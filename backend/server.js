require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Fix mongoose deprecation warning
mongoose.set('strictQuery', false);

const app = express();

// Middleware
// CORS configuration - Allow requests from frontend domains
app.use(cors({
  origin: [
    'http://localhost:5173', // Local development (Vite default port)
    'https://vishti-shop.vercel.app', // Production frontend (Vercel)
  ],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// MongoDB connection with better error handling and options
const mongooseOptions = {
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  retryWrites: true,
  w: 'majority'
};

mongoose.connect(process.env.MONGODB_URI, mongooseOptions)
  .then(() => {
    console.log('MongoDB connected successfully');
    console.log('MongoDB connection state:', mongoose.connection.readyState);
  })
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    console.error('Error details:', {
      name: err.name,
      code: err.code,
      reason: err.reason?.message
    });
    
    if (err.message.includes('whitelist') || err.message.includes('IP')) {
      console.error('\n⚠️  IMPORTANT: MongoDB Atlas IP Whitelist Issue!');
      console.error('Railway IPs need to be whitelisted in MongoDB Atlas.');
      console.error('Solution: Go to MongoDB Atlas > Network Access > Add IP Address > Allow Access from Anywhere (0.0.0.0/0)');
    }
    
    // Don't exit process - let server start but log the error
    // This allows the server to be healthy even if MongoDB is temporarily down
  });

// Handle MongoDB connection events
mongoose.connection.on('connected', () => {
  console.log('MongoDB connection established');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected');
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/wishlist', require('./routes/wishlist'));
app.use('/api/queries', require('./routes/queries'));
app.use('/api/wholesale-inquiries', require('./routes/wholesale-inquiries'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/admin', require('./routes/admin'));

// Root route
app.get('/', (_req, res) => res.json({ ok: true, service: 'Vishti Shop API' }));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`API running on ${PORT}`));
