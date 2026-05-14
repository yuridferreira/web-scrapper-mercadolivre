const dotenv = require('dotenv');
const path = require('path');

const envFile = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envFile });

const requiredKeys = ['DATABASE_URL', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'];
const missingKeys = requiredKeys.filter((key) => !process.env[key]);
if (missingKeys.length) {
  throw new Error(`Faltam variáveis de ambiente obrigatórias: ${missingKeys.join(', ')}`);
}

module.exports = {
  app: {
    port: Number(process.env.PORT) || 3000,
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
  },
  marketplace: {
    siteId: process.env.MERCADO_LIVRE_SITE_ID || 'MLB',
  },
  cron: {
    schedule: process.env.CRON_SCHEDULE || '*/30 * * * *',
  },
};
