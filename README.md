# chain-mock

Mock fluent/chainable APIs (like Drizzle ORM, Knex, Kysely, etc.) with full call
tracking and cross-framework matcher support (Jest, Vitest, Bun, and more).

## The Problem

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

## The Solution

```typescript
import { chainMock, matchers } from 'chain-mock';
import { expect } from 'vitest';

// Setup (once in your test setup file)
expect.extend(matchers);

// In your test
const dbMock = chainMock<User[]>();
dbMock.mockResolvedValue([{ id: 42, name: 'Dan' }]);

vi.mocked(db.select).mockReturnValue(dbMock);

// Run your code
const result = await getUserById(42);

// Assert with ease ✨
expect(result).toEqual([{ id: 42, name: 'Dan' }]);
expect(dbMock.select).toHaveBeenChainCalled();
expect(dbMock.select.from).toHaveBeenChainCalledWith(users);
expect(dbMock.select.from.where).toHaveBeenChainCalledWith(eq(users.id, 42));
```

## Installation

```bash
npm install -D chain-mock
```

## Setup

### Vitest

#### 1. Matchers Setup

In your `vitest.setup.ts`:

```typescript
import { expect } from 'vitest';
import { matchers } from 'chain-mock';

expect.extend(matchers);
```

#### 2. Type Augmentation via tsconfig.json

```json
{
  "compilerOptions": {
    "types": ["chain-mock/vitest"]
  }
}
```

#### 3. Type Augmentation via Triple-Slash Reference

In your setup file or a global `.d.ts`:

```typescript
/// <reference types="chain-mock/vitest" />
```

#### 4. Manual Type Augmentation

Create `chain-mock.d.ts` in your project:

```typescript
import type { ChainMatchers } from 'chain-mock';

declare module 'vitest' {
  interface Assertion<T = any> extends ChainMatchers<T> {}
  interface AsymmetricMatchersContaining extends ChainMatchers {}
}
```

### Jest

#### 1. Matchers Setup

In your `jest.setup.js` or `jest.setup.ts`:

```typescript
import { matchers } from 'chain-mock';

expect.extend(matchers);
```

#### 2. Type Augmentation via tsconfig.json

```json
{
  "compilerOptions": {
    "types": ["chain-mock/jest"]
  }
}
```

#### 3. Type Augmentation via Triple-Slash Reference

In your setup file or a global `.d.ts`:

```typescript
/// <reference types="chain-mock/jest" />
```

#### 4. Manual Type Augmentation

Create `chain-mock.d.ts` in your project:

```typescript
import type { ChainMatchers } from 'chain-mock';

declare global {
  namespace jest {
    interface Matchers<R> extends ChainMatchers<R> {}
  }
}

export {};
```

For `@jest/globals` (explicit imports):

```typescript
import type { ChainMatchers } from 'chain-mock';

declare module '@jest/expect' {
  interface Matchers<R> extends ChainMatchers<R> {}
}
```

### Bun

#### 1. Matchers Setup

In your test setup file:

```typescript
import { expect } from 'bun:test';
import { matchers } from 'chain-mock';

expect.extend(matchers);
```

#### 2. Type Augmentation via tsconfig.json

```json
{
  "compilerOptions": {
    "types": ["bun", "chain-mock/bun"]
  }
}
```

#### 3. Type Augmentation via Triple-Slash Reference

In your setup file or a global `.d.ts`:

```typescript
/// <reference types="chain-mock/bun" />
```

#### 4. Manual Type Augmentation

Create `chain-mock.d.ts` in your project:

```typescript
import type { ChainMatchers } from 'chain-mock';

declare module 'bun:test' {
  interface Matchers<T> extends ChainMatchers<T> {}
  interface AsymmetricMatchers extends ChainMatchers {}
}
```

### Custom Framework

For any `expect.extend()`-compatible framework not listed above.

#### 1. Matchers Setup

```typescript
import { matchers } from 'chain-mock';

// Your framework's expect
expect.extend(matchers);
```

#### 2. Type Augmentation via tsconfig.json

Not available for custom frameworks - use manual augmentation.

#### 3. Type Augmentation via Triple-Slash Reference

Not available for custom frameworks - use manual augmentation.

#### 4. Manual Type Augmentation

Create `chain-mock.d.ts` in your project, augmenting your framework's matcher
interface:

```typescript
import type { ChainMatchers } from 'chain-mock';

// Replace 'your-framework' and interface names with your framework's equivalents
declare module 'your-framework' {
  interface Matchers<T> extends ChainMatchers<T> {}
}
```

Consult your framework's documentation for the correct module name and interface
to extend. The pattern is the same: extend your framework's `Matchers` interface
with `ChainMatchers`.

## API

### `chainMock<T>()`

Creates a chainable mock instance.

```typescript
const mock = chainMock<User[]>();
```

### Mock Configuration

```typescript
// Set resolved value (for async chains)
mock.mockResolvedValue([{ id: 1 }]);

// Set resolved value for next call only
mock.mockResolvedValueOnce([{ id: 1 }]);
mock.mockResolvedValueOnce([{ id: 2 }]);

// Set return value (for sync usage)
mock.mockReturnValue(value);
mock.mockReturnValueOnce(value);

// Custom implementation
mock.mockImplementation(() => fetchFromApi());

// Reset all mocked values and calls
mock.mockReset();

// Clear calls but keep mocked values
mock.mockClear();
```

### Custom Matchers

After calling `expect.extend(matchers)` in your setup file:

```typescript
expect(mock.method).toHaveBeenChainCalled();
expect(mock.method).toHaveBeenChainCalledTimes(2);
expect(mock.method).toHaveBeenChainCalledWith(arg1, arg2);
expect(mock.method).toHaveBeenLastChainCalledWith(arg);
```

### Direct Access to Calls

You can also access calls directly:

```typescript
expect(mock.method.mock.calls).toHaveLength(2);
expect(mock.method.mock.calls[0]).toEqual([arg1, arg2]);
expect(mock.method.mock.lastCall).toEqual([lastArg]);
```

## Examples

### Drizzle ORM

```typescript
import { chainMock, matchers } from 'chain-mock';
import { expect } from 'vitest';
import { db } from './db';
import { users } from './schema';
import { eq } from 'drizzle-orm';

vi.mock('./db');
expect.extend(matchers);

describe('UserService', () => {
  it('finds user by id', async () => {
    const selectMock = chainMock<User[]>();
    selectMock.mockResolvedValue([{ id: 42, name: 'Dan' }]);
    vi.mocked(db.select).mockReturnValue(selectMock);

    const result = await userService.findById(42);

    expect(result).toEqual({ id: 42, name: 'Dan' });
    expect(selectMock.from).toHaveBeenChainCalledWith(users);
    expect(selectMock.from.where).toHaveBeenChainCalledWith(eq(users.id, 42));
  });

  it('inserts new user', async () => {
    const insertMock = chainMock<User[]>();
    insertMock.mockResolvedValue([{ id: 1, name: 'New User' }]);
    vi.mocked(db.insert).mockReturnValue(insertMock);

    const result = await userService.create({ name: 'New User' });

    expect(insertMock.values).toHaveBeenChainCalledWith({ name: 'New User' });
    expect(insertMock.values.returning).toHaveBeenChainCalled();
  });
});
```

### Knex

```typescript
const knexMock = chainMock<User[]>();
knexMock.mockResolvedValue([{ id: 1, name: 'Test' }]);

vi.mocked(knex).mockReturnValue(knexMock);

await knex('users').where('id', 1).first();

expect(knexMock.where).toHaveBeenChainCalledWith('id', 1);
expect(knexMock.where.first).toHaveBeenChainCalled();
```

### Multiple Sequential Responses

```typescript
const mock = chainMock<number[]>();
mock
  .mockResolvedValueOnce([1, 2, 3])
  .mockResolvedValueOnce([4, 5, 6])
  .mockResolvedValue([]); // Default after queue exhausted

await mock.query(); // [1, 2, 3]
await mock.query(); // [4, 5, 6]
await mock.query(); // []
```

## How It Works

`chainMock` uses JavaScript Proxies to:

1. **Track calls** at every level of the chain
2. **Return itself** for any method call, enabling infinite chaining
3. **Resolve to your mocked value** when awaited
4. **Cache proxy instances** so `mock.select` always returns the same object

The chain tracking is path-based, so `mock.select.from` tracks calls differently
than `mock.select.where`.

## TypeScript

Full TypeScript support with generics:

```typescript
interface User {
  id: number;
  name: string;
}

const mock = chainMock<User[]>();
mock.mockResolvedValue([{ id: 1, name: 'Test' }]);

const result = await mock.query(); // result is User[]
```

## License

MIT
