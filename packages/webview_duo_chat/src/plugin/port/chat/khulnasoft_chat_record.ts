import { v4 as uuidv4 } from 'uuid';
import { buildCurrentContext, KhulnaSoftChatRecordContext } from './gitlab_chat_record_context';
import { SPECIAL_MESSAGES } from './constants';

type ChatRecordRole = 'user' | 'assistant' | 'system';
type ChatRecordState = 'pending' | 'ready';
type ChatRecordType =
  | 'general'
  | 'explainCode'
  | 'generateTests'
  | 'refactorCode'
  | 'newConversation';

type KhulnaSoftChatRecordAttributes = {
  chunkId?: number | null;
  type?: ChatRecordType;
  role: ChatRecordRole;
  content?: string;
  contentHtml?: string;
  requestId?: string;
  state?: ChatRecordState;
  errors?: string[];
  timestamp?: string;
  extras?: {
    sources: object[];
  };
};

export class KhulnaSoftChatRecord {
  chunkId?: number | null;

  role: ChatRecordRole;

  content?: string;

  contentHtml?: string;

  id: string;

  requestId?: string;

  state: ChatRecordState;

  timestamp: number;

  type: ChatRecordType;

  errors: string[];

  extras?: {
    sources: object[];
  };

  context?: KhulnaSoftChatRecordContext;

  constructor({
    chunkId,
    type,
    role,
    content,
    contentHtml,
    state,
    requestId,
    errors,
    timestamp,
    extras,
  }: KhulnaSoftChatRecordAttributes) {
    this.chunkId = chunkId;
    this.role = role;
    this.content = content;
    this.contentHtml = contentHtml;
    this.type = type ?? this.#detectType();
    this.state = state ?? 'ready';
    this.requestId = requestId;
    this.errors = errors ?? [];
    this.id = uuidv4();
    this.timestamp = timestamp ? Date.parse(timestamp) : Date.now();
    this.extras = extras;
  }

  static buildWithContext(attributes: KhulnaSoftChatRecordAttributes): KhulnaSoftChatRecord {
    const record = new KhulnaSoftChatRecord(attributes);
    record.context = buildCurrentContext();

    return record;
  }

  update(attributes: Partial<KhulnaSoftChatRecordAttributes>) {
    const convertedAttributes = attributes as Partial<KhulnaSoftChatRecord>;
    if (attributes.timestamp) {
      convertedAttributes.timestamp = Date.parse(attributes.timestamp);
    }
    Object.assign(this, convertedAttributes);
  }

  #detectType(): ChatRecordType {
    if (this.content === SPECIAL_MESSAGES.RESET) {
      return 'newConversation';
    }

    return 'general';
  }
}
