# Duo Chat

The component represents the complete Duo Chat feature.

The component provides a configurable chat UI interface. The primary use is communication with
KhulnaSoft Duo, however, the component is BE-agnostic and can accept information from any source.

## Usage

To use the component in its simplest form, import it and add it to the `template` part of your
consumer component.

```html
<gl-duo-chat
  :title="title"
  :messages="messages"
  :error="error"
  :is-loading="isLoading"
  :is-chat-available="isChatAvailable"
  :predefined-prompts="predefinedPrompts"
  :badge-help-page-url="badgeHelpPageUrl"
  :canceled-request-ids="cancelledRequestIds"
  :tool-name="toolName"
  :empty-state-title="emptyStateTitle"
  :empty-state-description="emptyStateDescription"
  :chat-prompt-placeholder="chatPromptPlaceholder"
  :slash-commands="slashCommands"
  @chat-hidden="onChatHidden"
  @send-chat-prompt="onSendChatPrompt"
  @track-feedback="onTrackFeedback"
/>
```

## Integration

To demonstrate how to connect this component to a backend implementation, let's consider its use
for KhulnaSoft Duo. First, some general notes on the best practices and expectations when using this
component.

### Expected dependency injection

To be universal, the component delegates some of its responsibilities to the consumer component.

The component expects two function props:

- `renderMarkdown`
- `renderGFM`

#### `renderMarkdown`

This function prop converts plain Markdown text into HTML markup. To have a better understanding
of what is expected from this function, take a look at
[the existing KhulnaSoft example](https://gitlab.com/gitlab-org/gitlab/-/blob/774ecc1f2b15a581e8eab6441de33585c9691c82/app/assets/javascripts/notes/utils.js#L22-24).

#### `renderGFM`

This function prop extends the standard Markdown rendering with support for the
[KhulnaSoft Flavored Markdown (GLFM)](https://docs.khulnasoft.com/ee/user/markdown.html). To
have a better understanding of what is expected from this function, take a look at
[the existing KhulnaSoft example](https://gitlab.com/gitlab-org/gitlab/-/blob/774ecc1f2b15a581e8eab6441de33585c9691c82/app/assets/javascripts/behaviors/markdown/render_gfm.js#L18-40).

The reason to have two different functions for rendering Markdown is performance. `renderGFM`
operates on a DOM node and might come with many additional mutations for the node's content.
Such behavior suits a one-time update. However, Duo Chat also supports streaming of the AI
responses (check the [Interactive story for this component](?path=/story/experimental-duo-chat-duo-chat--interactive))
and, in this case, when the message is constantly updating, we rely on a more lightweight
`renderMarkdown` to render the updated message faster.

### Don't use reactivity where unnecessary

The `GlDuoChat` component exposes many properties, as seen below. But not all of those should
be necessarily reactive in the consumer component. The properties that might be static:

- `title`. The title is shown in the head of the component.
- `isChatAvailable`. The flag indicates whether the communication interface should allow follow-up
  questions. Usually, this decision stays the same during the component's lifecycle.
- `predefinedPrompts`. The `Array` of strings that represents the possible questions to ask when
  there are no messages in the chat.
- `badgeHelpPageUrl`. The link to an external page explaining the meaning of an "experiment".
  The prop is passed down to the [`GlExperimentBadge` component](?path=/docs/experimental-experiment-badge--docs).
- `emptyStateTitle`. Title of the empty state component. Visible when there are no messages.
- `emptyStateDescription`. Description text of the empty state component. Visible when there are no messages.
- `chatPromptPlaceholder`. Placeholder text for the chat prompt input.

### Set up communication with consumer

```javascript
import { GlDuoChat } from '@khulnasoft/ui';

export default {
  ...
  data() {
    return {
      messages: [],
      error: null,
      isLoading: false,
      toolName: '',
      cancelledRequestIds: []
    }
  },
  provide: {
    renderMarkdown: (content) => {
      // implementation of the `renderMarkdown` functionality
    },
    renderGFM: (el) => {
      // implementation of the `renderGFM` functionality
    },
  },
  beforeCreate() {
    // Here, we set up our non-reactive properties if we must change the default values
    this.title = 'Foo Bar';
    this.isChatAvailable = true; // this is just an example. `true` is the default value
    this.predefinedPrompts = ['How to …?', 'Where do I …?'];
    this.badgeHelpPageUrl = 'https://dev.null';
    this.emptyStateTitle = 'Ask anything';
    this.emptyStateDescription = 'You will see the answers below';
    this.chatPromptPlaceholder = 'Type your question here';
  }
  methods: {
    onChatCancel() {
       // pushing last requestId of messages to canceled Request Ids
      this.cancelledRequestIds.push(this.messages[this.messages.length - 1].requestId);
      this.isLoading = false;
    },
    onChatHidden() {
      ...
    },
    onSendChatPrompt(prompt = '') {
      this.isLoading = true;
      this.messages.push(constructUserMessage(prompt));
      ...
    },
    onTrackFeedback(feedbackObj = {}) {
      ...
    },
    onAiResponse(data) {
      // check if requestId was not cancelled
      if (requestId && !this.cancelledRequestIds.includes(data.requestId)) {
        this.messages = data
      }
      …
      this.isLoading = false;
    },
    onAiResponseError(error) {
      this.error = error;
      this.isLoading = false;
    },
    onToolNameChange(toolMessage) {
      this.toolName = toolMessage.content;
    }
  }
}
```

With this template in place, consumer is left with the following things to implement:

- Fetch `messages`. For Duo Chat, we rely on GraphQL query to get the cached
  messages and subscription to monitor new messages when:

  - streaming response
  - listening to chat messages in other tabs/environments
  - listen to updates from different tools to update `toolName`

- Send the new user's prompt. For Duo Chat, we rely on GraphQL mutation for this purpose.
- Send user feedback to the telemetry of your choice when `track-feedback` event arrives.

## Slash commands

One of the props accepted by the component is the `slashCommands`. This is an `Array` of
the commands, shown to user when they start typing the prompt with a slash (`/`)
character.

```javascript
<script>
  const slashCommands = [
    {
      name: '/mycommand', // This is the exact name of my command as it will be submitted
      shouldSubmit: true, // If the command should be submitted right away without free text
      description: 'The description of my super-duper command.',
    },
    ...
  ];
  export default {
    ...
    options: {
      slashCommands
    }
  }
<script>
<template>
  <gl-duo-chat
    ...
    :slash-commands="slashCommands"
  />
</template>
```
