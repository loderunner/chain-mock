interface ChainMatchers<R = unknown> {
  /**
   * Verifies that each segment in the chain was called at least once.
   *
   * @example
   * ```ts
   * expect(chain.select.from.where).toHaveBeenChainCalled();
   * ```
   */
  toHaveBeenChainCalled(): R;

  /**
   * Verifies that each segment in the chain was called exactly n times.
   *
   * @example
   * ```ts
   * expect(chain.select.from.where).toHaveBeenChainCalledTimes(2);
   * ```
   */
  toHaveBeenChainCalledTimes(expected: number): R;

  /**
   * Verifies that any call to the chain had the corresponding arguments at each segment.
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
   * Verifies that each segment in the chain was called exactly once.
   *
   * @example
   * ```ts
   * expect(chain.select.from.where).toHaveBeenChainCalledExactlyOnce();
   * ```
   */
  toHaveBeenChainCalledExactlyOnce(): R;

  /**
   * Verifies that each segment in the chain was called exactly once with the specified arguments.
   *
   * @example
   * ```ts
   * expect(chain.select.from.where).toHaveBeenChainCalledExactlyOnceWith(
   *   ['id'],
   *   ['users'],
   *   ['active']
   * );
   * ```
   */
  toHaveBeenChainCalledExactlyOnceWith(...argsPerSegment: any[]): R;

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
  interface Assertion<T = any> extends ChainMatchers<T> {}
  interface AsymmetricMatchersContaining extends ChainMatchers {}
}

export {};
