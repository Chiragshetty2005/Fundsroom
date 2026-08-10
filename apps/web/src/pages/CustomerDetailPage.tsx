import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/common/Badge';
import { PlusIcon } from '../components/common/Icons';
import { Modal } from '../components/common/Modal';
import type { Customer } from '../types';

export const CustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { hasRole } = useAuth();
  const { showToast } = useToast();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  // Add Follow-up Modal
  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false);
  const [note, setNote] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadCustomer = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.get<{ customer: Customer }>(`/customers/${id}`);
      setCustomer(res.customer);
    } catch (error: any) {
      showToast(error.message || 'Failed to load customer details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomer();
  }, [id]);

  const handleAddFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) {
      showToast('Please enter a follow-up note.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/customers/${id}/follow-ups`, {
        note,
        nextFollowUpDate: nextFollowUpDate || null,
      });
      showToast('Follow-up interaction recorded!', 'success');
      setNote('');
      setNextFollowUpDate('');
      setIsFollowUpOpen(false);
      loadCustomer();
    } catch (error: any) {
      showToast(error.message || 'Failed to add follow-up note.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
        Loading customer CRM timeline...
      </div>
    );
  }

  if (!customer) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Customer profile not found.</p>
        <Link to="/customers" className="btn btn-secondary">
          Return to Customer List
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Top Breadcrumb Header */}
      <div className="action-bar">
        <div>
          <Link
            to="/customers"
            style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem' }}
          >
            &larr; Back to Customers
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
              {customer.name}
            </h1>
            <Badge type="customer-status" value={customer.status} />
            <Badge type="customer-type" value={customer.type} />
          </div>
        </div>

        {hasRole('ADMIN', 'SALES') && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-primary" onClick={() => setIsFollowUpOpen(true)}>
              <PlusIcon size={18} />
              <span>Log Follow-Up Note</span>
            </button>
            <Link to={`/challans/new?customerId=${customer.id}`} className="btn btn-secondary">
              Create Challan
            </Link>
          </div>
        )}
      </div>

      {/* Customer Profile Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 380px) 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left Column: Customer Attributes Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-card">
            <h2 className="card-title" style={{ marginBottom: '1rem' }}>Profile Information</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.9rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>
                  Business / Firm
                </span>
                <strong style={{ color: '#fff' }}>{customer.businessName}</strong>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>
                  Mobile Contact
                </span>
                <strong style={{ color: '#fff' }}>{customer.mobile}</strong>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>
                  Email Address
                </span>
                <strong style={{ color: '#fff' }}>{customer.email}</strong>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>
                  GST Number
                </span>
                <span style={{ color: customer.gstNumber ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {customer.gstNumber || 'Not provided'}
                </span>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>
                  Delivery / Billing Address
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>{customer.address}</span>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>
                  Next Follow-up Due
                </span>
                <span style={{ color: customer.followUpDate ? 'var(--accent-primary)' : 'var(--text-muted)', fontWeight: 600 }}>
                  {customer.followUpDate ? `📅 ${new Date(customer.followUpDate).toLocaleDateString()}` : 'None scheduled'}
                </span>
              </div>

              {customer.notes && (
                <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>
                    Initial Notes
                  </span>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                    {customer.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Challans Card */}
          <div className="glass-card">
            <h2 className="card-title" style={{ marginBottom: '1rem' }}>Order Challans</h2>
            {(!customer.challans || customer.challans.length === 0) ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No challans recorded for this client yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {customer.challans.map((ch) => (
                  <Link
                    key={ch.id}
                    to={`/challans/${ch.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 0.85rem',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.85rem',
                    }}
                  >
                    <div>
                      <strong style={{ color: 'var(--text-accent)' }}>{ch.challanNumber}</strong>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {ch.totalQuantity} items &bull; {new Date(ch.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <Badge type="challan-status" value={ch.status} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Interactive Follow-up Note Timeline */}
        <div className="glass-card">
          <div className="card-header">
            <div>
              <h2 className="card-title">CRM Interaction History</h2>
              <p className="card-subtitle">Chronological record of calls, meetings, and updates</p>
            </div>

            {hasRole('ADMIN', 'SALES') && (
              <button className="btn btn-secondary btn-sm" onClick={() => setIsFollowUpOpen(true)}>
                + New Note
              </button>
            )}
          </div>

          {(!customer.followUps || customer.followUps.length === 0) ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📝</div>
              <p>No follow-up notes recorded yet.</p>
              <button
                className="btn btn-primary btn-sm"
                style={{ marginTop: '1rem' }}
                onClick={() => setIsFollowUpOpen(true)}
              >
                Log First Follow-up
              </button>
            </div>
          ) : (
            <div className="timeline">
              {customer.followUps.map((fu) => (
                <div key={fu.id} className="timeline-item">
                  <div className="timeline-dot" />
                  <div className="timeline-card">
                    <div className="timeline-meta">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <strong style={{ color: '#fff' }}>{fu.createdBy.name}</strong>
                        <Badge type="role" value={fu.createdBy.role} />
                      </div>
                      <span>{new Date(fu.createdAt).toLocaleString()}</span>
                    </div>

                    <p style={{ color: 'var(--text-primary)', fontSize: '0.925rem', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                      {fu.note}
                    </p>

                    {fu.nextFollowUpDate && (
                      <div
                        style={{
                          marginTop: '0.75rem',
                          paddingTop: '0.5rem',
                          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                          fontSize: '0.8rem',
                          color: 'var(--accent-primary)',
                          fontWeight: 600,
                        }}
                      >
                        📅 Scheduled Next Follow-up: {new Date(fu.nextFollowUpDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Follow-up Note Modal */}
      <Modal
        isOpen={isFollowUpOpen}
        onClose={() => setIsFollowUpOpen(false)}
        title={`Log Follow-up with ${customer.name}`}
      >
        <form onSubmit={handleAddFollowUp}>
          <div className="form-group">
            <label className="form-label">Interaction Notes *</label>
            <textarea
              className="form-textarea"
              required
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Detail discussion, customer requirements, agreed pricing, objections..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">Next Follow-up Date (Optional)</label>
            <input
              type="date"
              className="form-input"
              value={nextFollowUpDate}
              onChange={(e) => setNextFollowUpDate(e.target.value)}
            />
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsFollowUpOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving Note...' : 'Save Follow-Up'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
