const express = require('express');
const router = express.Router();
const { verifyFirebaseToken } = require('../middleware/authMiddleware');
const User = require('../models/User');
const Product = require('../models/Product');

// All routes require authentication
router.use(verifyFirebaseToken);

// Add product to wishlist
router.post('/', async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.user.dbUser._id;

    // Find the user and their wishlist
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Initialize wishlist if it doesn't exist
    if (!user.wishlist) {
      user.wishlist = [];
    }

    // Check if product already exists in wishlist
    const exists = user.wishlist.includes(productId);
    if (exists) {
      return res.status(400).json({ message: 'Product already in wishlist' });
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Add to wishlist
    user.wishlist.push(productId);
    await user.save();

    res.json({
      success: true,
      message: 'Added to wishlist'
    });
  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({ message: 'Failed to add to wishlist' });
  }
});

// Remove product from wishlist
router.delete('/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.dbUser._id;

    // Find the user and their wishlist
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Initialize wishlist if it doesn't exist
    if (!user.wishlist) {
      user.wishlist = [];
    }

    // Remove from wishlist
    const index = user.wishlist.indexOf(productId);
    if (index > -1) {
      user.wishlist.splice(index, 1);
      await user.save();
    }

    res.json({
      success: true,
      message: 'Removed from wishlist'
    });
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({ message: 'Failed to remove from wishlist' });
  }
});

// Get user's wishlist with populated product data
router.get('/', async (req, res) => {
  try {
    const userId = req.user.dbUser._id;
    const user = await User.findById(userId)
      .populate({
        path: 'wishlist',
        model: 'Product'
      });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Format the response to match frontend expectations
    const wishlistItems = (user.wishlist || []).map(product => ({
      product: product
    }));

    res.json({
      items: wishlistItems
    });
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({ message: 'Failed to fetch wishlist' });
  }
});

module.exports = router;
