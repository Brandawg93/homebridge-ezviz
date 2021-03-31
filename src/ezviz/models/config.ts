import { PlatformConfig } from 'homebridge';
import { Credentials } from './connection';

interface Options {
  sleepSwitch?: boolean;
  audioSwitch?: boolean;
  pathToFfmpeg?: string;
}

interface Camera {
  serial: string;
  username: string;
  code: string;
}

export interface EZVIZConfig extends PlatformConfig {
  region: number;
  email: string;
  password: string;
  credentials: Credentials;
  domain: string;
  cameras?: Array<Camera>;
  options?: Options;
}
