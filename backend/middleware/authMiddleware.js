const admin = require('../config/firebase-admin'); 
const User = require('../models/User');

// Verify Firebase ID token from Authorization header
const verifyFirebaseToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Auth: No token provided in request');
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Add timeout to prevent hanging
    const verifyToken = admin.auth().verifyIdToken(token);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Token verification timeout')), 5000)
    );
    
    let decodedToken;
    try {
      decodedToken = await Promise.race([verifyToken, timeoutPromise]);
    } catch (verifyError) {
      console.error('Token verification failed:', verifyError.message);
      console.error('Error code:', verifyError.code);
      console.error('Error details:', verifyError.errorInfo || verifyError);
      
      // Check if Firebase Admin is initialized
      try {
        const apps = admin.apps;
        if (!apps || apps.length === 0) {
          console.error('CRITICAL: Firebase Admin is not initialized!');
          return res.status(500).json({ message: 'Authentication service unavailable' });
        }
      } catch (appError) {
        console.error('CRITICAL: Cannot access Firebase Admin apps:', appError);
        return res.status(500).json({ message: 'Authentication service error' });
      }
      
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    
    // Find user in database by firebaseUid
    const dbUser = await User.findOne({ firebaseUid: decodedToken.uid });
    if (!dbUser) {
      // For certain routes like /register, allow the request to proceed without a database user
      if (req.path === '/register' || req.method === 'POST') {
        req.user = {
          uid: decodedToken.uid,
          email: decodedToken.email,
          role: 'user',
          id: null,
          dbUser: null
        };
        return next();
      }
      return res.status(404).json({ message: 'User not found in database' });
    }

    // Check for admin role - prioritize database role, fallback to Firebase custom claims
    let isAdmin = false;
    
    // First check database role
    if (dbUser.role === 'admin') {
      isAdmin = true;
    } else {
      // Fallback to Firebase custom claims (if available)
      try {
        isAdmin = decodedToken.role === 'admin';
      } catch (error) {
        isAdmin = false;
      }
    }

    // Attach both firebase uid and mongo _id
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: isAdmin ? 'admin' : 'user',
      id: dbUser._id,                // MongoDB user ID for relations
      dbUser: dbUser
    };
    
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Ensure user has admin role
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { verifyFirebaseToken, requireAdmin };
