import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FiSearch, 
  FiShoppingCart, 
  FiHeart, 
  FiShare2, 
  FiStar, 
  FiTruck, 
  FiShield, 
  FiRefreshCw, 
  FiHeadphones,
  FiCheckCircle,
  FiArrowRight,
  FiClock,
  FiMapPin,
  FiMail,
  FiPhone,
  FiTrash2
} from "react-icons/fi";
import { useAuth } from "../../contexts/AuthContext";
import client from "../../api/client";
import { toast } from "react-toastify";

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isInWishlist, addToWishlist, removeFromWishlist } = useAuth();

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [isZoomed, setIsZoomed] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [showWholesaleForm, setShowWholesaleForm] = useState(false);
  const [wholesaleForm, setWholesaleForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    quantity: product?.wholesaleMinQty || 30,
    message: ''
  });
  const [submittingInquiry, setSubmittingInquiry] = useState(false);
  const [cartItem, setCartItem] = useState(null); // { itemId, quantity }
  const [updatingCart, setUpdatingCart] = useState(false);

  const isShop = user?.purpose === "shop";

  // Fetch Product + Related Products
  useEffect(() => {
    const fetchProductAndRelated = async () => {
      try {
        setLoading(true);

        // First fetch the current product
        const productRes = await client.get(`/api/products/${id}`);
        const productData = productRes.data;
        setProduct(productData);

        // Then fetch related products from the same category
        if (productData.category?._id) {
          const relatedRes = await client.get(`/api/products?category=${productData.category._id}&limit=12`);
          
          // Filter out the current product and take up to 8 related products
          const related = relatedRes.data.items
            .filter((p) => p._id !== productData._id)
            .slice(0, 8);
          
        setRelatedProducts(related);
        } else {
          // If no category, fetch some random products as fallback
          const relatedRes = await client.get(`/api/products?limit=8`);
          const related = relatedRes.data.items
            .filter((p) => p._id !== productData._id)
            .slice(0, 8);
          
          setRelatedProducts(related);
        }
      } catch (error) {
        console.error("Error fetching product:", error);
        if (error.response?.status === 404) {
          toast.error("Product not found");
        } else if (error.response?.status === 401) {
          toast.error("Please log in to continue");
          navigate("/login");
        } else {
          toast.error("Failed to load product details");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProductAndRelated();
  }, [id, navigate]);

  // Fetch cart data to check if product is in cart
  useEffect(() => {
    const fetchCartData = async () => {
      console.log('=== Fetching cart data ===');
      console.log('User:', user);
      console.log('Product:', product);
      
      if (!user || !product) return;
      
      try {
        const response = await client.get('/api/cart');
        const cartItems = response.data.items || [];
        console.log('Cart items:', cartItems);
        
        // Find if current product is in cart
        const existingItem = cartItems.find(item => 
          (item.product?._id || item.product) === product._id
        );
        console.log('Existing item in cart:', existingItem);
        
        if (existingItem) {
          console.log('Setting cart item and quantity:', existingItem.quantity);
          setCartItem({
            itemId: existingItem._id,
            quantity: existingItem.quantity
          });
          setQuantity(existingItem.quantity);
        } else {
          console.log('No existing item, setting quantity to 1');
          setCartItem(null);
          setQuantity(1);
        }
      } catch (error) {
        console.error('Error fetching cart:', error);
        setCartItem(null);
      }
    };

    fetchCartData();
  }, [user, product]);

  // Update wholesale form when user changes
  useEffect(() => {
    if (user) {
      setWholesaleForm(prev => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email || prev.email,
        phone: user.phone || prev.phone
      }));
    }
  }, [user]);

  // Zoom Effect
  const handleImageHover = (e) => {
    if (!isZoomed) return;
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.pageX - left) / width) * 100;
    const y = ((e.pageY - top) / height) * 100;
    setMousePosition({ x, y });
  };

  // Add to Cart
  const addToCart = async () => {
    if (!user) {
      toast.error("Please login to add items to cart");
      navigate("/login");
      return;
    }
    
    setUpdatingCart(true);
    try {
      // Use fallback wholesale price if not set
      const price = isShop 
        ? (product.wholesalePrice || 1999) 
        : product.price;

      const response = await client.post("/api/cart", {
        productId: id,
        quantity,
        isWholesale: isShop,
        price,
      });

      // Find the added item in the response to get the real cart item ID
      const addedItem = response.data?.items?.find(item => 
        (item.product?._id || item.product) === id
      );

      if (addedItem) {
        // Update local cart state with real cart item ID
        setCartItem({
          itemId: addedItem._id,
          quantity: addedItem.quantity
        });
        setQuantity(addedItem.quantity);
      }

      // No toast needed - visual feedback is sufficient
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error(error.response?.data?.message || "Failed to add to cart");
    } finally {
      setUpdatingCart(false);
    }
  };

  // Update cart quantity
  const updateCartQuantity = async (newQuantity) => {
    if (!user || !cartItem) return;
    
    if (newQuantity < 1) {
      // Remove from cart
      await removeFromCart();
      return;
    }
    
    setUpdatingCart(true);
    try {
      await client.put(`/api/cart/items/${cartItem.itemId}`, { 
        quantity: newQuantity 
      });
      
      setCartItem(prev => ({ ...prev, quantity: newQuantity }));
      setQuantity(newQuantity);
      
      // No toast needed - visual feedback is sufficient
    } catch (error) {
      console.error("Error updating cart quantity:", error);
      
      // If the cart item doesn't exist, refresh cart data
      if (error.response?.status === 404) {
        toast.error("Item not found in cart. Refreshing...");
        // Refresh cart data
        try {
          const response = await client.get('/api/cart');
          const cartItems = response.data.items || [];
          
          const existingItem = cartItems.find(item => 
            (item.product?._id || item.product) === id
          );
          
          if (existingItem) {
            setCartItem({
              itemId: existingItem._id,
              quantity: existingItem.quantity
            });
            setQuantity(existingItem.quantity);
            // Cart refreshed successfully
          } else {
            setCartItem(null);
            setQuantity(1);
            // Item was removed from cart
          }
        } catch (refreshError) {
          console.error("Error refreshing cart:", refreshError);
          toast.error("Failed to refresh cart data");
        }
      } else {
        toast.error(error.response?.data?.message || "Failed to update quantity");
      }
    } finally {
      setUpdatingCart(false);
    }
  };

  // Remove from cart
  const removeFromCart = async () => {
    if (!user || !cartItem) return;
    
    setUpdatingCart(true);
    try {
      await client.delete(`/api/cart/items/${cartItem.itemId}`);
      
      setCartItem(null);
      setQuantity(1);
      
      // No toast needed - visual feedback is sufficient
    } catch (error) {
      console.error("Error removing from cart:", error);
      
      // If the cart item doesn't exist, refresh cart data
      if (error.response?.status === 404) {
        toast.error("Item not found in cart. Refreshing...");
        // Refresh cart data
        try {
          const response = await client.get('/api/cart');
          const cartItems = response.data.items || [];
          
          const existingItem = cartItems.find(item => 
            (item.product?._id || item.product) === id
          );
          
          if (existingItem) {
            setCartItem({
              itemId: existingItem._id,
              quantity: existingItem.quantity
            });
            setQuantity(existingItem.quantity);
            // Cart refreshed successfully
          } else {
            setCartItem(null);
            setQuantity(1);
            // Item was already removed from cart
          }
        } catch (refreshError) {
          console.error("Error refreshing cart:", refreshError);
          toast.error("Failed to refresh cart data");
        }
      } else {
        toast.error(error.response?.data?.message || "Failed to remove from cart");
      }
    } finally {
      setUpdatingCart(false);
    }
  };

  // Buy Now
  const handleBuyNow = async () => {
    console.log('=== ProductDetailPage: handleBuyNow called ===');
    console.log('Product ID:', id);
    console.log('Product:', product);
    console.log('Quantity:', quantity);
    console.log('User:', user);
    console.log('Is Shop:', isShop);
    console.log('Cart item state:', cartItem);
    
    if (!user) {
      console.log('No user, redirecting to login');
      toast.error("Please login to continue");
      navigate("/login");
      return;
    }

    // For wholesale users, prevent direct buy now
    if (isShop) {
      console.log('Wholesale user, preventing buy now');
      toast.error('Minimum order value is ₹10,000 for wholesale buyers. Please add more items or change your account type in Profile settings.');
      return;
    }

    // If cart item exists, use its quantity; otherwise use current quantity state
    const finalQuantity = cartItem ? cartItem.quantity : quantity;
    console.log('Final quantity to use:', finalQuantity);

    console.log('=== Creating buyNowItem ===');
    console.log('Current quantity state:', quantity);
    console.log('Product data:', product);
    console.log('Cart item state:', cartItem);
    
    const checkoutItem = {
      product: {
        _id: id,
        name: product.name,
        price: product.price,
        image: product.images?.[0],
      },
      quantity: finalQuantity,
    };

    console.log('Setting buyNowItem:', checkoutItem);
    console.log('Current quantity state:', quantity);
    console.log('Product images:', product.images);
    console.log('Selected image:', product.images?.[0]);
    
    localStorage.setItem("buyNowItem", JSON.stringify(checkoutItem));
    
    // Verify it was set
    const verifyItem = localStorage.getItem("buyNowItem");
    console.log('Verification - buyNowItem in localStorage:', verifyItem);
    const parsedVerify = JSON.parse(verifyItem);
    console.log('Parsed verification - quantity:', parsedVerify.quantity);
    console.log('Parsed verification - image:', parsedVerify.product.image);
    
    console.log('Navigating to checkout...');
    navigate("/checkout");
  };

  // Wishlist
  const toggleWishlist = async () => {
    if (!user) {
      toast.error("Please login to add to wishlist");
      navigate("/login");
      return;
    }
    try {
      const currentlyInWishlist = isInWishlist(id);
      
      if (currentlyInWishlist) {
        await removeFromWishlist(id);
        // No toast needed - visual feedback is sufficient
      } else {
        await addToWishlist(id);
        // No toast needed - visual feedback is sufficient
      }
    } catch (error) {
      console.error("Error toggling wishlist:", error);
      toast.error(error.response?.data?.message || "Failed to update wishlist");
    }
  };

  // Submit Wholesale Inquiry
  const submitWholesaleInquiry = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please login to submit inquiry");
      navigate("/login");
      return;
    }

    setSubmittingInquiry(true);
    try {
      await client.post('/api/wholesale-inquiries', {
        ...wholesaleForm,
        productId: id
      });

      // Inquiry submitted successfully
      setShowWholesaleForm(false);
      setWholesaleForm({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        quantity: product?.wholesaleMinQty || 30,
        message: ''
      });
    } catch (error) {
      console.error("Error submitting inquiry:", error);
      toast.error(error.response?.data?.message || "Failed to submit inquiry");
    } finally {
      setSubmittingInquiry(false);
    }
  };

  // Search
  const handleSearch = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    if (term.trim()) {
      navigate(`/store?search=${encodeURIComponent(term)}`);
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Navigation Skeleton */}
        <div className="sticky top-0 z-20 backdrop-blur-md bg-white/90 border-b border-gray-200/50 shadow-soft">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-10 w-24 bg-gray-200 rounded-xl loading-shimmer"></div>
                <div className="h-8 w-32 bg-gray-200 rounded-lg loading-shimmer"></div>
              </div>
              <div className="flex-1 max-w-2xl mx-auto">
                <div className="h-12 bg-gray-200 rounded-xl loading-shimmer"></div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 bg-gray-200 rounded-xl loading-shimmer"></div>
                <div className="h-10 w-10 bg-gray-200 rounded-xl loading-shimmer"></div>
                <div className="h-10 w-10 bg-gray-200 rounded-xl loading-shimmer"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Product Details Skeleton */}
        <div className="container mx-auto px-4 py-8">
          <div className="glass-card overflow-hidden mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
              {/* Image Skeleton */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-8">
                <div className="space-y-6">
                  <div className="aspect-square rounded-2xl bg-gray-200 loading-shimmer"></div>
                  <div className="grid grid-cols-5 gap-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="aspect-square rounded-xl bg-gray-200 loading-shimmer"></div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Info Skeleton */}
              <div className="p-8 lg:p-12">
                <div className="space-y-6">
                  <div className="h-6 w-24 bg-gray-200 rounded-full loading-shimmer"></div>
                  <div className="h-8 w-3/4 bg-gray-200 rounded loading-shimmer"></div>
                  <div className="h-4 w-1/2 bg-gray-200 rounded loading-shimmer"></div>
                  <div className="h-20 w-full bg-gray-200 rounded-2xl loading-shimmer"></div>
                  <div className="h-16 w-full bg-gray-200 rounded-xl loading-shimmer"></div>
                  <div className="space-y-3">
                    <div className="h-12 w-full bg-gray-200 rounded-2xl loading-shimmer"></div>
                    <div className="h-12 w-full bg-gray-200 rounded-2xl loading-shimmer"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No Product Found
  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Product not found</h2>
          <p className="text-gray-600 mb-6">The product you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/store')}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all duration-200"
          >
            Back to Store
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Enhanced Navigation Bar */}
      <div className="sticky top-0 z-20 backdrop-blur-md bg-white/90 border-b border-gray-200/50 shadow-soft">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Left Section - Back Button & Brand */}
            <div className="flex items-center gap-4">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl btn-secondary font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </motion.button>
              
              <div className="hidden sm:flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl gradient-primary shadow-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">V</span>
                </div>
                <span className="text-xl font-bold text-gradient">
                  Vishti Shop
                </span>
              </div>
            </div>

            {/* Center Section - Search Bar */}
            <div className="flex-1 max-w-2xl mx-auto">
              <div className="relative">
                <FiSearch className="absolute left-4 top-3.5 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={handleSearch}
                  className="input w-full pl-12 pr-12"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Right Section - Quick Actions */}
            <div className="flex items-center gap-2">
              {/* Cart Button */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/cart')}
                className="relative p-3 rounded-xl btn-secondary"
                title="View Cart"
              >
                <FiShoppingCart className="w-5 h-5" />
                {cartItem && (
                  <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-gradient-to-r from-pink-500 to-red-500 text-white text-xs font-bold flex items-center justify-center shadow-lg">
                    {cartItem.quantity}
                  </div>
                )}
              </motion.button>

              {/* Wishlist Button */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={toggleWishlist}
                className={`p-3 rounded-xl transition-all duration-200 ${
                  isInWishlist(id) 
                    ? "bg-red-100 text-red-600 hover:bg-red-200 shadow-md" 
                    : "btn-secondary"
                }`}
                title={isInWishlist(id) ? "Remove from Wishlist" : "Add to Wishlist"}
              >
                <FiHeart className={`w-5 h-5 ${isInWishlist(id) ? "fill-current" : ""}`} />
              </motion.button>

              {/* Share Button */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  navigator.share
                    ? navigator
                        .share({
                          title: product?.name,
                          text: product?.description,
                          url: window.location.href,
                        })
                        .catch(() => {
                          navigator.clipboard.writeText(window.location.href);
                        })
                    : navigator.clipboard.writeText(window.location.href);
                }}
                className="btn-secondary p-3"
                title="Share Product"
              >
                <FiShare2 className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Product Details */}
        <div className="glass-card overflow-hidden mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            {/* Images Section */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-8">
              <div className="space-y-6">
                {/* Main Image */}
                <div
                  className="relative aspect-square rounded-2xl overflow-hidden bg-white shadow-lg"
                  onMouseMove={handleImageHover}
                  onMouseEnter={() => setIsZoomed(true)}
                  onMouseLeave={() => setIsZoomed(false)}
                >
                  <motion.img
                    src={product.images?.[activeImage] || "/placeholder.png"}
                    alt={product.name}
                    className="w-full h-full object-cover cursor-zoom-in transition-transform duration-300"
                    style={
                      isZoomed
                        ? {
                            transformOrigin: `${mousePosition.x}% ${mousePosition.y}%`,
                            transform: "scale(1.5)",
                          }
                        : {}
                    }
                  />
                  {/* Zoom indicator */}
                  {isZoomed && (
                    <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                      <div className="glass-card px-3 py-1 text-sm font-medium">
                        Zoomed
                      </div>
                    </div>
                  )}
                </div>

                {/* Thumbnails */}
                {product.images?.length > 1 && (
                  <div className="grid grid-cols-5 gap-3">
                    {product.images.map((image, index) => (
                      <motion.button
                        key={index}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setActiveImage(index)}
                        className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                          activeImage === index
                            ? "border-indigo-500 shadow-lg"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <img
                          src={image}
                          alt={`${product.name} ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {activeImage === index && (
                          <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                          </div>
                        )}
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Info Section */}
            <div className="p-8 lg:p-12">
              <div className="space-y-6">
                {/* Category Badge */}
                {product.category && (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="inline-flex items-center px-4 py-2 rounded-2xl text-sm font-semibold gradient-primary text-white shadow-lg"
                  >
                    {product.category.name}
                  </motion.div>
                )}

                {/* Premium Product Name */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="space-y-4"
                >
                  <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 leading-tight">
                    {product.name}
                  </h1>
                  
                  {/* Rating and Reviews */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.2 + i * 0.05 }}
                        >
                          <FiStar
                          className={`w-4 h-4 ${
                            i < 4 ? "text-yellow-400 fill-current" : "text-gray-300"
                          }`}
                        />
                        </motion.div>
                      ))}
                    </div>
                    <span className="text-sm text-gray-600 font-medium">4.8 (127 reviews)</span>
                    <div className="h-1 w-1 bg-gray-400 rounded-full"></div>
                    <span className="text-sm text-gray-600">In Stock</span>
                  </div>
                </motion.div>

                {/* Premium Price Section */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-2xl border border-gray-100"
                >
                  <div className="space-y-3">
                    {/* Price Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                        {isShop ? "Wholesale Price" : "Price"}
                        </span>
                      {isShop && (
                          <span className="px-2 py-1 text-xs font-bold bg-emerald-100 text-emerald-700 rounded-full">
                          Wholesale
                          </span>
                        )}
                      </div>
                      {isShop && product.wholesalePrice && product.price > product.wholesalePrice && (
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                          <span className="text-xs font-medium text-green-600">
                            Save ₹{product.price - product.wholesalePrice}
                          </span>
                        </div>
                      )}
                    </div>
                    
                     {/* Price Display */}
                     <div className="space-y-2">
                       {isShop ? (
                         // Wholesale user - show wholesale price with fallback
                         <div className="space-y-2">
                           {/* Regular Price - Crossed Out */}
                           <div className="flex items-center gap-2">
                             <span className="text-lg text-gray-400 line-through font-medium">
                            ₹{product.price}
                          </span>
                             <span className="px-2 py-1 text-xs font-bold bg-gray-100 text-gray-600 rounded-full">
                               Regular Price
                             </span>
                      </div>
                    
                           {/* Wholesale Price */}
                      <div className="flex items-center gap-2">
                             <span className="text-3xl lg:text-4xl font-bold text-gray-900">
                               ₹{product.wholesalePrice || 1999}
                             </span>
                             <span className="px-2 py-1 text-xs font-bold bg-emerald-100 text-emerald-700 rounded-full">
                               Wholesale Price
                             </span>
                           </div>
                           
                           {/* Savings */}
                           <div className="flex items-center gap-1">
                             <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                             <span className="text-sm font-semibold text-green-600">
                               You save ₹{product.price - (product.wholesalePrice || 1999)} per item
                             </span>
                           </div>
                           
                           {/* Minimum Quantity */}
                           <div className="flex items-center gap-1">
                             <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                             <span className="text-sm font-medium text-blue-600">
                               Minimum quantity: {product.wholesaleMinQty || 30} units
                             </span>
                           </div>
                         </div>
                       ) : (
                         // Regular user - show regular price
                         <div className="flex items-center gap-2">
                           <span className="text-3xl lg:text-4xl font-bold text-gray-900">
                             ₹{product.price}
                           </span>
                           <span className="px-2 py-1 text-xs font-bold bg-blue-100 text-blue-700 rounded-full">
                             Regular Price
                           </span>
                      </div>
                    )}
                  </div>
                </div>
                </motion.div>

                {/* Quantity Selector */}
                {product.inStock && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700">Quantity</span>
                      <span className="text-xs text-gray-500">
                        {product.stock} available
                      </span>
                    </div>
                    
                    <div className="relative">
                    <div className="flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden w-fit">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            const newQty = Math.max(1, quantity - 1);
                            if (cartItem) {
                              updateCartQuantity(newQty);
                            } else {
                              setQuantity(newQty);
                            }
                          }}
                          disabled={updatingCart}
                          className="p-3 text-gray-600 hover:text-gray-800 hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                      </motion.button>
                        
                        <div className="px-4 py-3 min-w-[60px] text-center">
                      <input
                        type="number"
                        min="1"
                        value={quantity}
                            onChange={(e) => {
                              const newQty = Math.max(1, parseInt(e.target.value) || 1);
                              if (cartItem) {
                                updateCartQuantity(newQty);
                              } else {
                                setQuantity(newQty);
                              }
                            }}
                            disabled={updatingCart}
                            className="w-full text-center text-lg font-semibold bg-transparent border-none outline-none text-gray-900"
                          />
                        </div>
                        
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            const newQty = quantity + 1;
                            if (cartItem) {
                              updateCartQuantity(newQty);
                            } else {
                              setQuantity(newQty);
                            }
                          }}
                          disabled={updatingCart}
                          className="p-3 text-gray-600 hover:text-gray-800 hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                      </motion.button>
                      </div>
                      
                      {updatingCart && (
                        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-2 text-sm text-indigo-600 font-medium">
                          <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                          Updating cart...
                        </div>
                      )}
                    </div>
                  </div>
                )}

                 {/* Modern Action Buttons */}
                <div className="space-y-4">
                   {cartItem ? (
                     // Product is in cart - show premium cart management
                     <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6 rounded-3xl border border-indigo-100 shadow-lg">
                       <div className="flex items-center gap-4 mb-6">
                         <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                           <FiShoppingCart className="w-6 h-6 text-white" />
                          </div>
                          <div>
                           <h3 className="text-lg font-bold text-gray-900">Item Added to Cart</h3>
                           <p className="text-sm text-gray-600">Quantity: {cartItem.quantity} • Ready for checkout</p>
                         </div>
                         <div className="ml-auto">
                           <div className="bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full border border-indigo-200">
                             <span className="text-sm font-bold text-indigo-700">{cartItem.quantity}</span>
                           </div>
                          </div>
                        </div>
                        
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <motion.button
                           whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => navigate('/cart')}
                           className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 rounded-2xl hover:shadow-xl hover:from-indigo-700 hover:to-purple-700 flex items-center justify-center gap-3 font-semibold text-lg transition-all duration-300 shadow-lg"
                          >
                            <FiShoppingCart className="w-5 h-5" />
                            View Cart
                            <div className="bg-white/20 px-2 py-1 rounded-lg text-sm font-bold">
                              {cartItem.quantity}
                            </div>
                          </motion.button>
                          
                          <motion.button
                           whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={removeFromCart}
                            disabled={updatingCart}
                           className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-6 py-4 rounded-2xl hover:shadow-xl hover:from-red-600 hover:to-pink-600 disabled:opacity-50 flex items-center justify-center gap-3 font-semibold text-lg transition-all duration-300 shadow-lg disabled:transform-none"
                          >
                            <FiTrash2 className="w-5 h-5" />
                            Remove
                           {updatingCart && (
                             <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                           )}
                          </motion.button>
                      </div>
                    </div>
                  ) : (
                    // Product not in cart - show premium add to cart button
                    <motion.button
                       whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={addToCart}
                      disabled={!product.inStock || updatingCart}
                       className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white px-8 py-5 rounded-2xl hover:shadow-2xl hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 disabled:opacity-50 flex items-center justify-center gap-4 font-bold text-xl transition-all duration-300 shadow-xl disabled:transform-none"
                    >
                       <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                         <FiShoppingCart className="w-5 h-5" />
                       </div>
                       <span>{updatingCart ? 'Adding to Cart...' : 'Add to Cart'}</span>
                      {updatingCart && (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      )}
                       {!updatingCart && (
                         <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                       )}
                    </motion.button>
                  )}
                  
                  {/* Buy Now Button */}
                    <motion.button
                     whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleBuyNow}
                      disabled={!product.inStock}
                     className="w-full bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white px-8 py-5 rounded-2xl hover:shadow-2xl hover:from-orange-600 hover:via-red-600 hover:to-pink-600 disabled:opacity-50 font-bold text-xl transition-all duration-300 shadow-xl disabled:transform-none flex items-center justify-center gap-4"
                    >
                     <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                     <span>Buy Now</span>
                     <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                   </motion.button>

                  {/* Wholesale Inquiry Button (for shop users) */}
                  {isShop && (
                    <motion.button
                       whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowWholesaleForm(true)}
                       className="w-full bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 text-white px-8 py-5 rounded-2xl hover:shadow-2xl hover:from-emerald-600 hover:via-green-600 hover:to-teal-600 font-bold text-xl transition-all duration-300 shadow-xl flex items-center justify-center gap-4"
                     >
                       <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                         <FiMail className="w-5 h-5" />
                       </div>
                       <span>Wholesale Inquiry</span>
                       <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    </motion.button>
                  )}
                 </div>


                 {/* Modern Description Section */}
                {product.description && (
                   <motion.div 
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ delay: 0.5 }}
                     className="bg-gradient-to-br from-gray-50 via-white to-gray-50 p-8 rounded-3xl border border-gray-100 shadow-lg"
                   >
                     <div className="flex items-center gap-4 mb-6">
                       <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                         <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                         </svg>
                  </div>
                       <div>
                         <h3 className="text-xl font-bold text-gray-900">Product Description</h3>
                         <p className="text-sm text-gray-600">Detailed information about this product</p>
                       </div>
                     </div>
                     
                     <div className="prose prose-lg prose-gray max-w-none">
                       <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-100 shadow-sm">
                         <p className="text-gray-700 leading-relaxed text-base font-medium">
                           {product.description}
                         </p>
                       </div>
                     </div>
                     
                     {/* Additional Info Cards */}
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                       <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-gray-100 shadow-sm">
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                             <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                             </svg>
                           </div>
                           <div>
                             <p className="text-sm font-semibold text-gray-900">Quality Assured</p>
                             <p className="text-xs text-gray-600">Premium materials</p>
                           </div>
                         </div>
                       </div>
                       
                       <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-gray-100 shadow-sm">
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                             <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                             </svg>
                           </div>
                           <div>
                             <p className="text-sm font-semibold text-gray-900">Fast Delivery</p>
                             <p className="text-xs text-gray-600">Quick shipping</p>
                           </div>
                         </div>
                       </div>
                       
                       <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-gray-100 shadow-sm">
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                             <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                             </svg>
                           </div>
                           <div>
                             <p className="text-sm font-semibold text-gray-900">Customer Love</p>
                             <p className="text-xs text-gray-600">Highly rated</p>
                           </div>
                         </div>
                       </div>
                     </div>
                   </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Trust Badges Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Why Choose Vishti Shop?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FiTruck className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Free Shipping</h3>
              <p className="text-gray-600 text-sm">Free delivery on orders above ₹500</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FiShield className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Secure Payment</h3>
              <p className="text-gray-600 text-sm">100% secure payment processing</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FiRefreshCw className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Easy Returns</h3>
              <p className="text-gray-600 text-sm">30-day return policy</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FiHeadphones className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">24/7 Support</h3>
              <p className="text-gray-600 text-sm">Round the clock customer support</p>
            </div>
          </div>
        </div>

        {/* Enhanced Related Products */}
        {relatedProducts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="glass-card p-8"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="h-2 w-8 rounded-full gradient-primary"></div>
                <h2 className="text-3xl font-bold text-gradient">Related Products</h2>
              </div>
              <div className="text-sm text-gray-600 font-medium">
                {relatedProducts.length} {relatedProducts.length === 1 ? 'item' : 'items'}
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {relatedProducts.map((relatedProduct, index) => (
                <motion.div
                  key={relatedProduct._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  onClick={() => navigate(`/product/${relatedProduct._id}`)}
                  className="product-card group cursor-pointer"
                >
                  <div className="relative overflow-hidden">
                    {/* Image Container */}
                    <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 aspect-square overflow-hidden">
                    <img
                      src={relatedProduct.images?.[0] || "/placeholder.png"}
                      alt={relatedProduct.name}
                        className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110"
                      />
                      
                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      {/* Quick Actions Overlay */}
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); }}
                            className="p-2 rounded-full backdrop-blur-sm bg-white/90 text-gray-700 hover:bg-white shadow-md transition-all duration-200"
                          >
                            <FiHeart className="text-sm" />
                          </button>
                  </div>
                      </div>

                      {/* Stock Badge */}
                      {relatedProduct.stock <= 5 && relatedProduct.stock > 0 && (
                        <div className="absolute top-3 left-3">
                          <span className="px-2 py-1 text-xs font-semibold bg-orange-500 text-white rounded-full shadow-lg">
                            Only {relatedProduct.stock} left!
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Product Info */}
                  <div className="p-4">
                      <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 text-sm group-hover:text-gradient transition-colors duration-200">
                      {relatedProduct.name}
                    </h3>
                      
                      {/* Price Section */}
                      <div className="mb-3">
                         <div className="flex items-center gap-2 mb-1">
                           <span className="text-lg font-bold text-gradient">
                             ₹{isShop ? (relatedProduct.wholesalePrice || 1999) : relatedProduct.price}
                           </span>
                           {isShop && (
                             <span className="text-xs text-gray-500 line-through">
                               ₹{relatedProduct.price}
                             </span>
                           )}
                         </div>
                         {isShop && (
                           <span className="text-xs text-green-600 font-medium">
                             Wholesale Price
                           </span>
                         )}
                      </div>

                      {/* Quick Add Button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); }}
                        className="btn-primary w-full py-2 text-sm"
                      >
                        <FiShoppingCart className="inline mr-2" />
                        Quick Add
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            
            {/* View All Button */}
            <div className="mt-8 text-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/store')}
                className="btn-secondary px-8 py-3"
              >
                View All Products
              </motion.button>
          </div>
          </motion.div>
        )}
      </div>

      {/* Wholesale Inquiry Modal */}
      <AnimatePresence>
        {showWholesaleForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowWholesaleForm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Wholesale Inquiry</h2>
                <button
                  onClick={() => setShowWholesaleForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={submitWholesaleInquiry} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={wholesaleForm.name}
                    onChange={(e) => setWholesaleForm(prev => ({ ...prev, name: e.target.value }))}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={wholesaleForm.email}
                    onChange={(e) => setWholesaleForm(prev => ({ ...prev, email: e.target.value }))}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                  <input
                    type="tel"
                    value={wholesaleForm.phone}
                    onChange={(e) => setWholesaleForm(prev => ({ ...prev, phone: e.target.value }))}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                  <input
                    type="number"
                     min={product?.wholesaleMinQty || 30}
                    value={wholesaleForm.quantity}
                     onChange={(e) => setWholesaleForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || (product?.wholesaleMinQty || 30) }))}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                   <p className="text-xs text-gray-500 mt-1">
                     Minimum quantity: {product?.wholesaleMinQty || 30} units
                   </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
                  <textarea
                    value={wholesaleForm.message}
                    onChange={(e) => setWholesaleForm(prev => ({ ...prev, message: e.target.value }))}
                    required
                    rows="4"
                    placeholder="Tell us about your requirements..."
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowWholesaleForm(false)}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingInquiry}
                    className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 rounded-lg hover:shadow-lg disabled:opacity-50 transition-all duration-200"
                  >
                    {submittingInquiry ? "Submitting..." : "Submit Inquiry"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

