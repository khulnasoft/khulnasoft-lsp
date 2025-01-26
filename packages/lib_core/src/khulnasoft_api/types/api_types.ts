export interface InstanceInfo {
  instanceUrl: string;
  instanceVersion: string;
}

export interface TokenInfo {
  scopes: string[];
  type: 'pat' | 'oauth';
}

export interface ApiReconfigureSuccess {
  /** the API client is configured in a way that allows it to send request to the API */
  isInValidState: true;
  instanceInfo: InstanceInfo;
  tokenInfo: TokenInfo;
}

export interface ApiReconfigureError {
  /** the API client is not configured in a way that allows it to send request to the API */
  isInValidState: false;
  validationMessage: string;
}

export type ApiReconfiguredData = ApiReconfigureSuccess | ApiReconfigureError;
