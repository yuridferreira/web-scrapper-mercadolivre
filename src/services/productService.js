const prisma = require('../database/prisma');
const ApiError = require('../utils/apiError');

class ProductService {
  async createProduct({ name, targetPrice, productUrl, telegramChatId }) {
    const parsedTargetPrice = Number(targetPrice);

    return prisma.product.create({
      data: {
        name: name.trim(),
        targetPrice: parsedTargetPrice,
        currentPrice: null,
        productUrl: productUrl.trim(),
        notified: false,
        telegramChatId: telegramChatId ?? null,
      },
    });
  }

  async listProducts(telegramChatId) {
    return prisma.product.findMany({
      where: telegramChatId ? { OR: [{ telegramChatId }, { telegramChatId: null }] } : undefined,
      orderBy: { createdAt: 'desc' },
      include: { priceHistory: true },
    });
  }

  async findProductById(id) {
    return prisma.product.findUnique({
      where: { id },
      include: { priceHistory: true },
    });
  }

  async updateProduct(id, updatePayload) {
    const existing = await prisma.product.findUnique({ where: { id } });

    if (!existing) {
      throw new ApiError(404, 'Produto não encontrado.');
    }

    const { name, targetPrice, productUrl } = updatePayload;
    const updateData = {};

    if (name !== undefined) {
      updateData.name = name.trim();
    }

    if (targetPrice !== undefined) {
      updateData.targetPrice = Number(targetPrice);
    }

    if (productUrl !== undefined) {
      updateData.productUrl = productUrl.trim();
    }

    if (!Object.keys(updateData).length) {
      throw new ApiError(400, 'Nenhum campo válido para atualização.');
    }

    if (
      (updateData.targetPrice !== undefined && updateData.targetPrice !== existing.targetPrice) ||
      (updateData.productUrl !== undefined && updateData.productUrl !== existing.productUrl)
    ) {
      updateData.notified = false;
    }

    return prisma.product.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteProduct(id, telegramChatId) {
    const existing = await prisma.product.findUnique({ where: { id } });

    if (!existing) {
      throw new ApiError(404, 'Produto não encontrado.');
    }

    if (telegramChatId && existing.telegramChatId && existing.telegramChatId !== telegramChatId) {
      throw new ApiError(404, 'Produto não encontrado.');
    }

    await prisma.product.delete({ where: { id } });
  }
}

module.exports = new ProductService();
