import type { ChainMatchers } from './matchers';

// For @jest/globals - augment the expect module
declare module 'expect' {
  interface Matchers<R, _T> extends ChainMatchers<R> {}
  interface AsymmetricMatchers extends ChainMatchers {}
}

// For @jest/expect (used by @jest/globals)
declare module '@jest/expect' {
  interface Matchers<R, _T> extends ChainMatchers<R> {}
}

// For @types/jest - augment the global namespace
declare global {
  namespace jest {
    interface Matchers<R, _T> extends ChainMatchers<R> {}
    interface Expect extends ChainMatchers {}
    interface InverseAsymmetricMatchers extends ChainMatchers {}
  }
}
