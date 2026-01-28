import { chainMock, chainMocked, matchers } from 'chain-mock';
import { vi, it, expect } from 'vitest';
import { db } from './db';
import { eq } from 'drizzle-orm';
import { findUserById } from './user-service';
import { users } from './schema';

expect.extend(matchers);

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
