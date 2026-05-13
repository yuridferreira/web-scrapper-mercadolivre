const express = require('express');
const productController = require('../controllers/productController');
const {
  validateProductData,
  validateProductId,
} = require('../middlewares/validateProductMiddleware');

const router = express.Router();

router.post('/', validateProductData, productController.createProduct);
router.get('/', productController.listProducts);
router.delete('/:id', validateProductId, productController.deleteProduct);

module.exports = router;
