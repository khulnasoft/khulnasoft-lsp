import { KhulnaSoftChatRecord } from './gitlab_chat_record';

const currentContextMock = { currentFile: { fileName: 'foo', selectedText: 'bar' } };

jest.mock('./gitlab_chat_record_context', () => ({
  buildCurrentContext: jest.fn().mockImplementation(() => currentContextMock),
}));

describe('KhulnaSoftChatRecord', () => {
  let record: KhulnaSoftChatRecord;

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
    it('assigns current file context to the record', () => {
      record = KhulnaSoftChatRecord.buildWithContext({ role: 'user', content: '' });

      expect(record.context).toStrictEqual(currentContextMock);
    });
  });
});
