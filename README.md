# 🛍️ Vishti Shop E-commerce Platform

A modern, full-stack e-commerce platform built with React, Node.js, MongoDB, Firebase Authentication, and Razorpay payment integration.

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js (v16 or higher)
- MongoDB (local or cloud)
- Firebase project with Authentication enabled
- Razorpay account
- Cloudinary account

### **1. Clone and Install**
```bash
git clone <repository-url>
cd vishti-shop

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### **2. Environment Setup**

#### **Backend Environment (.env)**
Create `backend/.env` file:
```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/vishti-shop

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_YOUR_TEST_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_TEST_KEY_SECRET

# Server Configuration
PORT=5000
NODE_ENV=development
```

#### **Frontend Environment (.env)**
Create `frontend/.env` file:
```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Razorpay Public Key
VITE_RAZORPAY_KEY_ID=rzp_test_YOUR_TEST_KEY_ID

# Backend API URL
VITE_API_URL=http://localhost:5000
```

### **3. Firebase Setup**

1. **Create Firebase Project**: Go to [Firebase Console](https://console.firebase.google.com/)
2. **Enable Authentication**: Enable Email/Password authentication
3. **Download Service Account**: Go to Project Settings → Service Accounts → Generate New Private Key
4. **Place Service Account**: Save as `backend/config/serviceAccountKey.json`

### **4. Start Development Servers**

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Visit `http://localhost:5173` to see the application.

---

## 👨‍💼 **Admin Setup**

### **Making a User Admin**

#### **Method 1: Using Script (Recommended)**
```bash
cd backend
node set-admin-role.js admin@example.com
```

#### **Method 2: Manual Firebase Console**
1. Go to Firebase Console → Authentication → Users
2. Find the user and note their UID
3. Use Firebase Admin SDK to set custom claims:

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./config/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function setAdminRole(email) {
  const user = await admin.auth().getUserByEmail(email);
  await admin.auth().setCustomUserClaims(user.uid, { role: 'admin' });
  console.log(`Admin role set for ${email}`);
}

setAdminRole('admin@example.com');
```

#### **Important Notes:**
- ⚠️ **User must sign out and sign back in** after setting admin role
- 🔒 Admin role is verified on every request
- 🛡️ Only users with `role: 'admin'` can access admin endpoints

---

## 🏗️ **Project Structure**

```
vishti-shop/
├── backend/                 # Node.js/Express API
│   ├── config/             # Database, Firebase, Cloudinary configs
│   ├── controllers/        # Business logic controllers
│   ├── middleware/        # Authentication middleware
│   ├── models/           # MongoDB schemas
│   ├── routes/           # API routes
│   ├── server.js         # Main server file
│   └── set-admin-role.js # Admin setup script
├── frontend/              # React application
│   ├── src/
│   │   ├── api/          # API client configuration
│   │   ├── components/    # Reusable components
│   │   ├── contexts/     # React contexts (Auth)
│   │   ├── layouts/      # Layout components
│   │   ├── pages/        # Page components
│   │   │   ├── admin/    # Admin panel pages
│   │   │   ├── auth/     # Authentication pages
│   │   │   └── store/    # Store pages
│   │   └── firebase.js   # Firebase configuration
│   └── package.json
└── README.md
```

---

## 🔧 **Key Features**

### **🛒 E-commerce Features**
- ✅ Product catalog with categories
- ✅ Shopping cart functionality
- ✅ Wishlist management
- ✅ User authentication (Firebase)
- ✅ Order management
- ✅ Payment integration (Razorpay)
- ✅ Admin dashboard
- ✅ Wholesale pricing
- ✅ Image upload (Cloudinary)

### **👤 User Types**
- **Personal Users**: Regular customers
- **Wholesale Users**: Business customers with minimum order requirements
- **Admin Users**: Full access to admin panel

### **💳 Payment Features**
- ✅ Razorpay integration
- ✅ Test mode support
- ✅ Payment verification
- ✅ Order confirmation
- ✅ Order tracking

### **🎨 UI/UX Features**
- ✅ Responsive design
- ✅ Modern UI with Tailwind CSS
- ✅ Smooth animations (Framer Motion)
- ✅ Toast notifications
- ✅ Loading states
- ✅ Error handling

---

## 📱 **User Roles & Permissions**

### **Personal Users**
- Browse products
- Add to cart/wishlist
- Place orders
- View order history
- Manage profile

### **Wholesale Users**
- All personal user features
- Wholesale pricing
- Minimum order requirements (₹10,000)
- Wholesale inquiry system

### **Admin Users**
- All user features
- Product management (CRUD)
- Category management
- Order management
- User management
- Analytics dashboard
- Wholesale inquiry management

---

## 🔌 **API Endpoints**

### **Authentication**
- `POST /api/auth/register` - Register/Update user profile
- `GET /api/auth/me` - Get current user profile
- `GET /api/auth/admin-check` - Check if user is admin

### **Products**
- `GET /api/products` - List products (public)
- `GET /api/products/:id` - Get single product (public)
- `POST /api/products` - Create product (admin only)
- `PUT /api/products/:id` - Update product (admin only)
- `DELETE /api/products/:id` - Delete product (admin only)

### **Cart**
- `GET /api/cart` - Get user's cart
- `POST /api/cart` - Add item to cart
- `PUT /api/cart/items/:itemId` - Update cart item
- `DELETE /api/cart/items/:itemId` - Remove cart item
- `DELETE /api/cart` - Clear cart

### **Orders**
- `POST /api/orders` - Place order
- `GET /api/orders` - Get user orders
- `GET /api/orders/admin` - Get all orders (admin only)
- `PUT /api/orders/:id/status` - Update order status (admin only)

### **Payments**
- `POST /api/payments/create-order` - Create Razorpay order
- `POST /api/payments/verify` - Verify payment

---

## 🛠️ **Development**

### **Available Scripts**

#### **Backend**
```bash
npm run dev          # Start development server with nodemon
npm start            # Start production server
npm test             # Run tests
```

#### **Frontend**
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### **Database Models**

#### **User**
- Firebase UID, email, name
- User type (personal/wholesale)
- Address, phone, DOB
- Wishlist items

#### **Product**
- Name, description, images
- Price, wholesale price
- Category, colors, stock
- Active status

#### **Cart**
- User reference
- Items array (product, quantity, price)
- Wholesale flag

#### **Order**
- User reference
- Items, pricing breakdown
- Shipping details
- Payment status, tracking

---

## 🚀 **Deployment**

### **Backend Deployment**
1. Set production environment variables
2. Use MongoDB Atlas for database
3. Deploy to platforms like Heroku, Railway, or DigitalOcean
4. Update CORS settings for production domain

### **Frontend Deployment**
1. Build the application: `npm run build`
2. Deploy to Vercel, Netlify, or similar
3. Update environment variables for production
4. Configure Firebase hosting rules

### **Environment Variables for Production**

#### **Backend**
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/vishti-shop
CLOUDINARY_CLOUD_NAME=your_production_cloud_name
CLOUDINARY_API_KEY=your_production_api_key
CLOUDINARY_API_SECRET=your_production_api_secret
RAZORPAY_KEY_ID=rzp_live_YOUR_LIVE_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_LIVE_KEY_SECRET
NODE_ENV=production
```

#### **Frontend**
```env
VITE_FIREBASE_API_KEY=your_production_firebase_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_RAZORPAY_KEY_ID=rzp_live_YOUR_LIVE_KEY_ID
VITE_API_URL=https://your-backend-domain.com
```

---

## 🔒 **Security Features**

- ✅ Firebase Authentication with custom claims
- ✅ JWT token verification
- ✅ Role-based access control
- ✅ Input validation and sanitization
- ✅ CORS configuration
- ✅ Environment variable protection
- ✅ Payment signature verification

---

## 🐛 **Troubleshooting**

### **Common Issues**

#### **"User not found" error**
- Ensure user exists in Firebase Authentication
- Check if email is correct
- Verify Firebase configuration

#### **"Admin access denied"**
- Set admin role using `set-admin-role.js`
- User must sign out and sign back in
- Check Firebase custom claims

#### **"Payment verification failed"**
- Verify Razorpay keys are correct
- Check if order was created successfully
- Ensure payment signature verification

#### **"CORS error"**
- Update CORS settings in backend
- Check if frontend URL is allowed
- Verify API URL configuration

#### **"MongoDB connection failed"**
- Check MongoDB URI format
- Ensure MongoDB is running
- Verify network connectivity

---

## 📞 **Support**

For issues and questions:
1. Check this README for common solutions
2. Review the console logs for error details
3. Check Firebase Console for authentication issues
4. Verify all environment variables are set correctly

---

## 🎉 **You're All Set!**

Your Vishti Shop e-commerce platform is now ready for development and production use. The application includes:

- ✅ Complete e-commerce functionality
- ✅ Admin panel for management
- ✅ Secure payment processing
- ✅ Modern, responsive UI
- ✅ Comprehensive documentation

Happy coding! 🚀
