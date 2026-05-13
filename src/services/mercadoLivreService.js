const axios = require('axios');
const env = require('../config/env');
const logger = require('../utils/logger');

class MercadoLivreService {
  async fetchCurrentPrice(product) {
    const query = encodeURIComponent(product.name);
    const url = `${env.marketplace.searchBaseUrl}/${env.marketplace.siteId}/search?q=${query}`;

    logger.info('Consultando Mercado Livre', { product: product.name, url });

    const response = await axios.get(url);
    const [firstResult] = response.data.results || [];

    if (!firstResult) {
      throw new Error('Nenhum resultado encontrado para o produto no Mercado Livre');
    }

    return {
      price: firstResult.price,
      productUrl: product.productUrl || firstResult.permalink,
      title: firstResult.title,
    };
  }
}

module.exports = new MercadoLivreService();
