import {
  API,
  APIEvent,
  DynamicPlatformPlugin,
  HAP,
  Logging,
  PlatformAccessory,
  PlatformAccessoryEvent,
  PlatformConfig,
} from 'homebridge';
import { EZVIZCam } from './ezviz/camera';
import { CameraInfo, SwitchTypes } from './ezviz/models/camera';
import { auth, getCameras, getDomain } from './ezviz/connection';
import { EZVIZConfig } from './ezviz/models/config';
import { EAVIZAccessory } from './accessory';

const HOUR = 3600000;

class Options {
  sleepSwitch = true;
  audioSwitch = true;
}

interface EZVIZObject {
  accessory: PlatformAccessory;
  camera: EZVIZCam;
}

let hap: HAP;
let Accessory: typeof PlatformAccessory;

const PLUGIN_NAME = 'homebridge-ezviz';
const PLATFORM_NAME = 'EZVIZ';

class EZVIZPlatform implements DynamicPlatformPlugin {
  private readonly log: Logging;
  private readonly api: API;
  private config: EZVIZConfig;
  private options: Options;
  private readonly ezvizObjects: Array<EZVIZObject> = [];

  constructor(log: Logging, config: PlatformConfig, api: API) {
    this.log = log;
    this.api = api;
    this.config = config as EZVIZConfig;
    this.options = new Options();

    // Need a config or plugin will not start
    if (!config) {
      return;
    }

    this.initDefaultOptions();
    api.on(APIEvent.DID_FINISH_LAUNCHING, this.didFinishLaunching.bind(this));
    api.on(APIEvent.SHUTDOWN, this.isShuttingDown.bind(this));
  }

  private initDefaultOptions(): void {
    // Setup boolean options
    Object.keys(this.options).forEach((opt) => {
      const key = opt as keyof Options;
      if (this.config.options) {
        const configVal = this.config.options[key];
        if (typeof configVal === 'undefined') {
          this.options[key] = true;
          this.log.debug(`Defaulting ${key} to true`);
        } else {
          this.options[key] = configVal;
          this.log.debug(`Using ${key} from config: ${configVal}`);
        }
      }
    });
  }

  configureAccessory(accessory: PlatformAccessory<Record<string, CameraInfo>>): void {
    this.log.info(`Configuring accessory ${accessory.displayName}`);

    accessory.on(PlatformAccessoryEvent.IDENTIFY, () => {
      this.log.info(`${accessory.displayName} identified!`);
    });

    const cameraInfo = accessory.context.cameraInfo;
    const camera = new EZVIZCam(this.config, cameraInfo, this.log);
    const ezvizAccessory = new EAVIZAccessory(accessory, camera, this.config, this.log, hap);
    ezvizAccessory.configureController();

    // // Sleep switch configuration
    try {
      const sleepSwitch = camera.info?.switch?.find((x) => x.type === SwitchTypes.Sleep);
      if (sleepSwitch && this.options.sleepSwitch) {
        ezvizAccessory.createSwitchService('Sleep Mode', hap.Service.Switch, SwitchTypes.Sleep, async (value) => {
          await ezvizAccessory.toggleSleep(value as boolean);
        });
      } else {
        ezvizAccessory.removeService(hap.Service.Switch, 'Sleep Mode');
      }
    } catch (e) {
      this.log.error('Error handling sleepSwitch', e);
    }

    // // Audio switch configuration
    try {
      const audioSwitch = camera.info?.switch?.find((x) => x.type === SwitchTypes.Audio);
      if (audioSwitch && this.options.audioSwitch) {
        ezvizAccessory.createSwitchService('Audio', hap.Service.Switch, SwitchTypes.Audio, async (value) => {
          await ezvizAccessory.toggleAudio(value as boolean);
        });
      } else {
        ezvizAccessory.removeService(hap.Service.Switch, 'Audio');
      }
    } catch (e) {
      this.log.error('Error handling audioSwitch', e);
    }

    this.ezvizObjects.push({ accessory: accessory, camera: camera });
  }

  /**
   * Add fetched cameras from ezviz to Homebridge
   */
  private async addCameras(cameras: Array<CameraInfo>): Promise<void> {
    cameras.forEach((cameraInfo: CameraInfo) => {
      const uuid = hap.uuid.generate(cameraInfo.deviceSerial);
      // Parenthesis in the name breaks HomeKit for some reason
      const displayName = cameraInfo.name.replace('(', '').replace(')', '');
      const accessory = new Accessory(displayName, uuid);
      // Add the verification code from config
      cameraInfo.code = this.config.cameras?.find((x) => x.serial === cameraInfo.deviceSerial)?.code;
      accessory.context.cameraInfo = cameraInfo;

      const accessoryInformation = accessory.getService(hap.Service.AccessoryInformation);
      if (accessoryInformation) {
        accessoryInformation.setCharacteristic(hap.Characteristic.Manufacturer, 'EZVIZ');
        accessoryInformation.setCharacteristic(hap.Characteristic.Model, cameraInfo.deviceSubCategory);
        accessoryInformation.setCharacteristic(hap.Characteristic.SerialNumber, cameraInfo.deviceSerial);
        accessoryInformation.setCharacteristic(hap.Characteristic.FirmwareRevision, cameraInfo.version);
      }

      // Only add new cameras that are not cached
      if (!this.ezvizObjects.find((x: EZVIZObject) => x.accessory.UUID === uuid)) {
        this.log.debug(`New camera found: ${cameraInfo.name}`);
        this.configureAccessory(accessory); // abusing the configureAccessory here
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      } else {
        // Go ahead and update data
        const obj = this.ezvizObjects.find((x: EZVIZObject) => x.accessory.UUID === uuid);
        if (obj) {
          obj.camera.info = cameraInfo;
        }
      }
    });
  }

  async getSessionId(): Promise<string> {
    const region = this.config.region;
    const email = this.config.email;
    const password = this.config.password;

    if (!email || !password) {
      this.log.error('You must provide your email and password in config.json.');
      return '';
    }

    this.config.domain = await getDomain(region);
    return await auth(this.config.domain, email, password, this.log);
  }

  async didFinishLaunching(): Promise<void> {
    const self = this;
    const sessionId = await this.getSessionId();
    if (sessionId) {
      this.config.sessionId = sessionId;
      // EZVIZ needs to be reauthenticated about every 12 hours
      setInterval(async () => {
        self.log.debug('Reauthenticating with config credentials');
        this.config.sessionId = await this.getSessionId();
      }, HOUR * 12);
      const cameras = await getCameras(this.config.sessionId, this.config.domain, this.log);
      await this.addCameras(cameras);
    } else {
      this.log.error('Unable to retrieve access token.');
    }
  }

  isShuttingDown(): void {
    const accessoryObjects = this.ezvizObjects.map((x) => {
      return x.accessory;
    });
    this.api.updatePlatformAccessories(accessoryObjects);
  }
}

export = (api: API): void => {
  hap = api.hap;
  Accessory = api.platformAccessory;

  api.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, EZVIZPlatform);
};
