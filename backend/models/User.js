const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  firebaseUid: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  name: { type: String, required: true },
  phone: { type: String },
  userType: { type: String, enum: ['personal', 'wholesale'], required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  companyName: { type: String },
  shopName: { type: String },
  gstin: { type: String },
  dob: { type: Date },
  purpose: { type: String, enum: ['personal', 'shop'] },
  address: {
    line1: String,
    landmark: String,
    district: String,
    state: String,
    pincode: String
  },
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
