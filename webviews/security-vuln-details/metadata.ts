import { WebviewId } from '@khulnasoft/webview-plugin';
import { CreateMessageMap } from '@khulnasoft/message-bus';

export type Vulnerability = {
  name: string;
  description: string;
  severity: string;
  location: {
    start_line: number;
    end_line: number;
    start_column: number;
    end_column: number;
  };
};

export type VulnerabilityDetailsWebviewMessages = CreateMessageMap<{
  inbound: {
    notifications: {
      updateDetails: {
        vulnerability: Vulnerability;
        filePath: string;
        timestamp: string;
      };
    };
  };
  outbound: {
    notifications: {
      openLink: {
        href: string;
      };
    };
  };
}>;

export const VULN_DETAILS_WEBVIEW_ID = 'security-vuln-details' as WebviewId;
