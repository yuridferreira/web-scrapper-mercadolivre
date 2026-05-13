const { Telegraf } = require('telegraf');
const env = require('../config/env');
const formatCurrency = require('../utils/formatCurrency');

const bot = new Telegraf(env.telegram.botToken);

class TelegramService {
  async sendPromotionNotification({ name, currentPrice, targetPrice, url }) {
    const message = `🔥 Promoção encontrada!\nProduto: ${name}\nPreço atual: ${formatCurrency(currentPrice)}\nMeta desejada: ${formatCurrency(targetPrice)}\nLink: ${url}`;

    await bot.telegram.sendMessage(env.telegram.chatId, message, {
      parse_mode: 'HTML',
      disable_web_page_preview: false,
    });
  }
}

module.exports = new TelegramService();
