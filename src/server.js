const app = require('./app');
const env = require('./config/env');
const priceMonitorJob = require('./jobs/priceMonitorJob');
const prisma = require('./database/prisma');
const telegramService = require('./services/telegramService');
const logger = require('./utils/logger');

const server = app.listen(env.app.port, () => {
  logger.info(`Servidor iniciado na porta ${env.app.port}`);

  // bot.launch() (polling) só resolve quando o bot é parado, então não
  // podemos esperar por ela aqui — senão o cron de monitoramento nunca inicia.
  telegramService.launch().catch((error) => {
    logger.error('Erro ao inicializar bot Telegram', {
      error: error.message,
      stack: error.stack,
    });
  });

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
