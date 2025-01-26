import { getRemoteInfo, GetRemoteInfoResult, HttpClient } from 'isomorphic-git';
import { LsFetch } from '../../fetch';
import { log } from '../../log';

export async function getRemoteRepositoryInfo(
  lsFetch: LsFetch,
  remoteUrl: string,
): Promise<GetRemoteInfoResult> {
  log.debug(`Getting default branch from remote "${remoteUrl}"`);

  const gitHttpClient: HttpClient = {
    request: async ({ url, method = 'GET', headers = {}, body }) => {
      let requestBody: ArrayBuffer | undefined;
      if (body) {
        const chunks: Uint8Array[] = [];
        for await (const chunk of body) {
          chunks.push(chunk);
        }
        requestBody = new Uint8Array(Buffer.concat(chunks));
      }

      const response = await lsFetch.fetch(url, {
        method,
        headers,
        body: requestBody,
      });

      const responseBody = async function* responseBodyGenerator() {
        const buffer = await response.arrayBuffer();
        yield new Uint8Array(buffer);
      };

      return {
        url: response.url,
        method,
        statusCode: response.status,
        statusMessage: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseBody(),
      };
    },
  };

  const url = convertToHttpUrl(remoteUrl);
  log.debug(`Repository remote URL as HTTP URL: "${url}"`);

  return getRemoteInfo({
    http: gitHttpClient,
    url,

    // Note, we're currently supporting only public / unauthenticated repositories for getRemoteInfo
    onAuth: () => undefined,
    onAuthSuccess: () => undefined,
    onAuthFailure: () => undefined,
  });
}

/**
 * Handle various git remote formats (http, ssh etc) and convert them to http.
 * @param remoteUrl
 */
function convertToHttpUrl(remoteUrl: string): string {
  // Handle SSH format (git@github.com:user/repo.git)
  if (remoteUrl.startsWith('git@')) {
    const match = remoteUrl.match(/git@([^:]+):(.+)/);
    if (match) {
      const [, domain, path] = match;
      return `https://${domain}/${path}`;
    }
  }

  // Handle git:// protocol
  if (remoteUrl.startsWith('git://')) {
    return remoteUrl.replace('git://', 'https://');
  }

  // Handle SSH with explicit protocol (ssh://git@github.com/user/repo.git)
  if (remoteUrl.startsWith('ssh://')) {
    return remoteUrl.replace('ssh://', 'https://').replace(/git@([^/]+)/, '$1');
  }

  // Already HTTP(S) or unknown format - return as-is
  return remoteUrl;
}
