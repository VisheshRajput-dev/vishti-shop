import React, { useState } from 'react';
import { auth } from '../../firebase';
import { sendPasswordResetEmail, sendEmailVerification } from 'firebase/auth';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Loader from '../../components/Loader';
import { useAuth } from '../../contexts/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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
    </div>
  );
}
