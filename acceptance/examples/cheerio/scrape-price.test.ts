import { chainMock } from 'chain-mock';
import * as cheerio from 'cheerio';
import { vi, it, expect } from 'vitest';
import { scrapePrice } from './scrape-price';

const mock$ = vi.hoisted(() => chainMock<cheerio.CheerioAPI>());
vi.mock('cheerio', () => ({ fromURL: () => Promise.resolve(mock$) }));

it('extracts price', async () => {
  mock$.find.text.mockReturnValue('$29.99' as any);

  const price = await scrapePrice('https://example.com');

  expect(price).toBe('$29.99');
  expect(mock$.find.text).toHaveBeenChainCalledWith(
    ['.product'],
    ['.price'],
    [],
  );
});
