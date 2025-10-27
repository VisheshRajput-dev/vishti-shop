#!/usr/bin/env node

/**
 * Script to fix user data by adding missing required fields
 * Usage: node fix-user-data.js <email>
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function fixUserData(email) {
  if (!email) {
    console.error('Please provide an email address');
    console.log('Usage: node fix-user-data.js <email>');
    process.exit(1);
  }

  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    console.log(`Looking up user with email: ${email}`);
    
    // Find user by email
    const user = await User.findOne({ email: email });
    if (!user) {
      console.error('❌ User not found in database');
      process.exit(1);
    }

    console.log(`Found user: ${user._id}`);
    console.log('Current user data:', {
      name: user.name,
      userType: user.userType,
      role: user.role,
      email: user.email
    });
    
    // Fix missing required fields
    const updates = {};
    
    if (!user.name) {
      updates.name = email.split('@')[0]; // Use email prefix as name
      console.log(`Setting name to: ${updates.name}`);
    }
    
    if (!user.userType) {
      updates.userType = 'personal'; // Default to personal
      console.log(`Setting userType to: ${updates.userType}`);
    }
    
    if (!user.role) {
      updates.role = 'admin'; // Set as admin
      console.log(`Setting role to: ${updates.role}`);
    }
    
    if (Object.keys(updates).length > 0) {
      // Update the user
      Object.assign(user, updates);
      await user.save();
      
      console.log(`✅ Successfully updated user data for ${email}`);
      console.log('Updated user data:', {
        name: user.name,
        userType: user.userType,
        role: user.role,
        email: user.email
      });
    } else {
      console.log('✅ User data is already complete');
    }
    
  } catch (error) {
    console.error('❌ Error fixing user data:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Get email from command line arguments
const email = process.argv[2];

// Run the script
fixUserData(email).then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
