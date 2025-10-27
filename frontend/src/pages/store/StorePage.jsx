import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import client from '../../api/client';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import debounce from 'lodash/debounce';
import { FiSearch, FiFilter, FiX, FiUser, FiChevronDown, FiLogOut, FiShoppingCart, FiUserPlus, FiPlus, FiMinus, FiZap, FiPackage, FiHeart } from 'react-icons/fi';
import Masonry from 'react-masonry-css';

export default function StorePage() {
  const navigate = useNavigate();
  const { user, logout, wishlistItems, addToWishlist, removeFromWishlist, isInWishlist } = useAuth();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [cartMap, setCartMap] = useState({}); // { [productId]: { itemId, quantity } }
  const [imageAspect, setImageAspect] = useState({}); // { [productId]: aspectRatio }
  const [imageLoaded, setImageLoaded] = useState({}); // { [productId]: boolean }
  const [cartItemCount, setCartItemCount] = useState(0);

  const isWholesale = user?.purpose === 'shop';

  // Fetch categories
  useEffect(() => {
    client.get('/api/categories')
      .then(res => setCategories(res.data))
      .catch(error => {
        console.error('Error fetching categories:', error);
        toast.error('Failed to load categories');
      });
  }, []);

  // Fetch all products
  useEffect(() => {
    setLoading(true);
    client.get('/api/products')
      .then(res => {
        setProducts(res.data.items);
        setFilteredProducts(res.data.items);
      })
      .catch(error => {
        console.error('Error fetching products:', error);
        toast.error('Failed to load products');
      })
      .finally(() => setLoading(false));
  }, []);

  // Fetch cart to hydrate quantities on cards
  useEffect(() => {
    let ignore = false;
    const fetchCart = async () => {
      if (!user) { setCartMap({}); setCartItemCount(0); return; }
      try {
        const res = await client.get('/api/cart');
        if (ignore) return;
        const nextMap = {};
        let totalItems = 0;
        (res.data?.items || []).forEach((it) => {
          if (it?.product?._id) {
            nextMap[it.product._id] = { itemId: it._id, quantity: it.quantity };
            totalItems += it.quantity;
          }
        });
        setCartMap(nextMap);
        setCartItemCount(totalItems);
      } catch (e) {
        // ignore silently
      }
    };
    fetchCart();
    return () => { ignore = true; };
  }, [user]);

  // Refresh cart data when user purpose changes
  useEffect(() => {
    if (user) {
      // Refetch cart when user purpose changes
      const refreshCart = async () => {
        try {
          const cartRes = await client.get('/api/cart');
          const nextMap = {};
          let totalItems = 0;
          (cartRes.data?.items || []).forEach((it) => {
            if (it?.product?._id) {
              nextMap[it.product._id] = { itemId: it._id, quantity: it.quantity };
              totalItems += it.quantity;
            }
          });
          setCartMap(nextMap);
          setCartItemCount(totalItems);
        } catch (e) {
          console.error('Error refreshing cart:', e);
        }
      };
      refreshCart();
    }
  }, [user?.purpose]); // Refresh when purpose changes

  // Debounced search function
  const debouncedSearch = useMemo(
    () =>
      debounce((searchTerm, products) => {
        if (!searchTerm.trim()) {
          setFilteredProducts(products);
          setSuggestions([]);
          return;
        }

        const searchLower = searchTerm.toLowerCase();
        const filtered = products.filter(product => {
          const nameMatch = product.name.toLowerCase().includes(searchLower);
          const categoryMatch = product.category?.name.toLowerCase().includes(searchLower);
          return nameMatch || categoryMatch;
        });

        // Generate suggestions
        const nameSuggestions = [...new Set(
          products
            .filter(p => p.name.toLowerCase().includes(searchLower))
            .map(p => p.name)
            .slice(0, 5)
        )];
        const categorySuggestions = [...new Set(
          products
            .filter(p => p.category?.name.toLowerCase().includes(searchLower))
            .map(p => p.category?.name)
            .filter(Boolean)
            .slice(0, 3)
        )];

        setSuggestions([...nameSuggestions, ...categorySuggestions]);
        setFilteredProducts(filtered);
      }, 300),
    []
  );

  // Handle search and filters
  useEffect(() => {
    let result = [...products];

    // Apply category filter
    if (selectedCategory) {
      result = result.filter(product => product.category?._id === selectedCategory);
    }

    // Apply search
    if (searchTerm) {
      debouncedSearch(searchTerm, result);
    } else {
      setFilteredProducts(result);
    }

    // Apply sorting
    if (sortBy) {
      result.sort((a, b) => {
        const priceA = isWholesale ? (a.wholesalePrice || a.price) : a.price;
        const priceB = isWholesale ? (b.wholesalePrice || b.price) : b.price;

        if (sortBy === 'price-asc') return priceA - priceB;
        if (sortBy === 'price-desc') return priceB - priceA;
        if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
        if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
        return 0;
      });
    }

    setFilteredProducts(result);
  }, [selectedCategory, sortBy, products]);

  const handleSearch = (term) => {
    setSearchTerm(term);
    setShowSuggestions(true);
    debouncedSearch(term, products);
  };

  const getPrice = (product) => {
    // If user is a shop/business and product has wholesale price, show wholesale price
    if (user?.purpose === 'shop' && product.wholesalePrice) {
      return product.wholesalePrice;
    }
    // For personal users or if wholesale price isn't available, show regular price
    return product.price;
  };

  const handleImageLoad = (productId, e) => {
    const w = e?.target?.naturalWidth;
    const h = e?.target?.naturalHeight;
    if (w && h) {
      setImageAspect((m) => ({ ...m, [productId]: w / h }));
    }
    setImageLoaded((m) => ({ ...m, [productId]: true }));
  };

  // Cart actions
  const handleAddToCart = async (product) => {
    if (!user) { toast.error('Please login to add to cart'); navigate('/login'); return; }
    try {
      const res = await client.post('/api/cart', {
        productId: product._id,
        quantity: 1,
        isWholesale: isWholesale,
      });
      // find the item in returned cart
      const added = (res.data?.items || []).find((it) => (it.product?._id || it.product) === product._id);
      if (added) {
        setCartMap((m) => ({ ...m, [product._id]: { itemId: added._id, quantity: added.quantity } }));
        setCartItemCount(prev => prev + 1);
      }
      // No toast needed - visual feedback is sufficient
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add to cart');
    }
  };

  const handleUpdateQty = async (productId, itemId, nextQty) => {
    if (!user) { toast.error('Please login'); navigate('/login'); return; }
    try {
      if (nextQty < 1) {
        await client.delete(`/api/cart/items/${itemId}`);
        const currentQty = cartMap[productId]?.quantity || 0;
        setCartMap((m) => {
          const copy = { ...m };
          delete copy[productId];
          return copy;
        });
        setCartItemCount(prev => prev - currentQty);
        return;
      }
      const res = await client.put(`/api/cart/items/${itemId}`, { quantity: nextQty });
      const updated = (res.data?.items || []).find((it) => (it.product?._id || it.product) === productId);
      if (updated) {
        const oldQty = cartMap[productId]?.quantity || 0;
        const newQty = updated.quantity;
        setCartMap((m) => ({ ...m, [productId]: { itemId: updated._id, quantity: updated.quantity } }));
        setCartItemCount(prev => prev - oldQty + newQty);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update quantity');
    }
  };

  const handleBuyNow = async (product) => {
    console.log('=== StorePage: handleBuyNow called ===');
    console.log('Product:', product);
    console.log('User:', user);
    console.log('Is Wholesale:', isWholesale);
    
    if (!user) {
      console.log('No user, redirecting to login');
      toast.error('Please login to continue');
      navigate('/login');
      return;
    }

    // For wholesale users, prevent direct buy now
    if (isWholesale) {
      console.log('Wholesale user, preventing buy now');
      toast.error('Minimum order value is ₹10,000 for wholesale buyers. Please add more items or change your account type in Profile settings.');
      return;
    }

    // Check if product is already in cart to get the correct quantity
    let quantity = 1; // Default quantity
    try {
      const response = await client.get('/api/cart');
      const cartItems = response.data.items || [];
      console.log('Cart items:', cartItems);
      
      // Find if current product is in cart
      const existingItem = cartItems.find(item => 
        (item.product?._id || item.product) === product._id
      );
      
      if (existingItem) {
        quantity = existingItem.quantity;
        console.log('Product found in cart with quantity:', quantity);
      } else {
        console.log('Product not in cart, using default quantity:', quantity);
      }
    } catch (error) {
      console.error('Error fetching cart for buy now:', error);
      console.log('Using default quantity due to error:', quantity);
    }

    // For normal users, proceed with buy now
    const price = product.price;
    const checkoutItem = {
      product: {
        _id: product._id,
        name: product.name,
        price,
        image: product.images?.[0],
      },
      quantity,
    };
    
    console.log('Setting buyNowItem:', checkoutItem);
    console.log('Final quantity used:', quantity);
    
    localStorage.setItem('buyNowItem', JSON.stringify(checkoutItem));
    
    // Verify it was set
    const verifyItem = localStorage.getItem('buyNowItem');
    console.log('Verification - buyNowItem in localStorage:', verifyItem);
    const parsedVerify = JSON.parse(verifyItem);
    console.log('Parsed verification - quantity:', parsedVerify.quantity);
    
    console.log('Navigating to checkout...');
    navigate('/checkout');
  };

  const handleWishlistToggle = async (product) => {
    if (!user) { toast.error('Please login to manage wishlist'); navigate('/login'); return; }
    
    try {
      const currentlyInWishlist = isInWishlist(product._id);
      
      if (currentlyInWishlist) {
        // Remove from wishlist
        const success = await removeFromWishlist(product._id);
        // No toast needed - visual feedback is sufficient
      } else {
        // Add to wishlist
        const success = await addToWishlist(product._id);
        // No toast needed - visual feedback is sufficient
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update wishlist');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (_) {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Email Verification Banner */}
      {user && !user.emailVerified && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Please verify your email address to access all features. Check your inbox for the verification email.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top Navigation */}
      <div className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-white/60 bg-white/80 border-b border-gray-100">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          {/* Brand */}
          <button onClick={() => navigate('/store')} className="flex items-center gap-2 group">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-sm" />
            <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 group-hover:from-indigo-600 group-hover:to-pink-600 transition-colors">
              Vishti Shop
            </span>
          </button>

          {/* Right actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Cart */}
            <div className="relative">
              <button
                onClick={() => navigate('/cart')}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Cart"
              >
                <FiShoppingCart className="h-5 w-5 text-gray-700" />
                {/* Cart Badge */}
                <AnimatePresence>
                  {cartItemCount > 0 && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center shadow-sm"
                    >
                      {cartItemCount > 99 ? '99+' : cartItemCount}
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </div>

            {/* Profile */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(v => !v)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-full hover:bg-gray-100 transition-colors"
                aria-haspopup="menu"
                aria-expanded={showProfileMenu}
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center font-semibold">
                  {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || <FiUser />}
                </div>
                <FiChevronDown className="text-gray-600" />
              </button>

              <AnimatePresence>
                {showProfileMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-lg ring-1 ring-black/5 overflow-hidden"
                    role="menu"
                  >
                    {user ? (
                      <div className="py-1">
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="text-sm text-gray-500">Signed in as</p>
                          <p className="text-sm font-medium truncate">{user.email}</p>
                        </div>
                        <button
                          onClick={() => { setShowProfileMenu(false); navigate('/orders'); }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                          role="menuitem"
                        >
                          <FiPackage /> My Orders
                        </button>
                        <button
                          onClick={() => { setShowProfileMenu(false); navigate('/cart'); }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                          role="menuitem"
                        >
                          <FiShoppingCart /> My Cart
                        </button>
                        <button
                          onClick={() => { setShowProfileMenu(false); navigate('/wishlist'); }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                          role="menuitem"
                        >
                          <FiHeart /> My Wishlist
                        </button>
                        <button
                          onClick={() => { setShowProfileMenu(false); navigate('/profile'); }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                          role="menuitem"
                        >
                          <FiUser /> My Profile
                        </button>
                        <div className="h-px bg-gray-100 my-1" />
                        <button
                          onClick={() => { setShowProfileMenu(false); handleLogout(); }}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          role="menuitem"
                        >
                          <FiLogOut /> Logout
                        </button>
                      </div>
                    ) : (
                      <div className="py-2">
                        <button
                          onClick={() => { setShowProfileMenu(false); navigate('/login'); }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                        >
                          <FiUser /> Login
                        </button>
                        <button
                          onClick={() => { setShowProfileMenu(false); navigate('/signup'); }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                        >
                          <FiUserPlus /> Sign up
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
      {/* Hero Section with Search */}
      <div className="animated-gradient text-white py-12">
        <div className="container mx-auto px-4">
          <motion.h1 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.5 }}
            className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-3 text-center drop-shadow"
          >
            Discover Our Products
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="text-center text-white/90 max-w-2xl mx-auto mb-6"
          >
            Handpicked items with great prices. Find what suits your style and budget.
          </motion.p>
          
          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto">
            <div className="relative">
              <FiSearch className="absolute left-4 top-3.5 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search products or categories..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/95 text-gray-800 focus:ring-2 focus:ring-white/60 focus:outline-none shadow-lg"
              />
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setShowSuggestions(false);
                  }}
                  className="absolute right-4 top-3.5 text-gray-500 hover:text-gray-700"
                >
                  <FiX size={20} />
                </button>
              )}
            </div>

            {/* Search Suggestions */}
            <AnimatePresence>
              {showSuggestions && suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl ring-1 ring-black/5 overflow-hidden text-gray-900"
                >
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      onClick={() => {
                        setSearchTerm(suggestion);
                        setShowSuggestions(false);
                      }}
                      className="px-4 py-2 hover:bg-gray-50 cursor-pointer"
                    >
                      {suggestion}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Filters and Sort */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow hover:shadow-md transition-shadow"
            >
              <FiFilter />
              Filters
            </button>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 bg-white rounded-xl shadow hover:shadow-md transition-shadow"
            >
              <option value="">Sort By</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name-asc">Name: A to Z</option>
              <option value="name-desc">Name: Z to A</option>
            </select>
          </div>

          {/* Removed total products count per user preference */}
        </div>

        {/* Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-6 overflow-hidden"
            >
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Category</label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">All Categories</option>
                      {categories.map(cat => (
                        <option key={cat._id} value={cat._id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Masonry / Pinterest-style Grid (JS-based) */}
        <Masonry
          breakpointCols={{ default: 5, 1280: 4, 1024: 3, 640: 2, 480: 1 }}
          className="my-masonry-grid"
          columnClassName="my-masonry-grid_column"
        >
          {filteredProducts.map((product) => (
            <motion.div
              key={product._id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              whileHover={{ y: -6, rotateX: 1.5, rotateY: -1.5 }}
              style={{ transformPerspective: '800px' }}
              onClick={() => navigate(`/product/${product._id}`)}
              className="group p-[1px] rounded-2xl bg-gradient-to-br from-indigo-100 via-white to-pink-100 hover:from-indigo-200 hover:to-pink-200 transition cursor-pointer"
            >
              <div className="bg-white rounded-2xl shadow-sm hover:shadow-2xl transition-all duration-300 overflow-hidden">
                <div className="relative bg-gray-50">
                  {!imageLoaded[product._id] && (
                    <div className="w-full h-64 animate-pulse bg-gray-200" />
                  )}
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    onLoad={(e) => handleImageLoad(product._id, e)}
                    className={`${imageLoaded[product._id] ? 'opacity-100' : 'opacity-0'} w-full h-auto object-contain transition-opacity duration-300`}
                  />
                  {/* Quick view overlay with micro-description */}
                  {product.description && (
                    <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 via-black/20 to-transparent">
                        <p className="text-xs sm:text-sm text-white/95 drop-shadow line-clamp-2">{product.description}</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                    {product.name}
                  </h3>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-pink-600">
                      ₹{getPrice(product)}
                    </p>
                    <div className="flex items-center gap-2">
                      {/* Buy Now */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleBuyNow(product); }}
                        title="Buy now"
                        className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                      >
                        <FiZap />
                      </button>
                      {/* Wishlist */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleWishlistToggle(product); }}
                        title={isInWishlist(product._id) ? "Remove from wishlist" : "Add to wishlist"}
                        className={`p-2 rounded-lg transition-colors ${
                          isInWishlist(product._id) 
                            ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <FiHeart className={isInWishlist(product._id) ? 'fill-current' : ''} />
                      </button>
                      {/* Cart control */}
                      {cartMap[product._id] ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={async (e) => { e.stopPropagation(); const entry = cartMap[product._id]; await handleUpdateQty(product._id, entry.itemId, entry.quantity - 1); }}
                            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"
                            title="Decrease"
                          >
                            <FiMinus />
                          </button>
                          <span className="min-w-[24px] text-center text-sm">{cartMap[product._id].quantity}</span>
                          <button
                            onClick={async (e) => { e.stopPropagation(); const entry = cartMap[product._id]; await handleUpdateQty(product._id, entry.itemId, entry.quantity + 1); }}
                            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"
                            title="Increase"
                          >
                            <FiPlus />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAddToCart(product); }}
                          title="Add to cart"
                          className="p-2 rounded-lg bg-pink-50 text-pink-600 hover:bg-pink-100"
                        >
                          <FiShoppingCart />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </Masonry>

        {/* Empty State */}
        {filteredProducts.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-2xl font-semibold text-gray-800 mb-2">
              No products found
            </h3>
            <p className="text-gray-600">
              Try adjusting your search or filters
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-16 bg-white relative">
        {/* Decorative wave divider with animation */}
        <div className="absolute -top-6 left-0 right-0 footer-wave" aria-hidden />
        <div className="relative container mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500" />
              <span className="text-lg font-bold text-gray-900">Vishti Shop</span>
            </div>
            <p className="text-gray-600">Premium products for every lifestyle. Quality you can trust, designs you'll adore.</p>
            <div className="mt-4 grid grid-cols-2 gap-3 max-w-sm">
              <div className="rounded-xl border border-gray-100 p-3 shadow-sm bg-white">
                <p className="text-xs text-gray-500">Email</p>
                <a href="mailto:support@vishtishop.com" className="text-sm text-gray-800 hover:text-gray-900">support@vishtishop.com</a>
              </div>
              <div className="rounded-xl border border-gray-100 p-3 shadow-sm bg-white">
                <p className="text-xs text-gray-500">Location</p>
                <p className="text-sm text-gray-800">Uttara Kannada, KA</p>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Contact</h4>
            <ul className="space-y-2 text-gray-600">
              <li>Email: <a href="mailto:support@vishtishop.com" className="text-indigo-600 hover:underline">support@vishtishop.com</a></li>
              <li>Phone: <a href="tel:+91-9876543210" className="text-indigo-600 hover:underline">+91-9876543210</a></li>
              <li>Address: 123 Business Park, Tech City, Bangalore, Karnataka, India 560001</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Links</h4>
            <div className="flex flex-wrap gap-3 text-gray-600">
              <button onClick={() => navigate('/store')} className="hover:text-gray-900">Store</button>
              <button onClick={() => navigate('/orders')} className="hover:text-gray-900">Orders</button>
              <button onClick={() => navigate('/cart')} className="hover:text-gray-900">Cart</button>
              <button onClick={() => navigate('/wishlist')} className="hover:text-gray-900">Wishlist</button>
              <button onClick={() => navigate('/profile')} className="hover:text-gray-900">Profile</button>
              <button onClick={handleLogout} className="hover:text-gray-900">Logout</button>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-100">
          <div className="container mx-auto px-4 py-6 text-sm text-gray-500 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>© {new Date().getFullYear()} Vishti Shop. All rights reserved.</span>
            <span>Made with ♥ for our customers.</span>
          </div>
        </div>
      </footer>

      {/* Back to top button */}
      <BackToTopButton />
    </div>
  );
}

function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 h-11 w-11 rounded-full bg-gradient-to-tr from-indigo-600 to-pink-600 text-white shadow-lg hover:shadow-xl focus:outline-none"
          aria-label="Back to top"
          title="Back to top"
        >
          ↑
        </motion.button>
      )}
    </AnimatePresence>
  );
}
