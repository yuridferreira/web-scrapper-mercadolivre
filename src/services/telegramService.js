const { Telegraf, Scenes, session } = require('telegraf');
const env = require('../config/env');
const formatCurrency = require('../utils/formatCurrency');
const productService = require('./productService');
const logger = require('../utils/logger');

const bot = new Telegraf(env.telegram.botToken);

// Cena para cadastro de produto
const productRegistrationScene = new Scenes.WizardScene(
  'product_registration',
  // Passo 1: Nome do produto
  async (ctx) => {
    await ctx.reply('📝 Qual o nome do produto que você quer monitorar?');
    ctx.wizard.state.productData = {};
    return ctx.wizard.next();
  },
  // Passo 2: Preço alvo
  async (ctx) => {
    const name = ctx.message.text.trim();
    if (!name) {
      await ctx.reply('❌ Nome inválido. Digite um nome válido:');
      return;
    }

    ctx.wizard.state.productData.name = name;
    await ctx.reply('💰 Qual o preço alvo (em reais)? Exemplo: 2999.90');
    return ctx.wizard.next();
  },
  // Passo 3: URL do produto
  async (ctx) => {
    const targetPriceText = ctx.message.text.replace(',', '.');
    const targetPrice = Number(targetPriceText);

    if (Number.isNaN(targetPrice) || targetPrice <= 0) {
      await ctx.reply('❌ Preço inválido. Digite um valor numérico maior que zero:');
      return;
    }

    ctx.wizard.state.productData.targetPrice = targetPrice;
    await ctx.reply('🔗 Cole a URL completa do produto no Mercado Livre:');
    return ctx.wizard.next();
  },
  // Passo 4: Confirmação e cadastro
  async (ctx) => {
    const productUrl = ctx.message.text.trim();

    // Validação mais permissiva para URLs do Mercado Livre
    const mercadoLivreUrlRegex = /^https?:\/\/(www\.)?mercado(livre|libre)\.com\.br\/.*$/i;

    if (!productUrl || !mercadoLivreUrlRegex.test(productUrl)) {
      await ctx.reply('❌ URL inválida. Cole uma URL válida do Mercado Livre (deve começar com https://www.mercadolivre.com.br/ ou https://mercado livre.com.br/):');
      return;
    }

    const productData = {
      ...ctx.wizard.state.productData,
      productUrl
    };

    try {
      const product = await productService.createProduct(productData);

      const message = `✅ Produto cadastrado com sucesso!\n\n📦 ${product.name}\n💰 Meta: ${formatCurrency(product.targetPrice)}\n🔗 ${product.productUrl}\n\n🔔 Você será notificado quando o preço atingir ou ficar abaixo da meta!`;

      await ctx.reply(message);
      logger.info('Produto cadastrado via Telegram', { productId: product.id, userId: ctx.from.id });

    } catch (error) {
      logger.error('Erro ao cadastrar produto via Telegram', { error: error.message, userId: ctx.from.id });
      await ctx.reply('❌ Erro ao cadastrar produto. Tente novamente mais tarde.');
    }

    return ctx.scene.leave();
  }
);

// Configurar stage e cenas
const stage = new Scenes.Stage([productRegistrationScene]);
bot.use(session());
bot.use(stage.middleware());

class TelegramService {
  constructor() {
    this.setupCommands();
  }

  setupCommands() {
    // Comando de início
    bot.start((ctx) => {
      const message = `🤖 Olá! Sou o Promo Monitor Bot!\n\n📋 Comandos disponíveis:\n/cadastrar - Cadastrar produto para monitoramento\n/listar - Listar produtos monitorados\n/deletar - Remover produto\n/ajuda - Ver comandos disponíveis\n\n💡 Basta enviar uma URL do Mercado Livre e eu monitoro o preço automaticamente!`;
      ctx.reply(message);
    });

    // Comando de ajuda
    bot.command('ajuda', (ctx) => {
      const message = `📋 Comandos disponíveis:\n\n/cadastrar - Cadastrar novo produto para monitoramento\n/listar - Ver todos os produtos monitorados\n/deletar - Remover um produto do monitoramento\n/ajuda - Mostrar esta mensagem\n\n💡 Como funciona:\n1. Use /cadastrar para adicionar um produto\n2. Informe nome, preço alvo e URL do Mercado Livre\n3. Eu verifico o preço a cada 30 minutos\n4. Você recebe notificação quando bater a meta!`;
      ctx.reply(message);
    });

    // Comando para cadastrar produto
    bot.command('cadastrar', (ctx) => {
      ctx.scene.enter('product_registration');
    });

    // Comando para listar produtos
    bot.command('listar', async (ctx) => {
      try {
        const products = await productService.listProducts();

        if (!products.length) {
          await ctx.reply('📭 Nenhum produto cadastrado ainda.\n\nUse /cadastrar para adicionar o primeiro produto!');
          return;
        }

        let message = `📦 Produtos monitorados (${products.length}):\n\n`;

        products.forEach((product, index) => {
          const status = product.notified ? '✅ Notificado' : '👀 Monitorando';
          const currentPrice = product.currentPrice ? formatCurrency(product.currentPrice) : 'Não verificado';
          const targetPrice = formatCurrency(product.targetPrice);

          message += `${index + 1}. ${product.name}\n`;
          message += `   💰 Meta: ${targetPrice}\n`;
          message += `   📊 Atual: ${currentPrice}\n`;
          message += `   📍 Status: ${status}\n`;
          message += `   🔗 ${product.productUrl}\n\n`;
        });

        // Telegram tem limite de 4096 caracteres por mensagem
        if (message.length > 4000) {
          const chunks = message.match(/(.|[\r\n]){1,4000}/g);
          for (const chunk of chunks) {
            await ctx.reply(chunk);
          }
        } else {
          await ctx.reply(message);
        }

      } catch (error) {
        logger.error('Erro ao listar produtos via Telegram', { error: error.message, userId: ctx.from.id });
        await ctx.reply('❌ Erro ao listar produtos. Tente novamente mais tarde.');
      }
    });

    // Comando para deletar produto
    bot.command('deletar', async (ctx) => {
      try {
        const products = await productService.listProducts();

        if (!products.length) {
          await ctx.reply('📭 Nenhum produto cadastrado para deletar.');
          return;
        }

        let message = `🗑️ Selecione o produto para deletar:\n\n`;

        products.forEach((product, index) => {
          message += `${index + 1}. ${product.name}\n`;
          message += `   💰 Meta: ${formatCurrency(product.targetPrice)}\n\n`;
        });

        message += `📝 Responda com o número do produto que deseja deletar:`;

        ctx.session.deleteProducts = products;
        await ctx.reply(message);

      } catch (error) {
        logger.error('Erro ao preparar lista para deletar', { error: error.message, userId: ctx.from.id });
        await ctx.reply('❌ Erro ao listar produtos. Tente novamente mais tarde.');
      }
    });

    // Handler para resposta de deletar
    bot.on('text', async (ctx) => {
      if (ctx.session?.deleteProducts) {
        const products = ctx.session.deleteProducts;
        const choice = parseInt(ctx.message.text);

        if (Number.isNaN(choice) || choice < 1 || choice > products.length) {
          await ctx.reply(`❌ Número inválido. Digite um número entre 1 e ${products.length}:`);
          return;
        }

        const productToDelete = products[choice - 1];

        try {
          await productService.deleteProduct(productToDelete.id);
          await ctx.reply(`✅ Produto "${productToDelete.name}" removido com sucesso!`);
          logger.info('Produto deletado via Telegram', { productId: productToDelete.id, userId: ctx.from.id });

        } catch (error) {
          logger.error('Erro ao deletar produto via Telegram', { error: error.message, userId: ctx.from.id });
          await ctx.reply('❌ Erro ao deletar produto. Tente novamente mais tarde.');
        }

        delete ctx.session.deleteProducts;
      }
    });

    // Handler para mensagens não reconhecidas
    bot.on('text', (ctx) => {
      if (!ctx.scene?.current) {
        ctx.reply('🤔 Não entendi. Use /ajuda para ver os comandos disponíveis.');
      }
    });
  }

  async sendPromotionNotification({ name, currentPrice, targetPrice, url }) {
    const message = `🔥 Promoção encontrada!\nProduto: ${name}\nPreço atual: ${formatCurrency(currentPrice)}\nMeta desejada: ${formatCurrency(targetPrice)}\nLink: ${url}`;

    logger.info('Enviando notificação para Telegram', {
      name,
      currentPrice,
      targetPrice,
      chatId: env.telegram.chatId,
    });

    await bot.telegram.sendMessage(env.telegram.chatId, message, {
      parse_mode: 'HTML',
      disable_web_page_preview: false,
    });
  }

  async launch() {
    logger.info('Bot Telegram iniciado');

    try {
      await bot.launch();
      logger.info('Bot Telegram lançado com sucesso');
    } catch (error) {
      logger.error('Erro ao lançar bot Telegram', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  async stop() {
    logger.info('Bot Telegram parado');
    await bot.stop();
  }
}

module.exports = new TelegramService();
