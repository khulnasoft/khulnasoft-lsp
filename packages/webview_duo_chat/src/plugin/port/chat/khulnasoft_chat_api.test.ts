import assert from 'assert';
import { Cable } from '@anycable/core';
import { createFakeCable, gitlabPlatformForAccount } from '../test_utils/entities';
import { createFakePartial } from '../test_utils/create_fake_partial';
import { KhulnaSoftVersionResponse } from '../gilab/check_version';
import { KhulnaSoftPlatformManagerForChat } from './get_platform_manager_for_chat';
import {
  KhulnaSoftChatApi,
  AI_MESSAGES_QUERY,
  CHAT_INPUT_TEMPLATE_17_2_AND_EARLIER,
  CHAT_INPUT_TEMPLATE_17_3_AND_LATER,
} from './gitlab_chat_api';
import { API_PULLING } from './api/pulling';
import { SPECIAL_MESSAGES, PLATFORM_ORIGIN } from './constants';

API_PULLING.interval = 1; // wait only 1ms between pulling attempts.

const mockedMutationResponse = {
  aiAction: { requestId: '123', errors: [] as string[] },
};

const mockedQueryResponse = {
  aiMessages: {
    nodes: [
      {
        content: 'test',
        requestId: '123',
        role: 'assistant',
        errors: ['bar'],
        timestamp: '2023-01-01 01:01:01',
        extras: {
          sources: ['foo'],
        },
      },
    ],
  },
};

const mockedEmptyQueryResponse = {
  aiMessages: { nodes: [] },
};

const mockPrompt = 'What is a fork?';
const mockGetProjectGqlId = jest.fn(
  async (): Promise<string | undefined> => 'gid://gitlab/Project/123',
);

describe('KhulnaSoftChatApi', () => {
  let makeApiRequest: jest.Mock;
  let manager: KhulnaSoftPlatformManagerForChat;
  let cable: Cable;
  let gitlabChatApi: KhulnaSoftChatApi;
  let versionResponse: () => Promise<KhulnaSoftVersionResponse>;

  const createManager = (
    queryContent = mockedQueryResponse,
    mutationContent = mockedMutationResponse,
  ): KhulnaSoftPlatformManagerForChat => {
    makeApiRequest = jest.fn(async <T>(params: { path?: string; query?: string }): Promise<T> => {
      let response;
      if (params.path === '/version') {
        response = (await versionResponse()) as T;
      } else if (
        params?.query === CHAT_INPUT_TEMPLATE_17_2_AND_EARLIER.query ||
        params?.query === CHAT_INPUT_TEMPLATE_17_3_AND_LATER.query
      ) {
        response = mutationContent as T;
      } else {
        response = queryContent as T;
      }
      return response;
    });

    return createFakePartial<KhulnaSoftPlatformManagerForChat>({
      getProjectGqlId: mockGetProjectGqlId,
      getKhulnaSoftPlatform: jest.fn(async () => ({
        ...gitlabPlatformForAccount,
        connectToCable: async () => cable,
        fetchFromApi: makeApiRequest,
      })),
    });
  };

  beforeEach(async () => {
    cable = createFakeCable();
    manager = createManager(mockedQueryResponse);
    gitlabChatApi = new KhulnaSoftChatApi(manager);
    versionResponse = () =>
      Promise.resolve({
        version: '17.3.0',
        enterprise: true,
      });
  });

  describe('getAiMessage', () => {
    it('returns first message with given requestId and role', async () => {
      const expectedMessage = mockedQueryResponse.aiMessages.nodes[0];

      const response = await gitlabChatApi.pullAiMessage(
        expectedMessage.requestId,
        expectedMessage.role,
      );

      assert(response.type === 'message');

      const [[aiMessagesQuery]] = makeApiRequest.mock.calls;

      expect(aiMessagesQuery.query).toBe(AI_MESSAGES_QUERY);
      expect(response.content).toBe(expectedMessage.content);
      expect(response.requestId).toBe(expectedMessage.requestId);
      expect(response.errors).toStrictEqual(expectedMessage.errors);
      expect(response.timestamp).toStrictEqual(expectedMessage.timestamp);
      expect(response.extras).toStrictEqual(expectedMessage.extras);
    });

    it('returns an error if pulling timeout is reached', async () => {
      manager = createManager(mockedEmptyQueryResponse);
      gitlabChatApi = new KhulnaSoftChatApi(manager);

      const response = await gitlabChatApi.pullAiMessage('123', 'assistant');

      expect(response.requestId).toBe('123');
      expect(response.errors).toContainEqual('Reached timeout while fetching response.');
    });
  });

  describe('subscribeToUpdates', () => {
    const createChunkMessage = (chunkId: string) => ({
      result: { data: { aiCompletionResponse: { role: 'assistant', chunkId } } },
    });
    const createFullMessage = () => ({
      result: { data: { aiCompletionResponse: { role: 'assistant' } } }, // no chunkId means a full message
    });

    it('stops processing messages once fullMessage is received', async () => {
      const callback = jest.fn();
      await gitlabChatApi.subscribeToUpdates(callback, 'xyz');
      const channel = jest.mocked(cable.subscribe).mock.calls[0][0];
      channel.receive(createChunkMessage('1'));
      channel.receive(createFullMessage());
      channel.receive(createChunkMessage('2')); // this one gets ignored

      expect(callback).toHaveBeenCalledTimes(2);
    });
  });

  describe('processNewUserPrompt', () => {
    it('sends user prompt as mutation', async () => {
      const response = await gitlabChatApi.processNewUserPrompt(mockPrompt);

      expect(response.aiAction).toBe(mockedMutationResponse.aiAction);

      const [, [aiActionMutation]] = makeApiRequest.mock.calls;

      expect(aiActionMutation.query).toBe(CHAT_INPUT_TEMPLATE_17_3_AND_LATER.query);
      expect(aiActionMutation.variables.currentFileContext).toStrictEqual(undefined);
      expect(aiActionMutation.variables.resourceId).toBe('gid://gitlab/Project/123');
      expect(aiActionMutation.variables.platformOrigin).toBe(PLATFORM_ORIGIN);
    });

    it('omits the platform origin field for chat mutation for KhulnaSoft 17.2 and earlier', async () => {
      versionResponse = () =>
        Promise.resolve({
          version: '17.2.0',
          enterprise: true,
        });
      const response = await gitlabChatApi.processNewUserPrompt(mockPrompt);

      expect(response.aiAction).toBe(mockedMutationResponse.aiAction);

      const [, [aiActionMutation]] = makeApiRequest.mock.calls;

      expect(aiActionMutation.query).toBe(CHAT_INPUT_TEMPLATE_17_2_AND_EARLIER.query);
      expect(aiActionMutation.variables.currentFileContext).toStrictEqual(undefined);
      expect(aiActionMutation.variables.resourceId).toBe('gid://gitlab/Project/123');
      expect(aiActionMutation.variables.platformOrigin).toBe(undefined);
    });

    it('sends the platform origin field for chat mutation for KhulnaSoft 17.3 and later', async () => {
      const response = await gitlabChatApi.processNewUserPrompt(mockPrompt);

      expect(response.aiAction).toBe(mockedMutationResponse.aiAction);

      const [, [aiActionMutation]] = makeApiRequest.mock.calls;

      expect(aiActionMutation.query).toBe(CHAT_INPUT_TEMPLATE_17_3_AND_LATER.query);
      expect(aiActionMutation.variables.currentFileContext).toStrictEqual(undefined);
      expect(aiActionMutation.variables.resourceId).toBe('gid://gitlab/Project/123');
      expect(aiActionMutation.variables.platformOrigin).toBe(PLATFORM_ORIGIN);

      // Make an additional call to verify we don't duplicate the version request.
      await gitlabChatApi.processNewUserPrompt(mockPrompt);
      expect(makeApiRequest).toHaveBeenCalledTimes(3);
    });

    it('sends the platform origin field for chat mutation when version query fails', async () => {
      versionResponse = () => Promise.reject();

      const response = await gitlabChatApi.processNewUserPrompt(mockPrompt);

      expect(response.aiAction).toBe(mockedMutationResponse.aiAction);

      const [, [aiActionMutation]] = makeApiRequest.mock.calls;

      expect(aiActionMutation.query).toBe(CHAT_INPUT_TEMPLATE_17_3_AND_LATER.query);
      expect(aiActionMutation.variables.currentFileContext).toStrictEqual(undefined);
      expect(aiActionMutation.variables.resourceId).toBe('gid://gitlab/Project/123');
      expect(aiActionMutation.variables.platformOrigin).toBe(PLATFORM_ORIGIN);
    });

    it('sets resourceId to null when project is not available', async () => {
      mockGetProjectGqlId.mockResolvedValueOnce(undefined);

      await gitlabChatApi.processNewUserPrompt(mockPrompt);

      const [, [aiActionMutation]] = makeApiRequest.mock.calls;

      expect(aiActionMutation.variables.resourceId).toBe(null);
      expect(aiActionMutation.variables.platformOrigin).toBe(PLATFORM_ORIGIN);
    });

    it('when active file context is provided it also sends it with the prompt', async () => {
      const fileContext = {
        fileName: 'foo.rb',
        selectedText: 'selected_text',
        contentAboveCursor: 'before_text',
        contentBelowCursor: 'after_text',
      };

      const response = await gitlabChatApi.processNewUserPrompt(mockPrompt, undefined, fileContext);

      expect(response.aiAction).toBe(mockedMutationResponse.aiAction);

      const [, [aiActionMutation]] = makeApiRequest.mock.calls;

      expect(aiActionMutation.query).toBe(CHAT_INPUT_TEMPLATE_17_3_AND_LATER.query);
      expect(aiActionMutation.variables.currentFileContext).toStrictEqual(fileContext);
      expect(aiActionMutation.variables.resourceId).toBe('gid://gitlab/Project/123');
      expect(aiActionMutation.variables.platformOrigin).toBe(PLATFORM_ORIGIN);
    });
  });

  describe('cleanChat', () => {
    it('sends the correct variables to chat mutation', async () => {
      await gitlabChatApi.cleanChat();

      expect(makeApiRequest).toHaveBeenCalledWith({
        query: CHAT_INPUT_TEMPLATE_17_3_AND_LATER.query,
        type: 'graphql',
        variables: {
          currentFileContext: undefined,
          question: SPECIAL_MESSAGES.CLEAN,
          resourceId: 'gid://gitlab/Project/123',
          platformOrigin: PLATFORM_ORIGIN,
        },
      });
    });

    it('omits the platform origin field for chat mutation for KhulnaSoft 17.2 and earlier', async () => {
      versionResponse = () =>
        Promise.resolve({
          version: '17.2.0',
          enterprise: true,
        });

      await gitlabChatApi.cleanChat();
      expect(makeApiRequest).toHaveBeenCalledWith({
        query: CHAT_INPUT_TEMPLATE_17_2_AND_EARLIER.query,
        type: 'graphql',
        variables: {
          currentFileContext: undefined,
          question: SPECIAL_MESSAGES.CLEAN,
          resourceId: 'gid://gitlab/Project/123',
        },
      });
    });

    it('sends the platform origin for chat mutation for KhulnaSoft 17.3 and later', async () => {
      await gitlabChatApi.cleanChat();

      expect(makeApiRequest).toHaveBeenCalledWith({
        query: CHAT_INPUT_TEMPLATE_17_3_AND_LATER.query,
        type: 'graphql',
        variables: {
          currentFileContext: undefined,
          question: SPECIAL_MESSAGES.CLEAN,
          resourceId: 'gid://gitlab/Project/123',
          platformOrigin: PLATFORM_ORIGIN,
        },
      });

      // Make an additional call to verify we don't duplicate the version request.
      await gitlabChatApi.cleanChat();

      expect(makeApiRequest).toHaveBeenCalledTimes(3);
    });

    it('sends the platform origin for chat mutation when version check fails', async () => {
      versionResponse = () => Promise.reject();

      await gitlabChatApi.cleanChat();

      expect(makeApiRequest).toHaveBeenCalledWith({
        query: CHAT_INPUT_TEMPLATE_17_3_AND_LATER.query,
        type: 'graphql',
        variables: {
          currentFileContext: undefined,
          question: SPECIAL_MESSAGES.CLEAN,
          resourceId: 'gid://gitlab/Project/123',
          platformOrigin: PLATFORM_ORIGIN,
        },
      });
    });
  });
});
