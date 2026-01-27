# chain-mock

Mock fluent/chainable APIs (like Drizzle ORM, Knex, Kysely, etc.) with full call
tracking and cross-framework matcher support.

- [Installation](#installation)
- [Framework Setup](#framework-setup)
- [API Reference](#api-reference)
- [Custom Matchers](#custom-matchers)
- [Examples](#examples)
- [Manual Type Augmentation](#manual-type-augmentation)
- [License](#license)

### The Problem

Testing code that uses chainable/fluent APIs is painful:

```typescript
// Your code
const users = await db
  .select({ id: users.id })
  .from(users)
  .where(eq(users.id, 42));

// Your test... 😱
vi.mocked(db.select).mockReturnValue({
  from: vi.fn(() => ({
    where: vi.fn().mockResolvedValue([{ id: 42 }]),
  })),
});
```

### The Solution

```typescript
import { chainMock, matchers } from 'chain-mock';

// Setup (once in your test setup file)
expect.extend(matchers);

// In your test
const dbMock = chainMock();
dbMock.mockResolvedValue([{ id: 42, name: 'Dan' }]);

// Run your code
const result = await getUserById(dbMock, 42);

// Assert with ease
expect(result).toEqual([{ id: 42, name: 'Dan' }]);
expect(dbMock.select.from.where).toHaveBeenChainCalledWith(
  [{ id: users.id }],
  [users],
  [eq(users.id, 42)],
);
```

## Installation

```bash
npm install -D chain-mock

# or yarn
yarn add -D chain-mock

# or pnpm
pnpm add -D chain-mock

# or bun
bun add -D chain-mock
```

## Framework Setup

### Vitest

**1. Register matchers** in your setup file:

```typescript
import { expect } from 'vitest';
import { matchers } from 'chain-mock';

expect.extend(matchers);
```

**2. Add type augmentation** in your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["chain-mock/vitest"]
  }
}
```

Or use a triple-slash reference in a `.d.ts` file:

```typescript
/// <reference types="chain-mock/vitest" />
```

### Jest

**1. Register matchers** in your setup file:

```typescript
import { matchers } from 'chain-mock';

expect.extend(matchers);
```

**2. Add type augmentation** in your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["chain-mock/jest"]
  }
}
```

Or use a triple-slash reference in a `.d.ts` file:

```typescript
/// <reference types="chain-mock/jest" />
```

### Bun

**1. Register matchers** in your setup file:

```typescript
import { expect } from 'bun:test';
import { matchers } from 'chain-mock';

expect.extend(matchers);
```

**2. Add type augmentation** in your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["bun", "chain-mock/bun"]
  }
}
```

Or use a triple-slash reference in a `.d.ts` file:

```typescript
/// <reference types="chain-mock/bun" />
```

## API Reference

### `chainMock<T>()`

Creates a chainable mock instance.

```typescript
const mock = chainMock();

// With type parameter for better inference
const mock = chainMock<typeof db>();
```

### Mock Configuration

All configuration methods are chainable and can be set on any path in the chain.

#### Async Values

```typescript
// Resolve with value when awaited
mock.mockResolvedValue([{ id: 1 }]);
mock.mockResolvedValueOnce([{ id: 1 }]);

// Reject with error when awaited
mock.mockRejectedValue(new Error('Connection failed'));
mock.mockRejectedValueOnce(new Error('Temporary failure'));
```

#### Sync Values

```typescript
// Return value synchronously (breaks the chain)
mock.digest.mockReturnValue('abc123');
mock.digest.mockReturnValueOnce('abc123');
```

#### Custom Implementation

```typescript
// Full control over behavior
mock.mockImplementation((...args) => computeResult(args));
mock.mockImplementationOnce((...args) => computeResult(args));
```

#### Reset and Clear

```typescript
// Clear call history, keep configured values
mock.mockClear();

// Reset everything (calls + configured values)
mock.mockReset();
```

#### Mock Naming

```typescript
mock.mockName('dbSelectMock');
mock.getMockName(); // 'dbSelectMock'
```

### Direct Call Access

Access call information directly via the `.mock` property:

```typescript
mock.select.mock.calls; // [['id'], ['name']]
mock.select.mock.lastCall; // ['name']
mock.select.mock.results; // [{ type: 'return', value: ... }]
mock.select.mock.contexts; // [thisArg1, thisArg2]
mock.select.mock.invocationCallOrder; // [1, 3]
```

### Utility Functions

#### `chainMocked<T>(value)`

Casts a value to its `ChainMock` type. Useful for typing mocked imports.

```typescript
import { db } from './db';

vi.mock('./db', () => ({
  db: chainMock(),
}));

const mockDb = chainMocked(db);
mockDb.select.mockResolvedValue([{ id: 42 }]);
```

#### `isChainMock(value)`

Type guard to check if a value is a `ChainMock` instance.

```typescript
if (isChainMock(maybeChainMock)) {
  maybeChainMock.mockReturnValue('test');
}
```

#### `clearAllMocks()`

Clears call history for all chain mocks. Does not reset configured values.

```typescript
afterEach(() => {
  clearAllMocks();
});
```

#### `resetAllMocks()`

Resets all chain mocks to their initial state, clearing both call history and
configured values.

```typescript
afterEach(() => {
  resetAllMocks();
});
```

## Custom Matchers

After calling `expect.extend(matchers)`:

### `toHaveBeenChainCalled()`

Verifies that each segment in the chain was called at least once.

```typescript
chain.select('id').from('users').where('active');
expect(chain.select.from.where).toHaveBeenChainCalled();
```

### `toHaveBeenChainCalledTimes(n)`

Verifies that each segment in the chain was called exactly `n` times.

```typescript
chain.select('id').from('users').where('active');
chain.select('name').from('posts').where('published');
expect(chain.select.from.where).toHaveBeenChainCalledTimes(2);
```

### `toHaveBeenChainCalledWith(...argsPerSegment)`

Verifies that any call to the chain had the corresponding arguments at each
segment. Pass one array of arguments per segment.

```typescript
chain.select('id').from('users').where('active');
expect(chain.select.from.where).toHaveBeenChainCalledWith(
  ['id'],
  ['users'],
  ['active'],
);
```

### `toHaveBeenChainCalledExactlyOnce()`

Verifies that each segment in the chain was called exactly once.

```typescript
chain.select('id').from('users').where('active');
expect(chain.select.from.where).toHaveBeenChainCalledExactlyOnce();
```

### `toHaveBeenChainCalledExactlyOnceWith(...argsPerSegment)`

Verifies that each segment was called exactly once with the specified arguments.

```typescript
chain.select('id').from('users').where('active');
expect(chain.select.from.where).toHaveBeenChainCalledExactlyOnceWith(
  ['id'],
  ['users'],
  ['active'],
);
```

### `toHaveBeenNthChainCalledWith(n, ...argsPerSegment)`

Verifies that the Nth call to each segment had the corresponding arguments.

```typescript
chain.select('id').from('users').where('active');
chain.select('name').from('posts').where('published');

expect(chain.select.from.where).toHaveBeenNthChainCalledWith(
  2,
  ['name'],
  ['posts'],
  ['published'],
);
```

### `toHaveBeenLastChainCalledWith(...argsPerSegment)`

Verifies that the last call to each segment had the corresponding arguments.

```typescript
chain.select('id').from('users').where('active');
chain.select('name').from('posts').where('published');

expect(chain.select.from.where).toHaveBeenLastChainCalledWith(
  ['name'],
  ['posts'],
  ['published'],
);
```

## Examples

### Drizzle ORM

```typescript
import { chainMock, chainMocked, matchers } from 'chain-mock';
import { db } from './db';
import { users } from './schema';
import { eq } from 'drizzle-orm';

vi.mock('./db', () => ({
  db: chainMock(),
}));
expect.extend(matchers);

describe('UserService', () => {
  const mockDb = chainMocked(db);

  beforeEach(() => {
    mockDb.mockReset();
  });

  it('finds user by id', async () => {
    mockDb.mockResolvedValue([{ id: 42, name: 'Dan' }]);

    const result = await userService.findById(42);

    expect(result).toEqual({ id: 42, name: 'Dan' });
    expect(mockDb.select.from.where).toHaveBeenChainCalledWith(
      [{ id: users.id, name: users.name }],
      [users],
      [eq(users.id, 42)],
    );
  });

  it('inserts new user', async () => {
    mockDb.mockResolvedValue([{ id: 1, name: 'New User' }]);

    await userService.create({ name: 'New User' });

    expect(mockDb.insert.values.returning).toHaveBeenChainCalledWith(
      [users],
      [{ name: 'New User' }],
      [],
    );
  });
});
```

## Manual Type Augmentation

If the built-in type augmentation doesn't work for your setup, you can manually
augment your framework's types:

```typescript
import type { ChainMatchers } from 'chain-mock';

// For Vitest
declare module 'vitest' {
  interface Assertion<T = any> extends ChainMatchers<T> {}
  interface AsymmetricMatchersContaining extends ChainMatchers {}
}

// For Jest with @jest/globals
declare module 'expect' {
  interface Matchers<R, T> extends ChainMatchers<R> {}
}

// For Jest with global expect
declare global {
  namespace jest {
    interface Matchers<R, T> extends ChainMatchers<R> {}
  }
}

// For Bun
declare module 'bun:test' {
  interface Matchers<T> extends ChainMatchers<T> {}
  interface AsymmetricMatchers extends ChainMatchers {}
}

// For other expect-based framework
declare module 'other-expect' {
  interface Matchers<R> extends ChainMatchers<R> {}
}
```

## License

Apache-2.0

Copyright 2026 Charles Francoise
