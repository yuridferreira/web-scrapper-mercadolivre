const prisma = require('../database/prisma');
const mercadoLivreService = require('./mercadoLivreService');
const telegramService = require('./telegramService');
const logger = require('../utils/logger');

class MonitorService {
  async monitorProducts() {
    const products = await prisma.product.findMany({ where: { notified: false } });

    if (!products.length) {
      logger.info('Nenhum produto ativo para monitoramento');
      return;
    }

    await Promise.all(
      products.map(async (product) => {
        try {
          const marketData = await mercadoLivreService.fetchCurrentPrice(product);

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
              productUrl: marketData.productUrl,
            },
          });

          if (marketData.price <= product.targetPrice) {
            await telegramService.sendPromotionNotification({
              name: product.name,
              currentPrice: marketData.price,
              targetPrice: product.targetPrice,
              url: marketData.productUrl,
            });

            await prisma.product.update({
              where: { id: product.id },
              data: { notified: true },
            });

            logger.info('Produto marcado como notificado', {
              productId: product.id,
              price: marketData.price,
              targetPrice: product.targetPrice,
            });
          }
        } catch (error) {
          logger.error('Erro ao avaliar produto', {
            productId: product.id,
            message: error.message,
          });
        }
      })
    );
  }
}

module.exports = new MonitorService();
