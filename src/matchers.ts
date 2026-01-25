/**
 * Custom vitest matchers for chain mocks.
 */

import type { MatcherState, SyncExpectationResult } from '@vitest/expect';

import {
  CHAIN_PATH,
  CHAIN_STATES,
  type ChainMock,
  type MockContext,
} from './mock';

type PathState = {
  mock: MockContext;
};

/**
 * Extracts path segments from a chain mock.
 * For path ['select', 'from', 'where'], returns:
 * ['select', 'select.from', 'select.from.where']
 */
function getPathSegments(chainMock: ChainMock): string[] {
  const path = chainMock[CHAIN_PATH];
  if (path.length === 0) {
    return [];
  }

  const segments: string[] = [];
  for (let i = 0; i < path.length; i++) {
    segments.push(path.slice(0, i + 1).join('.'));
  }
  return segments;
}

/**
 * Gets the PathState for a given path segment.
 */
function getPathState(
  chainMock: ChainMock,
  segment: string,
): PathState | undefined {
  const states = chainMock[CHAIN_STATES];
  return states.get(segment);
}

/**
 * Verifies that each segment in the chain was called exactly n times.
 */
export function toHaveBeenChainCalled(
  this: MatcherState,
  received: ChainMock,
  expected: number,
): SyncExpectationResult {
  const segments = getPathSegments(received);

  if (segments.length === 0) {
    return {
      pass: false,
      message: () => 'Cannot check chain calls on root mock',
    };
  }

  const mismatches: string[] = [];
  for (const segment of segments) {
    const state = getPathState(received, segment);
    const callCount = state?.mock.calls.length ?? 0;
    if (callCount !== expected) {
      mismatches.push(`${segment}: expected ${expected}, got ${callCount}`);
    }
  }

  const pass = mismatches.length === 0;

  return {
    pass,
    message: () => {
      if (pass) {
        // .not case - test failed because condition matched when it shouldn't
        return `Expected chain not to have been called ${expected} time(s), but all segments were called ${expected} time(s)`;
      }
      // Normal case - test failed because condition didn't match
      return `Expected all segments to be called ${expected} time(s), but:\n  ${mismatches.join('\n  ')}`;
    },
  };
}

/**
 * Verifies that each segment in the chain was called exactly once.
 */
export function toHaveBeenChainCalledOnce(
  this: MatcherState,
  received: ChainMock,
): SyncExpectationResult {
  return toHaveBeenChainCalled.call(this, received, 1);
}

/**
 * Verifies that the last call to each segment had the corresponding arguments.
 */
export function toHaveBeenChainCalledWith(
  this: MatcherState,
  received: ChainMock,
  ...argsPerSegment: any[]
): SyncExpectationResult {
  const { equals } = this;
  const segments = getPathSegments(received);

  if (segments.length === 0) {
    return {
      pass: false,
      message: () => 'Cannot check chain calls on root mock',
    };
  }

  if (argsPerSegment.length !== segments.length) {
    return {
      pass: false,
      message: () =>
        `Expected ${segments.length} argument array(s) (one per segment), but got ${argsPerSegment.length}`,
    };
  }

  const mismatches: string[] = [];
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]!;
    const expectedArgs = argsPerSegment[i];
    const state = getPathState(received, segment);

    if (state === undefined || state.mock.calls.length === 0) {
      mismatches.push(`${segment}: was never called`);
      continue;
    }

    const lastCall = state.mock.calls[state.mock.calls.length - 1]!;
    if (!equals(lastCall, expectedArgs)) {
      mismatches.push(
        `${segment}: expected last call with ${JSON.stringify(expectedArgs)}, got ${JSON.stringify(lastCall)}`,
      );
    }
  }

  const pass = mismatches.length === 0;

  return {
    pass,
    message: () => {
      if (pass) {
        return `Expected chain not to have been called with the specified arguments, but all segments matched`;
      }
      return `Expected all segments to match last call arguments, but:\n  ${mismatches.join('\n  ')}`;
    },
  };
}

/**
 * Verifies that the Nth call to each segment had the corresponding arguments.
 */
export function toHaveBeenNthChainCalledWith(
  this: MatcherState,
  received: ChainMock,
  n: number,
  ...argsPerSegment: any[]
): SyncExpectationResult {
  const { equals } = this;
  const segments = getPathSegments(received);

  if (segments.length === 0) {
    return {
      pass: false,
      message: () => 'Cannot check chain calls on root mock',
    };
  }

  if (n < 1) {
    return {
      pass: false,
      message: () => `Expected call index to be >= 1, but got ${n}`,
    };
  }

  if (argsPerSegment.length !== segments.length) {
    return {
      pass: false,
      message: () =>
        `Expected ${segments.length} argument array(s) (one per segment), but got ${argsPerSegment.length}`,
    };
  }

  const mismatches: string[] = [];
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]!;
    const expectedArgs = argsPerSegment[i];
    const state = getPathState(received, segment);

    if (state === undefined || state.mock.calls.length < n) {
      mismatches.push(
        `${segment}: expected at least ${n} call(s), but got ${state?.mock.calls.length ?? 0}`,
      );
      continue;
    }

    const nthCall = state.mock.calls[n - 1]!;
    if (!equals(nthCall, expectedArgs)) {
      mismatches.push(
        `${segment}: expected call ${n} with ${JSON.stringify(expectedArgs)}, got ${JSON.stringify(nthCall)}`,
      );
    }
  }

  const pass = mismatches.length === 0;

  return {
    pass,
    message: () => {
      if (pass) {
        return `Expected chain not to have been called ${n} time(s) with the specified arguments, but all segments matched`;
      }
      return `Expected all segments to match call ${n} arguments, but:\n  ${mismatches.join('\n  ')}`;
    },
  };
}

/**
 * Verifies that the last call to each segment had the corresponding arguments.
 */
export function toHaveBeenLastChainCalledWith(
  this: MatcherState,
  received: ChainMock,
  ...argsPerSegment: any[]
): SyncExpectationResult {
  return toHaveBeenChainCalledWith.call(this, received, ...argsPerSegment);
}

/**
 * Object containing all chain matchers for use with expect.extend().
 */
export const chainMatchers = {
  toHaveBeenChainCalled,
  toHaveBeenChainCalledOnce,
  toHaveBeenChainCalledWith,
  toHaveBeenNthChainCalledWith,
  toHaveBeenLastChainCalledWith,
};
