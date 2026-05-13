const app = require('./app');
const env = require('./config/env');
const priceMonitorJob = require('./jobs/priceMonitorJob');
const prisma = require('./database/prisma');
const logger = require('./utils/logger');

const server = app.listen(env.app.port, () => {
  logger.info(`Servidor iniciado na porta ${env.app.port}`);
  priceMonitorJob.start();
});

const shutdown = async () => {
  logger.info('Finalizando servidor...');
  priceMonitorJob.stop();
  await prisma.$disconnect();
  server.close(() => {
    logger.info('Servidor finalizado');
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
