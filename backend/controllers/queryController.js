const Query = require('../models/Query');

// Create new query
const createQuery = async (req, res) => {
  try {
    const query = await Query.create({
      ...req.body,
      user: req.user._id
    });
    
    await query.populate('productId', 'name images');
    
    res.status(201).json({
      success: true,
      message: 'Query submitted successfully',
      query
    });
  } catch (error) {
    console.error('Create query error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit query'
    });
  }
};

// Get all queries (admin only)
const getQueries = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    
    if (status) query.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Query.find(query)
        .populate('productId', 'name images')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Query.countDocuments(query)
    ]);

    res.json({
      success: true,
      items,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    console.error('Get queries error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch queries'
    });
  }
};

// Update query (admin only)
const updateQuery = async (req, res) => {
  try {
    const { id } = req.params;
    const query = await Query.findByIdAndUpdate(
      id,
      {
        reply: req.body.reply,
        status: req.body.status,
        updatedAt: Date.now()
      },
      { new: true }
    ).populate('productId', 'name images');

    if (!query) {
      return res.status(404).json({
        success: false,
        message: 'Query not found'
      });
    }

    res.json({
      success: true,
      message: 'Query updated successfully',
      query
    });
  } catch (error) {
    console.error('Update query error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update query'
    });
  }
};

module.exports = {
  createQuery,
  getQueries,
  updateQuery
};
