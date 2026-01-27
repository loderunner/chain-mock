import { describe, expectTypeOf, it } from 'vitest';

import { type ChainMock, chainMock } from './mock';

describe('object types (non-callable)', () => {
  it('mockReturnValue is never for non-functions', () => {
    const obj = chainMock<{ foo: string }>();
    expectTypeOf(obj.mockReturnValue).toEqualTypeOf<never>();
  });

  it('property access returns ChainMock of property type', () => {
    const obj = chainMock<{ foo: string }>();
    expectTypeOf(obj.foo).toEqualTypeOf<ChainMock<string>>();
  });

  it('mock.calls is never[][]', () => {
    const obj = chainMock<{ foo: string }>();
    expectTypeOf(obj.mock.calls).toEqualTypeOf<never[][]>();
  });

  it('all mock configuration methods are never', () => {
    const obj = chainMock<{ foo: string }>();
    expectTypeOf(obj.mockReturnValue).toEqualTypeOf<never>();
    expectTypeOf(obj.mockReturnValueOnce).toEqualTypeOf<never>();
    expectTypeOf(obj.mockResolvedValue).toEqualTypeOf<never>();
    expectTypeOf(obj.mockResolvedValueOnce).toEqualTypeOf<never>();
    expectTypeOf(obj.mockRejectedValue).toEqualTypeOf<never>();
    expectTypeOf(obj.mockRejectedValueOnce).toEqualTypeOf<never>();
    expectTypeOf(obj.mockImplementation).toEqualTypeOf<never>();
    expectTypeOf(obj.mockImplementationOnce).toEqualTypeOf<never>();
  });
});

describe('function types', () => {
  it('mockReturnValue takes return type', () => {
    const fn = chainMock<(x: number) => string>();
    expectTypeOf(fn.mockReturnValue).parameter(0).toEqualTypeOf<string>();
  });

  it('mockReturnValueOnce takes return type', () => {
    const fn = chainMock<(x: number) => string>();
    expectTypeOf(fn.mockReturnValueOnce).parameter(0).toEqualTypeOf<string>();
  });

  it('mockReturnValue takes Promise for async functions', () => {
    const fn = chainMock<() => Promise<string>>();
    expectTypeOf(fn.mockReturnValue)
      .parameter(0)
      .toEqualTypeOf<Promise<string>>();
  });

  it('mockResolvedValue takes awaited return type', () => {
    const fn = chainMock<() => Promise<string>>();
    expectTypeOf(fn.mockResolvedValue).parameter(0).toEqualTypeOf<string>();
  });

  it('mockResolvedValueOnce takes awaited return type', () => {
    const fn = chainMock<() => Promise<string>>();
    expectTypeOf(fn.mockResolvedValueOnce).parameter(0).toEqualTypeOf<string>();
  });

  it('mockResolvedValue takes return type for sync functions', () => {
    const fn = chainMock<(x: number) => string>();
    expectTypeOf(fn.mockResolvedValue).parameter(0).toEqualTypeOf<string>();
  });

  it('mock.calls is Parameters<T>[]', () => {
    const fn = chainMock<(x: number) => string>();
    expectTypeOf(fn.mock.calls).toEqualTypeOf<[number][]>();
  });

  it('mock.results is ChainMockResult<ReturnType<T>>[]', () => {
    const fn = chainMock<(x: number) => string>();
    expectTypeOf(fn.mock.results).items.toEqualTypeOf<
      | { type: 'return'; value: string }
      | { type: 'throw'; value: any }
      | { type: 'incomplete'; value: undefined }
    >();
  });

  it('mock.lastCall is Parameters<T> | undefined', () => {
    const fn = chainMock<(x: number) => string>();
    expectTypeOf(fn.mock.lastCall).toExtend<number | undefined>();
  });

  it('mock.settledResults for async functions', () => {
    const fn = chainMock<() => Promise<string>>();
    expectTypeOf(fn.mock.settledResults).items.toEqualTypeOf<
      | { type: 'fulfilled'; value: string }
      | { type: 'rejected'; value: any }
      | { type: 'incomplete'; value: undefined }
    >();
  });

  it('callable returns ChainMock<ReturnType<T>>', () => {
    const fn = chainMock<(x: number) => string>();
    const result = fn(42);
    expectTypeOf(result).toEqualTypeOf<ChainMock<string>>();
  });

  it('mockImplementation accepts function of type T', () => {
    const fn = chainMock<(x: number) => string>();
    expectTypeOf(fn.mockImplementation)
      .parameter(0)
      .toEqualTypeOf<(x: number) => string>();
  });
});

describe('nested object with methods', () => {
  type User = { id: number; name: string };
  type Post = { id: number; title: string; body: string };
  type API = {
    users: {
      get: (id: number) => User;
      list: () => User[];
    };
    posts: {
      create: (title: string, body: string) => Post;
    };
  };

  it('property access returns ChainMock', () => {
    const api = chainMock<API>();
    expectTypeOf(api.users).toEqualTypeOf<ChainMock<API['users']>>();
  });

  it('nested property access', () => {
    const api = chainMock<API>();
    expectTypeOf(api.users.get).toEqualTypeOf<
      ChainMock<(id: number) => User>
    >();
  });

  it('mockReturnValue on nested function', () => {
    const api = chainMock<API>();
    expectTypeOf(api.users.get.mockReturnValue)
      .parameter(0)
      .toEqualTypeOf<User>();
  });

  it('mock.calls on nested function', () => {
    const api = chainMock<API>();
    expectTypeOf(api.users.get.mock.calls).items.toEqualTypeOf<[number]>();
    expectTypeOf(api.posts.create.mock.calls).items.toEqualTypeOf<
      [string, string]
    >();
  });

  it('mock.results on nested function', () => {
    const api = chainMock<API>();
    expectTypeOf(api.users.get.mock.results).items.toEqualTypeOf<
      | { type: 'return'; value: User }
      | { type: 'throw'; value: any }
      | { type: 'incomplete'; value: undefined }
    >();
    expectTypeOf(api.users.list.mock.results).items.toEqualTypeOf<
      | { type: 'return'; value: User[] }
      | { type: 'throw'; value: any }
      | { type: 'incomplete'; value: undefined }
    >();
  });
});

describe('function returning object (look-through)', () => {
  type Result = { success: boolean };
  type Builder = (name: string) => { build: () => Result; reset: () => void };

  it('property access looks through return type', () => {
    const builder = chainMock<Builder>();
    expectTypeOf(builder.build).toEqualTypeOf<ChainMock<() => Result>>();
    expectTypeOf(builder.build.success).toEqualTypeOf<ChainMock<boolean>>();
  });

  it('mock.calls on looked-through property', () => {
    const builder = chainMock<Builder>();
    expectTypeOf(builder.build.mock.calls).items.toEqualTypeOf<[]>();
  });

  it('mockReturnValue on looked-through property', () => {
    const builder = chainMock<Builder>();
    expectTypeOf(builder.build.mockReturnValue)
      .parameter(0)
      .toEqualTypeOf<Result>();
  });

  it('calling function then accessing property', () => {
    const builder = chainMock<Builder>();
    const called = builder('test');
    expectTypeOf(called.build).toEqualTypeOf<ChainMock<() => Result>>();
  });
});

describe('untyped chainMock', () => {
  it('is callable with any arguments', () => {
    const chain = chainMock();
    expectTypeOf(chain).toBeCallableWith();
    expectTypeOf(chain).toBeCallableWith(1, 2, 3);
    expectTypeOf(chain).toBeCallableWith('a', { b: true });
  });

  it('returns ChainMock<any> when called', () => {
    const chain = chainMock();
    expectTypeOf(chain()).toEqualTypeOf<ChainMock>();
    expectTypeOf(chain(1, 2, 3)).toEqualTypeOf<ChainMock>();
  });

  it('allows arbitrary property access', () => {
    const chain = chainMock();
    expectTypeOf(chain.select).toEqualTypeOf<ChainMock>();
    expectTypeOf(chain.select.from).toEqualTypeOf<ChainMock>();
    expectTypeOf(chain.select.from.where).toEqualTypeOf<ChainMock>();
  });

  it('mock methods are available', () => {
    const chain = chainMock();
    expectTypeOf(chain.mockReturnValue).toBeCallableWith(42);
    expectTypeOf(chain.mockReturnValue).toBeCallableWith('test');
    expectTypeOf(chain.mockReturnValue).toBeCallableWith({ foo: 'bar' });
    expectTypeOf(chain.mockResolvedValue).toBeCallableWith(Promise.resolve(1));
    expectTypeOf(chain.mockRejectedValue).toBeCallableWith(new Error());
    expectTypeOf(chain.mockImplementation).toBeCallableWith(() => {});
  });

  it('mock methods return ChainMock for chaining', () => {
    const chain = chainMock();
    expectTypeOf(chain.mockReturnValue(42)).toEqualTypeOf<ChainMock>();
    expectTypeOf(
      chain.mockResolvedValue(Promise.resolve(1)),
    ).toEqualTypeOf<ChainMock>();
    expectTypeOf(
      chain.mockRejectedValue(new Error()),
    ).toEqualTypeOf<ChainMock>();
    expectTypeOf(chain.mockReset()).toEqualTypeOf<ChainMock>();
    expectTypeOf(chain.mockClear()).toEqualTypeOf<ChainMock>();
  });

  it('mock context properties are typed', () => {
    const chain = chainMock();
    expectTypeOf(chain.mock.calls).items.toEqualTypeOf<any[]>();
    expectTypeOf(chain.mock.results).items.toEqualTypeOf<
      | { type: 'return'; value: any }
      | { type: 'throw'; value: any }
      | { type: 'incomplete'; value: undefined }
    >();
    expectTypeOf(chain.mock.settledResults).items.toEqualTypeOf<
      | { type: 'fulfilled'; value: any }
      | { type: 'rejected'; value: any }
      | { type: 'incomplete'; value: undefined }
    >();
    expectTypeOf(chain.mock.lastCall).toExtend<any[] | undefined>();
  });

  it('supports PromiseLike behavior', () => {
    const chain = chainMock();
    expectTypeOf(chain.then).toBeFunction();
    expectTypeOf(chain).toExtend<PromiseLike<any>>();
  });

  it('allows chaining property access after calling', () => {
    const chain = chainMock();
    const called = chain('arg1', 'arg2');
    expectTypeOf(called.select).toEqualTypeOf<ChainMock>();
    expectTypeOf(called.select.from).toEqualTypeOf<ChainMock>();
  });
});
