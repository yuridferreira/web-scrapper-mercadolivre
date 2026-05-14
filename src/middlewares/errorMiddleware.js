const logger = require('../utils/logger');

function errorMiddleware(err, req, res, next) {
  if (next) {
    // Keeping next parameter for Express error middleware signature
  }

  logger.error(err.message || 'Erro desconhecido', {
    stack: err.stack,
    statusCode: err.statusCode || 500,
  });

  const status = err.statusCode || 500;
  const message = err.message || 'Erro interno no servidor';

  res.status(status).json({
    status: 'error',
    message,
  });
}

module.exports = errorMiddleware;
