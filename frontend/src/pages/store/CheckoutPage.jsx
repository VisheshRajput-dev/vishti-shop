import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiShoppingCart, 
  FiTruck, 
  FiMapPin, 
  FiPhone, 
  FiUser, 
  FiCreditCard, 
  FiAlertCircle,
  FiCheckCircle,
  FiArrowLeft,
  FiPackage
} from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import client from '../../api/client';
import { toast } from 'react-toastify';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State for checkout items
  const [checkoutItems, setCheckoutItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const hasProcessedBuyNow = useRef(false);
  
  // State for shipping details
  const [shippingDetails, setShippingDetails] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: '',
    city: '',
    state: '',
    pincode: ''
  });
  
  // State for delivery options
  const [deliveryOption, setDeliveryOption] = useState('normal');
  
  // State for validation errors
  const [errors, setErrors] = useState({});
  
  // Calculate totals
  const subtotal = checkoutItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const isWholesale = user?.purpose === 'shop';
  const minWholesaleAmount = 10000;
  
  // Calculate shipping cost
  const getShippingCost = () => {
    if (isWholesale) return 0; // Wholesale orders have separate shipping
    if (subtotal >= 1000) {
      return deliveryOption === 'express' ? 200 : 0;
    }
    return deliveryOption === 'express' ? 200 : 80;
  };
  
  const shippingCost = getShippingCost();
  const gst = Math.round(subtotal * 0.18); // 18% GST
  const total = subtotal + shippingCost + gst;
  
  // Check if wholesale user meets minimum order requirement
  const isWholesaleValid = !isWholesale || subtotal >= minWholesaleAmount;
  
  // Load checkout items
  useEffect(() => {
    const loadCheckoutItems = async () => {
      console.log('=== CheckoutPage: loadCheckoutItems called ===');
      console.log('hasProcessedBuyNow.current:', hasProcessedBuyNow.current);
      
      try {
        setLoading(true);
        
        // Check if this is a "Buy Now" checkout (from localStorage)
        const buyNowItem = localStorage.getItem('buyNowItem');
        console.log('Buy Now Item from localStorage:', buyNowItem);
        
        if (buyNowItem && !hasProcessedBuyNow.current) {
          console.log('Processing Buy Now item...');
          hasProcessedBuyNow.current = true; // Mark as processed
          // Single item checkout
          const item = JSON.parse(buyNowItem);
          console.log('Parsed Buy Now item:', item);
          console.log('Item quantity:', item.quantity);
          console.log('Item product image:', item.product.image);
          
          const checkoutItem = {
            product: item.product,
            quantity: item.quantity,
            price: item.product.price
          };
          console.log('Setting checkout item:', checkoutItem);
          
          setCheckoutItems([checkoutItem]);
          localStorage.removeItem('buyNowItem'); // Clean up
          console.log('Buy Now item processed successfully');
        } else if (!buyNowItem && !hasProcessedBuyNow.current) {
          console.log('No Buy Now item found, loading cart...');
          // Cart checkout
          const response = await client.get('/api/cart');
          const cartItems = response.data.items || [];
          console.log('Cart items:', cartItems);
          
          if (cartItems.length === 0) {
            console.log('Cart is empty, showing error');
            toast.error('Your cart is empty');
            navigate('/store');
            return;
          }
          
          setCheckoutItems(cartItems.map(item => ({
            product: item.product,
            quantity: item.quantity,
            price: item.price
          })));
        } else {
          console.log('Already processed buyNowItem or no action needed');
        }
      } catch (error) {
        console.error('Error loading checkout items:', error);
        
        // If there's a buyNowItem, don't redirect to store
        const buyNowItem = localStorage.getItem('buyNowItem');
        console.log('Error occurred, checking for buyNowItem:', buyNowItem);
        if (!buyNowItem) {
          toast.error('Failed to load checkout items');
          navigate('/store');
        } else {
          // Still try to process the buyNowItem even if cart loading failed
          console.log('Processing buyNowItem despite error...');
          const item = JSON.parse(buyNowItem);
          setCheckoutItems([{
            product: item.product,
            quantity: item.quantity,
            price: item.product.price
          }]);
          localStorage.removeItem('buyNowItem');
        }
      } finally {
        setLoading(false);
      }
    };
    
    console.log('CheckoutPage useEffect triggered, user:', user);
    if (user) {
      loadCheckoutItems();
    } else {
      console.log('No user, redirecting to login');
      navigate('/login');
    }
  }, [user]); // Removed navigate from dependencies
  
  // Update wholesale form when user changes
  useEffect(() => {
    if (user) {
      setShippingDetails(prev => ({
        ...prev,
        name: user.name || prev.name,
        phone: user.phone || prev.phone
      }));
    }
  }, [user]);
  
  // Validate shipping details
  const validateShippingDetails = () => {
    const newErrors = {};
    
    // Name validation
    if (!shippingDetails.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    // Phone validation (10 digits, India)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!shippingDetails.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!phoneRegex.test(shippingDetails.phone.trim())) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    }
    
    // Address validation
    if (!shippingDetails.address.trim()) {
      newErrors.address = 'Address is required';
    }
    
    // City validation
    if (!shippingDetails.city.trim()) {
      newErrors.city = 'City is required';
    }
    
    // State validation
    if (!shippingDetails.state.trim()) {
      newErrors.state = 'State is required';
    }
    
    // Pincode validation (6 digits)
    const pincodeRegex = /^[1-9][0-9]{5}$/;
    if (!shippingDetails.pincode.trim()) {
      newErrors.pincode = 'Pincode is required';
    } else if (!pincodeRegex.test(shippingDetails.pincode.trim())) {
      newErrors.pincode = 'Please enter a valid 6-digit pincode';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle input changes
  const handleInputChange = (field, value) => {
    setShippingDetails(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };
  
  // Handle payment with Razorpay
  const handlePayment = async () => {
    if (!validateShippingDetails()) {
      toast.error('Please fill the shipping details carefully');
      return;
    }
    
    if (!isWholesaleValid) {
      toast.error('Minimum order amount not met for wholesale buyers');
      return;
    }
    
    setProcessing(true);
    
    try {
      // Create Razorpay order
      const orderResponse = await client.post('/api/payments/create-order', {
        amount: total,
        currency: 'INR',
        receipt: `order_${Date.now()}`
      });
      
      const { orderId } = orderResponse.data;
      
      // Prepare order data for verification
      const orderData = {
        items: checkoutItems.map(item => ({
          productId: item.product._id,
          quantity: item.quantity,
          price: item.price
        })),
        shippingDetails,
        deliveryOption: isWholesale ? 'wholesale' : deliveryOption,
        subtotal,
        shippingCost,
        gst,
        total,
        isWholesale
      };
      
             // Initialize Razorpay
       const options = {
         key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_YOUR_KEY_ID', // Replace with your key
        amount: Math.round(total * 100), // Amount in paise
        currency: 'INR',
        name: 'Vishti Shop',
        description: 'Order Payment',
        order_id: orderId,
        handler: async function (response) {
          try {
            // Verify payment
            const verifyResponse = await client.post('/api/payments/verify-payment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderData
            });
            
            toast.success('Payment successful! Order placed successfully.');
            navigate(`/order-confirmation/${verifyResponse.data.order._id}`);
          } catch (error) {
            console.error('Payment verification failed:', error);
            toast.error('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: shippingDetails.name,
          contact: shippingDetails.phone,
          email: user?.email
        },
        theme: {
          color: '#6366f1'
        }
      };
      
      const rzp = new window.Razorpay(options);
      rzp.open();
      
    } catch (error) {
      console.error('Error initiating payment:', error);
      toast.error(error.response?.data?.message || 'Failed to initiate payment');
    } finally {
      setProcessing(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-indigo-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading checkout...</p>
        </div>
      </div>
    );
  }
  
  if (checkoutItems.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <FiShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">No items to checkout</h2>
          <p className="text-gray-600 mb-6">Your cart is empty or the checkout session has expired.</p>
          <button
            onClick={() => navigate('/store')}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all duration-200"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/store')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <FiArrowLeft className="w-5 h-5" />
              <span>Back to Store</span>
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
            <div className="w-20" /> {/* Spacer for centering */}
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Order Summary */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <FiShoppingCart className="w-5 h-5" />
                Order Summary
              </h2>
              
              {/* Items List */}
              <div className="space-y-4 mb-6">
                {checkoutItems.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl"
                  >
                    <img
                      src={item.product.image || item.product.images?.[0]}
                      alt={item.product.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 line-clamp-2">
                        {item.product.name}
                      </h3>
                      <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        ₹{(item.price * item.quantity).toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-600">₹{item.price} each</p>
                    </div>
                  </motion.div>
                ))}
              </div>
              
              {/* Price Breakdown */}
              <div className="border-t border-gray-200 pt-4 space-y-3">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toLocaleString()}</span>
                </div>
                
                {!isWholesale && (
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    <span>
                      {subtotal >= 1000 && deliveryOption === 'normal' 
                        ? 'Free' 
                        : `₹${shippingCost.toLocaleString()}`
                      }
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between text-gray-600">
                  <span>GST (18%)</span>
                  <span>₹{gst.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between text-lg font-bold text-gray-900 border-t border-gray-200 pt-3">
                  <span>Total</span>
                  <span>₹{total.toLocaleString()}</span>
                </div>
              </div>
            </div>
            
            {/* Wholesale Minimum Order Warning */}
            {isWholesale && !isWholesaleValid && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 rounded-xl p-6"
              >
                <div className="flex items-start gap-3">
                  <FiAlertCircle className="w-6 h-6 text-red-500 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-800 mb-2">Minimum Order Requirement</h3>
                    <p className="text-red-700 mb-3">
                      As a wholesale buyer, your minimum order amount is ₹{minWholesaleAmount.toLocaleString()}. 
                      Your current order total is ₹{subtotal.toLocaleString()}.
                    </p>
                    <p className="text-red-700">
                      To place smaller orders, please switch your account type to Personal Use in your profile settings.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
          
          {/* Shipping Details Form */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <FiMapPin className="w-5 h-5" />
                Shipping Details
              </h2>
              
              <form className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={shippingDetails.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                      errors.name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter your full name"
                  />
                  {errors.name && (
                    <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                      <FiAlertCircle className="w-4 h-4" />
                      {errors.name}
                    </p>
                  )}
                </div>
                
                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={shippingDetails.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className={`w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                      errors.phone ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter 10-digit phone number"
                    maxLength="10"
                  />
                  {errors.phone && (
                    <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                      <FiAlertCircle className="w-4 h-4" />
                      {errors.phone}
                    </p>
                  )}
                </div>
                
                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address *
                  </label>
                  <textarea
                    value={shippingDetails.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    rows="3"
                    className={`w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors resize-none ${
                      errors.address ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter your complete address"
                  />
                  {errors.address && (
                    <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                      <FiAlertCircle className="w-4 h-4" />
                      {errors.address}
                    </p>
                  )}
                </div>
                
                {/* City, State, Pincode */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      value={shippingDetails.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className={`w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                        errors.city ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="City"
                    />
                    {errors.city && (
                      <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                        <FiAlertCircle className="w-4 h-4" />
                        {errors.city}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State *
                    </label>
                    <input
                      type="text"
                      value={shippingDetails.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      className={`w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                        errors.state ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="State"
                    />
                    {errors.state && (
                      <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                        <FiAlertCircle className="w-4 h-4" />
                        {errors.state}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pincode *
                    </label>
                    <input
                      type="text"
                      value={shippingDetails.pincode}
                      onChange={(e) => handleInputChange('pincode', e.target.value)}
                      className={`w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                        errors.pincode ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="6-digit pincode"
                      maxLength="6"
                    />
                    {errors.pincode && (
                      <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                        <FiAlertCircle className="w-4 h-4" />
                        {errors.pincode}
                      </p>
                    )}
                  </div>
                </div>
              </form>
            </div>
            
            {/* Delivery Options */}
            {!isWholesale && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <FiTruck className="w-5 h-5" />
                  Delivery Options
                </h2>
                
                <div className="space-y-3">
                  <label className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="delivery"
                      value="normal"
                      checked={deliveryOption === 'normal'}
                      onChange={(e) => setDeliveryOption(e.target.value)}
                      className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">Normal Delivery</p>
                          <p className="text-sm text-gray-600">3-5 business days</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {subtotal >= 1000 ? 'Free' : '₹80'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </label>
                  
                  <label className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="delivery"
                      value="express"
                      checked={deliveryOption === 'express'}
                      onChange={(e) => setDeliveryOption(e.target.value)}
                      className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">Express Delivery</p>
                          <p className="text-sm text-gray-600">1-2 business days</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">₹200</p>
                        </div>
                      </div>
                    </div>
                  </label>
                </div>
                
                {subtotal >= 1000 && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800 flex items-center gap-2">
                      <FiCheckCircle className="w-4 h-4" />
                      Free normal delivery on orders above ₹1,000!
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Wholesale Shipping Note */}
            {isWholesale && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <FiPackage className="w-6 h-6 text-blue-500 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-blue-800 mb-2">Wholesale Order</h3>
                    <p className="text-blue-700">
                      Shipping charges will be communicated separately for wholesale orders. 
                      Our team will contact you to arrange delivery.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Proceed to Payment Button */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handlePayment}
              disabled={!isWholesaleValid || processing}
              className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                !isWholesaleValid || processing
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:from-indigo-700 hover:to-purple-700'
              }`}
            >
              {processing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white" />
                  Processing...
                </>
              ) : (
                <>
                  <FiCreditCard className="w-5 h-5" />
                  Proceed to Payment - ₹{total.toLocaleString()}
                </>
              )}
            </motion.button>
            
            {/* Order Summary on Mobile */}
            <div className="lg:hidden bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Order Total</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toLocaleString()}</span>
                </div>
                {!isWholesale && (
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    <span>
                      {subtotal >= 1000 && deliveryOption === 'normal' 
                        ? 'Free' 
                        : `₹${shippingCost.toLocaleString()}`
                      }
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>GST (18%)</span>
                  <span>₹{gst.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-gray-900 border-t border-gray-200 pt-2">
                  <span>Total</span>
                  <span>₹{total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}