/**
 * chain-mock
 *
 * A utility for mocking fluent/chainable APIs (like Drizzle ORM, Knex, etc.)
 * with full support for:
 * - Mocking resolved/returned values on any path in the chain
 * - Asserting on any method in the chain using standard vitest matchers
 * - Tracking call arguments at every level
 */

/**
 * Mock result types matching vitest's structure.
 */
type MockResultReturn = {
  type: 'return';
  value: any;
};

type MockResultThrow = {
  type: 'throw';
  value: any;
};

type MockResultIncomplete = {
  type: 'incomplete';
  value: undefined;
};

type MockResult = MockResultReturn | MockResultThrow | MockResultIncomplete;

type MockSettledResultFulfilled = {
  type: 'fulfilled';
  value: any;
};

type MockSettledResultRejected = {
  type: 'rejected';
  value: any;
};

type MockSettledResultIncomplete = {
  type: 'incomplete';
  value: undefined;
};

type MockSettledResult =
  | MockSettledResultFulfilled
  | MockSettledResultRejected
  | MockSettledResultIncomplete;

/**
 * Mock context matching vitest's structure.
 */
type MockContext = {
  calls: any[][];
  results: MockResult[];
  contexts: any[];
  instances: any[];
  invocationCallOrder: number[];
  settledResults: MockSettledResult[];
  get lastCall(): any[] | undefined;
};

/**
 * State for a single path in the chain.
 */
type PathState = {
  mock: MockContext;
  resolvedValue: any;
  resolvedValueQueue: any[];
  rejectedValue: any;
  rejectedValueQueue: any[];
  returnValue: any;
  returnValueQueue: any[];
  implementation: ((...args: any[]) => any) | undefined;
  implementationOnce: Array<(...args: any[]) => any>;
  mockName: string;
};

/**
 * Chain mock instance - callable and has all mock methods.
 */
export interface ChainMock extends PromiseLike<any> {
  (...args: any[]): ChainMock;
  [key: string]: any;
  _isMockFunction: true;
  mock: MockContext;
  mockResolvedValue: (value: any) => ChainMock;
  mockResolvedValueOnce: (value: any) => ChainMock;
  mockRejectedValue: (error: any) => ChainMock;
  mockRejectedValueOnce: (error: any) => ChainMock;
  mockReturnValue: (value: any) => ChainMock;
  mockReturnValueOnce: (value: any) => ChainMock;
  mockImplementation: (fn: (...args: any[]) => any) => ChainMock;
  mockImplementationOnce: (fn: (...args: any[]) => any) => ChainMock;
  mockReset: () => ChainMock;
  mockClear: () => ChainMock;
  mockName: (name: string) => ChainMock;
  getMockName: () => string;
}

let invocationCallCounter = 1;

const mockRegistry = new Set<ChainMock>();

/**
 * Creates a chainable mock that can be used to mock fluent APIs.
 *
 * @returns A ChainMock instance that can be chained infinitely
 *
 * @example
 * ```ts
 * const mockDb = chainMock();
 *
 * // Configure mock on any path
 * mockDb.select.from.where.mockResolvedValue([{ id: 42, name: 'Dan' }]);
 *
 * // Use the chain
 * await mockDb.select('id', 'name').from('users').where('id = 42');
 *
 * // Assert using standard vitest matchers
 * expect(mockDb.select).toHaveBeenCalled();
 * expect(mockDb.select.from).toHaveBeenCalledWith('users');
 * ```
 */
export function chainMock(): ChainMock {
  const pathStates = new Map<string, PathState>();
  const proxyCache = new Map<string, ChainMock>();

  function getOrCreatePathState(path: string[]): PathState {
    const key = path.join('.');
    if (!pathStates.has(key)) {
      const state: PathState = {
        mock: {
          calls: [],
          results: [],
          contexts: [],
          instances: [],
          invocationCallOrder: [],
          settledResults: [],
          get lastCall() {
            return state.mock.calls.at(-1);
          },
        },
        resolvedValue: undefined,
        resolvedValueQueue: [],
        rejectedValue: undefined,
        rejectedValueQueue: [],
        returnValue: undefined,
        returnValueQueue: [],
        implementation: undefined,
        implementationOnce: [],
        mockName: 'chainMock()',
      };
      pathStates.set(key, state);
    }
    return pathStates.get(key)!;
  }

  function getOrCreateProxy(path: string[] = []): ChainMock {
    const cacheKey = path.join('.');

    if (proxyCache.has(cacheKey)) {
      return proxyCache.get(cacheKey)!;
    }

    const state = getOrCreatePathState(path);

    const handler: ProxyHandler<object> = {
      get(_target, prop: string | symbol) {
        // Handle symbols
        if (typeof prop === 'symbol') {
          if (prop === Symbol.toStringTag) {
            return 'ChainMock';
          }
          if (prop === Symbol.toPrimitive) {
            return () => '[ChainMock]';
          }
          return undefined;
        }

        // Vitest marker
        if (prop === '_isMockFunction') {
          return true;
        }

        // Mock context
        if (prop === 'mock') {
          return state.mock;
        }

        // Mock configuration methods - available on every path
        if (prop === 'mockResolvedValue') {
          return (value: any) => {
            state.resolvedValue = value;
            return getOrCreateProxy(path);
          };
        }

        if (prop === 'mockResolvedValueOnce') {
          return (value: any) => {
            state.resolvedValueQueue.push(value);
            return getOrCreateProxy(path);
          };
        }

        if (prop === 'mockRejectedValue') {
          return (error: any) => {
            state.rejectedValue = error;
            return getOrCreateProxy(path);
          };
        }

        if (prop === 'mockRejectedValueOnce') {
          return (error: any) => {
            state.rejectedValueQueue.push(error);
            return getOrCreateProxy(path);
          };
        }

        if (prop === 'mockReturnValue') {
          return (value: any) => {
            state.returnValue = value;
            return getOrCreateProxy(path);
          };
        }

        if (prop === 'mockReturnValueOnce') {
          return (value: any) => {
            state.returnValueQueue.push(value);
            return getOrCreateProxy(path);
          };
        }

        if (prop === 'mockImplementation') {
          return (fn: (...args: any[]) => any) => {
            state.implementation = fn;
            return getOrCreateProxy(path);
          };
        }

        if (prop === 'mockImplementationOnce') {
          return (fn: (...args: any[]) => any) => {
            state.implementationOnce.push(fn);
            return getOrCreateProxy(path);
          };
        }

        if (prop === 'mockReset') {
          return () => {
            // If resetting root, clear all paths
            if (path.length === 0) {
              pathStates.clear();
              proxyCache.clear();
            } else {
              // Reset this specific path and all its children
              const keysToDelete: string[] = [];
              for (const key of pathStates.keys()) {
                if (key === cacheKey || key.startsWith(cacheKey + '.')) {
                  keysToDelete.push(key);
                }
              }
              for (const key of keysToDelete) {
                pathStates.delete(key);
                proxyCache.delete(key);
              }
            }

            // Create fresh state for this path
            const newState: PathState = {
              mock: {
                calls: [],
                results: [],
                contexts: [],
                instances: [],
                invocationCallOrder: [],
                settledResults: [],
                get lastCall() {
                  return newState.mock.calls.at(-1);
                },
              },
              resolvedValue: undefined,
              resolvedValueQueue: [],
              rejectedValue: undefined,
              rejectedValueQueue: [],
              returnValue: undefined,
              returnValueQueue: [],
              implementation: undefined,
              implementationOnce: [],
              mockName: 'chainMock()',
            };
            pathStates.set(cacheKey, newState);
            // Invalidate cached proxy for this path
            proxyCache.delete(cacheKey);
            return getOrCreateProxy(path);
          };
        }

        if (prop === 'mockClear') {
          return () => {
            // If clearing root, clear all paths
            if (path.length === 0) {
              for (const pathState of pathStates.values()) {
                pathState.mock.calls = [];
                pathState.mock.results = [];
                pathState.mock.contexts = [];
                pathState.mock.instances = [];
                pathState.mock.invocationCallOrder = [];
                pathState.mock.settledResults = [];
              }
            } else {
              // Clear this specific path and all its children
              for (const [key, pathState] of pathStates.entries()) {
                if (key === cacheKey || key.startsWith(cacheKey + '.')) {
                  pathState.mock.calls = [];
                  pathState.mock.results = [];
                  pathState.mock.contexts = [];
                  pathState.mock.instances = [];
                  pathState.mock.invocationCallOrder = [];
                  pathState.mock.settledResults = [];
                }
              }
            }
            return getOrCreateProxy(path);
          };
        }

        if (prop === 'mockName') {
          return (name: string) => {
            state.mockName = name;
            return getOrCreateProxy(path);
          };
        }

        if (prop === 'getMockName') {
          return () => state.mockName;
        }

        // Promise interface
        if (prop === 'then') {
          return (
            resolve: (value: any) => void,
            reject?: (error: any) => void,
          ) => {
            try {
              // Walk up the path to find the first state with a value
              let currentPath = path;
              let foundState: PathState | undefined;

              while (currentPath.length >= 0) {
                const checkKey = currentPath.join('.');
                const checkState = pathStates.get(checkKey);
                if (checkState !== undefined) {
                  // Note: implementation and returnValue are handled in apply(), not here
                  // Check for rejection
                  if (
                    checkState.rejectedValueQueue.length > 0 ||
                    checkState.rejectedValue !== undefined
                  ) {
                    foundState = checkState;
                    break;
                  }
                  // Check for resolution
                  if (
                    checkState.resolvedValueQueue.length > 0 ||
                    checkState.resolvedValue !== undefined
                  ) {
                    foundState = checkState;
                    break;
                  }
                }
                // After checking current path, break if we've reached root
                if (currentPath.length === 0) {
                  break;
                }
                currentPath = currentPath.slice(0, -1);
              }

              const useState = foundState ?? state;

              // Note: implementation and returnValue are handled in apply(), not here
              // Get indices for updating results
              const lastResultIdx = state.mock.results.length - 1;
              const lastSettledIdx = state.mock.settledResults.length - 1;

              // Check for rejection (queue first, then default)
              if (useState.rejectedValueQueue.length > 0) {
                const error = useState.rejectedValueQueue.shift();
                state.mock.results[lastResultIdx] = {
                  type: 'throw',
                  value: error,
                };
                state.mock.settledResults[lastSettledIdx] = {
                  type: 'rejected',
                  value: error,
                };
                // Call reject callback synchronously if provided
                // This causes the outer promise (from Promise.resolve(thenable)) to reject
                if (reject !== undefined) {
                  reject(error);
                  // Return resolved promise since rejection is handled by calling reject
                  return Promise.resolve();
                }
                // If no reject callback, return rejected promise
                // Attach no-op handler to prevent unhandled rejection warnings
                const promise = Promise.reject(error);
                promise.catch(() => {
                  // Error will be handled by caller
                });
                return promise;
              }

              if (useState.rejectedValue !== undefined) {
                state.mock.results[lastResultIdx] = {
                  type: 'throw',
                  value: useState.rejectedValue,
                };
                state.mock.settledResults[lastSettledIdx] = {
                  type: 'rejected',
                  value: useState.rejectedValue,
                };
                // Call reject callback synchronously if provided
                // This causes the outer promise (from Promise.resolve(thenable)) to reject
                if (reject !== undefined) {
                  reject(useState.rejectedValue);
                  // Return resolved promise since rejection is handled by calling reject
                  return Promise.resolve();
                }
                // If no reject callback, return rejected promise
                // Attach no-op handler to prevent unhandled rejection warnings
                const promise = Promise.reject(useState.rejectedValue);
                promise.catch(() => {
                  // Error will be handled by caller
                });
                return promise;
              }

              // Check for resolution (queue first, then default)
              // Note: returnValue is handled synchronously in apply(), not here
              let value: any;
              if (useState.resolvedValueQueue.length > 0) {
                value = useState.resolvedValueQueue.shift();
              } else if (useState.resolvedValue !== undefined) {
                value = useState.resolvedValue;
              } else {
                value = undefined;
              }

              state.mock.results[lastResultIdx] = {
                type: 'return',
                value: value,
              };
              state.mock.settledResults[lastSettledIdx] = {
                type: 'fulfilled',
                value: value,
              };

              const promise = Promise.resolve(value);
              promise.then(resolve);
              return promise;
            } catch (error) {
              const promise = Promise.reject(error);
              if (reject !== undefined) {
                promise.catch(reject);
              }
              return promise;
            }
          };
        }

        if (prop === 'catch') {
          return (_fn: (error: any) => void) => {
            return getOrCreateProxy(path);
          };
        }

        if (prop === 'finally') {
          return (fn: () => void) => {
            fn();
            return getOrCreateProxy(path);
          };
        }

        // Access to child chain - return cached proxy for that path
        return getOrCreateProxy([...path, prop]);
      },

      apply(_target, thisArg, args: any[]) {
        // Record this call
        const callOrder = invocationCallCounter++;
        state.mock.calls.push(args);
        state.mock.invocationCallOrder.push(callOrder);
        state.mock.contexts.push(thisArg);

        // Walk up the path to find the first state with a configured value
        // Also check if the method name itself (last segment) has a value configured
        let currentPath = path;
        let foundState: PathState | undefined;

        // Helper to check if a state has any configured value
        const hasConfiguredValue = (s: PathState) =>
          s.implementationOnce.length > 0 ||
          s.implementation !== undefined ||
          s.returnValueQueue.length > 0 ||
          s.returnValue !== undefined;

        // First check if the method name itself has a value configured
        // e.g., if path is ['append', 'digest'], also check ['digest']
        if (path.length > 0) {
          const methodName = path[path.length - 1]!;
          const methodState = pathStates.get(methodName);
          if (methodState !== undefined && hasConfiguredValue(methodState)) {
            foundState = methodState;
          }
        }

        // If not found, walk up the path
        if (foundState === undefined) {
          while (currentPath.length >= 0) {
            const checkKey = currentPath.join('.');
            const checkState = pathStates.get(checkKey);
            if (checkState !== undefined && hasConfiguredValue(checkState)) {
              foundState = checkState;
              break;
            }
            if (currentPath.length === 0) {
              break;
            }
            currentPath = currentPath.slice(0, -1);
          }
        }

        const useState = foundState ?? state;

        // Check for implementation first (highest priority)
        const impl =
          useState.implementationOnce.shift() ?? useState.implementation;

        if (impl !== undefined) {
          try {
            const returnValue = impl(...args);
            state.mock.results.push({
              type: 'return',
              value: returnValue,
            });
            if (returnValue instanceof Promise) {
              state.mock.settledResults.push({
                type: 'incomplete',
                value: undefined,
              });
              const settledIdx = state.mock.settledResults.length - 1;
              returnValue.then(
                (resolved) => {
                  state.mock.settledResults[settledIdx] = {
                    type: 'fulfilled',
                    value: resolved,
                  };
                },
                (rejected) => {
                  state.mock.settledResults[settledIdx] = {
                    type: 'rejected',
                    value: rejected,
                  };
                },
              );
            } else {
              state.mock.settledResults.push({
                type: 'fulfilled',
                value: returnValue,
              });
            }
            return returnValue;
          } catch (error) {
            state.mock.results.push({
              type: 'throw',
              value: error,
            });
            state.mock.settledResults.push({
              type: 'rejected',
              value: error,
            });
            throw error;
          }
        }

        // Check for synchronous return value (terminal method)
        if (useState.returnValueQueue.length > 0) {
          const returnValue = useState.returnValueQueue.shift();
          state.mock.results.push({
            type: 'return',
            value: returnValue,
          });
          state.mock.settledResults.push({
            type: 'fulfilled',
            value: returnValue,
          });
          return returnValue;
        }

        if (useState.returnValue !== undefined) {
          state.mock.results.push({
            type: 'return',
            value: useState.returnValue,
          });
          state.mock.settledResults.push({
            type: 'fulfilled',
            value: useState.returnValue,
          });
          return useState.returnValue;
        }

        // No return value configured - return proxy for chaining
        // Add incomplete result - will be updated when value is actually resolved/rejected
        state.mock.results.push({
          type: 'incomplete',
          value: undefined,
        });
        state.mock.settledResults.push({
          type: 'incomplete',
          value: undefined,
        });

        // Return proxy for chaining - values will be consumed in 'then' handler
        return getOrCreateProxy(path);
      },

      has(_target, prop: string | symbol) {
        if (
          prop === 'mock' ||
          prop === '_isMockFunction' ||
          prop === 'then' ||
          prop === 'catch' ||
          prop === 'finally' ||
          prop === 'mockResolvedValue' ||
          prop === 'mockResolvedValueOnce' ||
          prop === 'mockRejectedValue' ||
          prop === 'mockRejectedValueOnce' ||
          prop === 'mockReturnValue' ||
          prop === 'mockReturnValueOnce' ||
          prop === 'mockImplementation' ||
          prop === 'mockImplementationOnce' ||
          prop === 'mockReset' ||
          prop === 'mockClear' ||
          prop === 'mockName' ||
          prop === 'getMockName'
        ) {
          return true;
        }
        if (typeof prop === 'string') {
          return true; // All string properties exist (for chaining)
        }
        return false;
      },
    };

    const callable = function () {} as unknown as ChainMock;
    const proxy = new Proxy(callable, handler) as ChainMock;

    proxyCache.set(cacheKey, proxy);
    return proxy;
  }

  const root = getOrCreateProxy();
  mockRegistry.add(root);
  return root;
}

/**
 * Clears call history (calls, results, contexts, instances) for all chain mocks.
 * Does not reset configured values (mockResolvedValue, mockImplementation, etc.).
 *
 * @example
 * ```ts
 * afterEach(() => {
 *   clearAllMocks();
 * });
 * ```
 */
export function clearAllMocks(): void {
  for (const mock of mockRegistry) {
    mock.mockClear();
  }
}

/**
 * Resets all chain mocks to their initial state, clearing both call history
 * and all configured values (mockResolvedValue, mockImplementation, etc.).
 *
 * @example
 * ```ts
 * afterEach(() => {
 *   resetAllMocks();
 * });
 * ```
 */
export function resetAllMocks(): void {
  for (const mock of mockRegistry) {
    mock.mockReset();
  }
  mockRegistry.clear();
}
