import * as cheerio from 'cheerio';

export async function scrapePrice(url: string) {
  console.log(cheerio);
  const $ = await cheerio.fromURL(url);
  console.log($);
  return $('.product').find('.price').text();
}
