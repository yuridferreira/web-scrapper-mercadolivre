const productService = require('../services/productService');

class ProductController {
  async create(req, res, next) {
    try {
      const product = await productService.createProduct(req.body);
      res.status(201).json(product);
    } catch (error) {
      next(error);
    }
  }

  async list(req, res, next) {
    try {
      const products = await productService.listProducts();
      res.json(products);
    } catch (error) {
      next(error);
    }
  }

  async findById(req, res, next) {
    try {
      const id = Number(req.params.id);
      const product = await productService.findProductById(id);

      if (!product) {
        return res.status(404).json({ message: 'Produto não encontrado.' });
      }

      res.json(product);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const id = Number(req.params.id);
      const product = await productService.updateProduct(id, req.body);
      res.json(product);
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const id = Number(req.params.id);
      await productService.deleteProduct(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProductController();
