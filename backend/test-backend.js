#!/usr/bin/env node

/**
 * Simple test script to verify backend functionality
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function testBackend() {
  try {
    console.log('🔌 Testing MongoDB connection...');
    
    // Test MongoDB connection
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully');
    
    // Test Firebase Admin
    console.log('🔥 Testing Firebase Admin...');
    const admin = require('./config/firebase-admin');
    console.log('✅ Firebase Admin initialized successfully');
    
    // Test Cloudinary
    console.log('☁️ Testing Cloudinary...');
    const { cloudinary } = require('./config/cloudinary');
    console.log('✅ Cloudinary configured successfully');
    
    console.log('\n🎉 All tests passed! Backend is ready to use.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

testBackend();
