import { SimpleFibonacciSolver } from './simple_fibonacci_solver';

describe('SimpleFibonacciSolver', () => {
  let solver: SimpleFibonacciSolver;

  beforeEach(() => {
    solver = new SimpleFibonacciSolver();
  });

  it('should return the correct Fibonacci number for n=0', () => {
    expect(solver.solve(0)).toBe(0);
  });

  it('should return the correct Fibonacci number for n=1', () => {
    expect(solver.solve(1)).toBe(1);
  });

  it('should return the correct Fibonacci number for n=5', () => {
    expect(solver.solve(5)).toBe(5);
  });

  it('should return the correct Fibonacci number for n=10', () => {
    expect(solver.solve(10)).toBe(55);
  });
});
