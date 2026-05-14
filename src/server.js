const app = require('./app');
const env = require('./config/env');
const priceMonitorJob = require('./jobs/priceMonitorJob');
const prisma = require('./database/prisma');
const telegramService = require('./services/telegramService');
const logger = require('./utils/logger');

const server = app.listen(env.app.port, async () => {
  logger.info(`Servidor iniciado na porta ${env.app.port}`);

  // Inicializar bot do Telegram
  try {
    await telegramService.launch();
    logger.info('Bot Telegram inicializado com sucesso');
  } catch (error) {
    logger.error('Erro ao inicializar bot Telegram', {
      error: error.message,
      stack: error.stack,
    });
  }

  priceMonitorJob.start();
});

const shutdown = async () => {
  logger.info('Finalizando servidor...');
  priceMonitorJob.stop();

  try {
    await telegramService.stop();
    logger.info('Bot Telegram finalizado');
  } catch (error) {
    logger.error('Erro ao finalizar bot Telegram', { error: error.message });
  }

  await prisma.$disconnect();
  server.close(() => {
    logger.info('Servidor finalizado');
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
