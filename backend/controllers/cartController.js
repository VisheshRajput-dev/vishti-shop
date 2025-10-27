const Cart = require('../models/Cart');
const Product = require('../models/Product');
const mongoose = require('mongoose');

// Helper function to calculate cart total
const calculateCartTotal = (items) => {
  return items.reduce((total, item) => {
    const price = item.price || 0;
    const quantity = item.quantity || 0;
    return total + (price * quantity);
  }, 0);
};

// Get user's cart
const getCart = async (req, res) => {
  try {
    const userId = req.user.dbUser._id;

    let cart = await Cart.findOne({ user: userId })
      .populate('items.product', 'name images price wholesalePrice stock inStock');
    
    if (!cart) {
      cart = await Cart.create({
        user: userId,
        items: [],
        totalAmount: 0
      });
    }

    res.json(cart);
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cart'
    });
  }
};

// Add item to cart
const addToCart = async (req, res) => {
  try {
    const { productId, quantity, isWholesale } = req.body;
    const userId = req.user.dbUser._id;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (!product.inStock) {
      return res.status(400).json({
        success: false,
        message: 'Product is out of stock'
      });
    }

    // Validate product has a valid price
    if (!product.price || product.price <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Product price is not valid'
      });
    }

    let cart = await Cart.findOne({ user: userId });
    
    if (!cart) {
      cart = await Cart.create({
        user: userId,
        items: [],
        totalAmount: 0
      });
    }

    // Check if product already in cart
    const existingItem = cart.items.find(item => 
      item.product.toString() === productId && 
      item.isWholesale === (isWholesale || false)
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      // Determine the correct price based on wholesale status
      let itemPrice = product.price; // Default to regular price
      
      if (isWholesale && product.wholesalePrice) {
        itemPrice = product.wholesalePrice;
      } else if (isWholesale && !product.wholesalePrice) {
        // If wholesale is requested but no wholesale price exists, use regular price
        itemPrice = product.price;
      }
      
      cart.items.push({
        product: productId,
        quantity,
        price: itemPrice,
        isWholesale: isWholesale && !!product.wholesalePrice // Only true wholesale if wholesale price exists
      });
    }

    // Recalculate total
    cart.totalAmount = calculateCartTotal(cart.items);

    await cart.save();
    await cart.populate('items.product', 'name images price wholesalePrice stock inStock');

    res.json(cart);
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add item to cart'
    });
  }
};

// Update cart item quantity
const updateCartItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    const userId = req.user.dbUser._id;

    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1'
      });
    }

    const cart = await Cart.findOne({ user: userId });
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    const item = cart.items.id(id);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }

    item.quantity = quantity;

    cart.totalAmount = calculateCartTotal(cart.items);

    await cart.save();
    await cart.populate('items.product', 'name images price wholesalePrice stock inStock');

    res.json(cart);
  } catch (error) {
    console.error('Update cart item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update cart item'
    });
  }
};

// Remove item from cart
const removeCartItem = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.dbUser._id;

    const cart = await Cart.findOne({ user: userId });
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    cart.items = cart.items.filter(item => item._id.toString() !== id);

    cart.totalAmount = calculateCartTotal(cart.items);

    await cart.save();
    await cart.populate('items.product', 'name images price wholesalePrice stock inStock');

    res.json(cart);
  } catch (error) {
    console.error('Remove cart item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove cart item'
    });
  }
};

// Clear cart
const clearCart = async (req, res) => {
  try {
    const userId = req.user.dbUser._id;
    const cart = await Cart.findOne({ user: userId });
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    cart.items = [];
    cart.totalAmount = 0;
    await cart.save();

    res.json({
      success: true,
      message: 'Cart cleared successfully'
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cart'
    });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart
};
