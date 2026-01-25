interface CustomMatchers<R = unknown> {
  /**
   * Verifies that each segment in the chain was called exactly n times.
   *
   * @example
   * ```ts
   * expect(chain.select.from.where).toHaveBeenChainCalled(2);
   * ```
   */
  toHaveBeenChainCalled(expected: number): R;

  /**
   * Verifies that each segment in the chain was called exactly once.
   *
   * @example
   * ```ts
   * expect(chain.select.from.where).toHaveBeenChainCalledOnce();
   * ```
   */
  toHaveBeenChainCalledOnce(): R;

  /**
   * Verifies that the last call to each segment had the corresponding arguments.
   *
   * @example
   * ```ts
   * expect(chain.select.from.where).toHaveBeenChainCalledWith(
   *   ['id'],
   *   ['users'],
   *   ['active']
   * );
   * ```
   */
  toHaveBeenChainCalledWith(...argsPerSegment: any[]): R;

  /**
   * Verifies that the Nth call to each segment had the corresponding arguments.
   *
   * @example
   * ```ts
   * expect(chain.select.from.where).toHaveBeenNthChainCalledWith(
   *   2,
   *   ['name'],
   *   ['posts'],
   *   ['published']
   * );
   * ```
   */
  toHaveBeenNthChainCalledWith(n: number, ...argsPerSegment: any[]): R;

  /**
   * Verifies that the last call to each segment had the corresponding arguments.
   * Alias for toHaveBeenChainCalledWith.
   *
   * @example
   * ```ts
   * expect(chain.select.from.where).toHaveBeenLastChainCalledWith(
   *   ['id'],
   *   ['users'],
   *   ['active']
   * );
   * ```
   */
  toHaveBeenLastChainCalledWith(...argsPerSegment: any[]): R;
}

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

export {};
