import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { toast } from 'react-toastify';
import client from '../api/client';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wishlistItems, setWishlistItems] = useState(new Set());
  const auth = getAuth();

  // Fetch wishlist items when user changes
  useEffect(() => {
    const fetchWishlist = async () => {
      if (!user) {
        setWishlistItems(new Set());
        return;
      }
      try {
        const res = await client.get('/api/wishlist');
        const wishlistSet = new Set((res.data?.items || []).map(item => item.product?._id || item.product));
        setWishlistItems(wishlistSet);
      } catch (e) {
        console.error('Error fetching wishlist:', e);
        setWishlistItems(new Set());
      }
    };
    fetchWishlist();
  }, [user]);

  // Wishlist management functions
  const addToWishlist = async (productId) => {
    if (!user) return false;
    try {
      await client.post('/api/wishlist', { productId });
      setWishlistItems(prev => new Set([...prev, productId]));
      return true;
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      return false;
    }
  };

  const removeFromWishlist = async (productId) => {
    if (!user) return false;
    try {
      await client.delete(`/api/wishlist/${productId}`);
      setWishlistItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
      return true;
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      return false;
    }
  };

  const isInWishlist = (productId) => {
    return wishlistItems.has(productId);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Get the ID token
          const token = await firebaseUser.getIdToken();
          
          // Set token in axios defaults
          client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Get user profile from your backend
          const response = await client.get('/api/auth/me');
          
          setUser({
            ...response.data,
            firebaseUid: firebaseUser.uid,
            email: firebaseUser.email,
            emailVerified: firebaseUser.emailVerified
          });
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setUser(null);
          client.defaults.headers.common['Authorization'] = '';
        }
      } else {
        setUser(null);
        client.defaults.headers.common['Authorization'] = '';
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [auth]);

  const signup = async (email, password, userType, additionalData) => {
    // Create Firebase user
    const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);
    
    // Get ID token
    const token = await firebaseUser.getIdToken();
    client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // Create user profile in your backend
    try {
      const response = await client.post('/api/auth/register', {
        ...additionalData,
        userType,
        email
      });
      setUser(response.data);
      return response.data;
    } catch (error) {
      // If backend creation fails, delete the Firebase user
      await firebaseUser.delete();
      throw error;
    }
  };

  const login = async (email, password) => {
    const { user: firebaseUser } = await signInWithEmailAndPassword(auth, email, password);
    
    // Check if email is verified
    if (!firebaseUser.emailVerified) {
      // Sign out the user if email is not verified
      await signOut(auth);
      throw new Error('Please verify your email address before logging in. Check your inbox for the verification email.');
    }
    
    // The onAuthStateChanged listener will handle setting the user state
    // We just need to return the user data for the login component
    const token = await firebaseUser.getIdToken();
    client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // Get user profile from your backend
    const response = await client.get('/api/auth/me');
    return response.data;
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    client.defaults.headers.common['Authorization'] = '';
  };

  const refreshUser = async () => {
    if (!auth.currentUser) return;
    
    try {
      // Get the ID token
      const token = await auth.currentUser.getIdToken();
      
      // Set token in axios defaults
      client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Get user profile from your backend
      const response = await client.get('/api/auth/me');
      setUser({
        ...response.data,
        firebaseUid: auth.currentUser.uid,
        email: auth.currentUser.email
      });
    } catch (error) {
      console.error('Error refreshing user profile:', error);
    }
  };

  const value = {
    user,
    loading,
    signup,
    login,
    logout,
    refreshUser,
    wishlistItems,
    addToWishlist,
    removeFromWishlist,
    isInWishlist
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
