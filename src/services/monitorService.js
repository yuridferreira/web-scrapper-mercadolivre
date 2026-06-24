const pLimit = require('p-limit');
const prisma = require('../database/prisma');
const mercadoLivreScraper = require('./MercadoLivreScraperService');
const telegramService = require('./telegramService');
const env = require('../config/env');
const logger = require('../utils/logger');

class MonitorService {
  async monitorProducts() {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'asc' },
    });

    logger.info('Executando monitoramento de preços', { productsToMonitor: products.length });

    if (!products.length) {
      logger.info('Nenhum produto cadastrado para monitoramento');
      return;
    }

    const limit = pLimit(env.scraper.concurrency);

    await Promise.all(
      products.map((product) =>
        limit(async () => {
          try {
            const marketData = await mercadoLivreScraper.fetchProductData(product.productUrl);

            await prisma.priceHistory.create({
              data: {
                productId: product.id,
                price: marketData.price,
              },
            });

            await prisma.product.update({
              where: { id: product.id },
              data: {
                currentPrice: marketData.price,
              },
            });

            logger.info('Produto avaliado', {
              productId: product.id,
              name: product.name,
              currentPrice: marketData.price,
              targetPrice: product.targetPrice,
              availability: marketData.availability,
              notified: product.notified,
            });

            if (marketData.availability === 'out_of_stock') {
              logger.info('Produto fora de estoque, alerta não enviado', {
                productId: product.id,
              });
              return;
            }

            if (!product.notified && marketData.price <= product.targetPrice) {
              await telegramService.sendPromotionNotification({
                name: product.name,
                currentPrice: marketData.price,
                targetPrice: product.targetPrice,
                url: product.productUrl,
              });

              await prisma.product.update({
                where: { id: product.id },
                data: { notified: true },
              });

              logger.info('Alerta enviado para produto', {
                productId: product.id,
                currentPrice: marketData.price,
                targetPrice: product.targetPrice,
              });
            }
          } catch (error) {
            logger.error('Erro no monitoramento do produto', {
              productId: product.id,
              message: error.message,
            });
          }
        })
      )
    );
  }
}

module.exports = new MonitorService();
