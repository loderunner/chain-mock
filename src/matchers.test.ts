import { beforeEach, describe, expect, it } from 'vitest';

import { chainMatchers } from './matchers';
import { type ChainMock, chainMock } from './mock';

// Extend expect with chain matchers
expect.extend(chainMatchers);

describe('chain matchers', () => {
  describe('toHaveBeenChainCalled', () => {
    let chain: ChainMock;

    beforeEach(() => {
      chain = chainMock();
    });

    it('passes when all segments called expected number of times', () => {
      chain.select('id').from('users').where('active');
      chain.select('name').from('posts').where('published');

      expect(chain.select.from.where).toHaveBeenChainCalled(2);
    });

    it('fails when segment call counts mismatch', () => {
      chain.select('id').from('users').where('active');
      chain.select('name').from('posts');

      expect(() => {
        expect(chain.select.from.where).toHaveBeenChainCalled(2);
      }).toThrow();
    });

    it('fails when no calls made', () => {
      expect(() => {
        expect(chain.select.from.where).toHaveBeenChainCalled(1);
      }).toThrow();
    });

    it('works with not', () => {
      chain.select('id').from('users').where('active');
      expect(chain.select.from.where).not.toHaveBeenChainCalled(2);
    });

    it('fails on root mock', () => {
      expect(() => {
        chain();
        expect(chain).toHaveBeenChainCalled(1);
      }).toThrow();
    });
  });

  describe('toHaveBeenChainCalledOnce', () => {
    let chain: ChainMock;

    beforeEach(() => {
      chain = chainMock();
    });

    it('passes when all segments called once', () => {
      chain.select('id').from('users').where('active');

      expect(chain.select.from.where).toHaveBeenChainCalledOnce();
    });

    it('fails when called multiple times', () => {
      chain.select('id').from('users').where('active');
      chain.select('name').from('posts').where('published');

      expect(() => {
        expect(chain.select.from.where).toHaveBeenChainCalledOnce();
      }).toThrow();
    });

    it('fails when not called', () => {
      expect(() => {
        expect(chain.select.from.where).toHaveBeenChainCalledOnce();
      }).toThrow();
    });

    it('works with not', () => {
      expect(chain.select.from.where).not.toHaveBeenChainCalledOnce();

      chain.select('id').from('users').where('active');
      chain.select('name').from('posts').where('published');
      expect(chain.select.from.where).not.toHaveBeenChainCalledOnce();
    });
  });

  describe('toHaveBeenChainCalledWith', () => {
    let chain: ChainMock;

    beforeEach(() => {
      chain = chainMock();
    });

    it('passes when last calls match', () => {
      chain.select('id').from('users').where('active');
      chain.select('name').from('posts').where('published');

      expect(chain.select.from.where).toHaveBeenChainCalledWith(
        ['name'],
        ['posts'],
        ['published'],
      );
    });

    it('fails when args mismatch', () => {
      chain.select('id').from('users').where('active');

      expect(() => {
        expect(chain.select.from.where).toHaveBeenChainCalledWith(
          ['id'],
          ['users'],
          ['inactive'],
        );
      }).toThrow();
    });

    it('fails when wrong number of args provided', () => {
      chain.select('id').from('users').where('active');

      expect(() => {
        expect(chain.select.from.where).toHaveBeenChainCalledWith(
          ['id'],
          ['users'],
        );
      }).toThrow();
    });

    it('fails when segment never called', () => {
      chain.select('id').from('users');
      // where never called

      expect(() => {
        expect(chain.select.from.where).toHaveBeenChainCalledWith(
          ['id'],
          ['users'],
          ['active'],
        );
      }).toThrow();
    });

    it('works with not', () => {
      chain.select('id').from('users').where('active');

      expect(chain.select.from.where).not.toHaveBeenChainCalledWith(
        ['id'],
        ['users'],
        ['inactive'],
      );
    });

    it('handles complex arguments', () => {
      chain.select('id', 'name').from('users').where({ active: true });

      expect(chain.select.from.where).toHaveBeenChainCalledWith(
        ['id', 'name'],
        ['users'],
        [{ active: true }],
      );
    });
  });

  describe('toHaveBeenNthChainCalledWith', () => {
    let chain: ChainMock;

    beforeEach(() => {
      chain = chainMock();
    });

    it('passes when nth calls match', () => {
      chain.select('id').from('users').where('active');
      chain.select('name').from('posts').where('published');

      expect(chain.select.from.where).toHaveBeenNthChainCalledWith(
        1,
        ['id'],
        ['users'],
        ['active'],
      );

      expect(chain.select.from.where).toHaveBeenNthChainCalledWith(
        2,
        ['name'],
        ['posts'],
        ['published'],
      );
    });

    it('fails when nth call args mismatch', () => {
      chain.select('id').from('users').where('active');
      chain.select('name').from('posts').where('published');

      expect(() => {
        expect(chain.select.from.where).toHaveBeenNthChainCalledWith(
          2,
          ['id'],
          ['users'],
          ['active'],
        );
      }).toThrow();
    });

    it('fails when nth call does not exist', () => {
      chain.select('id').from('users').where('active');

      expect(() => {
        expect(chain.select.from.where).toHaveBeenNthChainCalledWith(
          2,
          ['id'],
          ['users'],
          ['active'],
        );
      }).toThrow();
    });

    it('fails when n < 1', () => {
      chain.select('id').from('users').where('active');

      expect(() => {
        expect(chain.select.from.where).toHaveBeenNthChainCalledWith(
          0,
          ['id'],
          ['users'],
          ['active'],
        );
      }).toThrow();
    });

    it('fails when wrong number of args provided', () => {
      chain.select('id').from('users').where('active');

      expect(() => {
        expect(chain.select.from.where).toHaveBeenNthChainCalledWith(
          1,
          ['id'],
          ['users'],
        );
      }).toThrow();
    });

    it('works with not', () => {
      chain.select('id').from('users').where('active');
      expect(chain.select.from.where).not.toHaveBeenNthChainCalledWith(
        1,
        ['id'],
        ['users'],
        ['inactive'],
      );
    });
  });

  describe('toHaveBeenLastChainCalledWith', () => {
    let chain: ChainMock;

    beforeEach(() => {
      chain = chainMock();
    });

    it('passes when last calls match', () => {
      chain.select('id').from('users').where('active');
      chain.select('name').from('posts').where('published');

      expect(chain.select.from.where).toHaveBeenLastChainCalledWith(
        ['name'],
        ['posts'],
        ['published'],
      );
    });

    it('is equivalent to toHaveBeenChainCalledWith', () => {
      chain.select('id').from('users').where('active');
      chain.select('name').from('posts').where('published');

      expect(chain.select.from.where).toHaveBeenChainCalledWith(
        ['name'],
        ['posts'],
        ['published'],
      );

      expect(chain.select.from.where).toHaveBeenLastChainCalledWith(
        ['name'],
        ['posts'],
        ['published'],
      );
    });

    it('fails when last call args mismatch', () => {
      chain.select('id').from('users').where('active');
      chain.select('name').from('posts').where('published');

      expect(() => {
        expect(chain.select.from.where).toHaveBeenLastChainCalledWith(
          ['id'],
          ['users'],
          ['active'],
        );
      }).toThrow();
    });

    it('works with not', () => {
      chain.select('id').from('users').where('active');

      expect(chain.select.from.where).not.toHaveBeenLastChainCalledWith(
        ['id'],
        ['users'],
        ['inactive'],
      );
    });
  });

  describe('edge cases', () => {
    let chain: ChainMock;

    beforeEach(() => {
      chain = chainMock();
    });

    it('handles partial chains', () => {
      chain.select('id').from('users');
      chain.select('name').from('posts').where('published');

      // select.from should work
      expect(chain.select.from).toHaveBeenChainCalled(2);

      // select.from.where should only match the second call
      // But select and select.from were called twice, so this will fail
      // This is expected behavior - all segments must match
      expect(() => {
        expect(chain.select.from.where).toHaveBeenChainCalledOnce();
      }).toThrow();
    });

    it('handles root mock edge case', () => {
      chain('arg1');
      chain('arg2');

      // Root mock has no segments, so chain matchers should fail
      expect(() => {
        expect(chain).toHaveBeenChainCalledOnce();
      }).toThrow('Cannot check chain calls on root mock');
    });
  });
});
