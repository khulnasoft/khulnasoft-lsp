import 'core-js/proposals/set-methods-v2';
import { shallowMount } from '@vue/test-utils';
import { DuoWorkflowStatus } from '../../../../common/duo_workflow_status.ts';
import DuoChat from '../../../duo_chat/duo_chat.vue';
import { toolUseToMessage } from '../../../tools/index.ts';
import DuoWorkflowChat from './duo_workflow_chat.vue';

const mockToolMessage = { type: 'tool_use', name: 'read_file', input: { file_path: './test' } };
const mockProseMessage = {
  type: 'tool_use',
  name: 'handover_tool',
  input: { summary: 'I am handing this over.' },
};
const mockConversationHistory = {
  planner: [
    {
      type: 'AIMessage',
      content: [{ type: 'text', text: 'Hello!' }, mockToolMessage],
    },
    {
      type: 'AIMessage',
      content: [{ type: 'text', text: 'Hello!' }, mockProseMessage],
    },
  ],
};

describe('DuoWorkflowChat', () => {
  let wrapper;

  const createWrapper = (propsData = {}) => {
    wrapper = shallowMount(DuoWorkflowChat, {
      propsData: {
        conversationHistory: mockConversationHistory,
        status: DuoWorkflowStatus.FINISHED,
        ...propsData,
      },
    });
  };

  const findDuoChat = () => wrapper.findComponent(DuoChat);

  const getAllMessages = () => findDuoChat().props('messages');

  const getAllMessageContent = () => getAllMessages().map((w) => w.content);

  describe('messages', () => {
    beforeEach(() => {
      createWrapper();
    });

    it('shows chat', () => {
      const allMessages = getAllMessageContent();

      expect(allMessages).toEqual([
        toolUseToMessage(mockToolMessage).text,
        toolUseToMessage(mockProseMessage).text,
      ]);
    });

    it('distinguishes between prose and tools', () => {
      const allMessages = getAllMessages();

      expect(allMessages).toMatchObject([{ role: 'system' }, { role: 'assistant' }]);
    });

    it('only adds new chat messages', async () => {
      const mockNewToolMessage = {
        type: 'tool_use',
        name: 'write_file_with_contents',
        input: { file_path: './test' },
      };
      const newConversationHistory = {
        agent: [
          {
            type: 'AIMessage',
            content: [{ type: 'text', text: 'Goodbye!' }, mockNewToolMessage],
          },
        ],
        ...mockConversationHistory,
      };

      await wrapper.setProps({ conversationHistory: newConversationHistory });

      const allMessages = getAllMessageContent();

      expect(allMessages).toEqual([
        toolUseToMessage(mockToolMessage).text,
        toolUseToMessage(mockProseMessage).text,
        toolUseToMessage(mockNewToolMessage).text,
      ]);
    });

    describe('chat input', () => {
      it('shows the chat input when the workflow is not terminated', () => {
        createWrapper({ status: DuoWorkflowStatus.RUNNING });

        expect(findDuoChat().props('isChatAvailable')).toBe(true);
      });

      it('hides chat input when workflow is terminated', () => {
        createWrapper({ status: DuoWorkflowStatus.FINISHED });

        expect(findDuoChat().props('isChatAvailable')).toBe(false);
      });

      it('adds user messages to the shown messges and emits the message up', async () => {
        createWrapper({ status: DuoWorkflowStatus.RUNNING });

        await findDuoChat().vm.$emit('send-chat-prompt', 'hello');

        expect(wrapper.emitted('message')).toEqual([['hello']]);

        expect(findDuoChat().props('messages').at(-1)).toEqual({ content: 'hello', role: 'user' });
      });
    });
  });
});
