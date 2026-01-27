import type { ChainMatchers } from './matchers';

declare module 'bun:test' {
  interface Matchers<T> extends ChainMatchers<T> {}
  interface AsymmetricMatchers extends ChainMatchers {}
}

export {};
