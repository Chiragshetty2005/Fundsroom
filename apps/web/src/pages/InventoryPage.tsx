import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/common/Badge';
import { PlusIcon } from '../components/common/Icons';
import { Modal } from '../components/common/Modal';
import { Pagination } from '../components/common/Pagination';
import type { PaginatedResponse, Product, StockMovement, StockMovementType } from '../types';

export const InventoryPage: React.FC = () => {
  const { hasRole } = useAuth();
  const { showToast } = useToast();

  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>('');

  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [adjustData, setAdjustData] = useState({
    productId: '',
    quantity: 1,
    type: 'IN' as StockMovementType,
    reason: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const loadMovements = async () => {
    setLoading(true);
    try {
      const res = await api.get<PaginatedResponse<StockMovement>>('/inventory/movements', {
        params: {
          type: typeFilter || undefined,
          page,
          limit: 15,
        },
      });
      setMovements(res.data);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } catch (error: any) {
      showToast(error.message || 'Failed to load stock movements.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadProductOptions = async () => {
    try {
      const res = await api.get<PaginatedResponse<Product>>('/products?limit=100');
      setProducts(res.data);
      if (res.data.length > 0 && !adjustData.productId) {
        setAdjustData((prev) => ({ ...prev, productId: res.data[0].id }));
      }
    } catch (error) {
      console.error('Failed to load products for adjustment modal:', error);
    }
  };

  useEffect(() => {
    loadMovements();
  }, [typeFilter, page]);

  useEffect(() => {
    loadProductOptions();
  }, []);

  const handleOpenAdjust = () => {
    if (products.length > 0) {
      setAdjustData({
        productId: products[0].id,
        quantity: 1,
        type: 'IN',
        reason: '',
      });
    }
    setIsAdjustOpen(true);
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustData.reason.trim() || adjustData.reason.trim().length < 3) {
      showToast('Provide a specific adjustment reason (minimum 3 characters).', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/inventory/adjust', {
        productId: adjustData.productId,
        quantity: Number(adjustData.quantity),
        type: adjustData.type,
        reason: adjustData.reason.trim(),
      });
      showToast('Stock adjusted and movement logged.', 'success');
      setIsAdjustOpen(false);
      loadMovements();
      loadProductOptions();
    } catch (error: any) {
      showToast(error.message || 'Stock adjustment failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="action-bar">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">Stock movement ledger and manual adjustments</p>
        </div>

        {hasRole('ADMIN', 'WAREHOUSE') && (
          <button className="btn btn-primary" onClick={handleOpenAdjust}>
            <PlusIcon size={16} />
            <span>Adjust stock</span>
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="filter-bar">
        <button
          type="button"
          className={`filter-toggle ${!typeFilter ? 'active' : ''}`}
          onClick={() => { setTypeFilter(''); setPage(1); }}
        >
          All
        </button>
        <button
          type="button"
          className={`filter-toggle ${typeFilter === 'IN' ? 'active' : ''}`}
          onClick={() => { setTypeFilter('IN'); setPage(1); }}
          style={{ color: typeFilter === 'IN' ? 'var(--success-text)' : undefined }}
        >
          IN
        </button>
        <button
          type="button"
          className={`filter-toggle ${typeFilter === 'OUT' ? 'active' : ''}`}
          onClick={() => { setTypeFilter('OUT'); setPage(1); }}
          style={{ color: typeFilter === 'OUT' ? 'var(--danger-text)' : undefined }}
        >
          OUT
        </button>
      </div>

      {/* Movement Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Product</th>
              <th>Type</th>
              <th>Qty</th>
              <th>Recorded by</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  Loading...
                </td>
              </tr>
            ) : movements.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  {typeFilter
                    ? `No ${typeFilter} movements found.`
                    : 'No stock movements recorded yet. Use "Adjust stock" to log the first entry.'}
                </td>
              </tr>
            ) : (
              movements.map((m) => (
                <tr key={m.id}>
                  <td>
                    <span className="tabular" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {new Date(m.createdAt).toLocaleString()}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>
                      {m.product?.name}
                    </div>
                    <span className="mono" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {m.product?.sku}
                    </span>
                  </td>
                  <td>
                    <Badge type="movement" value={m.type} />
                  </td>
                  <td>
                    <span
                      className="tabular"
                      style={{
                        fontWeight: 600,
                        color: m.type === 'IN' ? 'var(--success-text)' : 'var(--danger-text)',
                      }}
                    >
                      {m.type === 'IN' ? '+' : '-'}{m.quantity}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: '13px' }}>{m.createdBy?.name}</div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {m.createdBy?.email}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: '13px' }}>{m.reason}</div>
                    {m.challan && (
                      <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 500 }}>
                        Linked to #{m.challan.challanNumber}
                      </span>
                    )}
                  </td>
                </tr>
              ))
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

      {/* Manual Stock Adjustment Modal */}
      <Modal
        isOpen={isAdjustOpen}
        onClose={() => setIsAdjustOpen(false)}
        title="Adjust stock"
      >
        <form onSubmit={handleSaveAdjustment}>
          <div className="form-group">
            <label className="form-label">Product</label>
            <select
              className="form-select"
              required
              value={adjustData.productId}
              onChange={(e) => setAdjustData({ ...adjustData, productId: e.target.value })}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku}) — {p.currentStock} in stock
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <div className="form-group">
              <label className="form-label">Direction</label>
              <select
                className="form-select"
                value={adjustData.type}
                onChange={(e) => setAdjustData({ ...adjustData, type: e.target.value as StockMovementType })}
              >
                <option value="IN">IN (restock)</option>
                <option value="OUT">OUT (write-off / correction)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Quantity</label>
              <input
                type="number"
                min="1"
                className="form-input"
                required
                value={adjustData.quantity}
                onChange={(e) => setAdjustData({ ...adjustData, quantity: Math.max(1, Number(e.target.value)) })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Reason</label>
            <textarea
              className="form-textarea"
              required
              rows={3}
              value={adjustData.reason}
              onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
              placeholder="Received shipment from supplier / Damaged during transit / Physical count correction"
            />
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsAdjustOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Applying...' : 'Apply adjustment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
