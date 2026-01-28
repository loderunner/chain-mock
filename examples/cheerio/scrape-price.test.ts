import * as cheerio from 'cheerio';
import { vi, it, expect } from 'vitest';
import { matchers } from 'chain-mock';
import { scrapePrice } from './scrape-price';

expect.extend(matchers);

// hoist chain mock to make it available to the mocked cheerio module
// wrap chain mock in a tuple to avoid resolving it as a Promise
const [mock$] = await vi.hoisted(async () => {
  const { chainMock } = await import('chain-mock');
  return [chainMock<cheerio.CheerioAPI>()];
});
vi.mock('cheerio', () => ({ load: () => mock$ }));

it('extracts price', async () => {
  mock$.find.text.mockReturnValue('$29.99' as any);

  const price = await scrapePrice(`<html>...</html>`);

  expect(price).toBe('$29.99');
  expect(mock$.find.text).toHaveBeenChainCalledWith(
    ['.product'],
    ['.price'],
    [],
  );
});
