import { beforeEach, describe, expect, it } from 'vitest';

import { chainMock } from './mock';

describe('chainMock', () => {
  describe('basic chaining', () => {
    let chain: ReturnType<typeof chainMock>;

    beforeEach(() => {
      chain = chainMock();
    });

    it('is callable', () => {
      expect(chain()).toBe(chain);
    });

    it('allows any chain of methods', () => {
      const result = chain.any.chain.of.methods().works();
      expect(result).toBe(chain.any.chain.of.methods.works);
    });

    it('tracks calls on root', () => {
      chain('arg1');
      chain('arg2');

      expect(chain.mock.calls).toHaveLength(2);
      expect(chain.mock.calls[0]).toEqual(['arg1']);
      expect(chain.mock.calls[1]).toEqual(['arg2']);
    });

    it('tracks calls on chain paths', () => {
      chain.select('id').from('users').where('id = 42');

      expect(chain.select.mock.calls).toHaveLength(1);
      expect(chain.select.mock.calls[0]).toEqual(['id']);

      expect(chain.select.from.mock.calls).toHaveLength(1);
      expect(chain.select.from.mock.calls[0]).toEqual(['users']);

      expect(chain.select.from.where.mock.calls).toHaveLength(1);
      expect(chain.select.from.where.mock.calls[0]).toEqual(['id = 42']);
    });

    it('tracks multiple calls to same path', () => {
      chain.select('id').from('users');
      chain.select('name').from('posts');
      chain.select('*').from('comments');

      expect(chain.select.from.mock.calls).toHaveLength(3);
      expect(chain.select.from.mock.calls).toEqual([
        ['users'],
        ['posts'],
        ['comments'],
      ]);
    });

    it('provides lastCall helper', () => {
      chain.select('a').from('x');
      chain.select('b').from('y');
      expect(chain.select.mock.lastCall).toEqual(['b']);
      expect(chain.select.from.mock.lastCall).toEqual(['y']);

      chain.select('c').from('z');
      expect(chain.select.mock.lastCall).toEqual(['c']);
      expect(chain.select.from.mock.lastCall).toEqual(['z']);
    });
  });

  describe('mockResolvedValue', () => {
    it('can be set on root', async () => {
      const mock = chainMock();
      mock.mockResolvedValue([{ id: 42, name: 'Dan' }]);

      const result = await mock.select('id').from('users');
      expect(result).toEqual([{ id: 42, name: 'Dan' }]);
    });

    it('can be set on any path', async () => {
      const mock = chainMock();
      mock.select.from.where.mockResolvedValue([{ id: 42, name: 'Dan' }]);

      const result = await mock
        .select('id', 'name')
        .from('users')
        .where('id = 42');
      expect(result).toEqual([{ id: 42, name: 'Dan' }]);
    });

    it('resolves to same value from any point in chain', async () => {
      const mock = chainMock();
      mock.mockResolvedValue([{ id: 1 }]);

      const result1 = await mock.select('id').from('users');
      const result2 = await mock
        .select('id')
        .from('users')
        .where('active = true');
      const result3 = await mock.select('id').from('users').limit(10);

      expect(result1).toEqual([{ id: 1 }]);
      expect(result2).toEqual([{ id: 1 }]);
      expect(result3).toEqual([{ id: 1 }]);
    });
  });

  describe('mockResolvedValueOnce', () => {
    it('resolves different values in sequence', async () => {
      const mock = chainMock();
      mock
        .mockResolvedValueOnce([{ id: 1, name: 'First' }])
        .mockResolvedValueOnce([{ id: 2, name: 'Second' }]);

      const result1 = await mock.select('name').from('users');
      const result2 = await mock.select('name').from('users');

      expect(result1).toEqual([{ id: 1, name: 'First' }]);
      expect(result2).toEqual([{ id: 2, name: 'Second' }]);
    });

    it('falls back to mockResolvedValue after queue is exhausted', async () => {
      const mock = chainMock();
      mock
        .mockResolvedValueOnce([{ special: true }])
        .mockResolvedValue([{ default: true }]);

      const result1 = await mock.select('*').from('config');
      const result2 = await mock.select('*').from('config');
      const result3 = await mock.select('*').from('config');

      expect(result1).toEqual([{ special: true }]);
      expect(result2).toEqual([{ default: true }]);
      expect(result3).toEqual([{ default: true }]);
    });

    it('works on specific paths', async () => {
      const mock = chainMock();
      mock.select.from.where
        .mockResolvedValueOnce([{ first: true }])
        .mockResolvedValue([{ default: true }]);

      const result1 = await mock.select('id').from('users').where('id = 1');
      const result2 = await mock.select('id').from('users').where('id = 2');

      expect(result1).toEqual([{ first: true }]);
      expect(result2).toEqual([{ default: true }]);
    });
  });

  describe('mockRejectedValue', () => {
    it('rejects with the error when awaited', async () => {
      const mock = chainMock();
      const error = new Error('Database connection failed');
      mock.mockRejectedValue(error);

      await expect(mock.select('id').from('users')).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('rejects on every await', async () => {
      const mock = chainMock();
      mock.mockRejectedValue(new Error('fail'));

      await expect(mock.select('a').from('x')).rejects.toThrow('fail');
      await expect(mock.select('b').from('y')).rejects.toThrow('fail');
    });

    it('can be set on any path', async () => {
      const mock = chainMock();
      mock.select.from.where.mockRejectedValue(new Error('where failed'));

      await expect(
        mock.select('id').from('users').where('id = 42'),
      ).rejects.toThrow('where failed');
    });
  });

  describe('mockRejectedValueOnce', () => {
    it('rejects once then falls back to resolved', async () => {
      const mock = chainMock();
      mock
        .mockRejectedValueOnce(new Error('temporary failure'))
        .mockResolvedValue([{ id: 1 }]);

      await expect(mock.select('id').from('users')).rejects.toThrow(
        'temporary failure',
      );

      const result = await mock.select('id').from('users');
      expect(result).toEqual([{ id: 1 }]);
    });

    it('rejects in sequence', async () => {
      const mock = chainMock();
      mock
        .mockRejectedValueOnce(new Error('first error'))
        .mockRejectedValueOnce(new Error('second error'))
        .mockResolvedValue([{ success: true }]);

      await expect(mock.select('*').from('x')).rejects.toThrow('first error');
      await expect(mock.select('*').from('x')).rejects.toThrow('second error');

      const result = await mock.select('*').from('x');
      expect(result).toEqual([{ success: true }]);
    });
  });

  describe('mockReturnValue', () => {
    it('returns value synchronously', () => {
      const mock = chainMock();
      mock.digest.mockReturnValue('hash');

      const result = mock.append('data').digest();
      expect(result).toBe('hash');
      expect(result).not.toBe(mock.digest);
    });

    it('can be set on any path', () => {
      const mock = chainMock();
      mock.select.from.where.mockReturnValue({ id: 42 });

      const result = mock.select('id').from('users').where('id = 42');
      expect(result).toEqual({ id: 42 });
      expect(result).not.toBe(mock.select.from.where);
    });
  });

  describe('mockReturnValueOnce', () => {
    it('returns different values in sequence', () => {
      const mock = chainMock();
      mock.digest.mockReturnValueOnce('hash1');
      mock.digest.mockReturnValueOnce('hash2');

      const result1 = mock.append('data1').digest();
      const result2 = mock.append('data2').digest();

      expect(result1).toBe('hash1');
      expect(result2).toBe('hash2');
    });

    it('falls back to proxy after queue is exhausted', () => {
      const mock = chainMock();
      mock.digest.mockReturnValueOnce('hash');

      const result1 = mock.append('data').digest();
      expect(result1).toBe('hash');

      // After queue is exhausted, returns proxy for chaining
      const result2 = mock.append('data').digest();
      expect(result2).not.toBe('hash');
      expect(result2._isMockFunction).toBe(true);
      expect(result2).toBe(mock.append.digest);
    });
  });

  describe('mockImplementation', () => {
    it('uses custom implementation', async () => {
      const mock = chainMock();
      mock.mockImplementation(() => ({ custom: true }));

      const result = await mock.select('id');
      expect(result).toEqual({ custom: true });
    });

    it('can be set on any path', async () => {
      const mock = chainMock();
      mock.select.from.where.mockImplementation(() => ({ fromWhere: true }));

      const result = await mock.select('id').from('users').where('id = 42');
      expect(result).toEqual({ fromWhere: true });
    });

    it('receives call arguments', async () => {
      const mock = chainMock();
      mock.select.mockImplementation((...args: any[]) => ({ args }));

      const result = await mock.select('id', 'name');
      expect(result).toEqual({ args: ['id', 'name'] });
    });

    it('returns synchronous value', () => {
      const mock = chainMock();
      mock.digest.mockImplementation(() => 'hash-value');

      const result = mock.append('data').digest();
      expect(result).toBe('hash-value');
    });

    it('returns resolved promise when implementation returns promise', async () => {
      const mock = chainMock();
      mock.select.mockImplementation(() => Promise.resolve({ async: true }));

      const result = await mock.select('id');
      expect(result).toEqual({ async: true });
    });

    it('handles promise rejection in implementation', async () => {
      const mock = chainMock();
      mock.select.mockImplementation(() =>
        Promise.reject(new Error('implementation error')),
      );

      await expect(mock.select('id')).rejects.toThrow('implementation error');
    });

    it('throws synchronously when implementation throws', () => {
      const mock = chainMock();
      mock.digest.mockImplementation(() => {
        throw new Error('sync error');
      });

      expect(() => mock.append('data').digest()).toThrow('sync error');
    });
  });

  describe('mockImplementationOnce', () => {
    it('uses implementation once then falls back', async () => {
      const mock = chainMock();
      mock
        .mockImplementationOnce(() => ({ first: true }))
        .mockImplementation(() => ({ default: true }));

      const result1 = await mock.select();
      const result2 = await mock.select();

      expect(result1).toEqual({ first: true });
      expect(result2).toEqual({ default: true });
    });

    it('returns synchronous value', () => {
      const mock = chainMock();
      mock.digest.mockImplementationOnce(() => 'hash-once');

      const result = mock.append('data').digest();
      expect(result).toBe('hash-once');
      // Chain is broken - digest() returned a value, not the proxy
    });

    it('returns synchronous value then falls back to proxy', () => {
      const mock = chainMock();
      mock.digest.mockImplementationOnce(() => 'hash-once');

      const result1 = mock.append('data1').digest();
      expect(result1).toBe('hash-once');

      const result2 = mock.append('data2').digest();
      expect(result2).not.toBe('hash-once');
      expect(result2._isMockFunction).toBe(true);
      expect(result2).toBe(mock.append.digest);
    });

    it('returns resolved promise when implementation returns promise', async () => {
      const mock = chainMock();
      mock.select.mockImplementationOnce(() =>
        Promise.resolve({ asyncOnce: true }),
      );

      const result = await mock.select('id');
      expect(result).toEqual({ asyncOnce: true });
    });

    it('handles promise rejection in implementation', async () => {
      const mock = chainMock();
      mock.select.mockImplementationOnce(() =>
        Promise.reject(new Error('once error')),
      );

      await expect(mock.select('id')).rejects.toThrow('once error');
    });

    it('throws synchronously when implementation throws', () => {
      const mock = chainMock();
      mock.digest.mockImplementationOnce(() => {
        throw new Error('once sync error');
      });

      expect(() => mock.append('data').digest()).toThrow('once sync error');
    });

    it('mixes sync and async implementations', async () => {
      const mock = chainMock();
      mock.select
        .mockImplementationOnce(() => 'sync-value')
        .mockImplementationOnce(() => Promise.resolve('async-value'));

      const result1 = mock.select();
      expect(result1).toBe('sync-value');

      const result2 = await mock.select();
      expect(result2).toBe('async-value');
    });

    it('falls back to default implementation after queue is exhausted', async () => {
      const mock = chainMock();
      mock.select
        .mockImplementationOnce(() => 'once-value')
        .mockImplementation(() => 'default-value');

      const result1 = mock.select();
      expect(result1).toBe('once-value');

      const result2 = mock.select();
      expect(result2).toBe('default-value');

      const result3 = mock.select();
      expect(result3).toBe('default-value');
    });
  });

  describe('mockReset', () => {
    it('clears all mocked values and calls', async () => {
      const mock = chainMock();
      mock.mockResolvedValue([{ id: 1 }]);
      mock.select('id').from('users');

      expect(mock.select.from.mock.calls).toHaveLength(1);

      mock.mockReset();

      expect(mock.select.from.mock.calls).toHaveLength(0);

      const result = await mock.select('id').from('users');
      expect(result).toBeUndefined();
    });

    it('works on specific paths', () => {
      const mock = chainMock();
      mock.select.from.where.mockResolvedValue([{ id: 1 }]);
      mock.select('id').from('users').where('id = 42');

      expect(mock.select.from.where.mock.calls).toHaveLength(1);

      mock.select.from.where.mockReset();

      expect(mock.select.from.where.mock.calls).toHaveLength(0);
      expect(mock.select.from.mock.calls).toHaveLength(1); // Other paths unchanged
    });
  });

  describe('mockClear', () => {
    it('clears calls but keeps mocked values', async () => {
      const mock = chainMock();
      mock.mockResolvedValue([{ preserved: true }]);
      mock.select('id').from('users');

      mock.mockClear();

      expect(mock.select.from.mock.calls).toHaveLength(0);

      const result = await mock.select('id').from('users');
      expect(result).toEqual([{ preserved: true }]);
    });

    it('works on specific paths', () => {
      const mock = chainMock();
      mock.select.from.where.mockResolvedValue([{ id: 1 }]);
      mock.select('id').from('users').where('id = 42');

      mock.select.from.where.mockClear();

      expect(mock.select.from.where.mock.calls).toHaveLength(0);
      expect(mock.select.from.mock.calls).toHaveLength(1); // Other paths unchanged
    });
  });

  describe('mockName and getMockName', () => {
    it('sets and gets mock name', () => {
      const mock = chainMock();
      expect(mock.getMockName()).toBe('chainMock()');

      mock.mockName('myMock');
      expect(mock.getMockName()).toBe('myMock');
    });

    it('works on specific paths', () => {
      const mock = chainMock();
      mock.select.from.where.mockName('selectFromWhere');

      expect(mock.select.from.where.getMockName()).toBe('selectFromWhere');
      expect(mock.select.getMockName()).toBe('chainMock()'); // Other paths unchanged
    });
  });
});
