const express = require('express');
const router = express.Router();
const { verifyFirebaseToken, requireAdmin } = require('../middleware/authMiddleware');
const Order = require('../models/Order');
const Cart = require('../models/Cart');

// Get user's orders (My Orders)
router.get('/my-orders', verifyFirebaseToken, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.dbUser._id })
      .populate('items.productId', 'name images price')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
});

// Get all orders (Admin only)
router.get('/admin/all', verifyFirebaseToken, requireAdmin, async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate('userId', 'name email phone')
      .populate('items.productId', 'name images price')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    console.error('Error fetching all orders:', error);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
});

// Get specific order (User can only see their own orders)
router.get('/:id', verifyFirebaseToken, async (req, res) => {
  try {
    const order = await Order.findOne({ 
      _id: req.params.id, 
      userId: req.user.dbUser._id 
    }).populate('items.productId', 'name images price description');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ message: 'Failed to fetch order' });
  }
});

// Get specific order (Admin can see any order)
router.get('/admin/:id', verifyFirebaseToken, requireAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('userId', 'name email phone')
      .populate('items.productId', 'name images price description');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ message: 'Failed to fetch order' });
  }
});

// Create order (for direct orders without payment)
router.post('/', verifyFirebaseToken, async (req, res) => {
  try {
    const { items, shippingDetails, deliveryOption, subtotal, shippingCost, gst, total, isWholesale } = req.body;

    // Validate wholesale minimum order
    if (isWholesale && subtotal < 10000) {
      return res.status(400).json({ 
        message: 'Minimum order amount for wholesale buyers is ₹10,000' 
      });
    }

    const order = new Order({
      userId: req.user.dbUser._id,
      items,
      subtotal,
      shippingCost,
      gst,
      total,
      shippingDetails,
      deliveryOption,
      isWholesale,
      status: 'pending',
      paymentStatus: 'pending'
    });

    await order.save();

    // Clear cart after successful order
    await Cart.findOneAndDelete({ user: req.user.dbUser._id });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Failed to create order' });
  }
});

// Update order status and tracking (Admin only)
router.put('/admin/:id/update', verifyFirebaseToken, requireAdmin, async (req, res) => {
  try {
    const { status, trackingNumber } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Update status if provided
    if (status) {
      order.status = status;
    }

    // Update tracking number if provided
    if (trackingNumber !== undefined) {
      order.trackingNumber = trackingNumber;
    }

    await order.save();

    res.json({
      success: true,
      message: 'Order updated successfully',
      order
    });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ message: 'Failed to update order' });
  }
});

// Legacy route for backward compatibility
router.get('/', verifyFirebaseToken, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.dbUser._id })
      .populate('items.productId', 'name images price')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
});

module.exports = router;
