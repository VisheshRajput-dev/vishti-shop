const express = require('express');
const router = express.Router();
const { verifyFirebaseToken, requireAdmin } = require('../middleware/authMiddleware');
const {
  createQuery,
  getQueries,
  updateQuery
} = require('../controllers/queryController');

// Create new query (authenticated users only)
router.post('/', verifyFirebaseToken, createQuery);

// Get all queries (admin only)
router.get('/', verifyFirebaseToken, requireAdmin, getQueries);

// Update query (admin only)
router.put('/:id', verifyFirebaseToken, requireAdmin, updateQuery);

module.exports = router;
