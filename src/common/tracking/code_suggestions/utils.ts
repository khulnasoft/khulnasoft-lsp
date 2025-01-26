import { v4 as uuidv4 } from 'uuid';
import { CODE_SUGGESTIONS_TRACKING_EVENTS } from './constants';

export const canClientTrackEvent = (
  actions: Array<{ action: CODE_SUGGESTIONS_TRACKING_EVENTS }> = [],
  event: CODE_SUGGESTIONS_TRACKING_EVENTS,
) => {
  return actions.some(({ action }) => action === event);
};

export const generateUniqueTrackingId = (): string => {
  return uuidv4();
};
