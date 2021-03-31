import { Logging } from 'homebridge';
import axios from 'axios';
import { AxiosRequestConfig } from 'axios';
import crypto from 'crypto';
import querystring from 'querystring';
import { Login, Domain, Credentials } from './models/connection';
import { CameraInfo } from './models/camera';
import { EZVIZConfig } from './models/config';
import { handleError, EZVIZEndpoints, sendRequest } from './endpoints';

function randomStr(length: number): string {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

export async function getDomain(id: number): Promise<string> {
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': EZVIZEndpoints.USER_AGENT,
    clientType: 1,
  };

  const domainReq: AxiosRequestConfig = {
    headers: headers,
    method: 'POST',
    url: 'https://api.ezvizlife.com/api/area/domain',
    data: querystring.stringify({
      areaId: id,
    }),
  };

  const domain = (await axios(domainReq)).data as Domain;
  return `https://${domain.domain}`;
}
/**
 * Get info on all cameras
 */
export async function getCameras(config: EZVIZConfig, log?: Logging): Promise<Array<CameraInfo>> {
  const cameras: Array<CameraInfo> = [];
  const query = querystring.stringify({
    filter: 'CONNECTION,SWITCH,STATUS,WIFI,NODISTURB,P2P,KMS,FEATURE,DETECTOR,VIDEO_QUALITY',
    groupId: -1,
    limit: 30,
    offset: 0,
  });
  try {
    const info = await sendRequest(config, config.domain, `${EZVIZEndpoints.API_ENDPOINT_PAGELIST}?${query}`, 'GET');
    if (info.deviceInfos && info.deviceInfos.length > 0) {
      const connection = info.CONNECTION;
      const status = info.STATUS;
      const switchInfo = info.SWITCH;
      for (const item of info.deviceInfos) {
        const camera = item as CameraInfo;
        camera.switch = [];
        if (connection && connection.hasOwnProperty(camera.deviceSerial)) {
          camera.connection = connection[camera.deviceSerial];
        }
        if (status && status.hasOwnProperty(camera.deviceSerial)) {
          camera.statusInfo = status[camera.deviceSerial];
        }
        if (switchInfo && switchInfo.hasOwnProperty(camera.deviceSerial)) {
          camera.switch = switchInfo[camera.deviceSerial];
        }

        cameras.push(camera);
      }
    }
  } catch (error) {
    handleError(log, error, 'Error fetching cameras');
  }
  return cameras;
}

export async function auth(
  domain: string,
  email: string,
  password: string,
  log?: Logging,
): Promise<Credentials | undefined> {
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': EZVIZEndpoints.USER_AGENT,
    clientType: 1,
  };

  const emailHash = crypto.createHash('md5').update(password).digest('hex');
  const passHash = crypto.createHash('md5').update(password).digest('hex');
  const cuName = randomStr(24);

  const payload = {
    account: email,
    featureCode: emailHash,
    password: passHash,
  };

  const req: AxiosRequestConfig = {
    headers: headers,
    method: 'POST',
    url: `${domain}${EZVIZEndpoints.API_ENDPOINT_AUTH}`,
    data: querystring.stringify(payload),
  };

  try {
    const response = (await axios(req)).data;
    if (response.retcode) {
      if (response.retcode === '1001') {
        log?.error('Login error: Incorrect login details');
      } else if (response.retcode === '1002') {
        log?.error('Login error: Captcha required');
      } else if (response.retcode === '1005') {
        log?.error('Login error: Incorrect Captcha code');
      } else {
        log?.error(`Login error: ${response.retcode}`);
      }
      return;
    }
    if (response.meta && response.meta.code) {
      const code = response.meta.code;
      if (code === 6002) {
        log?.error('2 Factor Authentication accounts are not supported at this time.');
        return;
      }
    }
    if (response.loginSession && response.loginSession.sessionId) {
      const login = response as Login;
      const credentials: Credentials = {
        sessionId: login.loginSession.sessionId,
        rfSessionId: login.loginSession.rfSessionId,
        featureCode: emailHash,
        cuName: cuName,
      };
      return credentials;
    } else {
      log?.error(response);
      return;
    }
  } catch (error) {
    handleError(log, error, 'Unable to login');
    return;
  }
}
