import React, { useEffect, useState, useMemo, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import client from '../../api/client';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import debounce from 'lodash/debounce';
import { FiSearch, FiFilter, FiX, FiUser, FiChevronDown, FiLogOut, FiShoppingCart, FiUserPlus, FiPlus, FiMinus, FiZap, FiPackage, FiHeart } from 'react-icons/fi';
import Masonry from 'react-masonry-css';

// Skeleton Loading Components
const ProductCardSkeleton = () => (
  <div className="product-card group">
    <div className="relative overflow-hidden">
      <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 aspect-square overflow-hidden">
        <div className="w-full h-full loading-shimmer rounded-t-2xl" />
      </div>
      <div className="p-4">
        <div className="h-4 bg-gray-200 rounded mb-2 loading-shimmer"></div>
        <div className="h-3 bg-gray-200 rounded mb-3 w-3/4 loading-shimmer"></div>
        <div className="flex items-center justify-between">
          <div className="h-6 bg-gray-200 rounded w-16 loading-shimmer"></div>
          <div className="h-8 bg-gray-200 rounded w-8 loading-shimmer"></div>
        </div>
      </div>
    </div>
  </div>
);

const ProductGridSkeleton = ({ count = 12 }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
    {Array.from({ length: count }).map((_, index) => (
      <ProductCardSkeleton key={index} />
    ))}
  </div>
);

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
  const [imagesLoading, setImagesLoading] = useState(true);

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
    setImagesLoading(true);
    setImageLoaded({});
    setImageAspect({});
    
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
    const img = e.target;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    
    if (w && h) {
      setImageAspect((m) => ({ ...m, [productId]: w / h }));
    }
    
    setImageLoaded((m) => {
      const newState = { ...m, [productId]: true };
      // Check if all images are loaded
      const totalProducts = filteredProducts.length;
      const loadedCount = Object.values(newState).filter(Boolean).length;
      
      if (loadedCount >= totalProducts * 0.8) { // 80% loaded
        setImagesLoading(false);
      }
      
      return newState;
    });
  };

  const handleImageError = (productId) => {
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
          <button onClick={() => navigate('/store')} className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-2xl gradient-primary shadow-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <span className="text-white font-bold text-lg">V</span>
            </div>
            <span className="text-xl font-bold text-gradient group-hover:scale-105 transition-transform duration-200">
              Vishti Shop
            </span>
          </button>

          {/* Right actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Cart */}
            <div className="relative">
              <button
                onClick={() => navigate('/cart')}
                className="p-3 rounded-xl hover:bg-gray-100/80 transition-all duration-200 hover:scale-105"
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
                      className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-gradient-to-r from-pink-500 to-red-500 text-white text-xs font-bold flex items-center justify-center shadow-lg"
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
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-100/80 transition-all duration-200 hover:scale-105"
                aria-haspopup="menu"
                aria-expanded={showProfileMenu}
              >
                <div className="h-9 w-9 rounded-full gradient-primary text-white flex items-center justify-center font-semibold shadow-lg">
                  {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || <FiUser />}
                </div>
                <FiChevronDown className={`text-gray-600 transition-transform duration-200 ${showProfileMenu ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showProfileMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-2 w-56 glass-card p-2 shadow-strong"
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
          
          {/* Enhanced Search Bar */}
          <div className="relative max-w-3xl mx-auto">
            <div className="relative">
              <div className="absolute left-4 top-3.5 z-10">
                <FiSearch className="text-gray-400" size={20} />
              </div>
              <input
                type="text"
                placeholder="Search products, categories, or brands..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                className="w-full pl-12 pr-12 py-4 rounded-2xl bg-white/95 backdrop-blur-sm text-gray-800 focus:ring-2 focus:ring-white/80 focus:outline-none shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 text-lg"
              />
              {searchTerm && (
                <motion.button
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  onClick={() => {
                    setSearchTerm('');
                    setShowSuggestions(false);
                  }}
                  className="absolute right-4 top-3.5 p-1 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors duration-200"
                >
                  <FiX size={18} className="text-gray-600" />
                </motion.button>
              )}
            </div>

            {/* Enhanced Search Suggestions */}
            <AnimatePresence>
              {showSuggestions && suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute z-50 w-full mt-3 glass-card overflow-hidden shadow-strong"
                >
                  <div className="p-2">
                    <div className="text-xs font-semibold text-gray-500 px-3 py-2 border-b border-gray-200/50">
                      Suggestions
                    </div>
                  {suggestions.map((suggestion, index) => (
                      <motion.div
                      key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      onClick={() => {
                        setSearchTerm(suggestion);
                        setShowSuggestions(false);
                      }}
                        className="px-3 py-3 hover:bg-gray-100/80 cursor-pointer rounded-lg transition-colors duration-200 flex items-center gap-2"
                    >
                        <FiSearch size={16} className="text-gray-400" />
                        <span className="text-gray-700">{suggestion}</span>
                      </motion.div>
                  ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Enhanced Filters and Sort */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            {/* Enhanced Filter Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-semibold transition-all duration-200 ${
                showFilters 
                  ? 'btn-primary shadow-lg' 
                  : 'btn-secondary hover:shadow-md'
              }`}
            >
              <FiFilter className="text-lg" />
              <span>Filters</span>
              {selectedCategory && (
                <span className="px-2 py-1 text-xs bg-white/20 rounded-full">
                  Active
                </span>
              )}
            </motion.button>

            {/* Enhanced Sort Dropdown */}
            <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none px-6 py-3 pr-10 rounded-2xl btn-secondary font-semibold cursor-pointer hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Sort By</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name-asc">Name: A to Z</option>
              <option value="name-desc">Name: Z to A</option>
            </select>
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <FiChevronDown className="text-gray-600" size={20} />
              </div>
            </div>
          </div>

          {/* Results Count - Only show when filters are applied */}
          {(selectedCategory || sortBy || searchTerm) && (
            <div className="text-sm text-gray-600 font-medium">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} found
            </div>
          )}
        </div>

        {/* Enhanced Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="mb-8 overflow-hidden"
            >
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full gradient-accent"></div>
                    Filter Products
                  </h3>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                  >
                    <FiX size={20} className="text-gray-600" />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Category</label>
                    <div className="relative">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 appearance-none cursor-pointer"
                    >
                      <option value="">All Categories</option>
                      {categories.map(cat => (
                        <option key={cat._id} value={cat._id}>{cat.name}</option>
                      ))}
                    </select>
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <FiChevronDown className="text-gray-600" size={18} />
                  </div>
                </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Price Range</label>
                    <div className="px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-600">
                      Coming Soon
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Availability</label>
                    <div className="px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-600">
                      Coming Soon
                    </div>
                  </div>
                </div>

                {/* Clear Filters */}
                {(selectedCategory || sortBy) && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setSelectedCategory('');
                        setSortBy('');
                      }}
                      className="btn-ghost text-sm"
                    >
                      Clear All Filters
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Products Grid with Loading State */}
        {loading ? (
          <div className="container mx-auto px-4 py-8">
            <ProductGridSkeleton count={12} />
          </div>
        ) : (
          <div className="container mx-auto px-4 py-8">
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
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              onClick={() => navigate(`/product/${product._id}`)}
              className="product-card group cursor-pointer"
            >
              <div className="relative overflow-hidden">
                {/* Image Container */}
                <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 aspect-square overflow-hidden">
                  {!imageLoaded[product._id] && (
                    <div className="w-full h-full loading-shimmer rounded-t-2xl" />
                  )}
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    onLoad={(e) => handleImageLoad(product._id, e)}
                    onError={() => handleImageError(product._id)}
                    loading="lazy"
                    decoding="async"
                    className={`${imageLoaded[product._id] ? 'opacity-100' : 'opacity-0'} w-full h-full object-cover transition-all duration-500 group-hover:scale-110`}
                  />
                  
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Quick Actions Overlay */}
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleWishlistToggle(product); }}
                        className={`p-2 rounded-full backdrop-blur-sm transition-all duration-200 ${
                          isInWishlist(product._id) 
                            ? 'bg-red-500/90 text-white shadow-lg' 
                            : 'bg-white/90 text-gray-700 hover:bg-white shadow-md'
                        }`}
                      >
                        <FiHeart className={`text-sm ${isInWishlist(product._id) ? 'fill-current' : ''}`} />
                      </button>
                      </div>
                  </div>

                  {/* Stock Badge */}
                  {product.stock <= 5 && product.stock > 0 && (
                    <div className="absolute top-3 left-3">
                      <span className="px-2 py-1 text-xs font-semibold bg-orange-500 text-white rounded-full shadow-lg">
                        Only {product.stock} left!
                      </span>
                    </div>
                  )}
                  
                  {product.stock === 0 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="px-3 py-1 text-sm font-semibold bg-red-500 text-white rounded-full">
                        Out of Stock
                      </span>
                </div>
                  )}
                </div>
                {/* Product Info */}
                <div className="p-5">
                  <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 text-lg group-hover:text-gradient transition-colors duration-200">
                    {product.name}
                  </h3>
                  
                  {/* Price Section */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl font-bold text-gradient">
                      ₹{getPrice(product)}
                      </span>
                      {isWholesale && product.wholesalePrice && (
                        <span className="text-sm text-gray-500 line-through">
                          ₹{product.price}
                        </span>
                      )}
                    </div>
                    {isWholesale && product.wholesalePrice && (
                      <span className="text-xs text-green-600 font-medium">
                        Wholesale Price
                      </span>
                    )}
                  </div>

                  {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                    {/* Cart Control */}
                      {cartMap[product._id] ? (
                      <div className="flex items-center gap-2 flex-1">
                          <button
                            onClick={async (e) => { e.stopPropagation(); const entry = cartMap[product._id]; await handleUpdateQty(product._id, entry.itemId, entry.quantity - 1); }}
                          className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors duration-200"
                          >
                          <FiMinus className="text-sm" />
                          </button>
                        <span className="min-w-[32px] text-center font-semibold text-gray-700">
                          {cartMap[product._id].quantity}
                        </span>
                          <button
                            onClick={async (e) => { e.stopPropagation(); const entry = cartMap[product._id]; await handleUpdateQty(product._id, entry.itemId, entry.quantity + 1); }}
                          className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors duration-200"
                          >
                          <FiPlus className="text-sm" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAddToCart(product); }}
                        className="btn-primary flex-1 py-2 text-sm"
                        >
                        <FiShoppingCart className="inline mr-2" />
                        Add to Cart
                        </button>
                      )}
                    
                    {/* Quick Buy */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleBuyNow(product); }}
                      className="btn-secondary px-3 py-2"
                      title="Buy now"
                    >
                      <FiZap className="text-sm" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </Masonry>
          </div>
        )}

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

      {/* Enhanced Footer */}
      <footer className="mt-20 relative overflow-hidden">
        {/* Enhanced Decorative Wave */}
        <div className="absolute -top-8 left-0 right-0 footer-wave" aria-hidden />
        
        {/* Main Footer Content */}
        <div className="relative bg-gradient-to-br from-gray-50 via-white to-gray-100">
          <div className="container mx-auto px-4 py-16">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Brand Section */}
              <div className="lg:col-span-2">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-12 w-12 rounded-2xl gradient-primary shadow-lg flex items-center justify-center">
                    <span className="text-white font-bold text-xl">V</span>
                  </div>
                  <span className="text-2xl font-bold text-gradient">Vishti Shop</span>
                </div>
                <p className="text-gray-600 text-lg mb-6 max-w-md">
                  Premium products for every lifestyle. Quality you can trust, designs you'll adore.
                </p>
                
                {/* Contact Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
                  <div className="glass-card p-4 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-8 w-8 rounded-lg gradient-accent flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <span className="text-sm font-semibold text-gray-700">Email</span>
                    </div>
                    <a href="mailto:support@vishtishop.com" className="text-sm text-gray-600 hover:text-gradient transition-colors duration-200">
                      support@vishtishop.com
                    </a>
                  </div>
                  
                  <div className="glass-card p-4 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-8 w-8 rounded-lg gradient-secondary flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <span className="text-sm font-semibold text-gray-700">Location</span>
                    </div>
                    <p className="text-sm text-gray-600">Uttara Kannada, KA</p>
                  </div>
                </div>
              </div>

              {/* Quick Links */}
          <div>
                <h4 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <div className="h-1 w-6 rounded-full gradient-primary"></div>
                  Quick Links
                </h4>
                <div className="space-y-3">
                  {[
                    { name: 'Store', path: '/store' },
                    { name: 'Orders', path: '/orders' },
                    { name: 'Cart', path: '/cart' },
                    { name: 'Wishlist', path: '/wishlist' },
                    { name: 'Profile', path: '/profile' }
                  ].map((link) => (
                    <motion.button
                      key={link.name}
                      whileHover={{ x: 5 }}
                      onClick={() => navigate(link.path)}
                      className="block text-gray-600 hover:text-gradient transition-colors duration-200 text-left"
                    >
                      {link.name}
                    </motion.button>
                  ))}
            </div>
              </div>

              {/* Contact Info */}
              <div>
                <h4 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <div className="h-1 w-6 rounded-full gradient-secondary"></div>
                  Contact Info
                </h4>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-lg gradient-accent flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
              </div>
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <a href="mailto:support@vishtishop.com" className="text-sm text-gradient hover:underline">
                        support@vishtishop.com
                      </a>
            </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-lg gradient-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
          </div>
          <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <a href="tel:+91-9876543210" className="text-sm text-gradient hover:underline">
                        +91-9876543210
                      </a>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
          </div>
          <div>
                      <p className="text-sm text-gray-600">Address</p>
                      <p className="text-sm text-gray-700">123 Business Park, Tech City<br />Bangalore, Karnataka, India 560001</p>
            </div>
          </div>
        </div>
              </div>
            </div>
          </div>
          
          {/* Footer Bottom */}
          <div className="border-t border-gray-200/50 bg-white/50 backdrop-blur-sm">
            <div className="container mx-auto px-4 py-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>© {new Date().getFullYear()} Vishti Shop. All rights reserved.</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    Made with 
                    <motion.span
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="text-red-500"
                    >
                      ♥
                    </motion.span>
                    for our customers
                  </span>
                </div>
              </div>
            </div>
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
