export const broadcastKeyboardEventsScript = `
<script>
  const KEYBOARD_EVENT_COMMAND = 'kbd-event';

  (() => {
    if (window.parent === window) {
      return;
    }

    document.addEventListener('keydown', (e) => {
      const data = {
        altKey: e.altKey,
        code: e.code,
        ctrlKey: e.ctrlKey,
        isComposing: e.isComposing,
        key: e.key,
        location: e.location,
        metaKey: e.metaKey,
        repeat: e.repeat,
        shiftKey: e.shiftKey,
      };

      try {
        window.parent.postMessage({
          command: KEYBOARD_EVENT_COMMAND,
          data,
        }, '*');
      } catch (err) {
        // noop
      }
    });
  })();
</script>
`;
