import { createInterfaceId, Injectable } from '@khulnasoft/di';
import { gql } from 'graphql-request';
import { uniq } from 'lodash';
import { KhulnaSoftApiClient } from '../../api';
import { KhulnaSoftProjectId } from '../../api_types';
import { KhulnaSoftGID, toKhulnaSoftGid, tryParseKhulnaSoftGid } from '../../graphql/gid_utils';
import { log } from '../../log';

export interface DuoApiProjectAccessGqlResponse {
  projects: {
    edges: {
      node: {
        id: KhulnaSoftGID;
        duoFeaturesEnabled: boolean;
      };
    }[];
  };
}

export interface DuoApiProjectAccessCache {
  getEnabledForProjects(projectIds: KhulnaSoftProjectId[]): Promise<Record<KhulnaSoftProjectId, boolean>>;
}

export const DuoApiProjectAccessCache = createInterfaceId<DuoApiProjectAccessCache>(
  'DuoApiProjectAccessCache',
);

@Injectable(DuoApiProjectAccessCache, [KhulnaSoftApiClient])
export class DefaultDuoApiProjectAccessCache implements DuoApiProjectAccessCache {
  #duoProjects: Record<KhulnaSoftProjectId, boolean>;

  #gitlabApiClient: KhulnaSoftApiClient;

  constructor(gitlabApiClient: KhulnaSoftApiClient) {
    this.#gitlabApiClient = gitlabApiClient;
    this.#duoProjects = {};

    // Ensure switching KhulnaSoft instances / tokens etc does not result in stale cache data
    this.#gitlabApiClient.onApiReconfigured(() => {
      this.#duoProjects = {};
    });
  }

  async getEnabledForProjects(
    projectIds: KhulnaSoftProjectId[],
  ): Promise<Record<KhulnaSoftProjectId, boolean>> {
    const missingFromCache = uniq(projectIds.filter((id) => !this.#duoProjects[id]));
    if (missingFromCache.length) {
      log.debug(
        `[DuoApiProjectAccessCache] checking the following projects for Duo Access: ${JSON.stringify(missingFromCache)}`,
      );
      const statuses = await this.#checkDuoFeaturesEnabled(missingFromCache);
      this.#duoProjects = { ...this.#duoProjects, ...statuses };
    }

    return projectIds.reduce(
      (result, projectId) => {
        return {
          ...result,
          [projectId]: this.#duoProjects[projectId] || false,
        };
      },
      {} satisfies Record<KhulnaSoftProjectId, boolean>,
    );
  }

  async #checkDuoFeaturesEnabled(
    projectIds: KhulnaSoftProjectId[],
  ): Promise<Record<KhulnaSoftProjectId, boolean>> {
    try {
      const { projects } = await this.#gitlabApiClient.fetchFromApi<DuoApiProjectAccessGqlResponse>(
        {
          type: 'graphql',
          query: gql`
            query GetProjectsDuoEnabledStatusById($projectIds: [ID!]!) {
              projects(ids: $projectIds) {
                edges {
                  node {
                    id
                    duoFeaturesEnabled
                  }
                }
              }
            }
          `,
          variables: {
            projectIds: projectIds.map((id) => toKhulnaSoftGid('Project', id)),
          },
        },
      );

      return projects.edges.reduce((acc, edge) => {
        const id = tryParseKhulnaSoftGid(edge.node.id);
        // unexpected/invalid ID. Exclude this project from statuses (project will not be enabled)
        if (!id) return acc;

        return {
          ...acc,
          [id]: edge.node.duoFeaturesEnabled,
        };
      }, {});
    } catch (error) {
      log.error(
        `[DuoApiProjectAccessCache] Failed to check if Duo features are enabled for projects: ${projectIds}`,
        error,
      );
      return {};
    }
  }
}
