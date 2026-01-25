import { beforeEach, describe, expect, it } from 'vitest';

import { chainMock } from './mock';

describe('vitest matcher compatibility', () => {
  let mock: ReturnType<typeof chainMock>;

  beforeEach(() => {
    mock = chainMock();
  });

  describe('toHaveBeenCalled', () => {
    it('works with standard vitest matcher', () => {
      mock.select('id').from('users');

      expect(mock.select).toHaveBeenCalled();
      expect(mock.select.from).toHaveBeenCalled();
      expect(mock.select.from.where).not.toHaveBeenCalled();
    });

    it('works with negation', () => {
      expect(mock.select).not.toHaveBeenCalled();

      mock.select('id');

      expect(mock.select).toHaveBeenCalled();
    });
  });

  describe('toHaveBeenCalledTimes', () => {
    it('counts calls correctly', () => {
      mock.select('id');
      mock.select('name');
      mock.select('email');

      expect(mock.select).toHaveBeenCalledTimes(3);
    });

    it('works on chain paths', () => {
      mock.select('id').from('users');
      mock.select('name').from('posts');
      mock.select('*').from('comments');

      expect(mock.select.from).toHaveBeenCalledTimes(3);
    });
  });

  describe('toHaveBeenCalledWith', () => {
    it('matches arguments', () => {
      mock.select('id', 'name').from('users');

      expect(mock.select).toHaveBeenCalledWith('id', 'name');
      expect(mock.select.from).toHaveBeenCalledWith('users');
    });

    it('works with complex arguments', () => {
      mock.configure({ speed: 'fast', mode: 'stealth' });

      expect(mock.configure).toHaveBeenCalledWith({
        speed: 'fast',
        mode: 'stealth',
      });
    });

    it('works with negation', () => {
      mock.select('id');

      expect(mock.select).not.toHaveBeenCalledWith('name');
      expect(mock.select).toHaveBeenCalledWith('id');
    });
  });

  describe('toHaveBeenLastCalledWith', () => {
    it('matches last call arguments', () => {
      mock.select('id');
      mock.select('name');
      mock.select('email');

      expect(mock.select).toHaveBeenLastCalledWith('email');
      expect(mock.select).not.toHaveBeenLastCalledWith('id');
    });

    it('works on chain paths', () => {
      mock.select('id').from('users');
      mock.select('name').from('posts');
      mock.select('*').from('comments');

      expect(mock.select.from).toHaveBeenLastCalledWith('comments');
    });
  });

  describe('toHaveBeenNthCalledWith', () => {
    it('matches nth call arguments', () => {
      mock.select('id');
      mock.select('name');
      mock.select('email');

      expect(mock.select).toHaveBeenNthCalledWith(1, 'id');
      expect(mock.select).toHaveBeenNthCalledWith(2, 'name');
      expect(mock.select).toHaveBeenNthCalledWith(3, 'email');
    });

    it('works on chain paths', () => {
      mock.select('id').from('users');
      mock.select('name').from('posts');
      mock.select('*').from('comments');

      expect(mock.select.from).toHaveBeenNthCalledWith(1, 'users');
      expect(mock.select.from).toHaveBeenNthCalledWith(2, 'posts');
      expect(mock.select.from).toHaveBeenNthCalledWith(3, 'comments');
    });
  });

  describe('mock.calls direct access', () => {
    it('allows direct access for complex assertions', () => {
      mock.configure({ speed: 'fast', mode: 'stealth' });

      expect(mock.configure.mock.calls[0][0]).toEqual(
        expect.objectContaining({ mode: 'stealth' }),
      );
    });

    it('works with array methods', () => {
      mock.select('id');
      mock.select('name');
      mock.select('email');

      const calls = mock.select.mock.calls;
      expect(calls.length).toBe(3);
      expect(calls.every((call) => call.length === 1)).toBe(true);
    });
  });

  describe('deeply nested chains', () => {
    it('works with long chains', async () => {
      mock.mockResolvedValue('deep');

      const result = await mock.a().b().c().d().e().f().g().h().i().j();

      expect(result).toBe('deep');
      expect(mock.a.b.c.d.e.f.g.h.i.j).toHaveBeenCalled();
    });
  });

  describe('methods with no arguments', () => {
    it('tracks empty calls', () => {
      mock.stop();

      expect(mock.stop).toHaveBeenCalled();
      expect(mock.stop.mock.calls[0]).toEqual([]);
      expect(mock.stop).toHaveBeenCalledWith();
    });
  });

  describe('methods with multiple arguments', () => {
    it('tracks all arguments', () => {
      mock.navigate(10, 20, 30, { speed: 'fast' });

      expect(mock.navigate).toHaveBeenCalledWith(10, 20, 30, {
        speed: 'fast',
      });
    });
  });
});
