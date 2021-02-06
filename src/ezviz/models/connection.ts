interface LoginTerminalStatus {
  terminalBinded: string;
  terminalOpened: string;
}

interface LoginUser {
  userId: string;
  username: string;
  phone: string;
  email: string;
  confusedPhone: string;
  confusedEmail: string;
  customno: string;
  areaId: number;
  needTrans: boolean;
  transferringToStandaloneRegion: boolean;
  userCode: string;
  avatarPath: string;
  contact: string;
  category: number;
  homeTitle: string;
  location: string;
  regDate: string;
  langType: string;
  msgStatus: number;
}

interface Meta {
  code: number;
  message: string;
  moreInfo: string;
}

interface LoginArea {
  apiDomain: string;
  webDomain: string;
  areaName: string;
  areaId: number;
}

interface LoginSession {
  sessionId: string;
  rfSessionId: string;
}

export interface Domain {
  areaDomain: string;
  domain: string;
  httpDomain: string;
  resultCode: string;
  resultDes: string;
}

export interface Login {
  isolate: boolean;
  loginTerminalStatus: LoginTerminalStatus;
  loginUser: LoginUser;
  meta: Meta;
  hcGvIsolate: boolean;
  telphoneCode: string;
  loginArea: LoginArea;
  loginSession: LoginSession;
}
