import { createButton } from './buttons_utils';

export class CopyCodeElement extends HTMLElement {
  constructor() {
    super();
    const btn = createButton('Copy to clipboard', 'copy-to-clipboard');
    const wrapper = this.parentNode;

    this.appendChild(btn);
    btn.addEventListener('click', async () => {
      const textToCopy = wrapper.innerText;
      await navigator.clipboard.writeText(textToCopy);
    });
  }
}
