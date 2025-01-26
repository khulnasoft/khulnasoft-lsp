import type { FibonacciSolver } from './types';

export class SimpleFibonacciSolver implements FibonacciSolver {
  solve(index: number): number {
    if (index <= 1) return index;
    return this.solve(index - 1) + this.solve(index - 2);
  }
}
