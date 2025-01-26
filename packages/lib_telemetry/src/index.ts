export interface TelemetryService<TEvent, TEventContext, TTrackingContext> {
  trackEvent(event: TEvent, context?: TEventContext): void;
  setTrackingContext?(context: TTrackingContext): void;
  isEnabled(): boolean;
}
