import { gql } from 'graphql-request';

export const GET_WORKFLOW_ENABLEMENT_CHECKS_QUERY = gql`
  query getDuoWorkflowEnablementChecks($projectPath: ID!) {
    project(fullPath: $projectPath) {
      id
      duoWorkflowStatusCheck {
        enabled
        checks {
          name
          value
          message
        }
      }
    }
  }
`;

export const GET_WORKFLOW_EVENTS_QUERY = gql`
  query getDuoWorkflowEvents($workflowId: AiDuoWorkflowsWorkflowID!) {
    duoWorkflowEvents(workflowId: $workflowId) {
      nodes {
        checkpoint
        errors
        metadata
        workflowGoal
        workflowStatus
      }
    }
  }
`;

export const GET_USER_WORKFLOWS = gql`
  query getUserWorkflows(
    $projectPath: ID!
    $after: String
    $before: String
    $first: Int
    $last: Int
  ) {
    duoWorkflowWorkflows(
      projectPath: $projectPath
      first: $first
      after: $after
      last: $last
      before: $before
    ) {
      pageInfo {
        startCursor
        endCursor
        hasNextPage
        hasPreviousPage
      }
      edges {
        node {
          id
          projectId
          humanStatus
          updatedAt
          goal
        }
      }
    }
  }
`;
