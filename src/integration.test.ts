import { describe, expect, it } from 'vitest';

import { matchers } from './matchers';
import { chainMock } from './mock';

expect.extend(matchers);

describe('integration tests', () => {
  it('mockClear should clear chain call from root', async () => {
    // setup chain mock
    const chain = chainMock();
    chain.mockResolvedValue([{ id: 42 }]);

    // assert that the chain was not called yet
    expect.soft(chain.select.from.where).not.toHaveBeenChainCalled();

    // call the chain and assert that it was called exactly once
    await chain.select('id').from('users').where('id = 42');
    expect.soft(chain.select.from.where).toHaveBeenChainCalledExactlyOnce();

    // clear the chain mock itself, call again and assert that it was called
    // exactly once
    chain.mockClear();
    await chain.select('id').from('users').where('id = 42');
    expect.soft(chain.select.from.where).toHaveBeenChainCalledExactlyOnce();
  });
});
