function validateProductData(req, res, next) {
  const { name, targetPrice, productUrl } = req.body;

  if (!name || typeof name !== 'string') {
    return res
      .status(400)
      .json({ message: 'O nome do produto é obrigatório e deve ser uma string.' });
  }

  const price = Number(targetPrice);
  if (!targetPrice || Number.isNaN(price) || price <= 0) {
    return res.status(400).json({ message: 'O preço alvo deve ser um número maior que zero.' });
  }

  if (!productUrl || typeof productUrl !== 'string') {
    return res
      .status(400)
      .json({ message: 'A URL do produto é obrigatória e deve ser uma string.' });
  }

  next();
}

function validateProductId(req, res, next) {
  const { id } = req.params;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'O id do produto é obrigatório.' });
  }

  next();
}

module.exports = {
  validateProductData,
  validateProductId,
};
