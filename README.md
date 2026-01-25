# chain-mock

Mock fluent/chainable APIs (like Drizzle ORM, Knex, Kysely, etc.) with full call
tracking and vitest compatibility.

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
import { chainMock, setupChainMockMatchers } from 'chain-mock';

// Setup (once in your test setup file)
setupChainMockMatchers(expect);

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

Add to your test setup file:

```typescript
// vitest.setup.ts
import { expect } from 'vitest';
import { setupChainMockMatchers } from 'chain-mock';

setupChainMockMatchers(expect);
```

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    setupFiles: ['./vitest.setup.ts'],
  },
});
```

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

After calling `setupChainMockMatchers(expect)`:

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
import { chainMock, setupChainMockMatchers } from 'chain-mock';
import { db } from './db';
import { users } from './schema';
import { eq } from 'drizzle-orm';

vi.mock('./db');
setupChainMockMatchers(expect);

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
