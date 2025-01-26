import { KhulnaSoftAPI } from './api';
import { ProxyKhulnaSoftApiService } from './gitlab_api_service';
import { DefaultFeatureFlagService } from './feature_flags';
import { featureStateContributions } from './feature_state/contributions';
import { DefaultErrorHandler } from './errors/error_handler';
import { aiContextManagementContributions } from './ai_context_management/contributions';
import { DefaultOpenTabsService } from './open_tabs/open_tabs_service';
import { DefaultDocumentTransformerService } from './document_transformer_service';
import { DefaultSecretRedactor } from './secret_redaction';
import { DefaultIssueService, DefaultMergeRequestService } from './services/gitlab';
import { DefaultPostProcessorPipeline } from './suggestion_client/post_processors/default_post_processor_pipeline';
import { DefaultUserService } from './core/services/user_service';
import { duoAccessContributions } from './services/duo_access/contributions';
import { DefaultSystemContext } from './request_context/system_context';
import { DefaultAuthContext } from './request_context/auth_context';
import { telemetryContributions } from './tracking/contributions';
import { configurationValidationContributions } from './configuration_validation/contributions';
import { DefaultLogger } from './log';
import { connectionHandlersContributions } from './core/handlers/contributions';
import { DefaultDidChangeConfigurationHandler } from './core/handlers/did_change_configuration_handler';
import { DefaultConfigService } from './config_service';
import { DefaultSupportedLanguagesService } from './suggestion/supported_languages_service';
import { DefaultWorkflowHandler } from './workflow_handler';

export const commonContributions = [
  ...featureStateContributions,
  ...aiContextManagementContributions,
  ...duoAccessContributions,
  ...telemetryContributions,
  ...configurationValidationContributions,
  ...connectionHandlersContributions,
  DefaultLogger,
  DefaultConfigService,
  DefaultSupportedLanguagesService,
  KhulnaSoftAPI,
  ProxyKhulnaSoftApiService,
  DefaultFeatureFlagService,
  DefaultErrorHandler,
  DefaultOpenTabsService,
  DefaultDocumentTransformerService,
  DefaultSecretRedactor,
  DefaultPostProcessorPipeline,
  DefaultUserService,
  DefaultIssueService,
  DefaultMergeRequestService,
  DefaultSystemContext,
  DefaultAuthContext,
  DefaultDidChangeConfigurationHandler,
  DefaultWorkflowHandler,
] as const;
