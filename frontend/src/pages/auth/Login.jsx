import React, { useState } from 'react';
import { auth } from '../../firebase';
import { sendPasswordResetEmail, sendEmailVerification } from 'firebase/auth';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
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
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-indigo-200 flex items-center justify-center p-4">
      {loading && <Loader />}
      <div className="bg-white shadow-xl rounded-lg w-full max-w-md p-8">
        <h2 className="text-3xl font-bold text-center text-indigo-600 mb-8">Welcome Back</h2>
        <form onSubmit={handleLogin} className="space-y-6">
          <input 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            placeholder="Gmail" 
            className="input" 
          />
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            placeholder="Password" 
            className="input" 
          />
          <div className="flex justify-between items-center">
            <button 
              type="submit" 
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg"
            >
              Login
            </button>
            <div className="flex flex-col items-end space-y-1">
              <button 
                type="button" 
                onClick={handleForgot} 
                className="text-sm text-pink-600 hover:underline"
              >
                Forgot password?
              </button>
              <button 
                type="button" 
                onClick={handleResendVerification} 
                className="text-sm text-blue-600 hover:underline"
              >
                Resend verification email
              </button>
            </div>
          </div>
          <div className="text-center mt-4">
            <p className="text-gray-600">
              Don't have an account?{' '}
              <button 
                type="button"
                onClick={() => navigate('/signup')}
                className="text-indigo-600 hover:underline font-medium"
              >
                Sign up
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
