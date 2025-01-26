import { Disposable } from '@khulnasoft/disposable';
import { ClientConfig } from '../config_service';
import {
  StateCheckId,
  StateCheckContext,
  FeatureStateCheck,
} from './feature_state_management_types';

export interface StateCheckChangedEventData {
  checkId: StateCheckId;
  engaged: boolean;
  details?: string;
}

export interface StateCheck<T extends StateCheckId> {
  id: T;
  engaged: boolean;
  init?: () => Promise<void>;
  /** registers a listener that's called when the policy changes */
  onChanged: (listener: (data: StateCheckChangedEventData) => void) => Disposable;
  details?: string;
  context?: StateCheckContext<T>;
}

export interface StateConfigCheck {
  validate(config: ClientConfig): Promise<FeatureStateCheck<StateCheckId> | undefined>;
}
