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

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

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
        showToast('Product updated.', 'success');
        setEditingProduct(null);
      } else {
        await api.post('/products', {
          ...formData,
          unitPrice: parseFloat(formData.unitPrice),
          initialStock: Number(formData.initialStock),
          minimumStockAlertQuantity: Number(formData.minimumStockAlertQuantity),
        });
        showToast('Product added.', 'success');
        setIsCreateOpen(false);
      }
      loadProducts();
    } catch (error: any) {
      showToast(error.message || 'Failed to save product.', 'error');
    }
  };

  return (
    <div>
      <div className="action-bar">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">Catalog, pricing, and stock alert levels</p>
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
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  Loading...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
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
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</span>
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
                        <button className="btn btn-secondary btn-sm row-actions" onClick={() => handleOpenEdit(p)}>
                          Edit
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
        title={editingProduct ? `Edit ${editingProduct.name}` : 'Add product'}
        size="lg"
      >
        <form onSubmit={handleSaveProduct}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <div className="form-group">
              <label className="form-label">Product name</label>
              <input
                type="text"
                className="form-input"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Wireless Ergonomic Mouse"
              />
            </div>

            <div className="form-group">
              <label className="form-label">SKU code</label>
              <input
                type="text"
                className="form-input"
                required
                disabled={!!editingProduct}
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                placeholder="SKU-WEM-001"
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
                placeholder="Peripherals, Electronics, Storage"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Unit price ($)</label>
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
                <label className="form-label">Initial stock quantity</label>
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
              <label className="form-label">Minimum stock alert</label>
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
            <label className="form-label">Warehouse location</label>
            <input
              type="text"
              className="form-input"
              required
              value={formData.warehouseLocation}
              onChange={(e) => setFormData({ ...formData, warehouseLocation: e.target.value })}
              placeholder="Warehouse A - Rack 04 - Shelf B"
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
              {editingProduct ? 'Update product' : 'Add product'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
