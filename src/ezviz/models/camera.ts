export enum SwitchTypes {
  'Sleep' = 21,
  'Audio' = 22,
}

interface Connection {
  localIp: string;
  netIp: string;
  localRtspPort: number;
  netRtspPort: number;
  localCmdPort: number;
  netCmdPort: number;
  localStreamPort: number;
  netHttpPort: number;
  localHttpPort: number;
  netStreamPort: number;
  netType: number;
  wanIp: string;
  upnp: boolean;
}

interface Optionals {
  bandWidth: string;
  latestUnbandTime: string;
  alarmVideoCloud: string;
  updateCode: string;
  authCode: string;
  diskHealth: string;
  OnlineStatus: string;
  AlgorithmInfo: string;
  timeZone: string;
  language: string;
  diskCapacity: string;
  wanIp: string;
  kms_version: string;
  daylightSavingTime: string;
  timeFormat: string;
  tzCode: string;
  superState: string;
  voiceIndex: string;
  lastUpgradeTime: 1612132254212;
}

interface Status {
  diskNum: number;
  diskState: string;
  globalStatus: number;
  pirStatus: number;
  isEncrypt: number;
  encryptPwd: string;
  upgradeAvailable: number;
  upgradeProcess: number;
  upgradeStatus: number;
  alarmSoundMode: number;
  optionals: Optionals;
}

interface Switch {
  deviceSerial: string;
  channelNo: number;
  type: number;
  enable: boolean;
}

export interface CameraInfo {
  name: string;
  deviceSerial: string;
  fullSerial: string;
  deviceType: string;
  devicePicPrefix: string;
  version: string;
  supportExt: string;
  status: number;
  userDeviceCreateTime: string;
  channelNumber: number;
  hik: boolean;
  deviceCategory: string;
  deviceSubCategory: string;
  ezDeviceCapability: string;
  customType: string;
  offlineTime: string;
  offlineNotify: number;
  instructionBook: string;
  authCode: string;
  userName: string;
  riskLevel: number;
  offlineTimestamp: number;
  connection: Connection;
  statusInfo: Status;
  switch: Array<Switch>;
  code?: string;
}
