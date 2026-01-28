# chain-mock

Mock fluent/chainable APIs (Drizzle, Express, D3, Cheerio, ioredis, and more)
with full call tracking and cross-framework matcher support.

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

### Table of Contents

- [Installation](#installation)
- [Framework Setup](#framework-setup)
- [API Reference](#api-reference)
- [Custom Matchers](#custom-matchers)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)
- [License](#license)

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

### Manual Type Augmentation

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

### Callable Root vs. Property Access

The matchers automatically detect whether the root mock was called as a
function. This is useful for APIs like Cheerio where the root is callable
(`$('.selector')`).

**When root is called as a function:** The root call is included as the first
segment in the assertion. Provide an argument array for it:

```typescript
// Cheerio-style: root is called as a function
chain('.product').find('.price').text();

// Root call included - 3 argument arrays for 3 segments
expect(chain.find.text).toHaveBeenChainCalledWith(
  ['.product'], // root call
  ['.price'], // .find()
  [], // .text()
);
```

**When root is accessed as a property:** The root is not included in the
assertion. Provide argument arrays only for the accessed segments:

```typescript
// Drizzle-style: root accessed as property
chain.select('id').from('users').where('active');

// No root call - 3 argument arrays for 3 segments
expect(chain.select.from.where).toHaveBeenChainCalledWith(
  ['id'], // .select()
  ['users'], // .from()
  ['active'], // .where()
);
```

## Examples

### Drizzle ORM

\[ [Full example](examples/drizzle) \] | \[
[Drizzle ORM](https://orm.drizzle.team/) \]

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

\[ [Full example](examples/express) \] | \[ [Express](https://expressjs.com/) \]

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

\[ [Full example](examples/ioredis) \] | \[
[ioredis](https://github.com/redis/ioredis) \]

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

\[ [Full example](examples/d3) \] | \[ [D3.js](https://d3js.org/) \]

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
    ['#chart'],
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

\[ [Full example](examples/cheerio) \] | \[ [Cheerio](https://cheerio.js.org/)
\]

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
const [mock$] = await vi.hoisted(async () => {
  const { chainMock } = await import('chain-mock');
  return [chainMock<cheerio.CheerioAPI>()];
});
vi.mock('cheerio', () => ({ load: () => mock$ }));

it('extracts price', async () => {
  mock$.find.text.mockReturnValue('$29.99' as any);

  const price = await scrapePrice(`<html>...</html>`);

  expect(price).toBe('$29.99');
  expect(mock$.find.text).toHaveBeenChainCalledWith(
    ['.product'],
    ['.price'],
    [],
  );
});
```

## Troubleshooting

### "Argument of type 'X' is not assignable to parameter of type 'Y'" (Bun)

Bun's `toEqual`, `toBe`, and `toStrictEqual` matchers use TypeScript's `NoInfer`
utility to constrain the expected value to match the received type. When a
ChainMock is called, the return type is `ChainMock<T>`, not the underlying value
type.

**Solution:** Add an explicit type parameter to the matcher:

```typescript
const mock = chainMock();
mock.mockReturnValue('hello');
const result = mock();

// ❌ Error: Argument of type 'string' is not assignable...
expect(result).toEqual('hello');

// ✅ Fix: add explicit type parameter
expect(result).toEqual<string>('hello');
```

See [Bun Matchers.toEqual](https://bun.sh/docs/test/writing#toequal) for more
details.

### Async function returns `undefined` instead of ChainMock

ChainMock implements `PromiseLike`, so when returned from an async function,
JavaScript automatically awaits it and resolves to its mocked value (or
`undefined` if no value was configured).

**Solution:** Wrap the ChainMock in a tuple or object to prevent automatic
resolution.

```typescript
// Test helper that loads fixtures and creates a configured mock
async function setupDbMock() {
  const fixtures = await loadFixtures('./users.json');

  const mock = chainMock();
  mock.select.from.where.mockResolvedValue(fixtures);

  return mock; // ❌ Awaited and resolved to undefined!
}

it('queries users', async () => {
  const db = await setupDbMock();
  db.select('*').from('users'); // ❌ Error: db is undefined
});

// Fix: wrap in tuple
async function setupDbMock() {
  const fixtures = await loadFixtures('./users.json');

  const mock = chainMock();
  mock.select.from.where.mockResolvedValue(fixtures);

  return [mock] as const; // ✅ Tuple prevents resolution
}

it('queries users', async () => {
  const [db] = await setupDbMock();
  db.select('*').from('users'); // ✅ Works!
});
```

### "Cannot access '\_\_vi_import_0\_\_' before initialization" (Vitest)

`vi.mock()` is hoisted to the top of the file, before any imports are evaluated.
If you try to use `chainMock` from a static import inside `vi.mock()` or
`vi.hoisted()`, the import hasn't been initialized yet.

**Solution:** Use `vi.hoisted()` with a dynamic `import()` and wrap the mock in
a tuple:

```typescript
// ❌ Wrong: static import is not available in hoisted code
import { chainMock } from 'chain-mock';
const mock = vi.hoisted(() => chainMock()); // Error!

// ✅ Correct: use dynamic import inside vi.hoisted
const [mock] = await vi.hoisted(async () => {
  const { chainMock } = await import('chain-mock');
  return [chainMock()];
});

vi.mock('./module', () => ({ fn: mock }));
```

See [Vitest vi.hoisted](https://vitest.dev/api/vi.html#vi-hoisted) for more
details.

## License

Apache-2.0

Copyright 2026 Charles Francoise
