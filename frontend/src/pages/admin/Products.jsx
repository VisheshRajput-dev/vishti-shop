import React, { useEffect, useMemo, useState } from 'react';
import client from '../../api/client';
import { toast } from 'react-toastify';

export default function Products() {
  const [categories, setCategories] = useState([]);
  const [list, setList] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [refresh, setRefresh] = useState(0);

  // Add/Edit form state
  const [form, setForm] = useState({
    name: '',
    price: '',
    colors: '',
    categoryId: '',
    categoryName: '',
    wholesalePrice: '',
    wholesaleMinQty: '',
    description: '',
    stock: 0,
    inStock: true,
    images: [], // new images to upload
    existingImages: [], // existing images from database
    deletedImages: [] // track images to be deleted
  });
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Fetch categories
  useEffect(() => {
    client.get('/api/categories')
      .then(res => setCategories(res.data))
      .catch(() => {});
  }, [refresh]);

  // Fetch products
  const loadProducts = async (p = 1) => {
    const res = await client.get(`/api/products?page=${p}&limit=20`);
    setList(res.data.items);
    setPage(res.data.page);
    setTotalPages(res.data.pages);
  };
  useEffect(() => { loadProducts(); }, [refresh]);

  // Handle deletion of existing images
  const handleImageDelete = (imageUrl) => {
    setForm(prev => ({
      ...prev,
      existingImages: prev.existingImages.filter(img => img !== imageUrl),
      deletedImages: [...prev.deletedImages, imageUrl]
    }));
  };

  // Handle removal of newly added images before upload
  const handleNewImageRemove = (index) => {
    setForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const resetForm = () => {
    setForm({
      name: '',
      price: '',
      colors: '',
      categoryId: '',
      categoryName: '',
      wholesalePrice: '',
      wholesaleMinQty: '',
      description: '',
      stock: 0,
      inStock: true,
      images: [],
      existingImages: []
    });
    setEditingId(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    
    if (type === 'file') {
      setForm(prev => ({ ...prev, images: Array.from(files) }));
      return;
    }
    
    if (type === 'checkbox') {
      setForm(prev => ({ ...prev, [name]: checked }));
      return;
    }

    // Handle category selection logic
    if (name === 'categoryId') {
      setForm(prev => ({ 
        ...prev, 
        categoryId: value,
        categoryName: value ? '' : prev.categoryName // Clear categoryName if categoryId is selected
      }));
      return;
    }

    if (name === 'categoryName') {
      setForm(prev => ({ 
        ...prev, 
        categoryName: value,
        categoryId: value ? '' : prev.categoryId // Clear categoryId if categoryName is typed
      }));
      return;
    }

    setForm(prev => ({ ...prev, [name]: value }));
  };

  // Remove existing image
  const removeExistingImage = (imageUrl) => {
    setForm(prev => ({
      ...prev,
      existingImages: prev.existingImages.filter(img => img !== imageUrl)
    }));
  };

  // Remove new image
  const removeNewImage = (index) => {
    setForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  // Create or Update
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price) {
      toast.error('Name and Price are required');
      return;
    }

    // Validate category selection
    if (!form.categoryId && !form.categoryName) {
      toast.error('Please select a category or create a new one');
      return;
    }

    const fd = new FormData();
    fd.append('name', form.name);
    fd.append('price', form.price);
    fd.append('colors', form.colors);
    fd.append('wholesalePrice', form.wholesalePrice);
    fd.append('wholesaleMinQty', form.wholesaleMinQty);
    fd.append('description', form.description);
    fd.append('stock', form.stock);
    fd.append('inStock', form.inStock ? 'true' : 'false');

    // category: either pick existing (categoryId) or create new (categoryName)
    if (form.categoryId) fd.append('categoryId', form.categoryId);
    if (form.categoryName) fd.append('categoryName', form.categoryName);

    // images (for create) or newImages (for update)
    const imagesKey = editingId ? 'newImages' : 'images';
    
    // Check file sizes before uploading
    const maxSize = 50 * 1024 * 1024; // 50MB
    for (const file of form.images) {
      if (file.size > maxSize) {
        toast.error(`Image "${file.name}" is too large. Please upload images smaller than 50MB.`);
        return;
      }
    }
    
    form.images.forEach(f => fd.append(imagesKey, f));

    // For edit: add existing images that weren't removed
    if (editingId && form.existingImages.length > 0) {
      fd.append('existingImages', JSON.stringify(form.existingImages));
      fd.append('deletedImages', JSON.stringify(form.deletedImages));
    }

    try {
      setUploading(true);
      if (editingId) {
        await client.put(`/api/products/${editingId}`, fd, { 
          headers: { 'Content-Type': 'multipart/form-data' } 
        });
        toast.success('Product updated');
      } else {
        await client.post('/api/products', fd, { 
          headers: { 'Content-Type': 'multipart/form-data' } 
        });
        toast.success('Product added');
      }
      resetForm();
      setRefresh(v => v + 1);
      await loadProducts(page);
    } catch (e1) {
      console.error('Error:', e1);
      toast.error(e1?.response?.data?.message || 'Error saving product');
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item._id);
    setForm({
      name: item.name || '',
      price: item.price || '',
      colors: (item.colors || []).join(', '),
      categoryId: item.category?._id || '',
      categoryName: '',
      wholesalePrice: item.wholesalePrice || '',
      wholesaleMinQty: item.wholesaleMinQty || '',
      description: item.description || '',
      stock: item.stock || 0,
      inStock: !!item.inStock,
      images: [], // new images can be appended
      existingImages: item.images || [], // existing images from database
      deletedImages: [] // reset deleted images when editing
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return;
    try {
      await client.delete(`/api/products/${id}`);
      toast.success('Deleted');
      setRefresh(v => v + 1);
    } catch {
      toast.error('Delete failed');
    }
  };

  // Image previews for new images
  const imagePreviews = useMemo(() => 
    form.images.map(f => URL.createObjectURL(f)), 
    [form.images]
  );

  // Cleanup image previews
  useEffect(() => {
    return () => {
      imagePreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);

  return (
    <div className="space-y-8">
      {/* Add / Edit Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">
          {editingId ? 'Edit Product' : 'Add Product'}
        </h2>
        
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Item Name *</label>
            <input 
              name="name" 
              value={form.name} 
              onChange={handleChange} 
              className="input" 
              placeholder="e.g. Banarasi Silk Saree" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Price (₹) *</label>
            <input 
              name="price" 
              type="number" 
              value={form.price} 
              onChange={handleChange} 
              className="input" 
              placeholder="e.g. 1499" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Available Colors (comma separated)</label>
            <input 
              name="colors" 
              value={form.colors} 
              onChange={handleChange} 
              className="input" 
              placeholder="Red, Blue, Green" 
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium mb-1">Wholesale Price (₹)</label>
              <input 
                name="wholesalePrice" 
                type="number" 
                value={form.wholesalePrice} 
                onChange={handleChange} 
                className="input" 
                placeholder="e.g. 999" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Wholesale Min Qty</label>
              <input 
                name="wholesaleMinQty" 
                type="number" 
                value={form.wholesaleMinQty} 
                onChange={handleChange} 
                className="input" 
                placeholder="e.g. 10" 
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea 
              name="description" 
              value={form.description} 
              onChange={handleChange} 
              className="input" 
              rows={3} 
              placeholder="Product details..." 
            />
          </div>

          {/* Category selector */}
          <div>
            <label className="block text-sm font-medium mb-1">Category (pick existing)</label>
            <select 
              name="categoryId" 
              value={form.categoryId} 
              onChange={handleChange} 
              className="input"
              disabled={!!form.categoryName} // Disable if new category is being typed
            >
              <option value="">— Select —</option>
              {categories.map(c => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
            {form.categoryName && (
              <p className="text-xs text-blue-600 mt-1">New category mode active</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">New Category (optional)</label>
            <input 
              name="categoryName" 
              value={form.categoryName} 
              onChange={handleChange} 
              className="input" 
              placeholder="e.g. Sarees"
              disabled={!!form.categoryId} // Disable if existing category is selected
            />
            {form.categoryId && (
              <p className="text-xs text-blue-600 mt-1">Existing category mode active</p>
            )}
          </div>

          {/* Stock / InStock */}
          <div>
            <label className="block text-sm font-medium mb-1">Total Available Pieces</label>
            <input 
              name="stock" 
              type="number" 
              value={form.stock} 
              onChange={handleChange} 
              className="input" 
              placeholder="e.g. 25" 
            />
          </div>

          <div className="flex items-center gap-3">
            <input 
              id="inStock" 
              type="checkbox" 
              name="inStock" 
              checked={form.inStock} 
              onChange={handleChange} 
              className="h-4 w-4" 
            />
            <label htmlFor="inStock" className="text-sm font-medium">In Stock</label>
          </div>

          {/* Existing Images (for edit mode) */}
          {editingId && form.existingImages.length > 0 && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Current Images</label>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {form.existingImages.map((imageUrl, index) => (
                  <div key={index} className="relative group">
                    <img 
                      src={imageUrl} 
                      alt={`Product ${index + 1}`} 
                      className="h-24 w-24 object-cover rounded border"
                    />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(imageUrl)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove image"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Click the × button to remove images. Removed images will be deleted from Cloudinary.
              </p>
            </div>
          )}

          {/* New Images Upload */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">
              {editingId ? 'Add New Images' : 'Upload Images'}
            </label>
            <input 
              type="file" 
              name="images" 
              multiple 
              accept="image/*" 
              onChange={handleChange} 
              className="input" 
            />
            
            {/* Preview of new images */}
            {imagePreviews.length > 0 && (
              <div className="mt-3">
                <label className="block text-sm font-medium mb-2">New Images Preview</label>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {imagePreviews.map((src, i) => (
                    <div key={i} className="relative group">
                      <img 
                        src={src} 
                        alt="preview" 
                        className="h-24 w-24 object-cover rounded border"
                      />
                      <button
                        type="button"
                        onClick={() => removeNewImage(i)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove image"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="md:col-span-2 flex gap-3">
            <button 
              disabled={uploading} 
              type="submit" 
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded disabled:opacity-50"
            >
              {uploading ? (editingId ? 'Updating...' : 'Saving...') : (editingId ? 'Update Product' : 'Add Product')}
            </button>
            {editingId && (
              <button 
                type="button" 
                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 rounded" 
                onClick={resetForm}
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Product List */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Product List</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">Image</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">Price</th>
                <th className="py-2 pr-4">Stock</th>
                <th className="py-2 pr-4">In Stock</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map(p => (
                <tr key={p._id} className="border-b">
                  <td className="py-2 pr-4">
                    {p.images?.[0] ? (
                      <img src={p.images[0]} className="h-12 w-12 object-cover rounded" alt={p.name} />
                    ) : '-'}
                  </td>
                  <td className="py-2 pr-4">{p.name}</td>
                  <td className="py-2 pr-4">{p.category?.name || '-'}</td>
                  <td className="py-2 pr-4">₹{p.price}</td>
                  <td className="py-2 pr-4">{p.stock}</td>
                  <td className="py-2 pr-4">{p.inStock ? 'Yes' : 'No'}</td>
                  <td className="py-2 pr-4 flex gap-2">
                    <button 
                      onClick={() => handleEdit(p)} 
                      className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(p._id)} 
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td className="py-4" colSpan={7}>No products yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex items-center gap-3">
          <button 
            disabled={page <= 1} 
            onClick={() => { loadProducts(page - 1); }} 
            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
          >
            Prev
          </button>
          <span>Page {page} / {totalPages}</span>
          <button 
            disabled={page >= totalPages} 
            onClick={() => { loadProducts(page + 1); }} 
            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
