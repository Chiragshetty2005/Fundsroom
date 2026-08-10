import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/common/Badge';
import { PrinterIcon } from '../components/common/Icons';
import type { SalesChallan } from '../types';

export const ChallanDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { hasRole } = useAuth();
  const { showToast } = useToast();

  const [challan, setChallan] = useState<SalesChallan | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadChallan = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.get<{ challan: SalesChallan }>(`/challans/${id}`);
      setChallan(res.challan);
    } catch (error: any) {
      showToast(error.message || 'Failed to load challan.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChallan();
  }, [id]);

  const handleConfirm = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      await api.post(`/challans/${id}/confirm`);
      showToast(`Challan ${challan?.challanNumber} confirmed.`, 'success');
      loadChallan();
    } catch (error: any) {
      showToast(error.message || 'Failed to confirm challan.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    if (!window.confirm('Cancel this draft challan? This action cannot be undone.')) return;

    setActionLoading(true);
    try {
      await api.post(`/challans/${id}/cancel`);
      showToast(`Challan ${challan?.challanNumber} cancelled.`, 'info');
      loadChallan();
    } catch (error: any) {
      showToast(error.message || 'Failed to cancel challan.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)', fontSize: '14px' }}>
        Loading...
      </div>
    );
  }

  if (!challan) {
    return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: '12px' }}>Challan not found.</p>
        <Link to="/challans" className="btn btn-secondary">
          Back to challans
        </Link>
      </div>
    );
  }

  const grandTotal =
    challan.items?.reduce((sum, item) => sum + item.quantity * Number(item.unitPrice), 0) || 0;

  return (
    <div>
      {/* Top Action Bar (hidden on print) */}
      <div className="action-bar no-print">
        <div>
          <Link to="/challans" className="back-link">
            &larr; Sales Challans
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 className="page-title">
              <span className="mono">{challan.challanNumber}</span>
            </h1>
            <Badge type="challan-status" value={challan.status} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={() => window.print()}>
            <PrinterIcon size={14} />
            <span>Print</span>
          </button>

          {hasRole('ADMIN', 'SALES') && challan.status === 'DRAFT' && (
            <>
              <button
                className="btn btn-success"
                onClick={handleConfirm}
                disabled={actionLoading}
              >
                {actionLoading ? 'Processing...' : 'Confirm challan'}
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={handleCancel}
                disabled={actionLoading}
              >
                Cancel draft
              </button>
            </>
          )}
        </div>
      </div>

      {/* Official Formatted Delivery Challan Slip */}
      <div className="printable-slip">
        {/* Document Header */}
        <div className="slip-header">
          <div>
            <div className="slip-company">MINI ERP WHOLESALE & DISTRIBUTION</div>
            <div className="slip-company-sub">Commercial Operations · GSTIN: 29AAAAA0000A1Z5</div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div className="slip-doc-type">DELIVERY CHALLAN</div>
            <div className="mono" style={{ fontSize: '14px', fontWeight: 600, marginTop: '4px' }}>
              {challan.challanNumber}
            </div>
            <div className="tabular" style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {new Date(challan.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Meta Grid */}
        <div className="slip-meta-grid">
          <div>
            <div className="slip-meta-label">Customer</div>
            <div style={{ fontSize: '15px', fontWeight: 600, marginTop: '4px' }}>
              {challan.customer?.name}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {challan.customer?.businessName}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {challan.customer?.address}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {challan.customer?.mobile} · {challan.customer?.email}
            </div>
            {challan.customer?.gstNumber && (
              <div style={{ fontSize: '12px', color: 'var(--accent)', marginTop: '4px', fontWeight: 500 }}>
                GSTIN: {challan.customer.gstNumber}
              </div>
            )}
          </div>

          <div>
            <div className="slip-meta-label">Dispatch Details</div>
            <div style={{ marginTop: '6px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Created by: </span>
                <span style={{ fontWeight: 500 }}>{challan.createdBy?.name} ({challan.createdBy?.role})</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Status: </span>
                <Badge type="challan-status" value={challan.status} />
              </div>
              {challan.confirmedAt && (
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Confirmed: </span>
                  <span className="tabular" style={{ color: 'var(--success-text)', fontWeight: 500 }}>
                    {new Date(challan.confirmedAt).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Itemized Table */}
        <div style={{ marginBottom: '24px' }}>
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>#</th>
                <th>Item</th>
                <th>SKU</th>
                <th style={{ textAlign: 'right' }}>Unit price</th>
                <th style={{ textAlign: 'center' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {challan.items?.map((item, idx) => (
                <tr key={item.id}>
                  <td className="tabular">{idx + 1}</td>
                  <td>
                    <span style={{ fontWeight: 500 }}>{item.productName}</span>
                  </td>
                  <td>
                    <span className="mono" style={{ fontSize: '12px' }}>
                      {item.productSku}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="tabular">${Number(item.unitPrice).toFixed(2)}</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="tabular" style={{ fontWeight: 600 }}>{item.quantity}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="tabular" style={{ fontWeight: 600 }}>
                      ${(item.quantity * Number(item.unitPrice)).toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} style={{ textAlign: 'right', fontWeight: 600, padding: '12px 16px' }}>
                  Total:
                </td>
                <td style={{ textAlign: 'center', fontWeight: 700 }}>
                  <span className="tabular">{challan.totalQuantity}</span>
                </td>
                <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '15px' }}>
                  <span className="tabular" style={{ color: 'var(--accent)' }}>
                    ${grandTotal.toFixed(2)}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Signatures */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '40px',
            paddingTop: '24px',
            borderTop: '1px solid var(--border)',
            marginTop: '24px',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ height: '48px', borderBottom: '1px dashed var(--border)', marginBottom: '8px' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Received by (customer signature)</span>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ height: '48px', borderBottom: '1px dashed var(--border)', marginBottom: '8px' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Authorized signatory (warehouse)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
