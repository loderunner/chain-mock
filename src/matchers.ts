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
 * Verifies that each segment in the chain was called at least once.
 */
export function toHaveBeenChainCalled(
  this: MatcherState,
  received: ChainMock,
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
    if (callCount === 0) {
      mismatches.push(`${segment}: was never called`);
    }
  }

  const pass = mismatches.length === 0;

  return {
    pass,
    message: () => {
      if (pass) {
        return `Expected chain not to have been called, but all segments were called`;
      }
      return `Expected all segments to be called at least once, but:\n  ${mismatches.join('\n  ')}`;
    },
  };
}

/**
 * Verifies that each segment in the chain was called exactly n times.
 */
export function toHaveBeenChainCalledTimes(
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
export function toHaveBeenChainCalledExactlyOnce(
  this: MatcherState,
  received: ChainMock,
): SyncExpectationResult {
  return toHaveBeenChainCalledTimes.call(this, received, 1);
}

/**
 * Verifies that each segment in the chain was called exactly once with the specified arguments.
 */
export function toHaveBeenChainCalledExactlyOnceWith(
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

    if (state.mock.calls.length !== 1) {
      mismatches.push(
        `${segment}: expected to be called exactly once, but was called ${state.mock.calls.length} time(s)`,
      );
      continue;
    }

    const call = state.mock.calls[0]!;
    if (!equals(call, expectedArgs)) {
      mismatches.push(
        `${segment}: expected call with ${JSON.stringify(expectedArgs)}, got ${JSON.stringify(call)}`,
      );
    }
  }

  const pass = mismatches.length === 0;

  return {
    pass,
    message: () => {
      if (pass) {
        return `Expected chain not to have been called exactly once with the specified arguments, but all segments matched`;
      }
      return `Expected all segments to be called exactly once with the specified arguments, but:\n  ${mismatches.join('\n  ')}`;
    },
  };
}

/**
 * Verifies that any call to the chain had the corresponding arguments at each segment.
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

  // Get all states and find the minimum call count
  const states = segments.map((seg) => getPathState(received, seg));
  const callCounts = states.map((s) => s?.mock.calls.length ?? 0);
  const minCalls = Math.min(...callCounts);

  if (minCalls === 0) {
    return {
      pass: false,
      message: () => {
        const uncalled = segments.filter(
          (_, i) => (states[i]?.mock.calls.length ?? 0) === 0,
        );
        return `Expected chain to have been called with specified arguments, but ${uncalled.join(', ')} was never called`;
      },
    };
  }

  // Check each call index to see if all segments match
  for (let callIdx = 0; callIdx < minCalls; callIdx++) {
    let allMatch = true;
    for (let segIdx = 0; segIdx < segments.length; segIdx++) {
      const state = states[segIdx]!;
      const expectedArgs = argsPerSegment[segIdx];
      const actualCall = state.mock.calls[callIdx]!;
      if (!equals(actualCall, expectedArgs)) {
        allMatch = false;
        break;
      }
    }
    if (allMatch) {
      return {
        pass: true,
        message: () =>
          `Expected chain not to have been called with the specified arguments, but call ${callIdx + 1} matched`,
      };
    }
  }

  return {
    pass: false,
    message: () =>
      `Expected chain to have been called with ${JSON.stringify(argsPerSegment)}, but no matching call was found`,
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
  const segments = getPathSegments(received);

  if (segments.length === 0) {
    return {
      pass: false,
      message: () => 'Cannot check chain calls on root mock',
    };
  }

  // Find the maximum call count across all segments
  const callCounts = segments.map((seg) => {
    const state = getPathState(received, seg);
    return state?.mock.calls.length ?? 0;
  });
  const lastCallIndex = Math.max(...callCounts);

  if (lastCallIndex === 0) {
    return {
      pass: false,
      message: () =>
        'Expected chain to have been called, but no segments were called',
    };
  }

  return toHaveBeenNthChainCalledWith.call(
    this,
    received,
    lastCallIndex,
    ...argsPerSegment,
  );
}

/**
 * Object containing all chain matchers for use with expect.extend().
 */
export const chainMatchers = {
  toHaveBeenChainCalled,
  toHaveBeenChainCalledTimes,
  toHaveBeenChainCalledWith,
  toHaveBeenChainCalledExactlyOnce,
  toHaveBeenChainCalledExactlyOnceWith,
  toHaveBeenNthChainCalledWith,
  toHaveBeenLastChainCalledWith,
};
