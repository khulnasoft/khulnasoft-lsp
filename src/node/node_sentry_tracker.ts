import * as Sentry from '@sentry/node';
import { Injectable } from '@khulnasoft/di';
import { ConfigService } from '../common';
import { getLanguageServerVersion } from '../common/utils/get_language_server_version';
import { ErrorTracker } from '../common/tracking/error_tracker';
import { SanitizedError } from '../common/errors/sanitized_error';
import { SystemContext } from '../common/request_context/system_context';

@Injectable(ErrorTracker, [ConfigService, SystemContext])
export class NodeSentryTracker {
  #configService: ConfigService;

  #systemContext: SystemContext;

  constructor(configService: ConfigService, systemContext: SystemContext) {
    this.#configService = configService;
    this.#systemContext = systemContext;

    Sentry.init({
      dsn: 'https://e91efe8a2479ca2e503712398b6503ee@new-sentry.gitlab.net/34',
      tracesSampleRate: 1.0,
      environment: process.env.NODE_ENV,
      release: getLanguageServerVersion(),
      beforeSend: (event) => {
        return this.#isTracked(event) ? this.#prepareTrackedEvent(event) : null;
      },
      integrations: [Sentry.rewriteFramesIntegration()],
      // no breadcrumbs until we have advanced scrubbing in place to prevent private information from leaking
      maxBreadcrumbs: 0,
    });
  }

  isEnabled(): boolean {
    const enabledSetting = this.#configService.get('client.telemetry.enabled');
    return enabledSetting ?? false;
  }

  trackError(e: SanitizedError): void {
    if (!this.isEnabled()) return;
    Sentry.setContext('client', {
      ide: this.#systemContext.ide,
      extension: this.#systemContext.extension,
    });
    // To track handled errors only to Sentry
    Sentry.setExtra('tracked', true);
    Sentry.captureException({ message: e.message });
  }

  #prepareTrackedEvent(event: Sentry.ErrorEvent) {
    const updatedEvent = { ...event };

    delete updatedEvent.extra?.tracked;

    // remove private information
    if (updatedEvent.server_name) {
      delete updatedEvent.server_name;
    }
    if (updatedEvent.contexts?.culture) {
      delete updatedEvent.contexts.culture;
    }
    if (updatedEvent.contexts?.device) {
      delete updatedEvent.contexts?.device;
    }
    if (updatedEvent.contexts?.app) {
      delete updatedEvent.contexts?.app;
    }
    return updatedEvent;
  }

  #isTracked(event: Sentry.ErrorEvent) {
    return Boolean(event.extra?.tracked);
  }
}
