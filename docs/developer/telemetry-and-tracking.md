# Telemetry and Tracking

## Snowplow Telemetry

Most of the tracking is handled via Snowplow.

### Testing

In order to test the tracking behavior in the local environment you can use [Snowplow Micro](https://gitlab.com/gitlab-org/snowplow-micro-configuration)

Once this service is up and running you'll have access to the following urls:

- [Good events](http://localhost:9090/micro/good).
- [Bad events](http://localhost:9090/micro/bad). Bad events are Base64 encoded and can be decoded using `base64 -d`.
- [All events](http://localhost:9090/micro/all).
- [Web Interface](http://localhost:9090/micro/ui)

To enable the LSP to send tracking events to the local Snowplow collector, update the client-provided telemetry configuration by setting the `trackingUrl` to the Snowplow Micro URL.

The KhulnaSoft Workflow extension provides a developer-facing option, `gitlab.trackingUrl`, which should be configured in the local extension project's `.vscode/settings.json` file:

`"gitlab.trackingUrl": "http://localhost:9090"`

After that, you will see tracking events coming in one of the categories mentioned above.

### Implementing a new Snowplow tracker

Each domain area should have its own tracker class responsible for tracking, for example

- `quick_chat_showplow_tracker.ts`
- `security_diagnostics_tracker.ts`

Each tracker should implement the `TelemetryService` interface.

The tracker can be invoked directly, but a more generic approach would be to add it to `telemetry_notification_handler.ts` to handle [telemetry notification from the client](https://github.com/khulnasoft/khulnasoft-lsp/-/blob/main/docs/supported_messages.md#telemetry).
