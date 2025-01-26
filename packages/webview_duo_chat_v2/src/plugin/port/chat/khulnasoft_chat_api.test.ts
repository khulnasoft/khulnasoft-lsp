import assert from 'assert';
import { Cable } from '@anycable/core';
import { KhulnaSoftApiService, InstanceInfo, UserService } from '@khulnasoft/core';
import { TestLogger } from '@khulnasoft/logging';
import { AIContextItemMetadata, AIContextManager } from '@khulnasoft/ai-context';
import { createFakeCable } from '../test_utils/entities';
import { createFakePartial } from '../test_utils/create_fake_partial';
import { SPECIAL_MESSAGES, PLATFORM_ORIGIN } from '../constants';
import {
  KhulnaSoftChatApi,
  AI_MESSAGES_QUERY,
  CHAT_INPUT_TEMPLATE_17_2_AND_EARLIER,
  CHAT_INPUT_TEMPLATE_17_3_AND_LATER,
  CHAT_INPUT_TEMPLATE_17_5_AND_LATER,
} from './gitlab_chat_api';
import { API_PULLING } from './api/pulling';

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
  let apiClient: KhulnaSoftApiService;
  let cable: Cable;
  let gitlabChatApi: KhulnaSoftChatApi;
  let canceledPromptRequestIds: string[];
  let aiContextManager: AIContextManager;
  const logger = new TestLogger();
  const userGqlId = 'gid://gitlab/User/12345';
  const userService = createFakePartial<UserService>({
    user: {
      gqlId: userGqlId,
    },
  });

  const createApiClient = (
    queryContent = mockedQueryResponse,
    mutationContent = mockedMutationResponse,
  ): KhulnaSoftApiService => {
    makeApiRequest = jest.fn(async <T>(params: { path?: string; query?: string }): Promise<T> => {
      let response;
      if (
        params?.query === CHAT_INPUT_TEMPLATE_17_2_AND_EARLIER.query ||
        params?.query === CHAT_INPUT_TEMPLATE_17_3_AND_LATER.query ||
        params?.query === CHAT_INPUT_TEMPLATE_17_5_AND_LATER.query
      ) {
        response = mutationContent as T;
      } else {
        response = queryContent as T;
      }
      return response;
    });

    return createFakePartial<KhulnaSoftApiService>({
      connectToCable: async () => cable,
      fetchFromApi: makeApiRequest,
      instanceInfo: createFakePartial<InstanceInfo>({}),
    });
  };

  beforeEach(async () => {
    cable = createFakeCable();
    apiClient = createApiClient(mockedQueryResponse);
    apiClient.instanceInfo!.instanceVersion = '17.3.0';

    canceledPromptRequestIds = [];
    aiContextManager = createFakePartial<AIContextManager>({
      getAvailableCategories: jest.fn().mockResolvedValue([]),
    });
    gitlabChatApi = new KhulnaSoftChatApi(
      apiClient,
      canceledPromptRequestIds,
      aiContextManager,
      logger,
      userService,
    );
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
      apiClient = createApiClient(mockedEmptyQueryResponse);
      gitlabChatApi = new KhulnaSoftChatApi(apiClient, [], aiContextManager, logger, userService);

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

      const [[aiActionMutation]] = makeApiRequest.mock.calls;

      expect(aiActionMutation.query).toBe(CHAT_INPUT_TEMPLATE_17_3_AND_LATER.query);
      expect(aiActionMutation.variables.currentFileContext).toStrictEqual(undefined);
      // TODO: get active project id
      // expect(aiActionMutation.variables.resourceId).toBe('gid://gitlab/Project/123');
      expect(aiActionMutation.variables.platformOrigin).toBe(PLATFORM_ORIGIN);
    });

    it('omits the platform origin field for chat mutation for KhulnaSoft 17.2 and earlier', async () => {
      apiClient.instanceInfo!.instanceVersion = '17.2.0';
      const response = await gitlabChatApi.processNewUserPrompt(mockPrompt);

      expect(response.aiAction).toBe(mockedMutationResponse.aiAction);

      const [[aiActionMutation]] = makeApiRequest.mock.calls;

      expect(aiActionMutation.query).toBe(CHAT_INPUT_TEMPLATE_17_2_AND_EARLIER.query);
      expect(aiActionMutation.variables.currentFileContext).toStrictEqual(undefined);
      // TODO: get active project id
      // expect(aiActionMutation.variables.resourceId).toBe('gid://gitlab/Project/123');
      expect(aiActionMutation.variables.platformOrigin).toBe(undefined);
    });

    it('sends the platform origin field for chat mutation for KhulnaSoft 17.3 and later', async () => {
      apiClient.instanceInfo!.instanceVersion = '17.4.0';
      const response = await gitlabChatApi.processNewUserPrompt(mockPrompt);

      expect(response.aiAction).toBe(mockedMutationResponse.aiAction);

      const [[aiActionMutation]] = makeApiRequest.mock.calls;

      expect(aiActionMutation.query).toBe(CHAT_INPUT_TEMPLATE_17_3_AND_LATER.query);
      expect(aiActionMutation.variables.currentFileContext).toStrictEqual(undefined);
      // TODO: get active project id
      // expect(aiActionMutation.variables.resourceId).toBe('gid://gitlab/Project/123');
      expect(aiActionMutation.variables.platformOrigin).toBe(PLATFORM_ORIGIN);

      // Make an additional call to verify we don't duplicate the version request.
      await gitlabChatApi.processNewUserPrompt(mockPrompt);
      expect(makeApiRequest).toHaveBeenCalledTimes(2);
    });

    it('sends the platform origin field for chat mutation when version is unknown', async () => {
      apiClient.instanceInfo!.instanceVersion = '';
      const response = await gitlabChatApi.processNewUserPrompt(mockPrompt);

      expect(response.aiAction).toBe(mockedMutationResponse.aiAction);

      const [[aiActionMutation]] = makeApiRequest.mock.calls;

      expect(aiActionMutation.query).toBe(CHAT_INPUT_TEMPLATE_17_3_AND_LATER.query);
      expect(aiActionMutation.variables.currentFileContext).toStrictEqual(undefined);
      // TODO: get active project id
      // expect(aiActionMutation.variables.resourceId).toBe('gid://gitlab/Project/123');
      expect(aiActionMutation.variables.platformOrigin).toBe(PLATFORM_ORIGIN);
    });

    it('sets resourceId to null when project is not available', async () => {
      mockGetProjectGqlId.mockResolvedValueOnce(undefined);

      await gitlabChatApi.processNewUserPrompt(mockPrompt);

      const [[aiActionMutation]] = makeApiRequest.mock.calls;

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

      const [[aiActionMutation]] = makeApiRequest.mock.calls;

      expect(aiActionMutation.query).toBe(CHAT_INPUT_TEMPLATE_17_3_AND_LATER.query);
      expect(aiActionMutation.variables.currentFileContext).toStrictEqual(fileContext);
      // TODO: get active project id
      // expect(aiActionMutation.variables.resourceId).toBe('gid://gitlab/Project/123');
      expect(aiActionMutation.variables.platformOrigin).toBe(PLATFORM_ORIGIN);
    });
  });

  describe('special messages', () => {
    describe.each([
      { message: SPECIAL_MESSAGES.CLEAR, sendMessage: () => gitlabChatApi.clearChat() },
      { message: SPECIAL_MESSAGES.RESET, sendMessage: () => gitlabChatApi.resetChat() },
    ])('$message', ({ message, sendMessage }) => {
      it('sends the correct variables to chat mutation', async () => {
        await sendMessage();

        expect(makeApiRequest).toHaveBeenCalledWith({
          query: CHAT_INPUT_TEMPLATE_17_3_AND_LATER.query,
          type: 'graphql',
          variables: {
            currentFileContext: undefined,
            question: message,
            // TODO: get active project id
            // resourceId: 'gid://gitlab/Project/123',
            resourceId: null,
            platformOrigin: PLATFORM_ORIGIN,
          },
        });
      });

      it('omits the platform origin field for KhulnaSoft 17.2 and earlier', async () => {
        apiClient.instanceInfo!.instanceVersion = '17.2.0';
        await sendMessage();
        expect(makeApiRequest).toHaveBeenCalledWith({
          query: CHAT_INPUT_TEMPLATE_17_2_AND_EARLIER.query,
          type: 'graphql',
          variables: {
            currentFileContext: undefined,
            question: message,
            // TODO: get active project id
            // resourceId: 'gid://gitlab/Project/123',
            resourceId: null,
          },
        });
      });

      it('sends the platform origin for KhulnaSoft 17.3 and later', async () => {
        apiClient.instanceInfo!.instanceVersion = '17.3.0';
        await sendMessage();

        expect(makeApiRequest).toHaveBeenCalledWith({
          query: CHAT_INPUT_TEMPLATE_17_3_AND_LATER.query,
          type: 'graphql',
          variables: {
            currentFileContext: undefined,
            question: message,
            // TODO: get active project id
            // resourceId: 'gid://gitlab/Project/123',
            resourceId: null,
            platformOrigin: PLATFORM_ORIGIN,
          },
        });

        // Make an additional call to verify we don't duplicate the version request.
        await sendMessage();

        expect(makeApiRequest).toHaveBeenCalledTimes(2);
      });

      it('sends the platform origin when version check fails', async () => {
        apiClient.instanceInfo!.instanceVersion = '';

        await sendMessage();

        expect(makeApiRequest).toHaveBeenCalledWith({
          query: CHAT_INPUT_TEMPLATE_17_3_AND_LATER.query,
          type: 'graphql',
          variables: {
            currentFileContext: undefined,
            question: message,
            // TODO: get active project id
            // resourceId: 'gid://gitlab/Project/123',
            resourceId: null,
            platformOrigin: PLATFORM_ORIGIN,
          },
        });
      });
    });

    describe('/clear', () => {
      it('clears the chat with the /clean command in KhulnaSoft 17.5 and earlier', async () => {
        apiClient.instanceInfo!.instanceVersion = '17.4.0';

        await gitlabChatApi.clearChat();

        const [[aiActionMutation]] = makeApiRequest.mock.calls;

        expect(aiActionMutation.query).toBe(CHAT_INPUT_TEMPLATE_17_3_AND_LATER.query);
        expect(aiActionMutation.variables).toEqual({
          currentFileContext: undefined,
          question: SPECIAL_MESSAGES.CLEAR,
          // TODO: get active project id
          // resourceId: 'gid://gitlab/Project/123',
          resourceId: null,
          platformOrigin: PLATFORM_ORIGIN,
        });
      });
    });
  });

  describe('cancelChat', () => {
    const createChunkMessage = (chunkId: string, requestId: string) => ({
      result: { data: { aiCompletionResponse: { role: 'assistant', chunkId, requestId } } },
    });

    it('does not collect any more chunks from graphql', async () => {
      const requestId = 'uniqueId';
      const callback = jest.fn();
      await gitlabChatApi.subscribeToUpdates(callback, 'xyz');
      const channel = jest.mocked(cable.subscribe).mock.calls[0][0];
      channel.receive(createChunkMessage('1', requestId));

      canceledPromptRequestIds.push(requestId);

      channel.receive(createChunkMessage('2', requestId)); // this one gets ignored

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('processNewUserPrompt with additional context', () => {
    it('sends the additionalContext when provided and additionalContext is enabled', async () => {
      jest
        .mocked(aiContextManager.getAvailableCategories)
        .mockResolvedValue(['local_git', 'merge_request']);
      const aiContextItems = [
        {
          id: '1',
          category: 'file' as const,
          content: 'file content',
          metadata: {} as AIContextItemMetadata,
        },
        {
          id: '2',
          category: 'snippet' as const,
          content: 'snippet content',
          metadata: { language: 'javascript' } as unknown as AIContextItemMetadata,
        },
      ];

      const response = await gitlabChatApi.processNewUserPrompt(
        mockPrompt,
        undefined,
        undefined,
        aiContextItems,
      );

      expect(response.aiAction).toBe(mockedMutationResponse.aiAction);

      const [[aiActionMutation]] = makeApiRequest.mock.calls;

      expect(aiActionMutation.variables.additionalContext).toEqual([
        {
          id: '1',
          category: 'FILE',
          content: 'file content',
          metadata: {},
        },
        {
          id: '2',
          category: 'SNIPPET',
          content: 'snippet content',
          metadata: { language: 'javascript' },
        },
      ]);

      expect(aiActionMutation.query).toBe(CHAT_INPUT_TEMPLATE_17_5_AND_LATER.query);
    });

    it('does not send additionalContext when not provided', async () => {
      const response = await gitlabChatApi.processNewUserPrompt(mockPrompt);

      expect(response.aiAction).toBe(mockedMutationResponse.aiAction);

      const [[aiActionMutation]] = makeApiRequest.mock.calls;

      expect(aiActionMutation.variables.additionalContext).toBeUndefined();
      expect(aiActionMutation.query).toBe(CHAT_INPUT_TEMPLATE_17_3_AND_LATER.query);
    });

    it('uses the correct query template when additionalContext is provided', async () => {
      jest.mocked(aiContextManager.getAvailableCategories).mockResolvedValue(['snippet']);
      const aiContextItems = [
        {
          id: '1',
          category: 'file' as const,
          content: 'file content',
          metadata: {} as AIContextItemMetadata,
        },
      ];

      await gitlabChatApi.processNewUserPrompt(mockPrompt, undefined, undefined, aiContextItems);

      const [[aiActionMutation]] = makeApiRequest.mock.calls;

      expect(aiActionMutation.query).toBe(CHAT_INPUT_TEMPLATE_17_5_AND_LATER.query);
      expect(aiActionMutation.variables.platformOrigin).toBe(PLATFORM_ORIGIN);
    });
  });
});
