const express = require('express');
const router = express.Router();
const { verifyFirebaseToken, requireAdmin } = require('../middleware/authMiddleware');
const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');

// Dashboard Statistics
router.get('/dashboard/stats', verifyFirebaseToken, requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get orders statistics
    const [todayOrders, weekOrders, monthOrders, pendingOrders] = await Promise.all([
      Order.countDocuments({ createdAt: { $gte: today } }),
      Order.countDocuments({ createdAt: { $gte: weekAgo } }),
      Order.countDocuments({ createdAt: { $gte: monthAgo } }),
      Order.countDocuments({ status: 'pending' })
    ]);

    // Get revenue statistics
    const [todayRevenue, weekRevenue, monthRevenue] = await Promise.all([
      Order.aggregate([
        { $match: { createdAt: { $gte: today }, paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: weekAgo }, paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: monthAgo }, paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ])
    ]);

    // Get total users
    const totalUsers = await User.countDocuments();

    res.json({
      totalOrders: {
        today: todayOrders,
        week: weekOrders,
        month: monthOrders
      },
      totalRevenue: {
        today: todayRevenue[0]?.total || 0,
        week: weekRevenue[0]?.total || 0,
        month: monthRevenue[0]?.total || 0
      },
      pendingOrders,
      totalUsers
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard statistics' });
  }
});

// Recent Orders
router.get('/dashboard/recent-orders', verifyFirebaseToken, requireAdmin, async (req, res) => {
  try {
    const recentOrders = await Order.find({})
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json(recentOrders);
  } catch (error) {
    console.error('Error fetching recent orders:', error);
    res.status(500).json({ message: 'Failed to fetch recent orders' });
  }
});

// Top Selling Products
router.get('/dashboard/top-products', verifyFirebaseToken, requireAdmin, async (req, res) => {
  try {
    const topProducts = await Order.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 }
    ]);

    // Get product details
    const productIds = topProducts.map(item => item._id);
    const products = await Product.find({ _id: { $in: productIds } });

    // Combine data
    const topProductsWithDetails = topProducts.map(item => {
      const product = products.find(p => p._id.toString() === item._id.toString());
      if (!product) {
        return {
          _id: item._id,
          name: 'Product Not Found',
          price: 0,
          totalSold: item.totalSold,
          totalRevenue: item.totalRevenue
        };
      }
      return {
        ...product.toObject(),
        totalSold: item.totalSold,
        totalRevenue: item.totalRevenue
      };
    });

    res.json(topProductsWithDetails);
  } catch (error) {
    console.error('Error fetching top products:', error);
    res.status(500).json({ message: 'Failed to fetch top products' });
  }
});

module.exports = router;
