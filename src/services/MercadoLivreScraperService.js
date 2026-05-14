const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');

function parsePriceFromPage($) {
  const metaPrice = $('meta[itemprop="price"]').attr('content');

  if (metaPrice) {
    const value = Number(metaPrice.toString().replace(',', '.'));
    if (!Number.isNaN(value)) {
      return value;
    }
  }

  const fraction = $('.price-tag-fraction').first().text().replace(/\D/g, '');
  const cents = $('.price-tag-cents').first().text().replace(/\D/g, '');

  if (fraction) {
    return Number(`${fraction}.${cents || '00'}`);
  }

  const rawText = $('.ui-pdp-price__second-line, .price-tag-text-sr-only').first().text();
  const normalized = rawText.replace(/[^0-9,.]/g, '').replace(/\./g, '').replace(',', '.');
  const fallback = Number(normalized);

  if (!Number.isNaN(fallback)) {
    return fallback;
  }

  throw new Error('Não foi possível extrair o preço do produto.');
}

function parseAvailabilityFromPage($) {
  const availabilityText =
    $('.ui-pdp-buybox__title, .ui-pdp-buybox__container .ui-pdp-buybox__availability, .ui-pdp-text--secondary')
      .text()
      .trim();

  if (/esgotado|indisponível|indisponivel|fora de estoque|sem estoque/i.test(availabilityText)) {
    return 'out_of_stock';
  }

  return 'available';
}

class MercadoLivreScraperService {
  async fetchProductData(productUrl) {
    if (!productUrl) {
      throw new Error('A URL do produto é obrigatória para o scraping.');
    }

    logger.info('Iniciando scraping no Mercado Livre', { productUrl });

    const response = await axios.get(productUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: 15000,
    });

    const $ = cheerio.load(response.data);
    const name = $('h1.ui-pdp-title').text().trim() || $('h1').first().text().trim();
    const price = parsePriceFromPage($);
    const availability = parseAvailabilityFromPage($);

    if (!name) {
      throw new Error('Não foi possível extrair o nome do produto.');
    }

    logger.info('Dados extraídos do Mercado Livre', { name, price, availability });

    return {
      name,
      price,
      availability,
      productUrl,
    };
  }
}

module.exports = new MercadoLivreScraperService();
