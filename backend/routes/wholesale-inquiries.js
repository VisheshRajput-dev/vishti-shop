const express = require('express');
const router = express.Router();
const { verifyFirebaseToken, requireAdmin } = require('../middleware/authMiddleware');
const WholesaleInquiry = require('../models/WholesaleInquiry');
const Product = require('../models/Product');

// Submit wholesale inquiry (authenticated users)
router.post('/', verifyFirebaseToken, async (req, res) => {
  try {
    const { name, email, phone, productId, quantity, message } = req.body;

    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Create inquiry
    const inquiry = new WholesaleInquiry({
      name,
      email,
      phone,
      productId,
      quantity,
      message
    });

    await inquiry.save();

    res.status(201).json({
      success: true,
      message: 'Wholesale inquiry submitted successfully',
      inquiry
    });
  } catch (error) {
    console.error('Wholesale inquiry error:', error);
    res.status(500).json({ message: 'Failed to submit inquiry' });
  }
});

// Get all inquiries (admin only)
router.get('/', verifyFirebaseToken, requireAdmin, async (req, res) => {
  try {
    const inquiries = await WholesaleInquiry.find()
      .populate('productId', 'name images')
      .populate('resolvedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(inquiries);
  } catch (error) {
    console.error('Get inquiries error:', error);
    res.status(500).json({ message: 'Failed to fetch inquiries' });
  }
});

// Update inquiry status (admin only)
router.put('/:id/status', verifyFirebaseToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    const inquiry = await WholesaleInquiry.findById(id);
    if (!inquiry) {
      return res.status(404).json({ message: 'Inquiry not found' });
    }

    inquiry.status = status;
    if (status === 'resolved') {
      inquiry.resolvedAt = new Date();
      inquiry.resolvedBy = req.user.dbUser._id;
    }

    await inquiry.save();

    res.json({
      success: true,
      message: `Inquiry marked as ${status}`,
      inquiry
    });
  } catch (error) {
    console.error('Update inquiry error:', error);
    res.status(500).json({ message: 'Failed to update inquiry' });
  }
});

module.exports = router;
