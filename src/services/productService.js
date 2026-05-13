const prisma = require('../database/prisma');

class ProductService {
  async createProduct({ name, targetPrice, productUrl }) {
    const parsedTarget = Number(targetPrice);

    return prisma.product.create({
      data: {
        name,
        targetPrice: parsedTarget,
        currentPrice: null,
        productUrl,
        notified: false,
      },
    });
  }

  async listProducts() {
    return prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      include: { priceHistory: true },
    });
  }

  async deleteProduct(id) {
    await prisma.product.delete({ where: { id } });
  }
}

module.exports = new ProductService();
