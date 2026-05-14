const prisma = require('../database/prisma');
const mercadoLivreScraper = require('./MercadoLivreScraperService');
const telegramService = require('./telegramService');
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

    await Promise.all(
      products.map(async (product) => {
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
            notified: product.notified,
          });

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
    );
  }
}

module.exports = new MonitorService();
