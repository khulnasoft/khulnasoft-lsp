import { z } from 'zod';

/**
 * ==========================
 * Send Message Schemas
 * ==========================
 */

export const MessageType = z.enum(['error', 'warning', 'info', 'success']);
export type MessageType = z.infer<typeof MessageType>;

export const SendMessageParams = z.object({
  type: MessageType,
  message: z.string(),
});
export type SendMessageParams = z.infer<typeof SendMessageParams>;

/**
 * ==========================
 * Get File Context Schemas
 * ==========================
 */

export const GetFileContextParams = z.undefined();
export type GetFileContextParams = z.infer<typeof GetFileContextParams>;

export const GetFileContextResponse = z.object({
  fileName: z.string(),
  selectedText: z.string(),
  contentAboveCursor: z.string().nullable(),
  contentBelowCursor: z.string().nullable(),
});
export type GetFileContextResponse = z.infer<typeof GetFileContextResponse>;

/**
 * ==========================
 * Insert Code Snippet Schemas
 * ==========================
 */

export const InsertCodeSnippetParams = z.object({
  snippet: z.string(),
});
export type InsertCodeSnippetParams = z.infer<typeof InsertCodeSnippetParams>;
