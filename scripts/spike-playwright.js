require('dotenv').config();

const STEALTH = process.env.STEALTH === '1';

const chromium = STEALTH
  ? (() => {
      const { chromium: chromiumExtra } = require('playwright-extra');
      chromiumExtra.use(require('puppeteer-extra-plugin-stealth')());
      return chromiumExtra;
    })()
  : require('playwright').chromium;

const prisma = require('../src/database/prisma');

const BLOCK_MARKERS = [
  'tráfego suspeito',
  'trafego suspeito',
  'tráfego incomum',
  'unusual traffic',
  'verifique que você não é um robô',
  'verifique que vc não é um robô',
  'por segurança, complete esta etapa',
];

async function classify(page) {
  const url = page.url();
  const title = await page.title().catch(() => '');

  const productTitle = await page
    .locator('h1.ui-pdp-title')
    .first()
    .textContent({ timeout: 3000 })
    .catch(() => null);

  if (productTitle && productTitle.trim()) {
    return { status: 'OK', detail: productTitle.trim(), url, title };
  }

  const bodyText = await page
    .locator('body')
    .innerText({ timeout: 3000 })
    .catch(() => '');
  const lowerBody = bodyText.toLowerCase();
  const blocked = BLOCK_MARKERS.some((marker) => lowerBody.includes(marker));

  if (blocked) {
    return { status: 'BLOQUEADO', detail: 'página de verificação de tráfego suspeito', url, title };
  }

  const snippet = bodyText.replace(/\s+/g, ' ').trim().slice(0, 200);
  return {
    status: 'ERRO',
    detail: `sem h1.ui-pdp-title nem marcador de bloqueio conhecido. Trecho: "${snippet}"`,
    url,
    title,
  };
}

async function checkUrl(browser, productUrl) {
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'pt-BR',
  });
  const page = await context.newPage();

  try {
    await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1500);
    return await classify(page);
  } catch (error) {
    return { status: 'ERRO', detail: error.message, url: page.url(), title: '' };
  } finally {
    await context.close();
  }
}

async function getProductUrls() {
  const products = await prisma.product.findMany({ select: { productUrl: true } });
  const dbUrls = products.map((p) => p.productUrl).filter(Boolean);
  const cliUrls = process.argv.slice(2);
  return [...new Set([...dbUrls, ...cliUrls])];
}

async function main() {
  const urls = await getProductUrls();

  if (!urls.length) {
    console.error('Nenhuma URL de produto encontrada (banco vazio e nenhum argumento informado).');
    process.exitCode = 1;
    return;
  }

  console.log(
    `Testando ${urls.length} produto(s) contra o Mercado Livre via Playwright${STEALTH ? ' (stealth)' : ''}...\n`
  );

  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const url of urls) {
    console.log(`-> ${url}`);
    const result = await checkUrl(browser, url);
    results.push({ url, ...result });
    console.log(`   [${result.status}] ${result.detail}\n`);
  }

  await browser.close();

  const ok = results.filter((r) => r.status === 'OK').length;
  console.log(`Resumo: ${ok}/${results.length} OK`);
  results.filter((r) => r.status !== 'OK').forEach((r) => console.log(`  - ${r.status}: ${r.url}`));

  process.exitCode = ok === results.length ? 0 : 1;
}

main()
  .catch((error) => {
    console.error('Falha ao rodar o spike:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
