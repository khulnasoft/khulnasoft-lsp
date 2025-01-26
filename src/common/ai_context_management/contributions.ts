import { DefaultAIContextManager } from './ai_context_manager';
import { DefaultAiContextTransformerService } from './context_transformers/ai_context_transformer_service';
import { DefaultSecretContextTransformer } from './context_transformers/ai_context_secret_transformer';
import { DefaultBinaryFileTransformer } from './context_transformers/ai_context_binary_file_transformer';
import { DefaultFilePolicyProvider } from './context_policies/file_policy';
import { DefaultDependencyScanner } from './context_providers/depdendency_scanner/scanner';
import { DefaultDependencyContextProvider } from './context_providers/dependencies';
import { DefaultLocalFileContextProvider } from './context_providers/file_local_search';
import { DefaultOpenTabContextProvider } from './context_providers/open_tabs/open_tabs_provider';
import { DefaultIssueContextProvider } from './context_providers/issue';
import { DefaultLocalGitContextProvider } from './context_providers/local_git_context_provider';
import { DefaultMergeRequestContextProvider } from './context_providers/merge_request';

export const aiContextManagementContributions = [
  DefaultSecretContextTransformer,
  DefaultBinaryFileTransformer,
  DefaultAiContextTransformerService,
  DefaultAIContextManager,
  DefaultOpenTabContextProvider,
  DefaultFilePolicyProvider,
  DefaultLocalFileContextProvider,
  DefaultIssueContextProvider,
  DefaultMergeRequestContextProvider,
  DefaultDependencyContextProvider,
  DefaultDependencyScanner,
  DefaultLocalGitContextProvider,
] as const;
