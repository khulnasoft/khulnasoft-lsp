import { transformHeadersToSnowplowOptions } from './headers_to_snowplow_options';

describe('transformHeadersToSnowplowOptions', () => {
  const mockInstanceId = '1';
  const mockGlobalUserId = '2';
  const mockHostName = 'https://test.gitlab.com';
  const mockDuoProNamespaceIds = [3, 4, 5];

  const headers = {
    'X-Gitlab-Instance-Id': mockInstanceId,
    'X-Gitlab-Global-User-Id': mockGlobalUserId,
    'X-Gitlab-Host-Name': mockHostName,
    'X-Gitlab-Saas-Duo-Pro-Namespace-Ids': mockDuoProNamespaceIds.join(','),
  };

  it('should parse headers and return Snowplow tracking options', () => {
    expect(transformHeadersToSnowplowOptions(headers)).toEqual({
      gitlab_instance_id: mockInstanceId,
      gitlab_global_user_id: mockGlobalUserId,
      gitlab_host_name: mockHostName,
      gitlab_saas_duo_pro_namespace_ids: mockDuoProNamespaceIds,
    });
  });

  it('should handle empty "gitlab_saas_duo_pro_namespace_ids" header` value correctly', () => {
    const emptyHeader = {
      ...headers,
      'X-Gitlab-Saas-Duo-Pro-Namespace-Ids': '',
    };
    expect(
      transformHeadersToSnowplowOptions(emptyHeader).gitlab_saas_duo_pro_namespace_ids,
    ).toEqual([]);
  });
});
