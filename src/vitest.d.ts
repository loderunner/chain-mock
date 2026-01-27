import type { ChainMatchers } from './matchers';

declare module 'vitest' {
  interface Assertion<T = any> extends ChainMatchers<T> {}
  interface AsymmetricMatchersContaining extends ChainMatchers {}
}

export {};
