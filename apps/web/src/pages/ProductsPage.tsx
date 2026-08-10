import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/common/Badge';
import { AlertTriangleIcon, PlusIcon, SearchIcon } from '../components/common/Icons';
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

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

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
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, {
          name: formData.name,
          category: formData.category,
          unitPrice: parseFloat(formData.unitPrice),
          minimumStockAlertQuantity: Number(formData.minimumStockAlertQuantity),
          warehouseLocation: formData.warehouseLocation,
        });
        showToast('Product master updated successfully!', 'success');
        setEditingProduct(null);
      } else {
        await api.post('/products', {
          ...formData,
          unitPrice: parseFloat(formData.unitPrice),
          initialStock: Number(formData.initialStock),
          minimumStockAlertQuantity: Number(formData.minimumStockAlertQuantity),
        });
        showToast('New product added to catalog!', 'success');
        setIsCreateOpen(false);
      }
      loadProducts();
    } catch (error: any) {
      showToast(error.message || 'Failed to save product.', 'error');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="action-bar">
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
            Product Catalog
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Master inventory items, SKU codes, pricing, and restock alert levels
          </p>
        </div>

        {hasRole('ADMIN', 'WAREHOUSE') && (
          <button className="btn btn-primary" onClick={handleOpenCreate}>
            <PlusIcon size={18} />
            <span>Add Product</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-input-wrapper" style={{ minWidth: '260px' }}>
            <SearchIcon className="search-icon" size={16} />
            <input
              type="text"
              className="form-input"
              placeholder="Search by SKU, product name, or warehouse location..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              type="button"
              className={`btn btn-sm ${lowStockOnly ? 'btn-danger' : 'btn-secondary'}`}
              onClick={() => {
                setLowStockOnly(!lowStockOnly);
                setPage(1);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <AlertTriangleIcon size={16} />
              <span>Low Stock Alerts Only</span>
            </button>
          </div>
        </div>
      </div>

      {/* Product Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Product Details</th>
              <th>SKU Code</th>
              <th>Category</th>
              <th>Unit Price</th>
              <th>Stock Status</th>
              <th>Warehouse Bay</th>
              {hasRole('ADMIN', 'WAREHOUSE') && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  Loading product catalog...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No products found.
                </td>
              </tr>
            ) : (
              products.map((p) => {
                const isLow = p.currentStock <= p.minimumStockAlertQuantity;
                return (
                  <tr key={p.id}>
                    <td>
                      <strong style={{ color: '#fff', fontSize: '0.95rem' }}>{p.name}</strong>
                    </td>
                    <td>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--text-accent)',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          background: 'rgba(99, 102, 241, 0.1)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        {p.sku}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--text-secondary)' }}>{p.category}</span>
                    </td>
                    <td>
                      <strong style={{ color: '#fff' }}>
                        ${Number(p.unitPrice).toFixed(2)}
                      </strong>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <span style={{ fontWeight: 800, fontSize: '1rem', color: isLow ? '#f87171' : '#34d399' }}>
                          {p.currentStock}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          (min: {p.minimumStockAlertQuantity})
                        </span>
                        <Badge type="stock" value={isLow ? 'LOW' : 'IN_STOCK'} />
                      </div>
                    </td>
                    <td>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        📍 {p.warehouseLocation}
                      </span>
                    </td>
                    {hasRole('ADMIN', 'WAREHOUSE') && (
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleOpenEdit(p)}>
                          Edit Master
                        </button>
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
        title={editingProduct ? `Edit ${editingProduct.name}` : 'Add Master Product'}
        size="lg"
      >
        <form onSubmit={handleSaveProduct}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Product Name *</label>
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
              <label className="form-label">SKU / Item Code *</label>
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
              <label className="form-label">Category *</label>
              <input
                type="text"
                className="form-input"
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g. Peripherals, Electronics, Storage"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Unit Price ($ USD) *</label>
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
                <label className="form-label">Initial Stock Quantity *</label>
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
              <label className="form-label">Minimum Stock Alert Threshold *</label>
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
            <label className="form-label">Warehouse Bay / Rack Location *</label>
            <input
              type="text"
              className="form-input"
              required
              value={formData.warehouseLocation}
              onChange={(e) => setFormData({ ...formData, warehouseLocation: e.target.value })}
              placeholder="e.g. Warehouse A - Rack 04 - Shelf B"
            />
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setIsCreateOpen(false);
                setEditingProduct(null);
              }}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingProduct ? 'Update Product' : 'Create Product'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
