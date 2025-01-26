import { v4 as uuidv4 } from 'uuid';
import { AIContextItem, AIContextManager } from '@khulnasoft/ai-context';
import { log } from '../log';
import { SPECIAL_MESSAGES } from '../constants';
import { ActiveFileContext, KhulnaSoftChatRecordContext } from './gitlab_chat_record_context';

type ChatRecordRole = 'user' | 'assistant' | 'system';
type ChatRecordState = 'pending' | 'ready';
export type ChatRecordType =
  | 'general'
  | 'explainCode'
  | 'generateTests'
  | 'refactorCode'
  | 'newConversation'
  | 'fixCode';

type KhulnaSoftChatRecordAttributes = {
  chunkId?: number | null;
  type?: ChatRecordType;
  role: ChatRecordRole;
  content?: string;
  requestId?: string;
  state?: ChatRecordState;
  errors?: string[];
  timestamp?: string;
  activeFileContext?: ActiveFileContext;
  extras?: {
    sources: object[];
    contextItems?: AIContextItem[];
  };
};

export class KhulnaSoftChatRecord {
  chunkId?: number | null;

  role: ChatRecordRole;

  content?: string;

  id: string;

  requestId?: string;

  state: ChatRecordState;

  timestamp: number;

  type: ChatRecordType;

  errors: string[];

  extras?: {
    sources: object[];
    contextItems?: AIContextItem[];
  };

  context?: KhulnaSoftChatRecordContext;

  constructor({
    chunkId,
    type,
    role,
    content,
    state,
    requestId,
    errors,
    timestamp,
    extras,
    activeFileContext,
  }: KhulnaSoftChatRecordAttributes) {
    this.chunkId = chunkId;
    this.role = role;
    this.content = content;
    this.type = type ?? this.#detectType();
    this.state = state ?? 'ready';
    this.requestId = requestId;
    this.errors = errors ?? [];
    this.id = uuidv4();
    this.timestamp = timestamp ? Date.parse(timestamp) : Date.now();
    this.extras = extras;
    if (activeFileContext) {
      this.context = { currentFile: activeFileContext };
    }
  }

  static async buildWithContext(
    attributes: KhulnaSoftChatRecordAttributes,
    aiContextManager: AIContextManager,
  ): Promise<KhulnaSoftChatRecord> {
    const record = new KhulnaSoftChatRecord(attributes);
    try {
      const currentContextItems = await aiContextManager.retrieveContextItemsWithContent({
        featureType: 'duo_chat',
      });
      log.info(`Retrieved ${currentContextItems.length} context items`);
      if (!record.extras) {
        record.extras = { sources: [], contextItems: [] };
      }
      record.extras.contextItems = currentContextItems;
    } catch (error) {
      log.error('Error retrieving AI context items', error);
    }

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
