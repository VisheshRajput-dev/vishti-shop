import React, { useState, useEffect, useRef } from 'react';
import { auth } from '../../firebase';
import { sendPasswordResetEmail, sendEmailVerification } from 'firebase/auth';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Loader from '../../components/Loader';
import { useAuth } from '../../contexts/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showDemoMenu, setShowDemoMenu] = useState(false);
  const demoMenuRef = useRef(null);

  // Close demo menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (demoMenuRef.current && !demoMenuRef.current.contains(event.target)) {
        setShowDemoMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    try {
      setLoading(true);
      
      // Use AuthContext login function
      const userData = await login(email, password);
      
      // Check if user is admin
      if (userData?.role === 'admin') {
        toast.success('Login successful! Redirecting to admin panel...');
        navigate('/admin/dashboard');
      } else {
        toast.success('Login successful! Redirecting to store...');
        navigate('/store');
      }
    } catch (err) {
      console.error('Login error:', err);
      
      // Check if it's an email verification error
      if (err.message && err.message.includes('verify your email')) {
        toast.error('Please verify your email address before logging in. Check your inbox for the verification email.');
      } else {
        toast.error('Email or password incorrect');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot() {
    if (!email) {
      toast.error('Enter your email to reset password');
      return;
    }
    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, email);
      toast.success('Password reset email sent');
    } catch (err) {
      toast.error('Could not send reset email');
    } finally {
      setLoading(false);
    }
  }

  async function handleResendVerification() {
    if (!email) {
      toast.error('Enter your email to resend verification');
      return;
    }
    try {
      setLoading(true);
      // We need to sign in temporarily to get the user object
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      
      if (!user.emailVerified) {
        await sendEmailVerification(user);
        await auth.signOut(); // Sign out immediately after sending verification
        toast.success('Verification email sent! Please check your inbox.');
      } else {
        await auth.signOut();
        toast.info('Email is already verified');
      }
    } catch (err) {
      console.error('Resend verification error:', err);
      toast.error('Could not send verification email. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen animated-gradient flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl float" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl pulse-slow"></div>
      </div>

      {loading && <Loader />}
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="glass-card w-full max-w-md p-8 relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-2xl gradient-primary shadow-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">V</span>
            </div>
            <h1 className="text-3xl font-bold text-gradient">Vishti Shop</h1>
          </div>
          <p className="text-gray-600">Welcome back! Please sign in to your account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <input 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="Enter your email" 
                className="input" 
                type="email"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="Enter your password" 
                className="input" 
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-primary w-full"
          >
            Sign In
          </button>

          <div className="flex justify-between items-center">
            <button 
              type="button" 
              onClick={handleForgot} 
              className="btn-ghost text-sm"
            >
              Forgot password?
            </button>
            <button 
              type="button" 
              onClick={handleResendVerification} 
              className="btn-ghost text-sm"
            >
              Resend verification email
            </button>
          </div>

             <div className="text-center pt-4 border-t border-gray-200">
               <p className="text-gray-600 mb-4">
                 Don't have an account?
               </p>
               <button
                 type="button"
                 onClick={() => navigate('/signup')}
                 className="btn-secondary w-full"
               >
                 Create Account
               </button>
             </div>
        </form>
      </motion.div>

      {/* Floating Demo Access Icon */}
      <div className="fixed top-6 right-6 z-50" ref={demoMenuRef}>
        <div className="relative">
          {/* Demo Access Button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowDemoMenu(!showDemoMenu)}
            className="w-14 h-14 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full shadow-xl hover:shadow-2xl flex items-center justify-center text-white transition-all duration-300 group"
            title="Demo Access"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            
            {/* Pulse Animation */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 animate-ping opacity-20"></div>
          </motion.button>

          {/* Demo Menu Dropdown */}
          <AnimatePresence>
            {showDemoMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute top-16 right-0 w-80 glass-card p-4 shadow-2xl border border-white/20"
              >
                <div className="space-y-3">
                  {/* Header */}
                  <div className="text-center pb-2 border-b border-gray-200/50">
                    <h3 className="text-sm font-semibold text-gray-800">Quick Demo Access</h3>
                    <p className="text-xs text-gray-500">Click to auto-fill credentials</p>
                  </div>

                  {/* Regular User Demo */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setEmail('visheshrajput2004@gmail.com');
                      setPassword('123456');
                      setShowDemoMenu(false);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 hover:border-blue-300 transition-all duration-200 group"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-sm font-semibold text-gray-800">Regular User</p>
                      <p className="text-xs text-gray-600">Personal shopping experience</p>
                      <p className="text-xs text-blue-600 font-medium">visheshrajput2004@gmail.com</p>
                    </div>
                    <div className="text-xs text-gray-500 group-hover:text-blue-600 transition-colors">
                      Fill
                    </div>
                  </motion.button>

                  {/* Wholesale User Demo */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setEmail('dialertone1@gmail.com');
                      setPassword('123456');
                      setShowDemoMenu(false);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 hover:border-emerald-300 transition-all duration-200 group"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-sm font-semibold text-gray-800">Wholesale User</p>
                      <p className="text-xs text-gray-600">Business pricing & bulk orders</p>
                      <p className="text-xs text-emerald-600 font-medium">dialertone1@gmail.com</p>
                    </div>
                    <div className="text-xs text-gray-500 group-hover:text-emerald-600 transition-colors">
                      Fill
                    </div>
                  </motion.button>

                  {/* Footer */}
                  <div className="pt-2 border-t border-gray-200/50 text-center">
                    <p className="text-xs text-gray-400">Demo accounts for testing</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
