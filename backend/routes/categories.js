const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const { verifyFirebaseToken, requireAdmin } = require('../middleware/authMiddleware');

const slugify = (str) =>
  str.toString().toLowerCase().trim()
    .replace(/\s+/g, '-')
    .replace(/&/g, '-and-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');

// Public: list categories
router.get('/', async (_req, res) => {
  const cats = await Category.find().sort({ name: 1 });
  res.json(cats);
});

// Admin: create
router.post('/', verifyFirebaseToken, requireAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Name required' });
    const cat = await Category.create({ name, description, slug: slugify(name) });
    res.json(cat);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Admin: update
router.put('/:id', verifyFirebaseToken, requireAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    const update = {};
    if (name) { update.name = name; update.slug = slugify(name); }
    if (description !== undefined) update.description = description;
    const cat = await Category.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json(cat);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Admin: delete
router.delete('/:id', verifyFirebaseToken, requireAdmin, async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
