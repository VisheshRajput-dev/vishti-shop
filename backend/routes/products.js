const express = require('express');
const router = express.Router();
const { verifyFirebaseToken, requireAdmin } = require('../middleware/authMiddleware');
const { upload } = require('../config/cloudinary');
const {
  createProduct,
  updateProduct,
  deleteProduct,
  getProducts,
  getProduct
} = require('../controllers/productController');

// Public: list products with filters & pagination
router.get('/', getProducts);

// Public: get single product
router.get('/:id', getProduct);

// Admin: create product
router.post('/', verifyFirebaseToken, requireAdmin, upload.array('images', 6), createProduct);

// Error handling middleware for multer errors
router.use((error, req, res, next) => {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'Image file is too large. Please upload images smaller than 50MB.'
    });
  }
  if (error.message && error.message.includes('File too large')) {
    return res.status(400).json({
      success: false,
      message: 'Image file is too large. Please upload images smaller than 50MB.'
    });
  }
  next(error);
});

// Admin: update product
router.put('/:id', verifyFirebaseToken, requireAdmin, upload.array('newImages', 6), updateProduct);

// Admin: delete product
router.delete('/:id', verifyFirebaseToken, requireAdmin, deleteProduct);

module.exports = router;
