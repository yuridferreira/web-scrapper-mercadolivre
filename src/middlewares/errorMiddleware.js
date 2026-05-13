const logger = require('../utils/logger');

function errorMiddleware(err, req, res) {
  logger.error(err.message, { stack: err.stack });

  const status = err.statusCode || 500;
  const message = err.message || 'Erro interno no servidor';

  res.status(status).json({
    status: 'error',
    message,
  });
}

module.exports = errorMiddleware;
