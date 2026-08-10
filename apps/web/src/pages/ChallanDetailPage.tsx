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
      showToast(error.message || 'Failed to load sales challan.', 'error');
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
      showToast(`Challan #${challan?.challanNumber} confirmed & stock deducted!`, 'success');
      loadChallan();
    } catch (error: any) {
      showToast(error.message || 'Failed to confirm challan.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    if (!window.confirm('Are you sure you want to cancel this draft challan?')) return;

    setActionLoading(true);
    try {
      await api.post(`/challans/${id}/cancel`);
      showToast(`Challan #${challan?.challanNumber} has been cancelled.`, 'info');
      loadChallan();
    } catch (error: any) {
      showToast(error.message || 'Failed to cancel challan.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
        Loading sales challan details...
      </div>
    );
  }

  if (!challan) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Sales challan not found.</p>
        <Link to="/challans" className="btn btn-secondary">
          Return to Challans List
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
          <Link
            to="/challans"
            style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem' }}
          >
            &larr; Back to Challan List
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
              Challan #{challan.challanNumber}
            </h1>
            <Badge type="challan-status" value={challan.status} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={() => window.print()}>
            <PrinterIcon size={18} />
            <span>Print Official Slip</span>
          </button>

          {hasRole('ADMIN', 'SALES') && challan.status === 'DRAFT' && (
            <>
              <button
                className="btn btn-success"
                onClick={handleConfirm}
                disabled={actionLoading}
              >
                {actionLoading ? 'Processing...' : '✓ Confirm & Issue'}
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={handleCancel}
                disabled={actionLoading}
              >
                Cancel Draft
              </button>
            </>
          )}
        </div>
      </div>

      {/* Official Formatted Delivery Challan Slip */}
      <div
        className="glass-card printable-slip"
        style={{
          maxWidth: '860px',
          margin: '0 auto',
          padding: '2.5rem',
          background: '#0f172a',
          color: '#fff',
        }}
      >
        {/* Document Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            paddingBottom: '1.5rem',
            borderBottom: '2px solid var(--border-subtle)',
            marginBottom: '2rem',
          }}
        >
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>
              MINI ERP WHOLESALE & DISTRIBUTION
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Commercial Operations & Delivery Network &bull; GSTIN: 29AAAAA0000A1Z5
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontSize: '1.2rem',
                fontWeight: 800,
                color: 'var(--text-accent)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              DELIVERY CHALLAN
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: '0.25rem' }}>
              #{challan.challanNumber}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Date: {new Date(challan.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Bill/Ship To Meta Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '2rem',
            marginBottom: '2rem',
            padding: '1.25rem',
            background: 'var(--bg-input)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Consignee / Customer Details
            </span>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginTop: '0.35rem' }}>
              {challan.customer?.name}
            </div>
            <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              {challan.customer?.businessName}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              📍 {challan.customer?.address}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              📞 {challan.customer?.mobile} &bull; ✉️ {challan.customer?.email}
            </div>
            {challan.customer?.gstNumber && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-accent)', marginTop: '0.25rem' }}>
                GSTIN: {challan.customer.gstNumber}
              </div>
            )}
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Dispatch & Authorization Details
            </span>
            <div style={{ marginTop: '0.5rem', fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Created By: </span>
                <strong>{challan.createdBy?.name} ({challan.createdBy?.role})</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Fulfillment Status: </span>
                <Badge type="challan-status" value={challan.status} />
              </div>
              {challan.confirmedAt && (
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Confirmed At: </span>
                  <span style={{ color: '#34d399', fontWeight: 600 }}>
                    {new Date(challan.confirmedAt).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Itemized Snapshot Table */}
        <div style={{ marginBottom: '2rem' }}>
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>#</th>
                <th>Item Description</th>
                <th>SKU Code</th>
                <th style={{ textAlign: 'right' }}>Unit Price</th>
                <th style={{ textAlign: 'center' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {challan.items?.map((item, idx) => (
                <tr key={item.id}>
                  <td>{idx + 1}</td>
                  <td>
                    <strong style={{ color: '#fff' }}>{item.productName}</strong>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                      {item.productSku}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    ${Number(item.unitPrice).toFixed(2)}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: '#fff' }}>
                    {item.quantity}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#fff' }}>
                    ${(item.quantity * Number(item.unitPrice)).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} style={{ textAlign: 'right', fontWeight: 700, padding: '1rem' }}>
                  Total Dispatch Quantity:
                </td>
                <td style={{ textAlign: 'center', fontWeight: 800, fontSize: '1.05rem', color: '#fff' }}>
                  {challan.totalQuantity} units
                </td>
                <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '1.25rem', color: 'var(--accent-primary)' }}>
                  ${grandTotal.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Signatures & Footer Notice */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '3rem',
            paddingTop: '2rem',
            borderTop: '1px solid var(--border-subtle)',
            marginTop: '2rem',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ height: '50px', borderBottom: '1px dashed var(--border-subtle)', marginBottom: '0.5rem' }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Received By (Customer Signature & Seal)</span>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ height: '50px', borderBottom: '1px dashed var(--border-subtle)', marginBottom: '0.5rem' }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Authorized Signatory (Warehouse Dispatch)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
