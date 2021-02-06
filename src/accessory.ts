import {
  AudioStreamingCodecType,
  AudioStreamingSamplerate,
  CameraControllerOptions,
  CharacteristicEventTypes,
  CharacteristicGetCallback,
  CharacteristicSetCallback,
  CharacteristicValue,
  HAP,
  Logging,
  PlatformAccessory,
  Service,
  WithUUID,
} from 'homebridge';
import { StreamingDelegate } from './streaming-delegate';
import { EZVIZConfig } from './ezviz/models/config';
import { EZVIZCam } from './ezviz/camera';
import { SwitchTypes } from './ezviz/models/camera';

type ServiceType = WithUUID<typeof Service>;

const sanitizeString = (str: string): string => {
  if (str.includes('package')) {
    // Package
    return str.replace('-', ' ').replace(/(?:^|\s|["'([{])+\S/g, (match) => match.toUpperCase());
  } else if (str.startsWith('Face') || str.startsWith('Zone')) {
    return str;
  } else {
    // Motion, Person, Sound
    return str.replace(/(?:^|\s|["'([{])+\S/g, (match) => match.toUpperCase());
  }
};

export class EAVIZAccessory {
  private readonly log: Logging;
  private readonly hap: HAP;
  private accessory: PlatformAccessory;
  private camera: EZVIZCam;
  private config: EZVIZConfig;

  constructor(accessory: PlatformAccessory, camera: EZVIZCam, config: EZVIZConfig, log: Logging, hap: HAP) {
    this.accessory = accessory;
    this.camera = camera;
    this.config = config;
    this.log = log;
    this.hap = hap;
  }

  createService(serviceType: ServiceType, name?: string): Service {
    const existingService = name
      ? this.accessory.getServiceById(serviceType, `${this.accessory.displayName} ${name}`)
      : this.accessory.getService(serviceType);

    const service =
      existingService ||
      (name
        ? this.accessory.addService(
            serviceType,
            `${this.accessory.displayName} ${name}`,
            `${this.accessory.displayName} ${name}`,
          )
        : this.accessory.addService(serviceType, this.accessory.displayName));
    return service;
  }

  removeService(serviceType: ServiceType, name?: string): void {
    const existingService = name
      ? this.accessory.getServiceById(serviceType, `${this.accessory.displayName} ${name}`)
      : this.accessory.getService(serviceType);

    if (existingService) {
      this.accessory.removeService(existingService);
    }
  }

  removeAllServicesByType(serviceType: ServiceType): void {
    let existingService = this.accessory.getService(serviceType);
    while (existingService) {
      this.accessory.removeService(existingService);
      existingService = this.accessory.getService(serviceType);
    }
  }

  createSwitchService(
    name: string,
    serviceType: ServiceType,
    type: number,
    cb: (value: CharacteristicValue) => void,
  ): void {
    const service = this.createService(serviceType, name);
    this.log.debug(`Creating switch for ${this.accessory.displayName} ${name}.`);
    const switchSwitch = this.camera.info.switch.find((x) => x.type === type);
    if (switchSwitch) {
      service
        .setCharacteristic(this.hap.Characteristic.On, switchSwitch.enable)
        .getCharacteristic(this.hap.Characteristic.On)
        .on(CharacteristicEventTypes.SET, async (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
          cb(value);
          this.log.info(`Setting ${this.accessory.displayName} ${name} to ${value ? 'on' : 'off'}`);
          callback();
        })
        .on(CharacteristicEventTypes.GET, async (callback: CharacteristicGetCallback) => {
          const info = await this.camera.updateData();
          this.accessory.context.cameraInfo = info;
          const ss = info.switch.find((x) => x.type === type);
          if (ss) {
            const value = ss.enable;
            if (typeof value !== 'undefined') {
              this.log.debug(`Updating info for ${this.accessory.displayName} ${name}`);
              callback(null, value);
            } else {
              callback(new Error(), undefined);
            }
          }
        });
    }
  }

  configureController(): void {
    const streamingDelegate = new StreamingDelegate(this.hap, this.camera, this.config, this.log);
    const options: CameraControllerOptions = {
      cameraStreamCount: 2, // HomeKit requires at least 2 streams, but 1 is also just fine
      delegate: streamingDelegate,
      streamingOptions: {
        supportedCryptoSuites: [this.hap.SRTPCryptoSuites.AES_CM_128_HMAC_SHA1_80],
        video: {
          resolutions: [
            [320, 180, 30],
            [320, 240, 15], // Apple Watch requires this configuration
            [320, 240, 30],
            [480, 270, 30],
            [480, 360, 30],
            [640, 360, 30],
            [640, 480, 30],
            [1280, 720, 30],
            [1280, 960, 30],
            [1920, 1080, 30],
            [1600, 1200, 30],
          ],
          codec: {
            profiles: [this.hap.H264Profile.BASELINE, this.hap.H264Profile.MAIN, this.hap.H264Profile.HIGH],
            levels: [this.hap.H264Level.LEVEL3_1, this.hap.H264Level.LEVEL3_2, this.hap.H264Level.LEVEL4_0],
          },
        },
        audio: {
          twoWayAudio: false,
          codecs: [
            {
              type: AudioStreamingCodecType.AAC_ELD,
              samplerate: AudioStreamingSamplerate.KHZ_16,
            },
          ],
        },
      },
    };

    const cameraController = new this.hap.CameraController(options);
    streamingDelegate.controller = cameraController;

    this.accessory.configureController(cameraController);
  }

  getServicesByType(serviceType: ServiceType): Array<Service> {
    return this.accessory.services.filter((x) => x.UUID === serviceType.UUID);
  }

  async toggleSleep(enabled: boolean): Promise<void> {
    const service = this.accessory.getService(`${this.accessory.displayName} Sleep Mode`);
    let value = 1;
    if (!enabled) {
      value = 0;
    }
    const set = await this.camera.setSwitchProperty(SwitchTypes.Sleep, value);
    if (set && service) {
      service.updateCharacteristic(this.hap.Characteristic.On, enabled);
    }
  }

  async toggleAudio(enabled: boolean): Promise<void> {
    const service = this.accessory.getService(`${this.accessory.displayName} Audio`);
    let value = 1;
    if (!enabled) {
      value = 0;
    }
    const set = await this.camera.setSwitchProperty(SwitchTypes.Audio, value);
    if (set && service) {
      service.updateCharacteristic(this.hap.Characteristic.On, enabled);
    }
  }

  private setMotion(state: boolean, types: Array<string>): void {
    if (this.hap) {
      types.forEach((type) => {
        type = sanitizeString(type);
        const service = this.accessory.getServiceById(
          this.hap.Service.MotionSensor,
          `${this.accessory.displayName} ${type}`,
        );
        if (service) {
          this.log.debug(`Setting ${this.accessory.displayName} ${type} Motion to ${state}`);
          service.updateCharacteristic(this.hap.Characteristic.MotionDetected, state);
        }
      });
    }
  }
}
