import { AIContextManager } from '@khulnasoft/ai-context';
import { createFakePartial } from '../test_utils/create_fake_partial';
import { KhulnaSoftChatRecord } from './gitlab_chat_record';
import { ActiveFileContext, KhulnaSoftChatRecordContext } from './gitlab_chat_record_context';

const activeFileContext = createFakePartial<ActiveFileContext>({
  fileName: 'foo',
  selectedText: 'bar',
});
const currentContextMock = createFakePartial<KhulnaSoftChatRecordContext>({
  currentFile: activeFileContext,
});

describe('KhulnaSoftChatRecord', () => {
  let record: KhulnaSoftChatRecord;
  let mockAIContextManager: AIContextManager;

  beforeEach(() => {
    mockAIContextManager = createFakePartial<AIContextManager>({
      retrieveSelectedContextItemsWithContent: jest.fn().mockResolvedValue([]),
    });
  });

  it('has meaningful defaults', () => {
    record = new KhulnaSoftChatRecord({ role: 'user', content: '' });
    expect(record.type).toBe('general');
    expect(record.state).toBe('ready');
  });

  it('respects provided values over defaults', () => {
    record = new KhulnaSoftChatRecord({
      chunkId: 1,
      role: 'user',
      content: '',
      type: 'explainCode',
      requestId: '123',
      state: 'pending',
    });
    expect(record.chunkId).toBe(1);
    expect(record.type).toBe('explainCode');
    expect(record.state).toBe('pending');
    expect(record.requestId).toBe('123');
  });

  it('assigns unique id', () => {
    record = new KhulnaSoftChatRecord({ role: 'user', content: '' });
    const anotherRecord = new KhulnaSoftChatRecord({ role: 'user', content: '' });

    expect(record.id).not.toEqual(anotherRecord.id);
    expect(record.id.length).toBe(36);
  });

  describe('buildWithContext', () => {
    it('assigns current file context to the record', async () => {
      record = await KhulnaSoftChatRecord.buildWithContext(
        { role: 'user', content: '', activeFileContext },
        mockAIContextManager,
      );

      expect(record.context).toStrictEqual(currentContextMock);
    });
  });
});
