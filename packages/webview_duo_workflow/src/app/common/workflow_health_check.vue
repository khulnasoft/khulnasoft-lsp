<script>
import { mapActions, mapState } from 'pinia';
import { GlEmptyState, GlIcon, GlModal, GlSprintf, GlButton } from '@khulnasoft/ui';

import { useHealthCheckStore } from '../stores/health_check';
import { useMainStore } from '../stores/main';
import { useDockerStore } from '../stores/docker';
import {
  INVALID_KHULNASOFT_PROJECT,
  PERMISSIONS_ERROR,
  USER_PERMISSIONS_ERROR,
  DOCKER_CONFIGURATION_ERROR,
  DEVELOPER_ACCESS_CHECK,
  UNKNOWN_ERROR,
} from '../constants';
import ProjectPath from '../common/project_path.vue';
import DockerHealthChecks from './docker_health_checks.vue';

import emptyProjectSvg from '@khulnasoft/svgs/dist/illustrations/empty-state/empty-projects-md.svg';
import generalPermissionsSvg from '@khulnasoft/svgs/dist/illustrations/empty-state/empty-access-md.svg';
import userPermissionsSvg from '@khulnasoft/svgs/dist/illustrations/empty-state/empty-private-md.svg';
import statusFailSvg from '@khulnasoft/svgs/dist/illustrations/status/status-fail-md.svg';
import statusSettingsSvg from '@khulnasoft/svgs/dist/illustrations/status/status-settings-md.svg';

export default {
  components: {
    GlEmptyState,
    GlIcon,
    GlModal,
    GlSprintf,
    GlButton,
    ProjectPath,
    DockerHealthChecks,
  },
  computed: {
    ...mapState(useHealthCheckStore, [
      'healthChecks',
      'isValidProject',
      'isWorkflowEnabledForProject',
    ]),
    ...mapState(useDockerStore, { isDockerReady: 'isReady', dockerStatus: 'status' }),
    currentState() {
      if (!this.isValidProject) {
        return INVALID_KHULNASOFT_PROJECT;
      }

      if (!this.isDockerReady) {
        return DOCKER_CONFIGURATION_ERROR;
      }

      const userCheck =
        this.healthChecks &&
        this.healthChecks.find((check) => check.name === DEVELOPER_ACCESS_CHECK);

      if (!this.isWorkflowEnabledForProject && userCheck) {
        if (!userCheck.value) {
          return USER_PERMISSIONS_ERROR;
        } else {
          return PERMISSIONS_ERROR;
        }
      }

      return UNKNOWN_ERROR;
    },
    currentStateData() {
      return this.$options.states[this.currentState];
    },
    isDockerError() {
      return this.currentState === DOCKER_CONFIGURATION_ERROR;
    },
    isPermissionsError() {
      return this.currentState === PERMISSIONS_ERROR;
    },
    isUserPermissionError() {
      return this.currentState === USER_PERMISSIONS_ERROR;
    },
  },
  methods: {
    ...mapActions(useMainStore, ['openUrl']),
    computeStatusIcon(check) {
      return check.value ? 'status-success' : 'status-failed';
    },
    computeStatusVariant(check) {
      return check.value ? 'success' : 'danger';
    },
  },
  states: {
    [INVALID_KHULNASOFT_PROJECT]: {
      illustration: emptyProjectSvg,
      title: 'Use with a KhulnaSoft project',
      description: [
        'KhulnaSoft Duo Workflow only works with KhulnaSoft projects that belong to a group namespace. To link your workspace folder to a KhulnaSoft project, open the Source Control view.',
      ],
    },
    [PERMISSIONS_ERROR]: {
      illustration: generalPermissionsSvg,
      title: 'Unavailable for this project',
      description: ['Before you can use KhulnaSoft Duo Workflow, resolve the following issues.'],
    },
    [USER_PERMISSIONS_ERROR]: {
      illustration: userPermissionsSvg,
      title: 'Unavailable to you',
      description: ['You must have at least the Developer role in this project.'],
    },
    [DOCKER_CONFIGURATION_ERROR]: {
      illustration: statusSettingsSvg,
      title: 'Configure Docker',
      helpLink:
        'https://docs.khulnasoft.com/ee/user/duo_workflow/#install-docker-and-set-the-socket-file-path',
      description: [
        "Before you can use KhulnaSoft Duo Workflow, you must configure Docker. It's used to execute arbitrary code, read and write files, and make API calls to KhulnaSoft.",
        '%{linkStart}How to set up Docker?%{linkEnd}',
      ],
    },
    [UNKNOWN_ERROR]: {
      illustration: statusFailSvg,
      title: 'KhulnaSoft Duo Workflow is disabled.',
      description: [
        'Unable to validate the project permissions. This could be due to a network error or a misconfiguration. Please contact your KhulnaSoft administrator to fix this.',
      ],
    },
  },
};
</script>
<template>
  <gl-empty-state class="gl-pt-20" :svgPath="currentStateData.illustration">
    <template #title>
      <h1 class="gl-mb-0 gl-mt-0 gl-text-size-h-display gl-leading-36 h4">
        {{ currentStateData.title }}
      </h1>
    </template>
    <template #description>
      <p v-for="(line, index) in currentStateData.description" :key="index">
        <gl-sprintf :message="line">
          <template #link="{ content }">
            <gl-button variant="link" @click="openUrl(currentStateData.helpLink)">
              {{ content }}
            </gl-button>
          </template>
        </gl-sprintf>
      </p>
      <project-path v-if="isPermissionsError || isUserPermissionError" class="gl-pb-7" centered />
      <div v-if="isPermissionsError" class="gl-border-t gl-py-6">
        <ul class="gl-p-0 gl-text-left">
          <li v-for="check in healthChecks" :key="check.name" class="gl-list-none gl-py-3">
            <gl-icon :name="computeStatusIcon(check)" :variant="computeStatusVariant(check)" />
            <span class="gl-pl-3">{{ check.message }}</span>
          </li>
        </ul>
      </div>
      <docker-health-checks v-if="isDockerError" :docker-status="dockerStatus" />
    </template>
  </gl-empty-state>
</template>
