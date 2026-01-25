- chain matchers
- type inference: ChainMockInstance<T> should be like vi.Mock<T>, and this would
  inform the methods of the ChainMockInstance (defaut T to any)
- does it work with Jest, Chai, Node testing framework, and other expect-based
  test frameworks? Does it work with function matchers from jest-extended? write
  a test bench (might need test projects and containers)
- find some interesting libraries that use chainable APIs and add them as
  examples to the documentation: Drizzle...
- rewrite all the docs
