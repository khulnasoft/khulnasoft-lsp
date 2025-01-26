import { DefaultSnowplowService } from './snowplow/snowplow_service';
import { DefaultCodeSuggestionsSnowplowTracker } from './code_suggestions/code_suggestions_snowplow_tracker';
import { DefaultCodeSuggestionsMultiTracker } from './code_suggestions/code_suggestions_multi_tracker';
import { DefaultCodeSuggestionsInstanceTracker } from './code_suggestions/code_suggestions_instance_tracker';
import { DefaulQuickChatSnowplowTracker } from './quick_chat/quick_chat_snowplow_tracker';
import { DefaultStandardContext } from './snowplow/standard_context';
import { DefaultSecurityDiagnosticsTracker } from './security_scan/security_diagnostics_tracker';

export const telemetryContributions = [
  DefaultSnowplowService,
  DefaultCodeSuggestionsMultiTracker,
  DefaultCodeSuggestionsSnowplowTracker,
  DefaultCodeSuggestionsInstanceTracker,
  DefaulQuickChatSnowplowTracker,
  DefaultStandardContext,
  DefaultSecurityDiagnosticsTracker,
] as const;
