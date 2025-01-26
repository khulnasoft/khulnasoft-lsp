import { ClientInfo } from '../tracking/code_suggestions/code_suggestions_tracking_types';
import { getLanguageServerVersion } from './get_language_server_version';

export const getUserAgent = (clientInfo?: ClientInfo) => {
  const clientInfoString = clientInfo
    ? `${clientInfo?.name}:${clientInfo?.version}`
    : 'missing client info';
  return `gitlab-language-server:${getLanguageServerVersion()} (${clientInfoString})`;
};
