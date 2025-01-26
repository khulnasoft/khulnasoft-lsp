import { SimpleFibonacciSolver } from '@khulnasoft-lsp/pkg-1';
import { FastFibonacciSolver } from '@khulnasoft-lsp/pkg-2';
import { resolveMessageBus } from '@khulnasoft/webview-client';
import { chatWebviewPlugin } from '../plugin/index';

resolveMessageBus({
  webviewId: chatWebviewPlugin.id,
});

const simpleSolver = new SimpleFibonacciSolver();
const fastSolver = new FastFibonacciSolver();

const inputBox = document.createElement('input');
inputBox.type = 'number';
inputBox.placeholder = 'Enter a number';

const button = document.createElement('button');
button.textContent = 'Calculate';

button.addEventListener('click', () => {
  const input = parseInt(inputBox.value, 10);
  // eslint-disable-next-line no-restricted-globals
  if (isNaN(input)) {
    // eslint-disable-next-line no-alert
    alert('Please enter a valid number');
  } else {
    testSolvers(input);
  }
});

const solvers = [
  { name: 'Simple solver', solver: simpleSolver },
  { name: 'Fast solver', solver: fastSolver },
];

// write method that tests both solvers and alerts the results
function testSolvers(index: number) {
  const results = solvers.map(({ name, solver }) => {
    const start = performance.now();
    const result = solver.solve(index);
    const duration = performance.now() - start;
    return { name, result, duration };
  });

  results.forEach(({ name, result, duration }) => {
    // eslint-disable-next-line no-alert
    alert(`${name}: Fibonacci of ${index} is ${result} (calculated in ${duration.toFixed(2)} ms)`);
  });
}

document.body.appendChild(inputBox);
document.body.appendChild(button);
