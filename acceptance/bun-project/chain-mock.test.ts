import { type ChainMock, chainMock, matchers } from 'chain-mock';
import { expect, test, beforeEach, describe } from 'bun:test';

expect.extend(matchers);

describe('chain-mock with bun', () => {
  let chain: ChainMock;

  beforeEach(() => {
    chain = chainMock();
  });

  test('validates toHaveBeenChainCalled', () => {
    chain.select('id').from('users').where('active');
    expect(chain.select.from.where).toHaveBeenChainCalled();
  });

  test('validates toHaveBeenChainCalledTimes', () => {
    chain.select('id').from('users').where('active');
    chain.select('name').from('posts').where('published');
    expect(chain.select.from.where).toHaveBeenChainCalledTimes(2);
  });

  test('validates toHaveBeenChainCalledWith', () => {
    chain.select('id').from('users').where('active');
    expect(chain.select.from.where).toHaveBeenChainCalledWith(
      ['id'],
      ['users'],
      ['active'],
    );
  });

  test('validates toHaveBeenChainCalledExactlyOnce', () => {
    chain.select('id').from('users').where('active');
    expect(chain.select.from.where).toHaveBeenChainCalledExactlyOnce();
  });

  test('validates toHaveBeenChainCalledExactlyOnceWith', () => {
    chain.select('id').from('users').where('active');
    expect(chain.select.from.where).toHaveBeenChainCalledExactlyOnceWith(
      ['id'],
      ['users'],
      ['active'],
    );
  });

  test('validates toHaveBeenNthChainCalledWith', () => {
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

  test('validates toHaveBeenLastChainCalledWith', () => {
    chain.select('id').from('users').where('active');
    chain.select('name').from('posts').where('published');
    expect(chain.select.from.where).toHaveBeenLastChainCalledWith(
      ['name'],
      ['posts'],
      ['published'],
    );
  });

  test('validates mockReturnValue', () => {
    chain.select.from.where.mockReturnValue({ id: 42, name: 'Dan' });
    const result = chain.select('id').from('users').where('active');
    expect(result).toEqual({ id: 42, name: 'Dan' });
  });

  test('validates mockResolvedValue', async () => {
    chain.select.from.where.mockResolvedValue([{ id: 42, name: 'Dan' }]);
    const result = await chain.select('id').from('users').where('active');
    expect(result).toEqual([{ id: 42, name: 'Dan' }]);
  });
});
