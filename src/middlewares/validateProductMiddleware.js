function isValidUrl(value) {
  const urlPattern = /^(https?:\/\/)[^\s$.?#].[^\s]*$/i;
  return typeof value === 'string' && urlPattern.test(value);
}

function validateProductData(req, res, next) {
  const { name, targetPrice, productUrl } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ message: 'O nome do produto é obrigatório e deve ser uma string válida.' });
  }

  const price = Number(targetPrice);
  if (targetPrice === undefined || Number.isNaN(price) || price <= 0) {
    return res.status(400).json({ message: 'O preço alvo é obrigatório e deve ser maior que zero.' });
  }

  if (!productUrl || typeof productUrl !== 'string' || !isValidUrl(productUrl)) {
    return res.status(400).json({ message: 'A URL do produto é obrigatória e deve ser válida.' });
  }

  next();
}

function validateProductUpdateData(req, res, next) {
  const { name, targetPrice, productUrl } = req.body;

  if (name === undefined && targetPrice === undefined && productUrl === undefined) {
    return res.status(400).json({ message: 'Pelo menos um campo deve ser informado para atualização.' });
  }

  if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
    return res.status(400).json({ message: 'O nome do produto deve ser uma string válida.' });
  }

  if (targetPrice !== undefined) {
    const price = Number(targetPrice);
    if (Number.isNaN(price) || price <= 0) {
      return res.status(400).json({ message: 'O preço alvo deve ser um número maior que zero.' });
    }
  }

  if (productUrl !== undefined && (typeof productUrl !== 'string' || !isValidUrl(productUrl))) {
    return res.status(400).json({ message: 'A URL do produto deve ser válida.' });
  }

  next();
}

function validateProductId(req, res, next) {
  const { id } = req.params;
  const parsedId = Number(id);

  if (!id || Number.isNaN(parsedId) || parsedId <= 0) {
    return res.status(400).json({ message: 'O id do produto deve ser um número inteiro válido.' });
  }

  next();
}

module.exports = {
  validateProductData,
  validateProductUpdateData,
  validateProductId,
};
