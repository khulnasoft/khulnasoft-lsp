# Duo Chat Conversation

A component that lists messages in a conversation, and presents an optional delimiter to
mark the beginning of the conversation.

## Usage

```html
<gl-duo-chat-conversation :messages="messages" :show-delimeter="showDelimiter" />
```

Translations for newChatLabel can be set via the props as documented or via translation configuration:

```js
setConfigs({
  translations: {
    'GlDuoWorkflowPrompt.newChat': __('New chat'),
  },
});
```
