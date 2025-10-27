const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    images: [{ type: String }],
    price: { type: Number, required: true, min: 0 },
    colors: [{ type: String }],
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    wholesalePrice: { type: Number, min: 0 },
    wholesaleMinQty: { type: Number, min: 0 },
    description: { type: String },
    stock: { type: Number, default: 0, min: 0 },
    inStock: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ category: 1, inStock: 1, price: 1 });

module.exports = mongoose.model('Product', productSchema);
