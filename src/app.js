const express = require('express');
const productRoutes = require('./routes/productRoutes');
const errorMiddleware = require('./middlewares/errorMiddleware');
const logger = require('./utils/logger');

const app = express();

app.use(express.json());
app.use((req, res, next) => {
  logger.info('Requisição recebida', {
    method: req.method,
    url: req.originalUrl,
  });
  next();
});

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Promo Monitor Bot API está rodando' });
});

app.use('/products', productRoutes);

app.use((req, res) => {
  logger.warn(`Rota não encontrada: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ message: 'Rota não encontrada' });
});

app.use(errorMiddleware);

module.exports = app;
