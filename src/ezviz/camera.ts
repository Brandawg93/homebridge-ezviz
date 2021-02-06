import { Logging } from 'homebridge';
import { CameraInfo } from './models/camera';
import { EZVIZConfig } from './models/config';
import { EventEmitter } from 'events';
import { getCameras } from './connection';
import { EZVIZEndpoints, sendRequest, handleError } from './endpoints';
import querystring from 'querystring';

export class EZVIZCam extends EventEmitter {
  private readonly config: EZVIZConfig;
  private readonly log: Logging | undefined;
  public info: CameraInfo;
  private lastUpdatedTime: Date;

  constructor(config: EZVIZConfig, info: CameraInfo, log?: Logging) {
    super();
    this.log = log;
    this.config = config;
    this.info = info;
    this.lastUpdatedTime = new Date();
  }

  async setSwitchProperty(type: number, value: number): Promise<boolean> {
    const query = querystring.stringify({
      channel: 0,
      clientType: 1,
      enable: value,
      serial: this.info.deviceSerial,
      sessionId: this.config.sessionId,
      type: type,
    });
    const response = await sendRequest(
      this.config.sessionId,
      this.config.domain,
      EZVIZEndpoints.API_ENDPOINT_SWITCH_STATUS,
      'POST',
      query,
    );

    try {
      if (response.resultCode && response.resultCode !== '0') {
        this.log?.error(`Unable to set property '${type}' for ${this.info.name} to ${value}`);
        return false;
      }
      const switchSwitch = this.info.switch.find((x) => x.type === type);
      if (switchSwitch) {
        switchSwitch.enable = value === 1;
      }
      return true;
    } catch (error) {
      handleError(this.log, error, `Error setting property for ${this.info.name}`);
    }
    return false;
  }

  async updateData(): Promise<CameraInfo> {
    // Only update if more than one second has elapsed
    const checkTime = new Date(this.lastUpdatedTime);
    checkTime.setSeconds(checkTime.getSeconds() + 1);
    if (new Date().getTime() < checkTime.getTime()) {
      return this.info;
    }

    const cameras = await getCameras(this.config.sessionId || '', this.config.domain, this.log);
    const camera = cameras.find((x) => x.deviceSerial === this.info.deviceSerial);
    if (camera) {
      camera.code = this.config.cameras?.find((x) => x.serial === camera.deviceSerial)?.code;
      this.info = camera;
    }
    return this.info;
  }
}
