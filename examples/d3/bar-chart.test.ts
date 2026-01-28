import { chainMock, chainMocked, matchers } from 'chain-mock';
import { vi, it, expect } from 'vitest';
import * as d3 from 'd3';

import { renderBarChart } from './bar-chart';

expect.extend(matchers);

vi.mock('d3', () => ({ select: chainMock() }));

const mockSelect = chainMocked(d3.select);

it('renders bars with correct dimensions', () => {
  renderBarChart('#chart', [10, 20, 30]);

  expect(
    mockSelect.selectAll.data.enter.append.attr.attr,
  ).toHaveBeenChainCalledWith(
    ['#chart'],
    ['.bar'],
    [[10, 20, 30]],
    [],
    ['rect'],
    ['class', 'bar'],
    ['height', expect.any(Function)],
  );
});
