import { setStoryTimeout } from '../../../../utils/test_utils';
import {
  DOCUMENTATION_SOURCE_TYPES,
  MESSAGE_MODEL_ROLES,
  CHAT_CLEAR_MESSAGE,
  CHAT_RESET_MESSAGE,
  CHAT_INCLUDE_MESSAGE,
} from './constants';
import { getMockContextItems } from './components/duo_chat_context/mock_context_data';

const MOCK_SOURCES = [
  {
    title: 'KhulnaSoft Handbook',
    source_type: DOCUMENTATION_SOURCE_TYPES.HANDBOOK.value,
    source_url: '/handbook/',
  },
  {
    stage: 'Mock Stage',
    group: 'Mock Group',
    source_type: DOCUMENTATION_SOURCE_TYPES.DOC.value,
    source_url: '/company/team/',
  },
  {
    date: '2023-04-21',
    author: 'Test User',
    source_type: DOCUMENTATION_SOURCE_TYPES.BLOG.value,
    source_url: '/blog/',
  },
];

export const MOCK_RESPONSE_MESSAGE = {
  id: '123',
  content:
    'Here is a simple JavaScript function to sum two numbers:\n\n  ```js\n  function sum(a, b) {\n    return a + b;\n  }\n  ```\n  \n  To use it:\n  \n  ```js\n  const result = sum(5, 3); // result = 8\n  ```\n  \n  This function takes two number parameters, a and b. It returns the sum of adding them together.\n',
  contentHtml:
    '<p data-sourcepos="1:1-1:56" dir="auto">Here is a simple JavaScript function to sum two numbers:</p>\n<div class="gl-relative markdown-code-block js-markdown-code">\n<pre data-sourcepos="3:1-7:3" data-canonical-lang="js" class="code highlight js-syntax-highlight language-javascript" lang="javascript" v-pre="true"><code><span id="LC1" class="line" lang="javascript"><span class="kd">function</span> <span class="nf">sum</span><span class="p">(</span><span class="nx">a</span><span class="p">,</span> <span class="nx">b</span><span class="p">)</span> <span class="p">{</span></span>\n<span id="LC2" class="line" lang="javascript">  <span class="k">return</span> <span class="nx">a</span> <span class="o">+</span> <span class="nx">b</span><span class="p">;</span></span>\n<span id="LC3" class="line" lang="javascript"><span class="p">}</span></span></code></pre>\n<copy-code></copy-code>\n<insert-code-snippet></insert-code-snippet>\n</div>\n<p data-sourcepos="9:1-9:10" dir="auto">To use it:</p>\n<div class="gl-relative markdown-code-block js-markdown-code">\n<pre data-sourcepos="11:1-13:3" data-canonical-lang="js" class="code highlight js-syntax-highlight language-javascript" lang="javascript" v-pre="true"><code><span id="LC1" class="line" lang="javascript"><span class="kd">const</span> <span class="nx">result</span> <span class="o">=</span> <span class="nf">sum</span><span class="p">(</span><span class="mi">5</span><span class="p">,</span> <span class="mi">3</span><span class="p">);</span> <span class="c1">// result = 8</span></span></code></pre>\n<copy-code></copy-code>\n</div>\n<p data-sourcepos="15:1-15:95" dir="auto">This function takes two number parameters, a and b. It returns the sum of adding them together.</p>',
  role: MESSAGE_MODEL_ROLES.assistant,
  extras: {
    sources: MOCK_SOURCES,
    contextItems: getMockContextItems().slice(0, 2),
  },
  requestId: '987',
  errors: [],
  timestamp: '2021-04-21T12:00:00.000Z',
};

export const generateSeparateChunks = (n) => {
  const res = [];
  for (let i = 1; i <= n; i += 1) {
    res.push({
      chunkId: i,
      content: `chunk #${i}`,
      role: MESSAGE_MODEL_ROLES.assistant,
      requestId: '987',
      errors: [],
      timestamp: '2021-04-21T12:00:00.000Z',
    });
  }
  return res;
};

export const MOCK_RESPONSE_MESSAGE_FOR_STREAMING = {
  id: '123',
  content: `To change your password in KhulnaSoft:

  1. Log in to your KhulnaSoft account.
  2. Select your avatar in the top right corner and choose Edit profile.
  3. On the left sidebar, select Password.
  4. Enter your current password in the Current password field.
  5. Enter your new password in the New password and Password confirmation fields.
  6. Select Save password.
  7. If you don't know your current password, select the I forgot my password link to reset it.

  KhulnaSoft enforces password requirements when you choose a new password.

  ~~~yaml
  # And here is a
  # code block
  everyone:
    likes:
      yaml: true
  ~~~
  which is rendered while streaming.
  `,
  role: 'assistant',
  extras: {
    contextItems: getMockContextItems().slice(0, 2),
  },
  requestId: '987',
  errors: [],
  timestamp: '2021-04-21T12:00:00.000Z',
};

// Utility function for delay
async function delayRandom(min = 16, max = 267) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  // eslint-disable-next-line no-promise-executor-return
  return new Promise((resolve) => setStoryTimeout(resolve, delay));
}

export async function* generateMockResponseChunks(requestId = 1) {
  const chunkSize = 5;
  const contentLength = MOCK_RESPONSE_MESSAGE_FOR_STREAMING.content.length;
  const chunkCount = Math.ceil(contentLength / chunkSize);

  for (let chunkId = 0; chunkId < chunkCount; chunkId += 1) {
    const start = chunkId * chunkSize;
    const end = Math.min((chunkId + 1) * chunkSize, contentLength);
    const chunk = {
      ...MOCK_RESPONSE_MESSAGE_FOR_STREAMING,
      requestId,
      content: MOCK_RESPONSE_MESSAGE_FOR_STREAMING.content.substring(start, end),
      chunkId: chunkId + 1,
    };

    // eslint-disable-next-line no-await-in-loop
    await delayRandom();
    yield chunk;
  }
  yield {
    ...MOCK_RESPONSE_MESSAGE_FOR_STREAMING,
    requestId,
    content: MOCK_RESPONSE_MESSAGE_FOR_STREAMING.content,
    chunkId: null,
  };
}

export const MOCK_USER_PROMPT_MESSAGE = {
  id: '456',
  chunkId: null,
  content: 'How to create a new template?',
  contentHtml: '<p>How to create a new template?</p>',
  role: MESSAGE_MODEL_ROLES.user,
  requestId: '987',
  errors: [],
  timestamp: '2021-04-21T12:00:00.000Z',
  extras: {
    contextItems: getMockContextItems().slice(0, 2),
  },
};

export const renderMarkdown = (content) => content;
export const renderGFM = (el) => {
  const codeBlock = el.querySelectorAll('.markdown-code-block');
  codeBlock.forEach((block) => {
    block?.classList.add('gl-markdown', 'gl-compact-markdown');
  });
};

export const SLASH_COMMANDS = [
  {
    name: CHAT_RESET_MESSAGE,
    shouldSubmit: true,
    description: 'Reset conversation, ignore the previous messages.',
  },
  {
    name: CHAT_CLEAR_MESSAGE,
    shouldSubmit: true,
    description: 'Delete all messages in this conversation.',
  },
  {
    name: '/tests',
    description: 'Write tests for the selected snippet.',
  },
  {
    name: '/refactor',
    description: 'Refactor the selected snippet.',
  },
  {
    name: '/explain',
    description: 'Explain the selected snippet.',
  },
];

export const INCLUDE_SLASH_COMMAND = {
  name: CHAT_INCLUDE_MESSAGE,
  description: 'Include additional context in the conversation.',
};
