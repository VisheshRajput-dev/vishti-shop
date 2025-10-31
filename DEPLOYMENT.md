# 🚀 Vishti Shop - Deployment Guide

This guide will walk you through deploying the Vishti Shop e-commerce platform to production using **Railway** for the backend and **Vercel** for the frontend.

## 📋 Prerequisites

Before deploying, ensure you have:

- **Node.js** (v16 or higher) installed locally
- **MongoDB Atlas** account (free tier available)
- **Firebase** project with Authentication enabled
- **Razorpay** account for payments
- **Cloudinary** account for image storage
- **GitHub** account (for connecting repositories)
- **Railway** account (for backend deployment)
- **Vercel** account (for frontend deployment)

## 🔧 Environment Variables Setup

Since `.env` files are not included in the repository for security reasons, you need to configure them on your deployment platforms.

### Backend Environment Variables (Railway)

These will be set in Railway dashboard:

```env
# MongoDB Connection
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/vishti-shop?retryWrites=true&w=majority

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_live_YOUR_LIVE_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_LIVE_KEY_SECRET

# Firebase Admin (Service Account Key)
# Paste the entire JSON content from serviceAccountKey.json as a single-line string
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}
# OR use individual fields (alternative approach):
# FIREBASE_PROJECT_ID=your_project_id
# FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
# FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
# FIREBASE_CLIENT_ID=your_client_id
# FIREBASE_PRIVATE_KEY_ID=your_private_key_id

# Server Configuration
PORT=5000
NODE_ENV=production
```

### Frontend Environment Variables (Vercel)

These will be set in Vercel dashboard:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Razorpay Public Key
VITE_RAZORPAY_KEY_ID=rzp_live_YOUR_LIVE_KEY_ID

# Backend API URL (Will be your Railway backend URL)
VITE_API_URL=https://your-backend.railway.app
```

## 🌐 Backend Deployment on Railway

Railway is a modern platform that makes deploying Node.js applications simple with automatic deployments from GitHub.

### Step 1: Prepare Your Backend

1. **Push your code to GitHub**
   ```bash
   cd shop/backend
   git init  # If not already a git repo
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/your-repo.git
   git push -u origin main
   ```

2. **Verify package.json has start script**
   - Ensure `package.json` has:
     ```json
     {
       "scripts": {
         "start": "node server.js",
         "dev": "nodemon server.js"
       }
     }
     ```

### Step 2: Deploy to Railway

#### Option A: Using Railway Dashboard (Recommended)

1. **Sign up/Login to Railway**
   - Go to [Railway](https://railway.app/)
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Select the `backend` folder as the root directory

3. **Configure Environment Variables**
   - Click on your service
   - Go to "Variables" tab
   - Add all backend environment variables:
     - `MONGODB_URI`
     - `CLOUDINARY_CLOUD_NAME`
     - `CLOUDINARY_API_KEY`
     - `CLOUDINARY_API_SECRET`
     - `RAZORPAY_KEY_ID`
     - `RAZORPAY_KEY_SECRET`
     - `FIREBASE_SERVICE_ACCOUNT_KEY` (See Firebase Setup section for details)
     - `NODE_ENV=production`
     - `PORT=5000` (Railway auto-assigns, but you can set it)

4. **Configure Build Settings** (if needed)
   - Railway auto-detects Node.js
   - Build command: `npm install`
   - Start command: `npm start`

5. **Deploy**
   - Railway will automatically deploy on every push to your main branch
   - Wait for deployment to complete
   - Your backend URL will be: `https://your-project.railway.app`

6. **Get Your Backend URL**
   - Click on your service
   - Go to "Settings" tab
   - Copy your "Public Domain" (e.g., `https://your-project.railway.app`)

#### Option B: Using Railway CLI

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**
   ```bash
   railway login
   ```

3. **Initialize Project**
   ```bash
   cd shop/backend
   railway init
   ```

4. **Set Environment Variables**
   ```bash
   railway variables set MONGODB_URI="your_mongodb_uri"
   railway variables set CLOUDINARY_CLOUD_NAME="your_cloud_name"
   railway variables set CLOUDINARY_API_KEY="your_api_key"
   railway variables set CLOUDINARY_API_SECRET="your_api_secret"
   railway variables set RAZORPAY_KEY_ID="your_razorpay_key_id"
   railway variables set RAZORPAY_KEY_SECRET="your_razorpay_key_secret"
   railway variables set FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'
   railway variables set NODE_ENV="production"
   ```
   **Note:** For `FIREBASE_SERVICE_ACCOUNT_KEY`, paste the entire JSON from your serviceAccountKey.json file. It's easier to set this via the Railway dashboard.

5. **Deploy**
   ```bash
   railway up
   ```

### Step 3: Update CORS Settings (Important!)

After getting your Railway backend URL, update your `server.js` CORS configuration:

```javascript
// In shop/backend/server.js
app.use(cors({
  origin: [
    'http://localhost:5173', // Local development
    'https://your-frontend.vercel.app', // Your Vercel frontend URL
    'https://your-custom-domain.com' // If you have a custom domain
  ],
  credentials: true
}));
```

**Important:** Commit and push this change before deploying frontend!

## 🎨 Frontend Deployment on Vercel

Vercel is optimized for React/Vite applications with automatic deployments and preview deployments for every pull request.

### Step 1: Build Frontend Locally (Test First)

Before deploying, test the build:

```bash
cd shop/frontend
npm run build
```

This creates a `dist` folder. If the build succeeds, you're ready to deploy!

### Step 2: Deploy to Vercel

#### Option A: Using Vercel Dashboard (Recommended)

1. **Sign up/Login to Vercel**
   - Go to [Vercel](https://vercel.com/)
   - Sign up with GitHub

2. **Import Your Project**
   - Click "Add New Project"
   - Import your GitHub repository
   - Select the `frontend` folder as the root directory

3. **Configure Project Settings**
   - **Framework Preset:** Vite
   - **Root Directory:** `shop/frontend` (or just `frontend` if root is already set)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

4. **Set Environment Variables**
   - Go to "Environment Variables" section
   - Add all frontend environment variables:
     - `VITE_FIREBASE_API_KEY`
     - `VITE_FIREBASE_AUTH_DOMAIN`
     - `VITE_FIREBASE_PROJECT_ID`
     - `VITE_FIREBASE_STORAGE_BUCKET`
     - `VITE_FIREBASE_MESSAGING_SENDER_ID`
     - `VITE_FIREBASE_APP_ID`
     - `VITE_RAZORPAY_KEY_ID`
     - `VITE_API_URL` (your Railway backend URL from Step 2)

   **Important:** Make sure to add these for **Production**, **Preview**, and **Development** environments.

5. **Deploy**
   - Click "Deploy"
   - Wait for deployment to complete
   - Your frontend will be live at: `https://your-project.vercel.app`

#### Option B: Using Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   cd shop/frontend
   vercel
   ```

4. **Set Environment Variables**
   ```bash
   vercel env add VITE_FIREBASE_API_KEY
   vercel env add VITE_FIREBASE_AUTH_DOMAIN
   vercel env add VITE_FIREBASE_PROJECT_ID
   vercel env add VITE_FIREBASE_STORAGE_BUCKET
   vercel env add VITE_FIREBASE_MESSAGING_SENDER_ID
   vercel env add VITE_FIREBASE_APP_ID
   vercel env add VITE_RAZORPAY_KEY_ID
   vercel env add VITE_API_URL
   ```

5. **Deploy to Production**
   ```bash
   vercel --prod
   ```

### Step 3: Update Backend CORS (If Not Done Already)

After getting your Vercel frontend URL, make sure your Railway backend's CORS includes your Vercel URL:

1. Go to Railway dashboard
2. Update the CORS origin in `server.js` to include your Vercel URL
3. Commit and push the change
4. Railway will auto-deploy

## 🗄️ Database Setup (MongoDB Atlas)

### Step-by-Step MongoDB Atlas Setup

1. **Create MongoDB Atlas Account**
   - Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Sign up for a free account

2. **Create Cluster**
   - Click "Build a Database"
   - Choose "M0 Sandbox" (free tier)
   - Select a region close to your Railway deployment region
   - Click "Create"

3. **Configure Database Access**
   - Go to "Database Access" in the left sidebar
   - Click "Add New Database User"
   - Choose "Password" authentication
   - Enter username and generate a secure password
   - **Save the password securely!**
   - Set privileges to "Read and write to any database"
   - Click "Add User"

4. **Configure Network Access**
   - Go to "Network Access" in the left sidebar
   - Click "Add IP Address"
   - Click "Allow Access from Anywhere" (0.0.0.0/0)
   - Click "Confirm"
   - This allows Railway to connect to your database

5. **Get Connection String**
   - Go back to "Clusters" (Database)
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Replace `<dbname>` with `vishti-shop` (or your preferred database name)
   - Example: `mongodb+srv://username:password@cluster.mongodb.net/vishti-shop?retryWrites=true&w=majority`

6. **Add to Railway Environment Variables**
   - In Railway dashboard, add `MONGODB_URI` with the connection string

## 🔥 Firebase Setup

### Step-by-Step Firebase Setup

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Create a project" or "Add project"
   - Enter project name: "Vishti Shop"
   - Follow the setup wizard

2. **Enable Authentication**
   - Go to "Authentication" in the left sidebar
   - Click "Get started"
   - Go to "Sign-in method" tab
   - Enable "Email/Password"
   - Click "Save"

3. **Get Web App Configuration**
   - Go to "Project Settings" (gear icon)
   - Scroll down to "Your apps" section
   - Click the "</>" (Web) icon
   - Register app with a nickname (e.g., "Vishti Shop Web")
   - Copy the Firebase configuration object

4. **Add to Vercel Environment Variables**
   Extract and add these values to Vercel:
   - `VITE_FIREBASE_API_KEY` = `apiKey` from config
   - `VITE_FIREBASE_AUTH_DOMAIN` = `authDomain` from config
   - `VITE_FIREBASE_PROJECT_ID` = `projectId` from config
   - `VITE_FIREBASE_STORAGE_BUCKET` = `storageBucket` from config
   - `VITE_FIREBASE_MESSAGING_SENDER_ID` = `messagingSenderId` from config
   - `VITE_FIREBASE_APP_ID` = `appId` from config

5. **Generate Service Account Key (For Backend - Railway)**
   - In Firebase Console, go to "Project Settings"
   - Go to "Service Accounts" tab
   - Click "Generate new private key"
   - **IMPORTANT:** A JSON file will download - **DO NOT** commit this to GitHub!
   - **Option 1: Add as Environment Variable (Recommended)**
     - Open the downloaded JSON file
     - Copy the entire JSON content
     - Go to Railway dashboard > Your service > Variables tab
     - Add new variable:
       - **Key:** `FIREBASE_SERVICE_ACCOUNT_KEY`
       - **Value:** Paste the entire JSON content (as a single-line string)
       - **Important:** Make sure to paste it as one continuous line, or use JSON.stringify() if needed
     - Click "Add"
   - **Option 2: Alternative (Individual Fields)**
     If the JSON approach doesn't work, you can set individual fields:
     - `FIREBASE_PROJECT_ID` = `project_id` from JSON
     - `FIREBASE_CLIENT_EMAIL` = `client_email` from JSON
     - `FIREBASE_PRIVATE_KEY` = `private_key` from JSON (keep the `\n` characters)
     - `FIREBASE_CLIENT_ID` = `client_id` from JSON (optional)
     - `FIREBASE_PRIVATE_KEY_ID` = `private_key_id` from JSON (optional)
   - **Note:** The backend code will automatically use the environment variable instead of the file

## 💳 Razorpay Setup

### Step-by-Step Razorpay Setup

1. **Create Razorpay Account**
   - Go to [Razorpay Dashboard](https://dashboard.razorpay.com/)
   - Sign up for an account
   - Complete KYC verification (required for live keys)

2. **Get API Keys**
   - Go to "Settings" > "API Keys"
   - You'll see Test and Live keys
   - **For Production:** Use Live keys
   - **For Testing:** Use Test keys
   - Copy your Key ID and Key Secret

3. **Add to Environment Variables**
   - **Backend (Railway):**
     - `RAZORPAY_KEY_ID` = Your Key ID (starts with `rzp_live_`)
     - `RAZORPAY_KEY_SECRET` = Your Key Secret
   - **Frontend (Vercel):**
     - `VITE_RAZORPAY_KEY_ID` = Same Key ID (public key)

4. **Configure Webhook (Optional but Recommended)**
   - Go to "Settings" > "Webhooks"
   - Add webhook URL: `https://your-backend.railway.app/api/payments/webhook`
   - Select events: `payment.captured`, `payment.failed`
   - Save the webhook

## ☁️ Cloudinary Setup

### Step-by-Step Cloudinary Setup

1. **Create Cloudinary Account**
   - Go to [Cloudinary](https://cloudinary.com/)
   - Sign up for a free account

2. **Get Credentials**
   - After signup, you'll be on the Dashboard
   - Find your credentials:
     - **Cloud Name** (e.g., `dabc123`)
     - **API Key** (e.g., `123456789012345`)
     - **API Secret** (e.g., `abcdefghijklmnopqrstuvwxyz123456`)

3. **Add to Railway Environment Variables**
   - `CLOUDINARY_CLOUD_NAME` = Your Cloud Name
   - `CLOUDINARY_API_KEY` = Your API Key
   - `CLOUDINARY_API_SECRET` = Your API Secret

4. **Configure Upload Presets (Optional)**
   - Go to "Settings" > "Upload"
   - Create upload presets for different image sizes
   - Configure allowed formats, max file size, etc.

## 🔧 Post-Deployment Configuration

### Update Firebase Authorized Domains

1. Go to Firebase Console > Authentication > Settings
2. Add your Vercel domain to "Authorized domains"
3. Example: `your-project.vercel.app` and `your-custom-domain.com`

### Test Your Deployment

1. **Test Frontend:**
   - Visit your Vercel URL
   - Check if the site loads
   - Test user registration/login
   - Test product browsing

2. **Test Backend:**
   - Visit `https://your-backend.railway.app/api/health` (if you have a health endpoint)
   - Check Railway logs for any errors

3. **Test Integration:**
   - Test adding products to cart
   - Test checkout process
   - Test payment flow (use Razorpay test mode first)

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] Code pushed to GitHub repository
- [ ] All local features tested and working
- [ ] Frontend build tested successfully (`npm run build`)
- [ ] MongoDB Atlas cluster created and accessible
- [ ] Firebase project created and authentication enabled
- [ ] Razorpay account created and API keys obtained
- [ ] Cloudinary account created and credentials obtained

### Backend Deployment (Railway)
- [ ] Railway account created and connected to GitHub
- [ ] Backend project deployed to Railway
- [ ] All backend environment variables set in Railway
- [ ] MongoDB connection string added to Railway
- [ ] CORS settings updated in `server.js` with frontend URL
- [ ] Railway deployment successful (check logs)
- [ ] Backend URL obtained and saved

### Frontend Deployment (Vercel)
- [ ] Vercel account created and connected to GitHub
- [ ] Frontend project deployed to Vercel
- [ ] All frontend environment variables set in Vercel
- [ ] `VITE_API_URL` set to Railway backend URL
- [ ] Vercel deployment successful
- [ ] Frontend URL obtained and saved

### Post-Deployment
- [ ] Firebase authorized domains updated
- [ ] Frontend connects to backend (check network tab)
- [ ] User registration/login working
- [ ] Product browsing working
- [ ] Cart functionality working
- [ ] Payment integration working (test mode)
- [ ] Admin panel accessible
- [ ] Image uploads working
- [ ] No console errors in browser
- [ ] Railway logs show no errors

## 🔍 Troubleshooting

### Common Issues

#### 1. CORS Errors
**Symptoms:** Frontend can't connect to backend, CORS errors in console

**Solutions:**
- Verify Railway backend URL is correct in Vercel `VITE_API_URL`
- Update `server.js` CORS to include your Vercel URL
- Commit and push the change to trigger Railway redeploy
- Clear browser cache and try again

#### 2. Environment Variables Not Loading
**Symptoms:** Features don't work, API calls fail

**Solutions:**
- Double-check variable names match exactly (case-sensitive)
- For Vercel: Ensure variables are set for "Production" environment
- For Railway: Verify variables are added in the correct service
- Redeploy after adding/updating variables
- **Important:** Vercel requires a redeploy for new environment variables to take effect

#### 3. Database Connection Issues
**Symptoms:** Backend logs show MongoDB connection errors

**Solutions:**
- Verify `MONGODB_URI` in Railway is correct
- Check MongoDB Atlas Network Access allows all IPs (0.0.0.0/0)
- Verify database user has correct permissions
- Check connection string format (includes password and database name)

#### 4. Build Failures
**Symptoms:** Deployment fails during build

**Solutions:**
- Check Railway/Vercel build logs for specific errors
- Ensure all dependencies are in `package.json`
- Test build locally first: `npm run build`
- Check for missing environment variables during build

#### 5. Payment Integration Issues
**Symptoms:** Razorpay payment fails

**Solutions:**
- Verify Razorpay keys are correct (Live vs Test)
- Check that both backend and frontend have the same Key ID
- Verify backend has the Key Secret
- Test in Razorpay test mode first
- Check Railway logs for payment errors

#### 6. Firebase Admin Initialization Error
**Symptoms:** Backend crashes with error: `Cannot find module './serviceAccountKey.json'`

**Solutions:**
- **CRITICAL:** This error means the Firebase service account key is missing in Railway
- Go to Railway dashboard > Your service > Variables tab
- Add `FIREBASE_SERVICE_ACCOUNT_KEY` environment variable:
  1. Download your `serviceAccountKey.json` from Firebase Console
  2. Open the JSON file and copy the entire content
  3. Paste it into Railway as the value for `FIREBASE_SERVICE_ACCOUNT_KEY`
  4. Make sure it's a valid JSON string (no extra quotes needed)
- **Alternative:** If JSON approach doesn't work, use individual fields:
  - Set `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, etc.
- After adding the variable, Railway will auto-redeploy
- Check logs to verify "Firebase Admin initialized successfully" message

#### 7. Firebase Authentication Issues
**Symptoms:** Login/signup not working

**Solutions:**
- Verify all Firebase environment variables are set in Vercel
- Check Firebase authorized domains include your Vercel URL
- Verify Firebase Authentication is enabled
- Check browser console for specific Firebase errors

#### 8. Image Upload Issues
**Symptoms:** Images not uploading to Cloudinary

**Solutions:**
- Verify Cloudinary credentials in Railway
- Check file size limits in Cloudinary settings
- Verify CORS settings in Cloudinary
- Check Railway logs for Cloudinary API errors

### Debugging Tips

1. **Check Railway Logs**
   - Go to Railway dashboard > Your service > Logs
   - Look for errors, connection issues, or missing variables

2. **Check Vercel Logs**
   - Go to Vercel dashboard > Your project > Deployments > Select deployment > Logs
   - Look for build errors or runtime errors

3. **Check Browser Console**
   - Open browser DevTools (F12)
   - Check Console tab for errors
   - Check Network tab for failed API calls

4. **Test API Endpoints**
   - Use Postman or curl to test backend endpoints directly
   - Example: `curl https://your-backend.railway.app/api/products`

5. **Verify Environment Variables**
   - Railway: Go to Variables tab, verify all are set
   - Vercel: Go to Settings > Environment Variables, verify all are set

## 📞 Getting Help

If you encounter issues:

1. Check the troubleshooting section above
2. Review Railway and Vercel deployment logs
3. Test each service individually (database, Firebase, Razorpay, Cloudinary)
4. Verify all environment variables are correctly set
5. Check Railway and Vercel documentation
6. Test locally with production environment variables

## 🎉 Success!

Once deployed successfully, your Vishti Shop e-commerce platform will be live!

**Your URLs:**
- **Frontend:** `https://your-project.vercel.app`
- **Backend:** `https://your-project.railway.app`
- **Admin Panel:** `https://your-project.vercel.app/admin`

### Next Steps

1. **Add Custom Domain** (Optional)
   - In Vercel: Add your custom domain in project settings
   - Update Firebase authorized domains
   - Update Railway CORS settings

2. **Set Up Monitoring**
   - Enable Railway metrics
   - Enable Vercel analytics
   - Set up error tracking (e.g., Sentry)

3. **Production Optimization**
   - Enable CDN caching in Vercel
   - Optimize images with Cloudinary transformations
   - Set up database backups
   - Monitor performance metrics

4. **Security**
   - Enable rate limiting (if not already done)
   - Review and rotate API keys periodically
   - Set up database backups
   - Monitor for security vulnerabilities

---

**Happy Deploying! 🚀**

**Need Help?** Check Railway and Vercel documentation:
- [Railway Docs](https://docs.railway.app/)
- [Vercel Docs](https://vercel.com/docs)