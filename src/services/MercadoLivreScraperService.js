const { chromium } = require('playwright-extra');
const stealthPlugin = require('puppeteer-extra-plugin-stealth');
const logger = require('../utils/logger');

chromium.use(stealthPlugin());

const NAVIGATION_TIMEOUT_MS = 30000;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function extractPrice(page) {
  const metaPrice = await page
    .locator('meta[itemprop="price"]')
    .first()
    .getAttribute('content', { timeout: 5000 })
    .catch(() => null);

  if (metaPrice) {
    const value = Number(metaPrice.toString().replace(',', '.'));
    if (!Number.isNaN(value)) {
      return value;
    }
  }

  const fractionText = await page
    .locator('.price-tag-fraction')
    .first()
    .textContent({ timeout: 5000 })
    .catch(() => null);
  const fraction = (fractionText || '').replace(/\D/g, '');

  if (fraction) {
    const centsText = await page
      .locator('.price-tag-cents')
      .first()
      .textContent({ timeout: 5000 })
      .catch(() => null);
    const cents = (centsText || '').replace(/\D/g, '');
    return Number(`${fraction}.${cents || '00'}`);
  }

  const rawText = await page
    .locator('.ui-pdp-price__second-line, .price-tag-text-sr-only')
    .first()
    .textContent({ timeout: 5000 })
    .catch(() => '');
  const normalized = (rawText || '')
    .replace(/[^0-9,.]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const fallback = Number(normalized);

  if (normalized && !Number.isNaN(fallback)) {
    return fallback;
  }

  throw new Error('Não foi possível extrair o preço do produto.');
}

async function extractAvailability(page) {
  const availabilityText = await page
    .locator(
      '.ui-pdp-buybox__title, .ui-pdp-buybox__container .ui-pdp-buybox__availability, .ui-pdp-text--secondary'
    )
    .first()
    .textContent({ timeout: 5000 })
    .catch(() => '');

  if (
    /esgotado|indisponível|indisponivel|fora de estoque|sem estoque/i.test(availabilityText || '')
  ) {
    return 'out_of_stock';
  }

  return 'available';
}

class MercadoLivreScraperService {
  constructor() {
    this.browserPromise = null;
  }

  async getBrowser() {
    if (this.browserPromise) {
      const browser = await this.browserPromise;
      if (browser.isConnected()) {
        return browser;
      }
      this.browserPromise = null;
    }

    this.browserPromise = chromium.launch({ headless: true }).catch((error) => {
      this.browserPromise = null;
      throw error;
    });

    return this.browserPromise;
  }

  async fetchProductData(productUrl) {
    if (!productUrl) {
      throw new Error('A URL do produto é obrigatória para o scraping.');
    }

    logger.info('Iniciando scraping no Mercado Livre', { productUrl });

    const browser = await this.getBrowser();
    const context = await browser.newContext({ userAgent: USER_AGENT, locale: 'pt-BR' });

    try {
      const page = await context.newPage();
      await page.goto(productUrl, {
        waitUntil: 'domcontentloaded',
        timeout: NAVIGATION_TIMEOUT_MS,
      });
      // Tempo pro JS de verificação anti-bot do ML (se houver) terminar de rodar
      // antes de extrair o conteúdo — validado no spike (scripts/spike-playwright.js).
      await page.waitForTimeout(1500);

      const name =
        (
          await page
            .locator('h1.ui-pdp-title')
            .first()
            .textContent({ timeout: 5000 })
            .catch(() => null)
        )?.trim() ||
        (
          await page
            .locator('h1')
            .first()
            .textContent({ timeout: 5000 })
            .catch(() => null)
        )?.trim();

      if (!name) {
        throw new Error('Não foi possível extrair o nome do produto.');
      }

      const price = await extractPrice(page);
      const availability = await extractAvailability(page);

      logger.info('Dados extraídos do Mercado Livre', { name, price, availability });

      return { name, price, availability, productUrl };
    } finally {
      await context.close();
    }
  }

  async closeBrowser() {
    if (!this.browserPromise) {
      return;
    }

    const browser = await this.browserPromise.catch(() => null);
    this.browserPromise = null;

    if (browser) {
      await browser.close();
    }
  }
}

module.exports = new MercadoLivreScraperService();
