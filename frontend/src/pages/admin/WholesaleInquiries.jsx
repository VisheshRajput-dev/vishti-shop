import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiMail, FiClock, FiCheckCircle, FiEye, FiUser, FiPhone, FiPackage } from 'react-icons/fi';
import client from '../../api/client';
import { toast } from 'react-toastify';

export default function WholesaleInquiries() {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchInquiries();
  }, []);

  const fetchInquiries = async () => {
    try {
      setLoading(true);
      const response = await client.get('/api/wholesale-inquiries');
      setInquiries(response.data);
    } catch (error) {
      console.error('Error fetching inquiries:', error);
      toast.error('Failed to load inquiries');
    } finally {
      setLoading(false);
    }
  };

  const updateInquiryStatus = async (inquiryId, status) => {
    try {
      await client.put(`/api/wholesale-inquiries/${inquiryId}/status`, { status });
      toast.success(`Inquiry marked as ${status}`);
      fetchInquiries(); // Refresh the list
    } catch (error) {
      console.error('Error updating inquiry:', error);
      toast.error('Failed to update inquiry status');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    if (status === 'resolved') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <FiCheckCircle className="w-3 h-3 mr-1" />
          Resolved
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        <FiClock className="w-3 h-3 mr-1" />
        Pending
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Wholesale Inquiries</h1>
            <p className="text-gray-600 mt-1">Manage customer wholesale inquiries</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-bold text-indigo-600">{inquiries.length}</div>
              <div className="text-sm text-gray-600">Total Inquiries</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-yellow-600">
                {inquiries.filter(i => i.status === 'pending').length}
              </div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
          </div>
        </div>
      </div>

      {/* Inquiries List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">All Inquiries</h2>
        </div>
        
        {inquiries.length === 0 ? (
          <div className="p-12 text-center">
            <FiMail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No inquiries yet</h3>
            <p className="text-gray-600">Wholesale inquiries will appear here when customers submit them.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {inquiries.map((inquiry) => (
              <motion.div
                key={inquiry._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {inquiry.name}
                      </h3>
                      {getStatusBadge(inquiry.status)}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <FiMail className="w-4 h-4" />
                        <span className="text-sm">{inquiry.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <FiPhone className="w-4 h-4" />
                        <span className="text-sm">{inquiry.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <FiPackage className="w-4 h-4" />
                        <span className="text-sm">Qty: {inquiry.quantity}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <FiClock className="w-4 h-4" />
                        <span className="text-sm">{formatDate(inquiry.createdAt)}</span>
                      </div>
                    </div>

                    {inquiry.productId && (
                      <div className="bg-gray-50 rounded-lg p-3 mb-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={inquiry.productId.images?.[0]}
                            alt={inquiry.productId.name}
                            className="w-12 h-12 object-cover rounded-lg"
                          />
                          <div>
                            <p className="font-medium text-gray-900">{inquiry.productId.name}</p>
                            <p className="text-sm text-gray-600">Product Inquiry</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-sm text-gray-700">{inquiry.message}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => {
                        setSelectedInquiry(inquiry);
                        setShowModal(true);
                      }}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <FiEye className="w-4 h-4" />
                    </button>
                    
                    {inquiry.status === 'pending' && (
                      <button
                        onClick={() => updateInquiryStatus(inquiry._id, 'resolved')}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Mark Resolved
                      </button>
                    )}
                    
                    {inquiry.status === 'resolved' && (
                      <button
                        onClick={() => updateInquiryStatus(inquiry._id, 'pending')}
                        className="px-3 py-1 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 transition-colors"
                      >
                        Mark Pending
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Inquiry Detail Modal */}
      {showModal && selectedInquiry && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Inquiry Details</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Customer Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Customer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <p className="text-gray-900">{selectedInquiry.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <p className="text-gray-900">{selectedInquiry.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <p className="text-gray-900">{selectedInquiry.phone}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <p className="text-gray-900">{selectedInquiry.quantity}</p>
                  </div>
                </div>
              </div>

              {/* Product Info */}
              {selectedInquiry.productId && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Product Information</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-4">
                      <img
                        src={selectedInquiry.productId.images?.[0]}
                        alt={selectedInquiry.productId.name}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      <div>
                        <h4 className="font-medium text-gray-900">{selectedInquiry.productId.name}</h4>
                        <p className="text-sm text-gray-600">Product ID: {selectedInquiry.productId._id}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Message */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Message</h3>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedInquiry.message}</p>
                </div>
              </div>

              {/* Timestamps */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Timeline</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FiClock className="w-4 h-4" />
                    <span>Submitted: {formatDate(selectedInquiry.createdAt)}</span>
                  </div>
                  {selectedInquiry.resolvedAt && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FiCheckCircle className="w-4 h-4" />
                      <span>Resolved: {formatDate(selectedInquiry.resolvedAt)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                {selectedInquiry.status === 'pending' ? (
                  <button
                    onClick={() => {
                      updateInquiryStatus(selectedInquiry._id, 'resolved');
                      setShowModal(false);
                    }}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Mark as Resolved
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      updateInquiryStatus(selectedInquiry._id, 'pending');
                      setShowModal(false);
                    }}
                    className="flex-1 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
                  >
                    Mark as Pending
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
