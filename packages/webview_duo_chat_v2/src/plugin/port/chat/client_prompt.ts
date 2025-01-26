import { ChatRecordType } from './gitlab_chat_record';

export type PromptType = Exclude<ChatRecordType, 'general'>;

export const commandToContentMap: Record<PromptType, string> = {
  explainCode: '/explain',
  fixCode: '/fix',
  generateTests: '/tests',
  refactorCode: '/refactor',
  newConversation: '/reset',
} as const;

export const validPromptTypes: PromptType[] = [
  'explainCode',
  'generateTests',
  'refactorCode',
  'newConversation',
  'fixCode',
] as const;
