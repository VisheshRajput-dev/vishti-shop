#!/usr/bin/env node

/**
 * Script to set admin role in database for a user
 * Usage: node set-db-admin-role.js <email>
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function setDbAdminRole(email) {
  if (!email) {
    console.error('Please provide an email address');
    console.log('Usage: node set-db-admin-role.js <email>');
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

    console.log(`Found user: ${user._id} (${user.name})`);
    
    // Set admin role in database
    user.role = 'admin';
    await user.save();
    
    console.log(`✅ Successfully set admin role in database for ${email}`);
    console.log(`User ID: ${user._id}`);
    console.log(`User Name: ${user.name}`);
    
  } catch (error) {
    console.error('❌ Error setting admin role:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Get email from command line arguments
const email = process.argv[2];

// Run the script
setDbAdminRole(email).then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
