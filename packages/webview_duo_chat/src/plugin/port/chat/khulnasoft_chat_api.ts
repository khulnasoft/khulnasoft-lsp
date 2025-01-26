import { gql } from 'graphql-request';
import { GraphQLRequest } from '../platform/web_ide';
import {
  AiCompletionResponseChannel,
  AiCompletionResponseMessageType,
} from '../api/graphql/ai_completion_response_channel';
import { extractUserId } from '../platform/gitlab_account';
import { log } from '../log';
import { versionRequest } from '../gilab/check_version';
import { ifVersionGte } from '../utils/if_version_gte';
import { KhulnaSoftPlatformManagerForChat } from './get_platform_manager_for_chat';
import { KhulnaSoftChatFileContext } from './gitlab_chat_file_context';
import { pullHandler } from './api/pulling';
import { PLATFORM_ORIGIN, SPECIAL_MESSAGES } from './constants';

export const MINIMUM_PLATFORM_ORIGIN_FIELD_VERSION = '17.3.0';

export const CHAT_INPUT_TEMPLATE_17_2_AND_EARLIER = {
  query: gql`
    mutation chat(
      $question: String!
      $resourceId: AiModelID
      $currentFileContext: AiCurrentFileInput
      $clientSubscriptionId: String
    ) {
      aiAction(
        input: {
          chat: { resourceId: $resourceId, content: $question, currentFile: $currentFileContext }
          clientSubscriptionId: $clientSubscriptionId
        }
      ) {
        requestId
        errors
      }
    }
  `,
  defaultVariables: {},
};

export const CHAT_INPUT_TEMPLATE_17_3_AND_LATER = {
  query: gql`
    mutation chat(
      $question: String!
      $resourceId: AiModelID
      $currentFileContext: AiCurrentFileInput
      $clientSubscriptionId: String
      $platformOrigin: String!
    ) {
      aiAction(
        input: {
          chat: { resourceId: $resourceId, content: $question, currentFile: $currentFileContext }
          clientSubscriptionId: $clientSubscriptionId
          platformOrigin: $platformOrigin
        }
      ) {
        requestId
        errors
      }
    }
  `,
  defaultVariables: {
    platformOrigin: PLATFORM_ORIGIN,
  },
};

export type AiActionResponseType = {
  aiAction: { requestId: string; errors: string[] };
};

export const AI_MESSAGES_QUERY = gql`
  query getAiMessages($requestIds: [ID!], $roles: [AiMessageRole!]) {
    aiMessages(requestIds: $requestIds, roles: $roles) {
      nodes {
        requestId
        role
        content
        contentHtml
        timestamp
        errors
        extras {
          sources
        }
      }
    }
  }
`;

type AiMessageResponseType = {
  requestId: string;
  role: string;
  content: string;
  contentHtml: string;
  timestamp: string;
  errors: string[];
  extras?: {
    sources: object[];
  };
};

type AiMessagesResponseType = {
  aiMessages: {
    nodes: AiMessageResponseType[];
  };
};

interface ErrorMessage {
  type: 'error';
  requestId: string;
  role: 'system';
  errors: string[];
}

const errorResponse = (requestId: string, errors: string[]): ErrorMessage => ({
  requestId,
  errors,
  role: 'system',
  type: 'error',
});

interface SuccessMessage {
  type: 'message';
  requestId: string;
  role: string;
  content: string;
  contentHtml: string;
  timestamp: string;
  errors: string[];
  extras?: {
    sources: object[];
  };
}

const successResponse = (response: AiMessageResponseType): SuccessMessage => ({
  type: 'message',
  ...response,
});

type AiMessage = SuccessMessage | ErrorMessage;

type ChatInputTemplate = {
  query: string;
  defaultVariables: {
    platformOrigin?: string;
  };
};

export class KhulnaSoftChatApi {
  #cachedActionQuery?: ChatInputTemplate = undefined;

  #manager: KhulnaSoftPlatformManagerForChat;

  constructor(manager: KhulnaSoftPlatformManagerForChat) {
    this.#manager = manager;
  }

  async processNewUserPrompt(
    question: string,
    subscriptionId?: string,
    currentFileContext?: KhulnaSoftChatFileContext,
  ): Promise<AiActionResponseType> {
    return this.#sendAiAction({
      question,
      currentFileContext,
      clientSubscriptionId: subscriptionId,
    });
  }

  async pullAiMessage(requestId: string, role: string): Promise<AiMessage> {
    const response = await pullHandler(() => this.#getAiMessage(requestId, role));

    if (!response) return errorResponse(requestId, ['Reached timeout while fetching response.']);

    return successResponse(response);
  }

  async cleanChat(): Promise<AiActionResponseType> {
    return this.#sendAiAction({ question: SPECIAL_MESSAGES.CLEAN });
  }

  async #currentPlatform() {
    const platform = await this.#manager.getKhulnaSoftPlatform();
    if (!platform) throw new Error('Platform is missing!');

    return platform;
  }

  async #getAiMessage(requestId: string, role: string): Promise<AiMessageResponseType | undefined> {
    const request: GraphQLRequest<AiMessagesResponseType> = {
      type: 'graphql',
      query: AI_MESSAGES_QUERY,
      variables: { requestIds: [requestId], roles: [role.toUpperCase()] },
    };
    const platform = await this.#currentPlatform();
    const history = await platform.fetchFromApi(request);

    return history.aiMessages.nodes[0];
  }

  async subscribeToUpdates(
    messageCallback: (message: AiCompletionResponseMessageType) => Promise<void>,
    subscriptionId?: string,
  ) {
    const platform = await this.#currentPlatform();

    const channel = new AiCompletionResponseChannel({
      htmlResponse: true,
      userId: `gid://gitlab/User/${extractUserId(platform.account.id)}`,
      aiAction: 'CHAT',
      clientSubscriptionId: subscriptionId,
    });

    const cable = await platform.connectToCable();

    // we use this flag to fix https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/issues/1397
    // sometimes a chunk comes after the full message and it broke the chat
    let fullMessageReceived = false;

    channel.on('newChunk', async (msg) => {
      if (fullMessageReceived) {
        log.info(`CHAT-DEBUG: full message received, ignoring chunk`);
        return;
      }
      await messageCallback(msg);
    });
    channel.on('fullMessage', async (message) => {
      fullMessageReceived = true;
      await messageCallback(message);

      if (subscriptionId) {
        cable.disconnect();
      }
    });

    cable.subscribe(channel);
  }

  async #sendAiAction(variables: object): Promise<AiActionResponseType> {
    const platform = await this.#currentPlatform();
    const { query, defaultVariables } = await this.#actionQuery();
    const projectGqlId = await this.#manager.getProjectGqlId();
    const request: GraphQLRequest<AiActionResponseType> = {
      type: 'graphql',
      query,
      variables: {
        ...variables,
        ...defaultVariables,
        resourceId: projectGqlId ?? null,
      },
    };

    return platform.fetchFromApi(request);
  }

  async #actionQuery(): Promise<ChatInputTemplate> {
    if (!this.#cachedActionQuery) {
      const platform = await this.#currentPlatform();

      try {
        const { version } = await platform.fetchFromApi(versionRequest);
        this.#cachedActionQuery = ifVersionGte<ChatInputTemplate>(
          version,
          MINIMUM_PLATFORM_ORIGIN_FIELD_VERSION,
          () => CHAT_INPUT_TEMPLATE_17_3_AND_LATER,
          () => CHAT_INPUT_TEMPLATE_17_2_AND_EARLIER,
        );
      } catch (e) {
        log.debug(`KhulnaSoft version check for sending chat failed:`, e as Error);
        this.#cachedActionQuery = CHAT_INPUT_TEMPLATE_17_3_AND_LATER;
      }
    }

    return this.#cachedActionQuery;
  }
}
