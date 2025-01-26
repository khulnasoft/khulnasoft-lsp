import { createInterfaceId, Injectable } from '@khulnasoft/di';
import { broadcastKeyboardEventsScript } from './broadcast_keyboard_events_script';
import { execCommandScript } from './exec_command_script';

export interface WebviewHtmlTransformer {
  transformHtml(html: string): string;
}

export const WebviewHtmlTransformer =
  createInterfaceId<WebviewHtmlTransformer>('WebviewHtmlTransformer');

@Injectable(WebviewHtmlTransformer, [])
export class DefaultWebviewHtmlTransformer {
  transformHtml(html: string): string {
    return html
      .replace('</body>', `${broadcastKeyboardEventsScript}</body>`)
      .replace('</body>', `${execCommandScript}</body>`);
  }
}
