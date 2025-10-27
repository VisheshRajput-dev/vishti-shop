import React, { useState } from 'react';
import { auth } from '../../firebase';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import Loader from '../../components/Loader';

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
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-indigo-200 flex items-center justify-center p-4">
      {loading && <Loader />}
      <div className="bg-white shadow-xl rounded-lg w-full max-w-2xl p-8">
        <h2 className="text-3xl font-bold text-center text-indigo-600 mb-8">Create an Account</h2>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal Info */}
          <div>
            <h3 className="text-xl font-semibold text-gray-700 mb-4">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input name="email" value={form.email} onChange={updateField} placeholder="Gmail" className="input" />
              <input type="password" name="password" value={form.password} onChange={updateField} placeholder="Password" className="input" />
              <input type="password" name="confirm" value={form.confirm} onChange={updateField} placeholder="Confirm password" className="input" />
              <input type="date" name="dob" value={form.dob} onChange={updateField} className="input" />
              <select name="purpose" value={form.purpose} onChange={updateField} className="input">
                <option value="personal">Personal use</option>
                <option value="shop">Wholesale / Shop purchase</option>
              </select>
              {form.purpose === 'shop' && (
                <input name="shopName" value={form.shopName} onChange={updateField} placeholder="Shop name" className="input" />
              )}
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-xl font-semibold text-gray-700 mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input name="address.line1" value={form.address.line1} onChange={updateField} placeholder="Address line 1" className="input" />
              <input name="address.landmark" value={form.address.landmark} onChange={updateField} placeholder="Landmark" className="input" />
              <input name="address.district" value={form.address.district} onChange={updateField} placeholder="District" className="input" />
              <input name="address.state" value={form.address.state} onChange={updateField} placeholder="State" className="input" />
              <input name="address.pincode" value={form.address.pincode} onChange={updateField} placeholder="Pincode" className="input" />
            </div>
          </div>

          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-lg transition">
            Sign Up
          </button>
        </form>
      </div>
    </div>
  );
}
