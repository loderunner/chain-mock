import * as cheerio from 'cheerio';

export async function scrapePrice(html: string) {
  const $ = cheerio.load(html);
  return $('.product').find('.price').text();
}
