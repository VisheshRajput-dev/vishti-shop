import React, { useState } from 'react';
import { auth } from '../../firebase';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Loader from '../../components/Loader';
import logo from '../../assets/vishtishop_logo.png';

export default function Signup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirm: '',
    dob: '',
    purpose: 'personal',
    shopName: '',
    address: { line1: '', landmark: '', district: '', state: '', pincode: '' }
  });

  function updateField(e) {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const key = name.split('.')[1];
      setForm(f => ({ ...f, address: { ...f.address, [key]: value } }));
    } else {
      setForm(f => ({ ...f, [name]: value }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.email.endsWith('@gmail.com')) {
      toast.error('Please use a valid @gmail.com address');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password should be at least 6 characters');
      return;
    }
    if (form.password !== form.confirm) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      const userCred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await sendEmailVerification(userCred.user);
      toast.success('Verification email sent!');

      const idToken = await userCred.user.getIdToken();
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/register`,
        {
          dob: form.dob,
          purpose: form.purpose,
          shopName: form.shopName,
          address: form.address
        },
        { headers: { Authorization: `Bearer ${idToken}` } }
      );

      console.log('User registered successfully:', response.data);
      toast.success('Account created successfully!');
      navigate('/login');
    } catch (err) {
      console.error('Signup error:', err);
      if (err.response?.data?.message) {
        toast.error(err.response.data.message);
      } else if (err.message) {
        toast.error(err.message);
      } else {
        toast.error('Signup failed. Please try again.');
      }
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
        className="glass-card w-full max-w-4xl p-8 relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <img 
              src={logo} 
              alt="Vishti Shop Logo" 
              className="h-12 w-12 rounded-2xl object-contain"
            />
            <h1 className="text-3xl font-bold text-gradient">Vishti Shop</h1>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Create Your Account</h2>
          <p className="text-gray-600">Join us and discover amazing products</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal Info */}
          <div className="glass-card p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full gradient-accent"></div>
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <input 
                  name="email" 
                  value={form.email} 
                  onChange={updateField} 
                  placeholder="Enter your Gmail address" 
                  className="input" 
                  type="email"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <input 
                  type="password" 
                  name="password" 
                  value={form.password} 
                  onChange={updateField} 
                  placeholder="Create a strong password" 
                  className="input" 
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                <input 
                  type="password" 
                  name="confirm" 
                  value={form.confirm} 
                  onChange={updateField} 
                  placeholder="Confirm your password" 
                  className="input" 
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                <input 
                  type="date" 
                  name="dob" 
                  value={form.dob} 
                  onChange={updateField} 
                  className="input" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Account Type</label>
                <select name="purpose" value={form.purpose} onChange={updateField} className="input">
                  <option value="personal">Personal use</option>
                  <option value="shop">Wholesale / Shop purchase</option>
                </select>
              </div>
              {form.purpose === 'shop' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Shop Name</label>
                  <input 
                    name="shopName" 
                    value={form.shopName} 
                    onChange={updateField} 
                    placeholder="Enter your shop name" 
                    className="input" 
                    required
                  />
                </div>
              )}
            </div>
          </div>

          {/* Contact Info */}
          <div className="glass-card p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full gradient-secondary"></div>
              Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 1</label>
                <input 
                  name="address.line1" 
                  value={form.address.line1} 
                  onChange={updateField} 
                  placeholder="Street address" 
                  className="input" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Landmark</label>
                <input 
                  name="address.landmark" 
                  value={form.address.landmark} 
                  onChange={updateField} 
                  placeholder="Nearby landmark" 
                  className="input" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">District</label>
                <input 
                  name="address.district" 
                  value={form.address.district} 
                  onChange={updateField} 
                  placeholder="District" 
                  className="input" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                <input 
                  name="address.state" 
                  value={form.address.state} 
                  onChange={updateField} 
                  placeholder="State" 
                  className="input" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pincode</label>
                <input 
                  name="address.pincode" 
                  value={form.address.pincode} 
                  onChange={updateField} 
                  placeholder="Pincode" 
                  className="input" 
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button type="submit" className="btn-primary flex-1 py-3 text-lg">
              Create Account
            </button>
            <button 
              type="button"
              onClick={() => navigate('/login')}
              className="btn-secondary flex-1 py-3 text-lg"
            >
              Already have an account? Sign In
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
