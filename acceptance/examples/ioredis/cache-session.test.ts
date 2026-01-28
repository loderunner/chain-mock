import { chainMock, chainMocked, matchers } from 'chain-mock';
import { vi, it, expect } from 'vitest';
import { cacheSession } from './cache-session';
import { redis } from './redis';

expect.extend(matchers);

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
