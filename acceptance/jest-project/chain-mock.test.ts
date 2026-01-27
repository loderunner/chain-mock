import { describe, expect, beforeEach, it } from '@jest/globals';
import { type ChainMock, chainMock, matchers } from 'chain-mock';

expect.extend(matchers);

describe('chain-mock with jest', () => {
  let chain: ChainMock;

  beforeEach(() => {
    chain = chainMock();
  });

  it('validates toHaveBeenChainCalled', () => {
    chain.select('id').from('users').where('active');
    expect(chain.select.from.where).toHaveBeenChainCalled();
  });

  it('validates toHaveBeenChainCalledTimes', () => {
    chain.select('id').from('users').where('active');
    chain.select('name').from('posts').where('published');
    expect(chain.select.from.where).toHaveBeenChainCalledTimes(2);
  });

  it('validates toHaveBeenChainCalledWith', () => {
    chain.select('id').from('users').where('active');
    expect(chain.select.from.where).toHaveBeenChainCalledWith(
      ['id'],
      ['users'],
      ['active'],
    );
  });

  it('validates toHaveBeenChainCalledExactlyOnce', () => {
    chain.select('id').from('users').where('active');
    expect(chain.select.from.where).toHaveBeenChainCalledExactlyOnce();
  });

  it('validates toHaveBeenChainCalledExactlyOnceWith', () => {
    chain.select('id').from('users').where('active');
    expect(chain.select.from.where).toHaveBeenChainCalledExactlyOnceWith(
      ['id'],
      ['users'],
      ['active'],
    );
  });

  it('validates toHaveBeenNthChainCalledWith', () => {
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

  it('validates toHaveBeenLastChainCalledWith', () => {
    chain.select('id').from('users').where('active');
    chain.select('name').from('posts').where('published');
    expect(chain.select.from.where).toHaveBeenLastChainCalledWith(
      ['name'],
      ['posts'],
      ['published'],
    );
  });

  it('validates mockReturnValue', () => {
    chain.select.from.where.mockReturnValue({ id: 42, name: 'Dan' });
    const result = chain.select('id').from('users').where('active');
    expect(result).toEqual({ id: 42, name: 'Dan' });
  });

  it('validates mockResolvedValue', async () => {
    chain.select.from.where.mockResolvedValue([{ id: 42, name: 'Dan' }]);
    const result = await chain.select('id').from('users').where('active');
    expect(result).toEqual([{ id: 42, name: 'Dan' }]);
  });
});
