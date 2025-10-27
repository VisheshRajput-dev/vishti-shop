#!/usr/bin/env node

/**
 * Script to set admin role for a user
 * Usage: node set-admin-role.js <email>
 */

require('dotenv').config();
const admin = require('./config/firebase-admin');

async function setAdminRole(email) {
  if (!email) {
    console.error('Please provide an email address');
    console.log('Usage: node set-admin-role.js <email>');
    process.exit(1);
  }

  try {
    console.log(`Looking up user with email: ${email}`);
    
    // Get user by email
    const user = await admin.auth().getUserByEmail(email);
    console.log(`Found user: ${user.uid} (${user.displayName || 'No display name'})`);
    
    // Set custom claim
    await admin.auth().setCustomUserClaims(user.uid, { role: 'admin' });
    console.log(`✅ Successfully set admin role for ${email}`);
    console.log(`User UID: ${user.uid}`);
    console.log('\n⚠️  Important: The user must sign out and sign back in for the changes to take effect.');
    
  } catch (error) {
    console.error('❌ Error setting admin role:', error.message);
    
    if (error.code === 'auth/user-not-found') {
      console.log('User not found. Make sure the email is correct and the user exists in Firebase Auth.');
    } else if (error.code === 'auth/invalid-email') {
      console.log('Invalid email format.');
    }
    
    process.exit(1);
  }
}

// Get email from command line arguments
const email = process.argv[2];

// Run the script
setAdminRole(email).then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
