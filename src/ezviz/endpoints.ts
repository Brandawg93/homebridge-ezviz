import axios from 'axios';
import { Logging } from 'homebridge';
import { AxiosRequestConfig, Method } from 'axios';

/**
 * Handle an axios error
 * @param {Logging} log     The log object to output error
 * @param {any} error       The error thrown
 * @param {string} message  The message to add to the log output
 */
export function handleError(log: Logging | undefined, error: any, message: string, debug = false): void {
  if (error.response) {
    const status = parseInt(error.response.status);
    const errMsg = `${message}: ${status}`;
    if (status >= 500 || status === 404) {
      log?.debug(errMsg);
    } else {
      debug ? log?.debug(errMsg) : log?.error(errMsg);
    }
  } else if (error.code) {
    const errMsg = `${message}: ${error.code}`;
    if (error.code === 'ECONNRESET' || error.code === 'EAI_AGAIN') {
      log?.debug(errMsg);
    } else {
      debug ? log?.debug(errMsg) : log?.error(errMsg);
    }
  } else {
    log?.error(error);
  }
}

/**
 * Send a generic api request
 * @param {string} sessionId  The token used to authenticate request
 * @param {string} hostname     The base uri to send the request
 * @param {string} endpoint     The endpoint to send the request
 * @param {Method} method       Usually 'GET' or 'POST'
 * @param {ResponseType} type   The type of return object (Usually 'json')
 * @param {any} data            The body of the request or null if a 'GET'
 */
export async function sendRequest(
  sessionId: string | undefined,
  hostname: string,
  endpoint: string,
  method: Method,
  data?: any,
): Promise<any> {
  const headers: any = {
    'User-Agent': EZVIZEndpoints.USER_AGENT,
    clientType: 1,
  };

  if (method === 'POST') {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
  }

  if (sessionId) {
    headers.sessionId = sessionId;
  }

  const url = hostname + endpoint;
  const req: AxiosRequestConfig = {
    method,
    url,
    data,
    headers,
    responseType: 'json',
  };

  return (await axios(req)).data;
}

/**
 * Class used to communicate with EZVIZ
 */
export class EZVIZEndpoints {
  public static USER_AGENT = 'EZVIZ/4.9.2 (iPhone; iOS 14.3; Scale/3.00)';
  public static API_BASE_TLD = '.ezvizlife.com';
  public static API_ENDPOINT_AUTH = '/v3/users/login/v5';
  public static API_ENDPOINT_PAGELIST = '/v3/userdevices/v1/resources/pagelist';
  public static API_ENDPOINT_SWITCH_STATUS = '/api/device/switchStatus';
}
