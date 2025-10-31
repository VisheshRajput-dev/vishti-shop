const admin = require('firebase-admin');

// Initialize Firebase Admin using environment variables
// This approach works for both local development (with .env) and production (Railway)
let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  // Production: Parse JSON from environment variable (Railway)
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  } catch (error) {
    console.error('Error parsing FIREBASE_SERVICE_ACCOUNT_KEY:', error);
    throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_KEY format');
  }
} else {
  // Development: Try to load from file (local development)
  try {
    serviceAccount = require('./serviceAccountKey.json');
  } catch (error) {
    // If file doesn't exist and we're in production, construct from individual env vars
    // Support both FIREBASE_PROJECT_ID and REACT_APP_FIREBASE_PROJECT_ID naming
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.REACT_APP_FIREBASE_PROJECT_ID;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    
    if (projectId && privateKey && clientEmail) {
      // Handle private key - replace escaped newlines
      const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');
      
      serviceAccount = {
        type: "service_account",
        project_id: projectId,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || "",
        private_key: formattedPrivateKey,
        client_email: clientEmail,
        client_id: process.env.FIREBASE_CLIENT_ID || "",
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(clientEmail)}`
      };
      console.log('Firebase Admin: Using individual environment variables');
    } else {
      console.error('Firebase Admin initialization failed: Missing service account configuration');
      console.error('Required: FIREBASE_PROJECT_ID (or REACT_APP_FIREBASE_PROJECT_ID), FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL');
      console.error('Available env vars:', {
        hasProjectId: !!projectId,
        hasPrivateKey: !!privateKey,
        hasClientEmail: !!clientEmail
      });
      throw new Error('Firebase Admin: Service account key not found. Please set FIREBASE_SERVICE_ACCOUNT_KEY or provide individual Firebase env vars.');
    }
  }
}

// Initialize Firebase Admin
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
  });
  console.log('Firebase Admin initialized successfully');
} catch (error) {
  console.error('Firebase Admin initialization error:', error);
  throw error;
}

module.exports = admin;
