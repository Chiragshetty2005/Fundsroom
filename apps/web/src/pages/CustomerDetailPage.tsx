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
      showToast(error.message || 'Failed to load customer.', 'error');
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
      showToast('Enter a follow-up note before saving.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/customers/${id}/follow-ups`, {
        note,
        nextFollowUpDate: nextFollowUpDate || null,
      });
      showToast('Follow-up recorded.', 'success');
      setNote('');
      setNextFollowUpDate('');
      setIsFollowUpOpen(false);
      loadCustomer();
    } catch (error: any) {
      showToast(error.message || 'Failed to add follow-up.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)', fontSize: '14px' }}>
        Loading...
      </div>
    );
  }

  if (!customer) {
    return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: '12px' }}>Customer not found.</p>
        <Link to="/customers" className="btn btn-secondary">
          Back to CRM
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="action-bar">
        <div>
          <Link to="/customers" className="back-link">
            &larr; CRM
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 className="page-title">{customer.name}</h1>
            <Badge type="customer-status" value={customer.status} />
            <Badge type="customer-type" value={customer.type} />
          </div>
        </div>

        {hasRole('ADMIN', 'SALES') && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-primary" onClick={() => setIsFollowUpOpen(true)}>
              <PlusIcon size={16} />
              <span>Add follow-up</span>
            </button>
            <Link to={`/challans/new?customerId=${customer.id}`} className="btn btn-secondary">
              Create challan
            </Link>
          </div>
        )}
      </div>

      {/* Two-column record view */}
      <div className="detail-grid-reverse">
        {/* Left rail: profile + challans */}
        <div className="detail-section">
          <div className="card">
            <h2 className="card-title" style={{ marginBottom: '16px' }}>Profile</h2>

            <div className="detail-field">
              <div className="detail-field-label">Business</div>
              <div className="detail-field-value">{customer.businessName}</div>
            </div>

            <div className="detail-field">
              <div className="detail-field-label">Mobile</div>
              <div className="detail-field-value">{customer.mobile}</div>
            </div>

            <div className="detail-field">
              <div className="detail-field-label">Email</div>
              <div className="detail-field-value">{customer.email}</div>
            </div>

            <div className="detail-field">
              <div className="detail-field-label">GST number</div>
              <div className="detail-field-value" style={{ color: customer.gstNumber ? undefined : 'var(--text-muted)' }}>
                {customer.gstNumber || 'Not provided'}
              </div>
            </div>

            <div className="detail-field">
              <div className="detail-field-label">Address</div>
              <div className="detail-field-value" style={{ color: 'var(--text-secondary)' }}>{customer.address}</div>
            </div>

            <div className="detail-field">
              <div className="detail-field-label">Next follow-up</div>
              <div className="detail-field-value" style={{ color: customer.followUpDate ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {customer.followUpDate ? new Date(customer.followUpDate).toLocaleDateString() : 'None scheduled'}
              </div>
            </div>

            {customer.notes && (
              <div className="detail-field" style={{ paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                <div className="detail-field-label">Notes</div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>
                  {customer.notes}
                </p>
              </div>
            )}
          </div>

          {/* Challans */}
          <div className="card">
            <h2 className="card-title" style={{ marginBottom: '12px' }}>Challans</h2>
            {(!customer.challans || customer.challans.length === 0) ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No challans recorded for this customer.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {customer.challans.map((ch) => (
                  <Link
                    key={ch.id}
                    to={`/challans/${ch.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '13px',
                    }}
                  >
                    <div>
                      <span className="mono" style={{ fontWeight: 600, color: 'var(--accent)' }}>{ch.challanNumber}</span>
                      <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)' }}>
                        <span className="tabular">{ch.totalQuantity}</span> items · {new Date(ch.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <Badge type="challan-status" value={ch.status} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: timeline */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Activity</h2>
              <p className="card-subtitle">Follow-up history</p>
            </div>

            {hasRole('ADMIN', 'SALES') && (
              <button className="btn btn-secondary btn-sm" onClick={() => setIsFollowUpOpen(true)}>
                Add note
              </button>
            )}
          </div>

          {(!customer.followUps || customer.followUps.length === 0) ? (
            <div className="empty-state" style={{ padding: '32px 16px' }}>
              <p className="empty-state-text">
                No follow-up notes recorded yet. Add one to start building this customer's history.
              </p>
              {hasRole('ADMIN', 'SALES') && (
                <button
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: '8px' }}
                  onClick={() => setIsFollowUpOpen(true)}
                >
                  Add first follow-up
                </button>
              )}
            </div>
          ) : (
            <div className="timeline">
              {customer.followUps.map((fu) => (
                <div key={fu.id} className="timeline-item">
                  <div className="timeline-dot" />
                  <div className="timeline-card">
                    <div className="timeline-meta">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <strong style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{fu.createdBy.name}</strong>
                        <Badge type="role" value={fu.createdBy.role} />
                      </div>
                      <span className="tabular">{new Date(fu.createdAt).toLocaleString()}</span>
                    </div>

                    <p style={{ color: 'var(--text-primary)', fontSize: '13px', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                      {fu.note}
                    </p>

                    {fu.nextFollowUpDate && (
                      <div
                        style={{
                          marginTop: '8px',
                          paddingTop: '6px',
                          borderTop: '1px solid var(--border)',
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                          fontWeight: 500,
                        }}
                      >
                        Next follow-up: <span className="tabular">{new Date(fu.nextFollowUpDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Follow-up Modal */}
      <Modal
        isOpen={isFollowUpOpen}
        onClose={() => setIsFollowUpOpen(false)}
        title={`Follow-up with ${customer.name}`}
      >
        <form onSubmit={handleAddFollowUp}>
          <div className="form-group">
            <label className="form-label">Interaction notes</label>
            <textarea
              className="form-textarea"
              required
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Discussion details, requirements, agreed pricing, objections"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Next follow-up date (optional)</label>
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
              {isSubmitting ? 'Saving...' : 'Save follow-up'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
