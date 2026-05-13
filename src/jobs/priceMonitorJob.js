const cron = require('node-cron');
const monitorService = require('../services/monitorService');
const env = require('../config/env');
const logger = require('../utils/logger');

class PriceMonitorJob {
  constructor() {
    this.task = null;
  }

  start() {
    logger.info('Agendando job de monitoramento', { schedule: env.cron.schedule });

    this.task = cron.schedule(
      env.cron.schedule,
      async () => {
        logger.info('Iniciando execução do job de monitoramento');
        await monitorService.monitorProducts();
      },
      {
        timezone: 'America/Sao_Paulo',
      }
    );
  }

  stop() {
    if (this.task) {
      this.task.stop();
      logger.info('Job de monitoramento parado');
    }
  }
}

module.exports = new PriceMonitorJob();
