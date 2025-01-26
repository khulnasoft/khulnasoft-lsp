import { FastFibonacciSolver, NegativeIndexError } from './fast_fibonacci_solver';

describe('FastFibonacciSolver', () => {
  let solver: FastFibonacciSolver;

  beforeEach(() => {
    solver = new FastFibonacciSolver();
  });

  test('should return 0 for index 0', () => {
    expect(solver.solve(0)).toBe(0);
  });

  test('should return 1 for index 1', () => {
    expect(solver.solve(1)).toBe(1);
  });

  test('should return 1 for index 2', () => {
    expect(solver.solve(2)).toBe(1);
  });

  test('should return 2 for index 3', () => {
    expect(solver.solve(3)).toBe(2);
  });

  test('should return 3 for index 4', () => {
    expect(solver.solve(4)).toBe(3);
  });

  test('should return 5 for index 5', () => {
    expect(solver.solve(5)).toBe(5);
  });

  test('should return 8 for index 6', () => {
    expect(solver.solve(6)).toBe(8);
  });

  test('should return 13 for index 7', () => {
    expect(solver.solve(7)).toBe(13);
  });

  test('should handle large indices correctly', () => {
    expect(solver.solve(50)).toBe(12586269025);
  });

  test('should throw an error for negative indices', () => {
    expect(() => solver.solve(-1)).toThrow(NegativeIndexError);
  });
});
