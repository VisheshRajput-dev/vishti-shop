const express = require('express');
const router = express.Router();
const { verifyFirebaseToken } = require('../middleware/authMiddleware');
const {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart
} = require('../controllers/cartController');

// All routes require authentication
router.use(verifyFirebaseToken);

// Get user's cart
router.get('/', getCart);

// Add item to cart
router.post('/', addToCart);

// Update cart item quantity
router.put('/items/:id', updateCartItem);

// Remove item from cart
router.delete('/items/:id', removeCartItem);

// Clear cart
router.delete('/', clearCart);

module.exports = router;
