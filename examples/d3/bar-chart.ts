import * as d3 from 'd3';

export function renderBarChart(container: string, data: number[]) {
  d3.select(container)
    .selectAll('.bar')
    .data(data)
    .enter()
    .append('rect')
    .attr('class', 'bar')
    .attr('height', (d) => d)
    .attr('width', 10);
}
