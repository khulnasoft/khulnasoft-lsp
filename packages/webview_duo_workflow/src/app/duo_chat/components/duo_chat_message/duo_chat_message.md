# Duo Chat Message

The component represents a Duo Chat message.

## Usage

```html
<gl-duo-chat-message :message="message" />
```

## Pretty rendering message content

There are two ways of pretty-rendering a message's content in the component:

- dependency injection, providing functions to convert raw Markdown into HTML,
- sending `contentHtml` prop as part of the `message` property

The component ships a default Markdown renderer based on `marked`. It should produce
reasonably well-looking results while streaming messages. The implementation can be found
[here](https://gitlab.com/gitlab-org/gitlab-ui/-/blob/main/src/components/experimental/duo/chat/markdown_renderer.js).

### Injecting functions

To inject the `renderMarkdown` function, which converts raw Markdown into proper HTML,
the component relies on [dependency injection, using `provide`/`inject` options](https://docs.khulnasoft.com/ee/development/fe_guide/vue.html#provide-and-inject).
The component expects a reference to a function, converting raw Markdown into HTML
to be _provided_ by a consumer.
[The example implementation](https://gitlab.com/gitlab-org/gitlab/-/blob/master/app/assets/javascripts/notes/utils.js#L22-24)

### `contentHtml`

This approach is self-explanatory and is used when raw Markdown can be converted to HTML on the server
before the message is returned to the client. Here's an example of a message's structure where Markdown
has been generated on the server and sent down in the `contentHtml` property:

```javascript
{
  content: '_Duo Chat message_ coming from AI',
  contentHtml: '<p><em>Duo Chat message</em> coming from AI</p>',
  role: 'assistant',
  ...
}
```

## KhulnaSoft Flavored Markdown (GLFM)

In most cases, it's not enough to just convert raw Markdown into HTML. Messages also require the
markup to support [KhulnaSoft Flavored Markdown (GLFM)](https://docs.khulnasoft.com/ee/user/markdown.html).
For this, the component relies on another dependency injection (in addition to `renderMarkdown`)
expecting a reference to the `renderGFM` function, decorating an HTML element with GLFM to be
_provided_ by a consumer.
[The example implementation](https://gitlab.com/gitlab-org/gitlab/-/blob/master/app/assets/javascripts/behaviors/markdown/render_gfm.js#L19-52)

## The underlying use of the `GlDuoUserFeedback` component

The component integrates the [`GlDuoUserFeedback`](/story/experimental-duo-user-feedback--default)
component to track user feedback on the AI-generated responses. Note that the `GlDuoChatMessage`
component renders the default state of `GlDuoUserFeedback` component, not allowing to override
the slots in that underlying component.

### Tracking User Feedback for a response

The component emits the `track-feedback` event, a proxy of the `feedback` event emitted by
the `GlDuoUserFeedback` component. Please refer to
[the documentation on that component](/story/experimental-duo-user-feedback--docs#listening-to-the-feedback-form-submission)
when processing feedback from users.

## Included context references

Messages will display any included context references (files, issues merge requests etc.) when
the message `meta.contextItems` array contains valid items.
