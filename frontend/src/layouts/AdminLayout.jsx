// src/layouts/AdminLayout.jsx
import { Link, Outlet, Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { auth } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import client from "../api/client";
import Loader from "../components/Loader";
import logo from "../assets/vishtishop_logo.png";

export default function AdminLayout() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Check if user is admin
          const response = await client.get('/api/auth/admin-check');
          if (response.data.isAdmin) {
            setIsAdmin(true);
            setUser(user);
          } else {
            // User is not admin, redirect to home
            navigate('/');
          }
        } catch (error) {
          console.error('Admin check failed:', error);
          navigate('/');
        }
      } else {
        // No user, redirect to login
        navigate('/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) {
    return <Loader />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-indigo-600 text-white flex flex-col p-4">
        <div className="mb-6 flex items-center gap-3">
          <img 
            src={logo} 
            alt="Vishti Shop Logo" 
            className="h-10 w-10 rounded-lg object-contain"
          />
          <div>
            <h2 className="text-2xl font-bold">Vishti Shop Admin</h2>
            <p className="text-sm text-indigo-200 mt-1">{user?.email}</p>
          </div>
        </div>
        
        <nav className="flex flex-col gap-3 flex-1">
          <Link to="/admin/dashboard" className="hover:bg-indigo-500 p-2 rounded transition">
            Dashboard
          </Link>
          <Link to="/admin/products" className="hover:bg-indigo-500 p-2 rounded transition">
            Products
          </Link>
          <Link to="/admin/categories" className="hover:bg-indigo-500 p-2 rounded transition">
            Categories
          </Link>
          <Link to="/admin/orders" className="hover:bg-indigo-500 p-2 rounded transition">
            Orders
          </Link>
          <Link to="/admin/wholesale-inquiries" className="hover:bg-indigo-500 p-2 rounded transition">
            Wholesale Inquiries
          </Link>
        </nav>

        <button
          onClick={handleLogout}
          className="mt-auto bg-red-600 hover:bg-red-700 p-2 rounded transition"
        >
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
