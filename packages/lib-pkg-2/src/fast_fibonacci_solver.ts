import type { FibonacciSolver } from '@khulnasoft-lsp/pkg-1';

export const NegativeIndexError = new Error('Index must be non-negative');

export class FastFibonacciSolver implements FibonacciSolver {
  #memo: Map<number, number> = new Map();

  #lastComputedIndex: number = 1;

  constructor() {
    this.#memo.set(0, 0);
    this.#memo.set(1, 1);
  }

  solve(index: number): number {
    if (index < 0) {
      throw NegativeIndexError;
    }

    if (this.#memo.has(index)) {
      return this.#memo.get(index) as number;
    }

    let a = this.#memo.get(this.#lastComputedIndex - 1) as number;
    let b = this.#memo.get(this.#lastComputedIndex) as number;

    for (let i = this.#lastComputedIndex + 1; i <= index; i++) {
      const nextValue = a + b;
      a = b;
      b = nextValue;
      this.#memo.set(i, nextValue);
    }

    this.#lastComputedIndex = index;
    return this.#memo.get(index) as number;
  }
}
