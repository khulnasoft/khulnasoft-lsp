import { DefaultDuoApiProjectAccessCache } from './api_project_access_cache';
import { DefaultDuoFeatureAccessService } from './duo_feature_access_service';
import { DefaultDuoProjectAccessChecker } from './project_access_checker';
import { DefaultDuoWorkspaceProjectAccessCache } from './workspace_project_access_cache';

export const duoAccessContributions = [
  DefaultDuoProjectAccessChecker,
  DefaultDuoWorkspaceProjectAccessCache,
  DefaultDuoApiProjectAccessCache,
  DefaultDuoFeatureAccessService,
] as const;
