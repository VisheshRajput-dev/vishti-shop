const Product = require('../models/Product');
const Category = require('../models/Category');
const { cloudinary } = require('../config/cloudinary');

// Helper function to slugify category names
const slugify = (text) => {
  return text.toLowerCase().trim()
    .replace(/\s+/g, '-')
    .replace(/&/g, '-and-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
};

// Helper function to delete image from Cloudinary
const deleteImageFromCloudinary = async (imageUrl) => {
  try {
    if (!imageUrl) return;
    
    // Extract public_id from Cloudinary URL
    const urlParts = imageUrl.split('/');
    const publicId = urlParts.slice(-1)[0].split('.')[0];
    const folder = urlParts.slice(-2, -1)[0];
    const fullPublicId = `${folder}/${publicId}`;
    
    await cloudinary.uploader.destroy(fullPublicId);
    console.log(`Deleted image: ${fullPublicId}`);
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
  }
};

// Helper function to handle category creation/selection
const handleCategory = async (categoryId, categoryName) => {
  if (categoryId) {
    // Use existing category
    const existingCategory = await Category.findById(categoryId);
    if (!existingCategory) {
      throw new Error('Selected category not found');
    }
    return existingCategory._id;
  } else if (categoryName) {
    // Create new category
    const slug = slugify(categoryName);
    const existingCategory = await Category.findOne({ 
      $or: [{ slug }, { name: categoryName }] 
    });
    
    if (existingCategory) {
      return existingCategory._id;
    }
    
    const newCategory = await Category.create({ 
      name: categoryName, 
      slug 
    });
    return newCategory._id;
  }
  return null;
};

// Create product
const createProduct = async (req, res) => {
  try {
    const imageUrls = (req.files || []).map(f => f.path);
    
    // Handle category
    const categoryId = await handleCategory(req.body.categoryId, req.body.categoryName);
    
    // Create product with proper description formatting
    if (!req.body.name || !req.body.price) {
      return res.status(400).json({
        message: "Please provide all required fields: Product name and price are mandatory"
      });
    }

    const product = await Product.create({
      name: req.body.name,
      description: req.body.description || '',
      price: req.body.price,
      stock: req.body.stock || 0,
      category: categoryId,
      images: imageUrls,
      inStock: req.body.stock > 0
    });

    if (!product) {
      return res.status(400).json({
        message: "Unable to create product. Please try again."
      });
    }

    // Update stock status if needed
    if (Number(product.stock) === 0 && product.inStock) {
      product.inStock = false;
      await product.save();
    }

    // Populate category for response
    await product.populate('category', 'name slug');
    
    res.status(201).json(product);
  } catch (error) {
    console.error('Create product error:', error);
    
    // Provide user-friendly error messages
    let errorMessage = "Unable to create product. ";
    
    if (error.name === 'ValidationError') {
      errorMessage += Object.values(error.errors)
        .map(err => err.message)
        .join('. ');
    } else if (error.code === 11000) {
      errorMessage += "A product with this name already exists.";
    } else if (error.code === 'LIMIT_FILE_SIZE') {
      errorMessage += "Image file is too large. Please upload images smaller than 50MB.";
    } else if (error.message && error.message.includes('File too large')) {
      errorMessage += "Image file is too large. Please upload images smaller than 50MB.";
    } else {
      errorMessage += "Please check your input and try again.";
    }
    
    res.status(500).json({ 
      message: errorMessage,
      success: false
    });
  }
};

// Update product
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    
    if (!product) {
      return res.status(404).json({ 
        success: false,
        message: 'Product not found' 
      });
    }

    // Handle image management
    let finalImages = [];
    
    try {
      // Get existing images that should be kept
      if (req.body.existingImages) {
        const existingImages = JSON.parse(req.body.existingImages);
        finalImages = existingImages;

        // Delete removed images from Cloudinary
        const removedImages = product.images.filter(img => !existingImages.includes(img));
        for (const imageUrl of removedImages) {
          await deleteImageFromCloudinary(imageUrl);
        }
      }

      // Add new uploaded images
      if (req.files && req.files.length > 0) {
        const newImageUrls = req.files.map(f => f.path);
        finalImages = [...finalImages, ...newImageUrls];
      }
    } catch (error) {
      console.error('Error handling images:', error);
      return res.status(400).json({
        success: false,
        message: 'Error processing images. Please try again.'
      });
    }

    const update = {
      name: req.body.name,
      price: req.body.price,
      colors: req.body.colors ? req.body.colors.split(',').map(s => s.trim()) : undefined,
      wholesalePrice: req.body.wholesalePrice,
      wholesaleMinQty: req.body.wholesaleMinQty,
      description: req.body.description,
      stock: req.body.stock,
      inStock: req.body.inStock !== undefined ? 
        ['true', true, '1', 1].includes(req.body.inStock) : undefined,
      isActive: req.body.isActive !== undefined ? 
        ['true', true, '1', 1].includes(req.body.isActive) : undefined,
      images: finalImages,
    };

    // Handle category
    if (req.body.categoryId || req.body.categoryName) {
      update.category = await handleCategory(req.body.categoryId, req.body.categoryName);
    }

    // Update product
    const updatedProduct = await Product.findByIdAndUpdate(id, update, { 
      new: true,
      runValidators: true 
    });
    
    if (!updatedProduct) {
      return res.status(400).json({
        success: false,
        message: 'Failed to update product. Please try again.'
      });
    }

    // Update stock status if needed
    if (Number(updatedProduct.stock) === 0 && updatedProduct.inStock) {
      updatedProduct.inStock = false;
      await updatedProduct.save();
    }

    // Populate category for response
    await updatedProduct.populate('category', 'name slug');
    
    res.json({
      success: true,
      message: 'Product updated successfully',
      product: updatedProduct
    });
  } catch (error) {
    console.error('Update product error:', error);
    
    // Provide user-friendly error messages
    let errorMessage = "Failed to update product. ";
    
    if (error.name === 'ValidationError') {
      errorMessage += Object.values(error.errors)
        .map(err => err.message)
        .join('. ');
    } else if (error.code === 11000) {
      errorMessage += "A product with this name already exists.";
    } else {
      errorMessage += "Please check your input and try again.";
    }
    
    res.status(500).json({ 
      success: false,
      message: errorMessage 
    });
  }
};

// Delete product
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Delete all images from Cloudinary
    if (product.images && product.images.length > 0) {
      for (const imageUrl of product.images) {
        await deleteImageFromCloudinary(imageUrl);
      }
    }

    // Delete product from database
    await Product.findByIdAndDelete(id);
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get products with filters and pagination
const getProducts = async (req, res) => {
  try {
    const { category, inStock, page = 1, limit = 20, search } = req.query;
    const query = {};
    
    if (inStock === 'true') query.inStock = true;
    if (inStock === 'false') query.inStock = false;

    if (category) {
      let catId = category;
      if (!category.match(/^[0-9a-fA-F]{24}$/)) {
        const cat = await Category.findOne({ slug: category }) || 
                   await Category.findOne({ name: category });
        if (cat) catId = cat._id;
      }
      query.category = catId;
    }
    
    if (search) query.$text = { $search: search };

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Product.find(query)
        .populate('category', 'name slug')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Product.countDocuments(query)
    ]);

    res.json({ 
      items, 
      total, 
      page: Number(page), 
      pages: Math.ceil(total / Number(limit)) 
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get single product
const getProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id).populate('category', 'name slug');
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createProduct,
  updateProduct,
  deleteProduct,
  getProducts,
  getProduct
};


