import { get } from 'lodash';
import { log } from '../log';
import { ISnowplowTrackerOptions } from '../config_service';
import { IDirectConnectionDetailsHeaders } from '../api';

export const transformHeadersToSnowplowOptions = (
  headers?: IDirectConnectionDetailsHeaders,
): ISnowplowTrackerOptions => {
  let gitlabSaasDuoProNamespaceIds: number[] | undefined;

  try {
    gitlabSaasDuoProNamespaceIds = get(headers, 'X-Gitlab-Saas-Duo-Pro-Namespace-Ids')
      ?.split(',')
      .map((id) => parseInt(id, 10))
      .filter((id) => !Number.isNaN(id));
  } catch (err) {
    log.debug('Failed to transform "X-Gitlab-Saas-Duo-Pro-Namespace-Ids" to telemetry options.');
  }

  return {
    gitlab_instance_id: get(headers, 'X-Gitlab-Instance-Id'),
    gitlab_global_user_id: get(headers, 'X-Gitlab-Global-User-Id'),
    gitlab_host_name: get(headers, 'X-Gitlab-Host-Name'),
    gitlab_saas_duo_pro_namespace_ids: gitlabSaasDuoProNamespaceIds,
  };
};
