import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/common/Badge';
import { AlertTriangleIcon, PlusIcon, SearchIcon, TrashIcon } from '../components/common/Icons';
import { Modal } from '../components/common/Modal';
import { Pagination } from '../components/common/Pagination';
import type { PaginatedResponse, Product } from '../types';

export const ProductsPage: React.FC = () => {
  const { hasRole } = useAuth();
  const { showToast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    unitPrice: '',
    initialStock: 0,
    minimumStockAlertQuantity: 5,
    warehouseLocation: '',
  });

  // Image Upload State
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get<PaginatedResponse<Product>>('/products', {
        params: {
          search: search || undefined,
          category: categoryFilter || undefined,
          lowStock: lowStockOnly ? 'true' : undefined,
          page,
          limit: 10,
        },
      });
      setProducts(res.data);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } catch (error: any) {
      showToast(error.message || 'Failed to load products.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts();
    }, 200);
    return () => clearTimeout(timer);
  }, [search, categoryFilter, lowStockOnly, page]);

  const handleOpenCreate = () => {
    setFormData({
      name: '',
      sku: '',
      category: '',
      unitPrice: '',
      initialStock: 0,
      minimumStockAlertQuantity: 5,
      warehouseLocation: '',
    });
    setSelectedImageFile(null);
    setImagePreviewUrl(null);
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      category: product.category,
      unitPrice: String(product.unitPrice),
      initialStock: product.currentStock,
      minimumStockAlertQuantity: product.minimumStockAlertQuantity,
      warehouseLocation: product.warehouseLocation,
    });
    setSelectedImageFile(null);
    setImagePreviewUrl(product.imageUrl || null);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image file exceeds the 5MB size limit. Please choose a smaller file.', 'error');
      return;
    }

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast('Invalid file format. Only JPG, PNG, and WebP images are allowed.', 'error');
      return;
    }

    setSelectedImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveExistingImage = async () => {
    if (editingProduct && editingProduct.imageUrl) {
      try {
        await api.delete(`/products/${editingProduct.id}/image`);
        showToast('Product image removed.', 'success');
        setEditingProduct({ ...editingProduct, imageUrl: null });
        setImagePreviewUrl(null);
        setSelectedImageFile(null);
        loadProducts();
      } catch (error: any) {
        showToast(error.message || 'Failed to remove image.', 'error');
      }
    } else {
      setSelectedImageFile(null);
      setImagePreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingProduct) {
        // 1. Update product fields
        await api.put(`/products/${editingProduct.id}`, {
          name: formData.name,
          category: formData.category,
          unitPrice: parseFloat(formData.unitPrice),
          minimumStockAlertQuantity: Number(formData.minimumStockAlertQuantity),
          warehouseLocation: formData.warehouseLocation,
        });

        // 2. If a new image was selected, upload it
        if (selectedImageFile) {
          const uploadData = new FormData();
          uploadData.append('image', selectedImageFile);
          await api.upload(`/products/${editingProduct.id}/image`, uploadData);
        }

        showToast('Product updated successfully.', 'success');
        setEditingProduct(null);
      } else {
        // 1. Create product record
        const res = await api.post<{ product: Product }>('/products', {
          ...formData,
          unitPrice: parseFloat(formData.unitPrice),
          initialStock: Number(formData.initialStock),
          minimumStockAlertQuantity: Number(formData.minimumStockAlertQuantity),
        });

        // 2. If an image was attached, upload it to S3
        if (selectedImageFile && res.product?.id) {
          const uploadData = new FormData();
          uploadData.append('image', selectedImageFile);
          await api.upload(`/products/${res.product.id}/image`, uploadData);
        }

        showToast('Product created successfully with image.', 'success');
        setIsCreateOpen(false);
      }

      loadProducts();
    } catch (error: any) {
      showToast(error.message || 'Failed to save product.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (p: Product) => {
    if (!window.confirm(`Are you sure you want to delete product "${p.name}" (${p.sku})?`)) {
      return;
    }

    try {
      await api.delete(`/products/${p.id}`);
      showToast(`Product ${p.name} deleted.`, 'success');
      loadProducts();
    } catch (error: any) {
      showToast(error.message || 'Failed to delete product.', 'error');
    }
  };

  return (
    <div>
      <div className="action-bar">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">Catalog, S3 product images, pricing, and stock alert levels</p>
        </div>

        {hasRole('ADMIN', 'WAREHOUSE') && (
          <button className="btn btn-primary" onClick={handleOpenCreate}>
            <PlusIcon size={16} />
            <span>Add product</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <SearchIcon className="search-icon" size={15} />
          <input
            type="text"
            className="form-input"
            placeholder="Search by SKU, name, or location"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <button
          type="button"
          className={`filter-toggle ${lowStockOnly ? 'active' : ''}`}
          onClick={() => {
            setLowStockOnly(!lowStockOnly);
            setPage(1);
          }}
          style={{ color: lowStockOnly ? 'var(--warning-text)' : undefined }}
        >
          <AlertTriangleIcon size={14} />
          <span>Low stock only</span>
        </button>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '48px' }}>Image</th>
              <th>Product</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Unit price</th>
              <th>Stock</th>
              <th>Location</th>
              {hasRole('ADMIN', 'WAREHOUSE') && <th></th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  Loading product catalog...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  {search || lowStockOnly
                    ? 'No products match the current filters.'
                    : 'No products yet. Add your first product to start building the catalog.'}
                </td>
              </tr>
            ) : (
              products.map((p) => {
                const isLow = p.currentStock <= p.minimumStockAlertQuantity;
                return (
                  <tr key={p.id}>
                    <td>
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          style={{
                            width: '38px',
                            height: '38px',
                            objectFit: 'cover',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border)',
                            background: 'var(--bg-secondary)',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px dashed var(--border)',
                            background: 'var(--bg-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'var(--text-muted)',
                          }}
                        >
                          {p.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                        {p.name}
                      </span>
                    </td>
                    <td>
                      <span className="mono" style={{ color: 'var(--accent)', fontWeight: 500 }}>
                        {p.sku}
                      </span>
                    </td>
                    <td>{p.category}</td>
                    <td>
                      <span className="tabular" style={{ fontWeight: 600 }}>
                        ${Number(p.unitPrice).toFixed(2)}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="tabular" style={{ fontWeight: 600, color: isLow ? 'var(--danger-text)' : 'var(--text-primary)' }}>
                          {p.currentStock}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          min: {p.minimumStockAlertQuantity}
                        </span>
                        <Badge type="stock" value={isLow ? 'LOW' : 'IN_STOCK'} />
                      </div>
                    </td>
                    <td>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                        {p.warehouseLocation}
                      </span>
                    </td>
                    {hasRole('ADMIN', 'WAREHOUSE') && (
                      <td>
                        <div className="row-actions" style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenEdit(p)}
                          >
                            Edit
                          </button>

                          {hasRole('ADMIN') && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-icon"
                              title="Delete product"
                              onClick={() => handleDeleteProduct(p)}
                              style={{ color: 'var(--danger-text)' }}
                            >
                              <TrashIcon size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={total}
        onPageChange={(p) => setPage(p)}
      />

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isCreateOpen || !!editingProduct}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingProduct(null);
        }}
        title={editingProduct ? `Edit Product: ${editingProduct.name}` : 'Add New Product'}
        size="lg"
      >
        <form onSubmit={handleSaveProduct}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <div className="form-group">
              <label className="form-label">Product Name</label>
              <input
                type="text"
                className="form-input"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Wireless Ergonomic Mouse"
              />
            </div>

            <div className="form-group">
              <label className="form-label">SKU Code</label>
              <input
                type="text"
                className="form-input"
                required
                disabled={!!editingProduct}
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                placeholder="e.g. SKU-WEM-001"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Category</label>
              <input
                type="text"
                className="form-input"
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Peripherals, Storage, Accessories"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Unit Price ($)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="form-input"
                required
                value={formData.unitPrice}
                onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                placeholder="49.99"
              />
            </div>

            {!editingProduct && (
              <div className="form-group">
                <label className="form-label">Initial Stock Quantity</label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  required
                  value={formData.initialStock}
                  onChange={(e) => setFormData({ ...formData, initialStock: Number(e.target.value) })}
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Minimum Stock Alert</label>
              <input
                type="number"
                min="0"
                className="form-input"
                required
                value={formData.minimumStockAlertQuantity}
                onChange={(e) => setFormData({ ...formData, minimumStockAlertQuantity: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Warehouse Location</label>
            <input
              type="text"
              className="form-input"
              required
              value={formData.warehouseLocation}
              onChange={(e) => setFormData({ ...formData, warehouseLocation: e.target.value })}
              placeholder="Warehouse A - Rack 04 - Shelf B"
            />
          </div>

          {/* S3 Product Image Upload Section */}
          <div className="form-group" style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Product Image (AWS S3)</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>JPG, PNG, WebP (Max 5MB)</span>
            </label>

            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              {imagePreviewUrl ? (
                <div style={{ position: 'relative' }}>
                  <img
                    src={imagePreviewUrl}
                    alt="Preview"
                    style={{
                      width: '72px',
                      height: '72px',
                      objectFit: 'cover',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleRemoveExistingImage}
                    title="Remove image"
                    style={{
                      position: 'absolute',
                      top: '-6px',
                      right: '-6px',
                      background: 'var(--danger)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'grid',
                      placeItems: 'center',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    }}
                  >
                    &times;
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px dashed var(--border)',
                    background: 'var(--bg-secondary)',
                    display: 'grid',
                    placeItems: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '11px',
                    textAlign: 'center',
                    padding: '4px',
                  }}
                >
                  No Image
                </div>
              )}

              <div style={{ flex: 1 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageFileChange}
                  style={{ fontSize: '13px' }}
                />
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', margin: 0 }}>
                  Uploaded files are stored in your secure AWS S3 bucket with short-lived presigned URLs.
                </p>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setIsCreateOpen(false);
                setEditingProduct(null);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting
                ? 'Saving...'
                : editingProduct
                  ? 'Update Product'
                  : 'Add Product'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
