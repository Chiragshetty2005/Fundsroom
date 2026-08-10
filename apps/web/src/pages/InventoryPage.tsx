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

  // Adjustment Modal
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
      showToast('Please provide a specific adjustment reason (min 3 chars).', 'error');
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
      showToast('Inventory adjusted & audit movement logged!', 'success');
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
      {/* Action Header */}
      <div className="action-bar">
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
            Stock Movement Ledger
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Complete auditable ledger of all inventory intake, write-offs, and sales deductions
          </p>
        </div>

        {hasRole('ADMIN', 'WAREHOUSE') && (
          <button className="btn btn-primary" onClick={handleOpenAdjust}>
            <PlusIcon size={18} />
            <span>Manual Stock Adjustment</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            type="button"
            className={`btn btn-sm ${!typeFilter ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              setTypeFilter('');
              setPage(1);
            }}
          >
            All Movements
          </button>
          <button
            type="button"
            className={`btn btn-sm ${typeFilter === 'IN' ? 'btn-success' : 'btn-secondary'}`}
            onClick={() => {
              setTypeFilter('IN');
              setPage(1);
            }}
          >
            + IN Movements
          </button>
          <button
            type="button"
            className={`btn btn-sm ${typeFilter === 'OUT' ? 'btn-danger' : 'btn-secondary'}`}
            onClick={() => {
              setTypeFilter('OUT');
              setPage(1);
            }}
          >
            - OUT Movements
          </button>
        </div>
      </div>

      {/* Movement Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Product & SKU</th>
              <th>Type</th>
              <th>Quantity</th>
              <th>Recorded By</th>
              <th>Reason / Linked Challan</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  Loading stock movement audit history...
                </td>
              </tr>
            ) : movements.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No stock movements recorded yet.
                </td>
              </tr>
            ) : (
              movements.map((m) => (
                <tr key={m.id}>
                  <td>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {new Date(m.createdAt).toLocaleString()}
                    </span>
                  </td>
                  <td>
                    <strong style={{ color: '#fff', fontSize: '0.925rem', display: 'block' }}>
                      {m.product?.name}
                    </strong>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.75rem',
                        color: 'var(--text-accent)',
                      }}
                    >
                      {m.product?.sku}
                    </span>
                  </td>
                  <td>
                    <Badge type="movement" value={m.type} />
                  </td>
                  <td>
                    <span
                      style={{
                        fontWeight: 800,
                        fontSize: '1rem',
                        color: m.type === 'IN' ? '#34d399' : '#f87171',
                      }}
                    >
                      {m.type === 'IN' ? '+' : '-'}{m.quantity} units
                    </span>
                  </td>
                  <td>
                    <div>{m.createdBy?.name}</div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {m.createdBy?.email}
                    </span>
                  </td>
                  <td>
                    <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{m.reason}</div>
                    {m.challan && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
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
        title="Manual Stock Adjustment (Warehouse)"
      >
        <form onSubmit={handleSaveAdjustment}>
          <div className="form-group">
            <label className="form-label">Select Product *</label>
            <select
              className="form-select"
              required
              value={adjustData.productId}
              onChange={(e) => setAdjustData({ ...adjustData, productId: e.target.value })}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku}) — Available: {p.currentStock} units
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Movement Direction *</label>
              <select
                className="form-select"
                value={adjustData.type}
                onChange={(e) => setAdjustData({ ...adjustData, type: e.target.value as StockMovementType })}
              >
                <option value="IN">+ IN (Restock / Intake)</option>
                <option value="OUT">- OUT (Damage / Write-off / Audit Correction)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Adjustment Quantity *</label>
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
            <label className="form-label">Mandatory Audit Reason *</label>
            <textarea
              className="form-textarea"
              required
              rows={3}
              value={adjustData.reason}
              onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
              placeholder="e.g. Received shipment from Supplier XYZ / Damaged during forklift transit / Periodic physical count correction"
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
              {submitting ? 'Applying Adjustment...' : 'Apply Stock Change'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
