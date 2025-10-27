const express = require('express');
const router = express.Router();
const { verifyFirebaseToken } = require('../middleware/authMiddleware');
const User = require('../models/User');

// Get current user profile
router.get('/me', verifyFirebaseToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ message: 'User profile not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Register/Update user profile
router.post('/register', verifyFirebaseToken, async (req, res) => {
  try {
    const { dob, purpose, shopName, address } = req.body;
    
    // Check if user already exists
    let user = await User.findOne({ firebaseUid: req.user.uid });
    
    if (user) {
      // Update existing user
      user.dob = dob ? new Date(dob) : user.dob;
      user.purpose = purpose;
      user.shopName = shopName;
      user.address = address;
      await user.save();
      res.json({ message: 'Profile updated successfully', user });
    } else {
      // Create new user
      user = new User({
        firebaseUid: req.user.uid,
        email: req.user.email,
        name: req.user.email.split('@')[0], // Default name from email
        userType: purpose === 'shop' ? 'wholesale' : 'personal', // Set userType based on purpose
        dob: dob ? new Date(dob) : undefined,
        purpose,
        shopName,
        address
      });
      await user.save();
      res.status(201).json({ message: 'Profile created successfully', user });
    }
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update user profile
router.put('/profile', verifyFirebaseToken, async (req, res) => {
  try {
    const { name, phone, dob, purpose, shopName, gstin, address } = req.body;
    
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user fields
    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (dob) user.dob = new Date(dob);
    if (purpose) {
      user.purpose = purpose;
      user.userType = purpose === 'shop' ? 'wholesale' : 'personal';
    }
    if (shopName !== undefined) user.shopName = shopName;
    if (gstin !== undefined) user.gstin = gstin;
    if (address) user.address = address;

    await user.save();
    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Check if user is admin
router.get('/admin-check', verifyFirebaseToken, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    res.json({ isAdmin, user: req.user });
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
