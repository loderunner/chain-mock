import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type ChainMock, chainMock, isChainMock } from './mock';

describe('chainMock', () => {
  let chain: ChainMock;

  beforeEach(() => {
    chain = chainMock();
  });

  describe('basic chaining', () => {
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
      chain.mockResolvedValue([{ id: 42, name: 'Dan' }]);

      const result = await chain.select('id').from('users');
      expect(result).toEqual([{ id: 42, name: 'Dan' }]);
    });

    it('can be set on any path', async () => {
      chain.select.from.where.mockResolvedValue([{ id: 42, name: 'Dan' }]);

      const result = await chain
        .select('id', 'name')
        .from('users')
        .where('id = 42');
      expect(result).toEqual([{ id: 42, name: 'Dan' }]);
    });

    it('resolves to same value from any point in chain', async () => {
      chain.mockResolvedValue([{ id: 1 }]);

      const result1 = await chain.select('id').from('users');
      const result2 = await chain
        .select('id')
        .from('users')
        .where('active = true');
      const result3 = await chain.select('id').from('users').limit(10);

      expect(result1).toEqual([{ id: 1 }]);
      expect(result2).toEqual([{ id: 1 }]);
      expect(result3).toEqual([{ id: 1 }]);
    });
  });

  describe('mockResolvedValueOnce', () => {
    it('resolves different values in sequence', async () => {
      chain
        .mockResolvedValueOnce([{ id: 1, name: 'First' }])
        .mockResolvedValueOnce([{ id: 2, name: 'Second' }]);

      const result1 = await chain.select('name').from('users');
      const result2 = await chain.select('name').from('users');

      expect(result1).toEqual([{ id: 1, name: 'First' }]);
      expect(result2).toEqual([{ id: 2, name: 'Second' }]);
    });

    it('falls back to mockResolvedValue after queue is exhausted', async () => {
      chain
        .mockResolvedValueOnce([{ special: true }])
        .mockResolvedValue([{ default: true }]);

      const result1 = await chain.select('*').from('config');
      const result2 = await chain.select('*').from('config');
      const result3 = await chain.select('*').from('config');

      expect(result1).toEqual([{ special: true }]);
      expect(result2).toEqual([{ default: true }]);
      expect(result3).toEqual([{ default: true }]);
    });

    it('works on specific paths', async () => {
      chain.select.from.where
        .mockResolvedValueOnce([{ first: true }])
        .mockResolvedValue([{ default: true }]);

      const result1 = await chain.select('id').from('users').where('id = 1');
      const result2 = await chain.select('id').from('users').where('id = 2');

      expect(result1).toEqual([{ first: true }]);
      expect(result2).toEqual([{ default: true }]);
    });
  });

  describe('mockRejectedValue', () => {
    it('rejects with the error when awaited', async () => {
      const error = new Error('Database connection failed');
      chain.mockRejectedValue(error);

      await expect(chain.select('id').from('users')).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('rejects on every await', async () => {
      chain.mockRejectedValue(new Error('fail'));

      await expect(chain.select('a').from('x')).rejects.toThrow('fail');
      await expect(chain.select('b').from('y')).rejects.toThrow('fail');
    });

    it('can be set on any path', async () => {
      chain.select.from.where.mockRejectedValue(new Error('where failed'));

      await expect(
        chain.select('id').from('users').where('id = 42'),
      ).rejects.toThrow('where failed');
    });
  });

  describe('mockRejectedValueOnce', () => {
    it('rejects once then falls back to resolved', async () => {
      chain
        .mockRejectedValueOnce(new Error('temporary failure'))
        .mockResolvedValue([{ id: 1 }]);

      await expect(chain.select('id').from('users')).rejects.toThrow(
        'temporary failure',
      );

      const result = await chain.select('id').from('users');
      expect(result).toEqual([{ id: 1 }]);
    });

    it('rejects in sequence', async () => {
      chain
        .mockRejectedValueOnce(new Error('first error'))
        .mockRejectedValueOnce(new Error('second error'))
        .mockResolvedValue([{ success: true }]);

      await expect(chain.select('*').from('x')).rejects.toThrow('first error');
      await expect(chain.select('*').from('x')).rejects.toThrow('second error');

      const result = await chain.select('*').from('x');
      expect(result).toEqual([{ success: true }]);
    });
  });

  describe('mockReturnValue', () => {
    it('returns value synchronously', () => {
      chain.digest.mockReturnValue('hash');

      const result = chain.append('data').digest();
      expect(result).toBe('hash');
      expect(result).not.toBe(chain.digest);
    });

    it('can be set on any path', () => {
      chain.select.from.where.mockReturnValue({ id: 42 });

      const result = chain.select('id').from('users').where('id = 42');
      expect(result).toEqual({ id: 42 });
      expect(result).not.toBe(chain.select.from.where);
    });
  });

  describe('mockReturnValueOnce', () => {
    it('returns different values in sequence', () => {
      chain.digest.mockReturnValueOnce('hash1');
      chain.digest.mockReturnValueOnce('hash2');

      const result1 = chain.append('data1').digest();
      const result2 = chain.append('data2').digest();

      expect(result1).toBe('hash1');
      expect(result2).toBe('hash2');
    });

    it('falls back to proxy after queue is exhausted', () => {
      chain.digest.mockReturnValueOnce('hash');

      const result1 = chain.append('data').digest();
      expect(result1).toBe('hash');

      // After queue is exhausted, returns proxy for chaining
      const result2 = chain.append('data').digest();
      expect(result2).not.toBe('hash');
      expect(result2._isMockFunction).toBe(true);
      expect(result2).toBe(chain.append.digest);
    });
  });

  describe('mockImplementation', () => {
    it('uses custom implementation', async () => {
      chain.mockImplementation(() => ({ custom: true }));

      const result = await chain.select('id');
      expect(result).toEqual({ custom: true });
    });

    it('can be set on any path', async () => {
      chain.select.from.where.mockImplementation(() => ({ fromWhere: true }));

      const result = await chain.select('id').from('users').where('id = 42');
      expect(result).toEqual({ fromWhere: true });
    });

    it('receives call arguments', async () => {
      chain.select.mockImplementation((...args: any[]) => ({ args }));

      const result = await chain.select('id', 'name');
      expect(result).toEqual({ args: ['id', 'name'] });
    });

    it('returns synchronous value', () => {
      chain.digest.mockImplementation(() => 'hash-value');

      const result = chain.append('data').digest();
      expect(result).toBe('hash-value');
    });

    it('returns resolved promise when implementation returns promise', async () => {
      chain.select.mockImplementation(() => Promise.resolve({ async: true }));

      const result = await chain.select('id');
      expect(result).toEqual({ async: true });
    });

    it('handles promise rejection in implementation', async () => {
      chain.select.mockImplementation(() =>
        Promise.reject(new Error('implementation error')),
      );

      await expect(chain.select('id')).rejects.toThrow('implementation error');
    });

    it('throws synchronously when implementation throws', () => {
      chain.digest.mockImplementation(() => {
        throw new Error('sync error');
      });

      expect(() => chain.append('data').digest()).toThrow('sync error');
    });
  });

  describe('mockImplementationOnce', () => {
    it('uses implementation once then falls back', async () => {
      chain
        .mockImplementationOnce(() => ({ first: true }))
        .mockImplementation(() => ({ default: true }));

      const result1 = await chain.select();
      const result2 = await chain.select();

      expect(result1).toEqual({ first: true });
      expect(result2).toEqual({ default: true });
    });

    it('returns synchronous value', () => {
      chain.digest.mockImplementationOnce(() => 'hash-once');

      const result = chain.append('data').digest();
      expect(result).toBe('hash-once');
      // Chain is broken - digest() returned a value, not the proxy
    });

    it('returns synchronous value then falls back to proxy', () => {
      chain.digest.mockImplementationOnce(() => 'hash-once');

      const result1 = chain.append('data1').digest();
      expect(result1).toBe('hash-once');

      const result2 = chain.append('data2').digest();
      expect(result2).not.toBe('hash-once');
      expect(result2._isMockFunction).toBe(true);
      expect(result2).toBe(chain.append.digest);
    });

    it('returns resolved promise when implementation returns promise', async () => {
      chain.select.mockImplementationOnce(() =>
        Promise.resolve({ asyncOnce: true }),
      );

      const result = await chain.select('id');
      expect(result).toEqual({ asyncOnce: true });
    });

    it('handles promise rejection in implementation', async () => {
      chain.select.mockImplementationOnce(() =>
        Promise.reject(new Error('once error')),
      );

      await expect(chain.select('id')).rejects.toThrow('once error');
    });

    it('throws synchronously when implementation throws', () => {
      chain.digest.mockImplementationOnce(() => {
        throw new Error('once sync error');
      });

      expect(() => chain.append('data').digest()).toThrow('once sync error');
    });

    it('mixes sync and async implementations', async () => {
      chain.select
        .mockImplementationOnce(() => 'sync-value')
        .mockImplementationOnce(() => Promise.resolve('async-value'));

      const result1 = chain.select();
      expect(result1).toBe('sync-value');

      const result2 = await chain.select();
      expect(result2).toBe('async-value');
    });

    it('falls back to default implementation after queue is exhausted', async () => {
      chain.select
        .mockImplementationOnce(() => 'once-value')
        .mockImplementation(() => 'default-value');

      const result1 = chain.select();
      expect(result1).toBe('once-value');

      const result2 = chain.select();
      expect(result2).toBe('default-value');

      const result3 = chain.select();
      expect(result3).toBe('default-value');
    });
  });

  describe('mockReset', () => {
    it('clears all mocked values and calls', async () => {
      chain.mockResolvedValue([{ id: 1 }]);
      chain.select('id').from('users');

      expect(chain.select.from.mock.calls).toHaveLength(1);

      chain.mockReset();

      expect(chain.select.from.mock.calls).toHaveLength(0);

      const result = await chain.select('id').from('users');
      expect(result).toBeUndefined();
    });

    it('throws error when called on nested path', () => {
      chain.select.from.where.mockResolvedValue([{ id: 1 }]);
      chain.select('id').from('users').where('id = 42');

      expect(() => {
        chain.select.from.where.mockReset();
      }).toThrow('mockReset() on a nested chain path');

      // Calls should still be there since reset failed
      expect(chain.select.from.where.mock.calls).toHaveLength(1);
    });
  });

  describe('mockClear', () => {
    it('clears calls but keeps mocked values', async () => {
      chain.mockResolvedValue([{ preserved: true }]);
      chain.select('id').from('users');

      chain.mockClear();

      expect(chain.select.from.mock.calls).toHaveLength(0);

      const result = await chain.select('id').from('users');
      expect(result).toEqual([{ preserved: true }]);
    });

    it('throws error when called on nested path', () => {
      chain.select.from.where.mockResolvedValue([{ id: 1 }]);
      chain.select('id').from('users').where('id = 42');

      expect(() => {
        chain.select.from.where.mockClear();
      }).toThrow('mockClear() on a nested chain path');

      // Calls should still be there since clear failed
      expect(chain.select.from.where.mock.calls).toHaveLength(1);
    });
  });

  describe('mockName and getMockName', () => {
    it('sets and gets mock name', () => {
      expect(chain.getMockName()).toBe('chainMock()');

      chain.mockName('myMock');
      expect(chain.getMockName()).toBe('myMock');
    });

    it('works on specific paths', () => {
      chain.select.from.where.mockName('selectFromWhere');

      expect(chain.select.from.where.getMockName()).toBe('selectFromWhere');
      expect(chain.select.getMockName()).toBe('chainMock()'); // Other paths unchanged
    });
  });
});

describe('isChainMock', () => {
  it('returns true for chainMock instances', () => {
    const mock = chainMock();
    expect(isChainMock(mock)).toBe(true);

    const typedMock = chainMock<{ foo: string }>();
    expect(isChainMock(typedMock)).toBe(true);

    const nestedMock = mock.select.from.where;
    expect(isChainMock(nestedMock)).toBe(true);
  });

  it('returns false for non-ChainMock values', () => {
    expect(isChainMock(null)).toBe(false);
    expect(isChainMock(undefined)).toBe(false);
    expect(isChainMock(42)).toBe(false);
    expect(isChainMock('string')).toBe(false);
    expect(isChainMock({})).toBe(false);
    expect(isChainMock([])).toBe(false);
    expect(isChainMock(() => {})).toBe(false);
    expect(isChainMock({ _isMockFunction: true })).toBe(false);
    expect(isChainMock({ _isMockFunction: false })).toBe(false);
    expect(isChainMock(vi.fn())).toBe(false);
  });
});
