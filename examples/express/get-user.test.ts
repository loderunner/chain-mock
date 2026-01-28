import { chainMock, matchers } from 'chain-mock';
import { vi, it, expect } from 'vitest';
import { handleGetUser } from './get-user';
import { Request, Response } from 'express';

expect.extend(matchers);

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
