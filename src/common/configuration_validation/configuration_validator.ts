import { ClientConfig } from '../config_service';
import { Feature, FeatureState } from '../feature_state';

export interface ConfigurationValidator {
  feature: Feature;
  validate(config: ClientConfig): Promise<FeatureState>;
}
