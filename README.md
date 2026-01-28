# chain-mock

Mock fluent/chainable APIs (Drizzle, Express, D3, Cheerio, ioredis, SuperAgent,
and more) with full call tracking and cross-framework matcher support.

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

> [!WARNING] Bun's `toEqual`, `toBe`, and `toStrictEqual` matchers constrain the
> expected value to match the received type. When testing `mockReturnValue`
> results, use an explicit type parameter:
>
> ```typescript
> chain.mockReturnValue('abc123');
> const result = chain();
>
> // Use explicit type parameter to avoid type error
> expect(result).toEqual<string>('abc123');
> ```

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
// Without chain-mock 😱
vi.mock('./db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([{ id: 42, name: 'Dan' }]),
      })),
    })),
  },
}));

it('finds user by id', async () => {
  const result = await findUserById(42);
  expect(result).toEqual({ id: 42, name: 'Dan' });
  // No way to easily assert on the chain calls
});
```

```typescript
// With chain-mock ✨
vi.mock('./db', () => ({ db: chainMock() }));

const mockDb = chainMocked(db);

it('finds user by id', async () => {
  mockDb.select.from.where.mockResolvedValue([{ id: 42, name: 'Dan' }]);

  const result = await findUserById(42);

  expect(result).toEqual({ id: 42, name: 'Dan' });
  expect(mockDb.select.from.where).toHaveBeenChainCalledWith(
    [],
    [users],
    [eq(users.id, 42)],
  );
});
```

### Express Response

```typescript
// Without chain-mock 😱
it('returns 404 when user not found', async () => {
  const res = { status: vi.fn(() => res), json: vi.fn(() => res) };

  await handleGetUser(
    { params: { id: '999' } } as unknown as Request,
    res as unknown as Response,
  );

  expect(res.status).toHaveBeenCalledWith(404);
  expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
  // Assertions are separate - can't verify the chain order
});
```

```typescript
// With chain-mock ✨
it('returns 404 when user not found', async () => {
  const mockRes = chainMock<Response>();

  await handleGetUser(
    { params: { id: '999' } } as unknown as Request,
    mockRes as unknown as Response,
  );

  expect(mockRes.status.json).toHaveBeenChainCalledWith(
    [404],
    [{ error: 'User not found' }],
  );
});
```

### ioredis Pipeline

```typescript
// Without chain-mock 😱
const mockExpire = vi.fn(() => ({ exec: mockExec }));
const mockHset = vi.fn(() => ({ expire: mockExpire }));

vi.mock('./redis', () => ({ redis: { pipeline: () => ({ hset: mockHset }) } }));

it('caches session', async () => {
  await cacheSession({ userId: '42', token: 'abc' });
  expect(mockHset).toHaveBeenCalledWith('session:42', 'token', 'abc');
  expect(mockExpire).toHaveBeenCalledWith('session:42', 3600);
});
```

```typescript
// With chain-mock ✨
vi.mock('./redis', () => ({ redis: chainMock() }));

const mockRedis = chainMocked(redis);

it('caches session', async () => {
  await cacheSession({ id: '123', data: { name: 'Dan' } });
  expect(mockRedis.pipeline.set.expire.exec).toHaveBeenChainCalledWith(
    [],
    ['123', JSON.stringify({ name: 'Dan' })],
    ['123', 3600],
    [],
  );
});
```

### D3.js

```typescript
// Without chain-mock 😱
const mockAttr2 = vi.fn(() => mockSelection);
const mockAttr = vi.fn(() => ({ attr: mockAttr2 }));
const mockAppend = vi.fn(() => ({ attr: mockAttr }));
const mockEnter = vi.fn(() => ({ append: mockAppend }));
const mockData = vi.fn(() => ({ enter: mockEnter }));
const mockSelectAll = vi.fn(() => ({ data: mockData }));
const mockSelection = { selectAll: mockSelectAll };
vi.mock('d3', () => ({ select: () => mockSelection }));
// ...and we haven't even written the assertions yet
```

```typescript
// With chain-mock ✨
vi.mock('d3', () => ({ select: chainMock() }));

const mockSelect = chainMocked(d3.select);

it('renders bars with correct dimensions', () => {
  renderBarChart('#chart', [10, 20, 30]);

  expect(
    mockSelect.selectAll.data.enter.append.attr.attr,
  ).toHaveBeenChainCalledWith(
    ['.bar'],
    [[10, 20, 30]],
    [],
    ['rect'],
    ['class', 'bar'],
    ['height', expect.any(Function)],
  );
});
```

### Cheerio

```typescript
// Without chain-mock 😱
const mockText = vi.fn(() => '$29.99');
const mockFirst = vi.fn(() => ({ text: mockText }));
const mockFind = vi.fn(() => ({ first: mockFirst }));
const mock$ = vi.fn(() => ({ find: mockFind }));

vi.mock('cheerio', () => ({ load: () => mock$ }));

it('extracts price', async () => {
  const price = await scrapePrice('<html>...</html>');
  expect(mock$).toHaveBeenCalledWith('.product');
  expect(mockFind).toHaveBeenCalledWith('.price');
});
```

```typescript
// With chain-mock ✨
import { chainMock, chainMocked } from 'chain-mock';

const mock$ = chainMock<CheerioAPI>();
vi.mock('cheerio', () => ({ load: () => mock$ }));

it('extracts price', async () => {
  mock$.mockReturnValue('$29.99');

  const price = await scrapePrice('<html>...</html>');

  expect(price).toBe('$29.99');
  expect(mock$.find).toHaveBeenChainCalledWith(['.product'], ['.price']);
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
