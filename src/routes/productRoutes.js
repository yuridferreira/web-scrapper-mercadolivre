const express = require('express');
const productController = require('../controllers/productController');
const {
  validateProductData,
  validateProductUpdateData,
  validateProductId,
} = require('../middlewares/validateProductMiddleware');

const router = express.Router();

router.post('/', validateProductData, productController.create);
router.get('/', productController.list);
router.get('/:id', validateProductId, productController.findById);
router.put('/:id', validateProductId, validateProductUpdateData, productController.update);
router.delete('/:id', validateProductId, productController.delete);

module.exports = router;
