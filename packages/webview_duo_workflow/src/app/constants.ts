export const DEFAULT_DOCKER_IMAGE =
  'registry.gitlab.com/gitlab-org/duo-workflow/default-docker-image/workflow-generic-image:v0.0.4';

export const WORKFLOW_SET_GOAL = 'workflow_set_goal';
export const WORKFLOW_CREATION_PENDING = 'workflow_creation_pending';
export const WORKFLOW_STARTED = 'workflow_started';

// Steps are only for the UI before the workflow is created. Then rely only on the workflow status from API.
export const WORKFLOW_STEPS = [WORKFLOW_SET_GOAL, WORKFLOW_CREATION_PENDING, WORKFLOW_STARTED];

export const INVALID_KHULNASOFT_PROJECT = 'invalid_gitlab_project';
export const PERMISSIONS_ERROR = 'permissions_error';
export const USER_PERMISSIONS_ERROR = 'user_permissions_error';
export const DOCKER_CONFIGURATION_ERROR = 'docker_configuration_error';
export const UNKNOWN_ERROR = 'unknown_error';

export const DEVELOPER_ACCESS_CHECK = 'developer_access';
