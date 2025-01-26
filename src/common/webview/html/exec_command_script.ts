export const execCommandScript = `
<script>

  window.addEventListener('message', (e) => {
    if (e.data.command === 'execCommand') {
      document.execCommand(e.data.data);
    }
  });

</script>
`;
