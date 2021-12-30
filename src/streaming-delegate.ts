import {
  CameraController,
  CameraStreamingDelegate,
  HAP,
  Logging,
  PrepareStreamCallback,
  PrepareStreamRequest,
  PrepareStreamResponse,
  SnapshotRequest,
  SnapshotRequestCallback,
  SRTPCryptoSuites,
  StreamingRequest,
  StreamRequestCallback,
  StreamRequestTypes,
  StreamSessionIdentifier,
  VideoInfo,
  AudioInfo,
} from 'homebridge';
import { EZVIZCam } from './ezviz/camera';
import { handleError } from './ezviz/endpoints';
import { EZVIZConfig } from './ezviz/models/config';
import { RtpSplitter, reservePorts } from './util/rtp';
import { SwitchTypes } from './ezviz/models/camera';
import { FfmpegProcess, isFfmpegInstalled, getSnapshot, getCodecsOutput } from './ffmpeg';
import { readFile } from 'fs';
import { join } from 'path';
import pathToFfmpeg from 'ffmpeg-for-homebridge';

type SessionInfo = {
  address: string; // address of the HAP controller

  videoPort: number;
  returnVideoPort: number;
  videoCryptoSuite: SRTPCryptoSuites; // should be saved if multiple suites are supported
  videoSRTP: Buffer; // key and salt concatenated
  videoSSRC: number; // rtp synchronisation source

  audioPort: number;
  returnAudioPort: number;
  twoWayAudioPort: number;
  rtpSplitter: RtpSplitter;
  audioCryptoSuite: SRTPCryptoSuites;
  audioSRTP: Buffer;
  audioSSRC: number;
};

export class StreamingDelegate implements CameraStreamingDelegate {
  private readonly hap: HAP;
  private readonly log: Logging;
  private customFfmpeg: string | undefined;
  private videoProcessor: string;
  private ffmpegInstalled = true;
  private ffmpegSupportsLibfdk_acc = true;
  private camera: EZVIZCam;
  controller?: CameraController;

  // keep track of sessions
  private pendingSessions: Record<string, SessionInfo> = {};
  private ongoingSessions: Record<string, FfmpegProcess | undefined> = {};

  constructor(hap: HAP, camera: EZVIZCam, config: EZVIZConfig, log: Logging) {
    this.hap = hap;
    this.log = log;
    this.camera = camera;
    this.customFfmpeg = config.options?.pathToFfmpeg;
    this.videoProcessor = this.customFfmpeg || pathToFfmpeg || 'ffmpeg';

    // Check if ffmpeg is installed
    isFfmpegInstalled(this.videoProcessor)
      .then((installed) => {
        this.ffmpegInstalled = installed;
      })
      .catch(() => {
        // skip
      });

    // Get the correct video codec
    getCodecsOutput(this.videoProcessor)
      .then((output) => {
        this.ffmpegSupportsLibfdk_acc = output.includes('libfdk_aac');
      })
      .catch(() => {
        // skip
      });
  }

  private getOfflineImage(callback: SnapshotRequestCallback): void {
    const log = this.log;
    readFile(join(__dirname, `../images/offline.jpg`), (err, data) => {
      if (err) {
        log.error(err.message);
        callback(err);
      } else {
        callback(undefined, data);
      }
    });
  }

  handleSnapshotRequest(request: SnapshotRequest, callback: SnapshotRequestCallback): void {
    const sleepSwitch = this.camera.info.switch.find((x) => x.type === 21);
    if (sleepSwitch && sleepSwitch.enable) {
      this.getOfflineImage(callback);
    } else {
      const url = `rtsp://admin:${this.camera.info.code}@${this.camera.info.connection.localIp}/Streaming/Channels/${this.camera.info.channelNumber}/`;
      getSnapshot(url, this.customFfmpeg)
        .then((snapshot) => {
          callback(undefined, snapshot);
        })
        .catch((error) => {
          handleError(this.log, error, `Error fetching snapshot for ${this.camera.info.name}`);
          callback(error);
        });
    }
  }

  async prepareStream(request: PrepareStreamRequest, callback: PrepareStreamCallback): Promise<void> {
    const sessionId: StreamSessionIdentifier = request.sessionID;
    const targetAddress = request.targetAddress;

    //video setup
    const video = request.video;
    const videoPort = video.port;
    const returnVideoPort = (await reservePorts())[0];
    const videoCryptoSuite = video.srtpCryptoSuite;
    const videoSrtpKey = video.srtp_key;
    const videoSrtpSalt = video.srtp_salt;
    const videoSSRC = this.hap.CameraController.generateSynchronisationSource();

    //audio setup
    const audio = request.audio;
    const audioPort = audio.port;
    const returnAudioPort = (await reservePorts())[0];
    const twoWayAudioPort = (await reservePorts(2))[0];
    const audioServerPort = (await reservePorts())[0];
    const audioCryptoSuite = video.srtpCryptoSuite;
    const audioSrtpKey = audio.srtp_key;
    const audioSrtpSalt = audio.srtp_salt;
    const audioSSRC = this.hap.CameraController.generateSynchronisationSource();

    const sessionInfo: SessionInfo = {
      address: targetAddress,

      videoPort: videoPort,
      returnVideoPort: returnVideoPort,
      videoCryptoSuite: videoCryptoSuite,
      videoSRTP: Buffer.concat([videoSrtpKey, videoSrtpSalt]),
      videoSSRC: videoSSRC,

      audioPort: audioPort,
      returnAudioPort: returnAudioPort,
      twoWayAudioPort: twoWayAudioPort,
      rtpSplitter: new RtpSplitter(audioServerPort, returnAudioPort, twoWayAudioPort),
      audioCryptoSuite: audioCryptoSuite,
      audioSRTP: Buffer.concat([audioSrtpKey, audioSrtpSalt]),
      audioSSRC: audioSSRC,
    };

    const response: PrepareStreamResponse = {
      video: {
        port: returnVideoPort,
        ssrc: videoSSRC,

        srtp_key: videoSrtpKey,
        srtp_salt: videoSrtpSalt,
      },
      audio: {
        port: audioServerPort,
        ssrc: audioSSRC,

        srtp_key: audioSrtpKey,
        srtp_salt: audioSrtpSalt,
      },
    };
    this.pendingSessions[sessionId] = sessionInfo;
    callback(undefined, response);
  }

  private getCommand(videoInfo: VideoInfo, audioInfo: AudioInfo, sessionId: string): Array<string> {
    const sessionInfo = this.pendingSessions[sessionId];
    const videoPort = sessionInfo.videoPort;
    const returnVideoPort = sessionInfo.returnVideoPort;
    const videoSsrc = sessionInfo.videoSSRC;
    const videoSRTP = sessionInfo.videoSRTP.toString('base64');
    const address = sessionInfo.address;
    // Multiply the bitrate because homekit requests extremely low bitrates
    const bitrate = videoInfo.max_bit_rate * 4;

    const videoPayloadType = videoInfo.pt;
    const mtu = videoInfo.mtu; // maximum transmission unit

    const audioPort = sessionInfo.audioPort;
    const returnAudioPort = sessionInfo.returnAudioPort;
    const audioSsrc = sessionInfo.audioSSRC;
    const audioSRTP = sessionInfo.audioSRTP.toString('base64');

    const audioPayloadType = audioInfo.pt;
    const audioMaxBitrate = audioInfo.max_bit_rate;
    const sampleRate = audioInfo.sample_rate;

    let command = [
      '-i',
      `rtsp://admin:${this.camera.info.code}@${this.camera.info.connection.localIp}/Streaming/Channels/${this.camera.info.channelNumber}/`,
      '-map',
      '0:0',
      '-c:v',
      'copy',
      '-b:v',
      `${bitrate}k`,
      '-bufsize',
      `${bitrate}k`,
      '-maxrate',
      `${2 * bitrate}k`,
      '-pix_fmt',
      'yuv420p',
      '-an',
      '-payload_type',
      videoPayloadType.toString(),
      '-ssrc',
      videoSsrc.toString(),
      '-f',
      'rtp',
      '-srtp_out_suite',
      'AES_CM_128_HMAC_SHA1_80',
      '-srtp_out_params',
      videoSRTP,
      `srtp://${address}:${videoPort}?rtcpport=${videoPort}&localrtcpport=${returnVideoPort}&pkt_size=${mtu}`,
    ];

    if (this.ffmpegSupportsLibfdk_acc) {
      const audioSwitch = this.camera.info.switch.find((x) => x.type === SwitchTypes.Audio);
      if (audioSwitch?.enable) {
        command = command.concat([
          '-map',
          '0:1',
          '-c:a',
          'libfdk_aac',
          '-profile:a',
          'aac_eld',
          '-ac',
          '1',
          '-vn',
          '-ar',
          `${sampleRate}k`,
          '-b:a',
          `${audioMaxBitrate}k`,
          '-flags',
          '+global_header',
          '-payload_type',
          audioPayloadType.toString(),
          '-ssrc',
          audioSsrc.toString(),
          '-f',
          'rtp',
          '-srtp_out_suite',
          'AES_CM_128_HMAC_SHA1_80',
          '-srtp_out_params',
          audioSRTP,
          `srtp://${address}:${audioPort}?rtcpport=${audioPort}&localrtcpport=${returnAudioPort}&pkt_size=188`,
        ]);
      }
    } else {
      this.log.error(
        "This version of FFMPEG does not support the audio codec 'libfdk_aac'. You may need to recompile FFMPEG using '--enable-libfdk_aac' and restart homebridge.",
      );
    }

    const sleepSwitch = this.camera.info.switch.find((x) => x.type === 21);
    if (sleepSwitch && sleepSwitch.enable) {
      command = [
        '-loop',
        '1',
        '-i',
        join(__dirname, `../images/offline.jpg`),
        '-c:v',
        'libx264',
        '-preset',
        'ultrafast',
        '-tune',
        'stillimage',
        '-pix_fmt',
        'yuv420p',
        '-an',
        '-payload_type',
        videoPayloadType.toString(),
        '-ssrc',
        videoSsrc.toString(),
        '-f',
        'rtp',
        '-srtp_out_suite',
        'AES_CM_128_HMAC_SHA1_80',
        '-srtp_out_params',
        videoSRTP,
        `srtp://${address}:${videoPort}?rtcpport=${videoPort}&localrtcpport=${returnVideoPort}&pkt_size=${mtu}`,
      ];
    }

    return command;
  }

  handleStreamRequest(request: StreamingRequest, callback: StreamRequestCallback): void {
    const sessionId = request.sessionID;

    switch (request.type) {
      case StreamRequestTypes.START:
        const video: VideoInfo = request.video;
        const audio: AudioInfo = request.audio;

        if (!this.ffmpegInstalled) {
          this.log.error('FFMPEG is not installed. Please install it and restart homebridge.');
          callback(new Error('FFmpeg not installed'));
          break;
        }

        const ffmpegCommand = this.getCommand(video, audio, sessionId);
        const ffmpeg = new FfmpegProcess(
          'STREAM',
          ffmpegCommand,
          this.log,
          callback,
          this,
          sessionId,
          false,
          this.customFfmpeg,
        );
        this.log.info(`Streaming started for ${this.camera.info.name}`);
        this.ongoingSessions[sessionId] = ffmpeg;
        break;
      case StreamRequestTypes.RECONFIGURE:
        // not implemented
        this.log.debug('(Not implemented) Received request to reconfigure to: ' + JSON.stringify(request.video));
        callback();
        break;
      case StreamRequestTypes.STOP:
        this.stopStream(sessionId);
        callback();
        break;
    }
  }

  public stopStream(sessionId: string): void {
    try {
      if (this.ongoingSessions[sessionId]) {
        const ffmpegVideoProcess = this.ongoingSessions[sessionId];
        ffmpegVideoProcess?.stop();
        this.log.info(`Streaming stopped for ${this.camera.info.name}`);
      }

      const sessionInfo = this.pendingSessions[sessionId];
      if (sessionInfo) {
        sessionInfo.rtpSplitter.close();
      }

      delete this.pendingSessions[sessionId];
      delete this.ongoingSessions[sessionId];
    } catch (e: any) {
      this.log.error('Error occurred terminating the video process!');
      this.log.error(e);
    }
  }
}
