const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { verifyFirebaseToken } = require('../middleware/authMiddleware');
const Order = require('../models/Order');
const Cart = require('../models/Cart');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Razorpay order
router.post('/create-order', verifyFirebaseToken, async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt } = req.body;
    
    if (!amount || amount < 1) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const options = {
      amount: Math.round(amount * 100), // Razorpay expects amount in paise
      currency,
      receipt: receipt || `order_${Date.now()}`,
      payment_capture: 1
    };

    const order = await razorpay.orders.create(options);
    
    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ message: 'Failed to create payment order' });
  }
});

// Verify payment signature
router.post('/verify-payment', verifyFirebaseToken, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderData } = req.body;
    
    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

                    // Create order in database
                const order = new Order({
                  userId: req.user.dbUser._id,
                  items: orderData.items,
                  subtotal: orderData.subtotal,
                  shippingCost: orderData.shippingCost,
                  gst: orderData.gst,
                  total: orderData.total,
                  shippingDetails: orderData.shippingDetails,
                  deliveryOption: orderData.deliveryOption,
                  isWholesale: orderData.isWholesale,
                  paymentStatus: 'paid',
                  paymentId: razorpay_payment_id,
                  orderId: razorpay_order_id,
                  status: 'confirmed'
                });

                await order.save();

                // Clear cart after successful order
                await Cart.findOneAndDelete({ user: req.user.dbUser._id });

    res.json({
      success: true,
      message: 'Payment verified and order created successfully',
      order: order
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ message: 'Failed to verify payment' });
  }
});

module.exports = router;
