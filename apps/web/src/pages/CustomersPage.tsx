import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/common/Badge';
import { PlusIcon, SearchIcon } from '../components/common/Icons';
import { Modal } from '../components/common/Modal';
import { Pagination } from '../components/common/Pagination';
import type { Customer, CustomerStatus, CustomerType, PaginatedResponse } from '../types';

export const CustomersPage: React.FC = () => {
  const { hasRole } = useAuth();
  const { showToast } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    businessName: '',
    gstNumber: '',
    type: 'RETAIL' as CustomerType,
    status: 'LEAD' as CustomerStatus,
    address: '',
    followUpDate: '',
    notes: '',
  });

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.get<PaginatedResponse<Customer>>('/customers', {
        params: {
          search: search || undefined,
          status: statusFilter || undefined,
          type: typeFilter || undefined,
          page,
          limit: 10,
        },
      });
      setCustomers(res.data);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } catch (error: any) {
      showToast(error.message || 'Failed to load customers.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCustomers();
    }, 200);
    return () => clearTimeout(timer);
  }, [search, statusFilter, typeFilter, page]);

  const handleOpenCreate = () => {
    setFormData({
      name: '',
      mobile: '',
      email: '',
      businessName: '',
      gstNumber: '',
      type: 'RETAIL',
      status: 'LEAD',
      address: '',
      followUpDate: '',
      notes: '',
    });
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      mobile: customer.mobile,
      email: customer.email,
      businessName: customer.businessName,
      gstNumber: customer.gstNumber || '',
      type: customer.type,
      status: customer.status,
      address: customer.address,
      followUpDate: customer.followUpDate ? customer.followUpDate.split('T')[0] : '',
      notes: customer.notes || '',
    });
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer.id}`, formData);
        showToast('Customer profile updated successfully!', 'success');
        setEditingCustomer(null);
      } else {
        await api.post('/customers', formData);
        showToast('New customer added to CRM!', 'success');
        setIsCreateOpen(false);
      }
      loadCustomers();
    } catch (error: any) {
      showToast(error.message || 'Failed to save customer.', 'error');
    }
  };

  return (
    <div>
      {/* Action Header */}
      <div className="action-bar">
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
            Customer CRM
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Manage client profiles, lead stages, and sales follow-up notes
          </p>
        </div>

        {hasRole('ADMIN', 'SALES') && (
          <button className="btn btn-primary" onClick={handleOpenCreate}>
            <PlusIcon size={18} />
            <span>Add Customer</span>
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
              placeholder="Search by customer, business, mobile, or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <select
              className="form-select"
              style={{ width: '150px' }}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Statuses</option>
              <option value="LEAD">Lead</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>

            <select
              className="form-select"
              style={{ width: '160px' }}
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Types</option>
              <option value="RETAIL">Retail</option>
              <option value="WHOLESALE">Wholesale</option>
              <option value="DISTRIBUTOR">Distributor</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer & Company</th>
              <th>Contact Info</th>
              <th>Type</th>
              <th>Status</th>
              <th>Follow-up Due</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  Loading customer database...
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No customers found matching your criteria.
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link
                      to={`/customers/${c.id}`}
                      style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem', display: 'block' }}
                    >
                      {c.name}
                    </Link>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {c.businessName} {c.gstNumber ? `• GST: ${c.gstNumber}` : ''}
                    </span>
                  </td>
                  <td>
                    <div>{c.mobile}</div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{c.email}</span>
                  </td>
                  <td>
                    <Badge type="customer-type" value={c.type} />
                  </td>
                  <td>
                    <Badge type="customer-status" value={c.status} />
                  </td>
                  <td>
                    {c.followUpDate ? (
                      <span style={{ color: 'var(--accent-primary)', fontSize: '0.85rem', fontWeight: 600 }}>
                        📅 {new Date(c.followUpDate).toLocaleDateString()}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>None scheduled</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Link to={`/customers/${c.id}`} className="btn btn-secondary btn-sm">
                        View CRM
                      </Link>
                      {hasRole('ADMIN', 'SALES') && (
                        <button className="btn btn-secondary btn-sm" onClick={() => handleOpenEdit(c)}>
                          Edit
                        </button>
                      )}
                    </div>
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

      {/* Add / Edit Customer Modal */}
      <Modal
        isOpen={isCreateOpen || !!editingCustomer}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingCustomer(null);
        }}
        title={editingCustomer ? 'Edit Customer Details' : 'Add New Customer'}
        size="lg"
      >
        <form onSubmit={handleSaveCustomer}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                className="form-input"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. John Doe"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Business / Firm Name *</label>
              <input
                type="text"
                className="form-input"
                required
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                placeholder="e.g. Apex Electronics Ltd"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mobile Number *</label>
              <input
                type="text"
                className="form-input"
                required
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                placeholder="e.g. +91 98765 43210"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input
                type="email"
                className="form-input"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contact@company.com"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Customer Type</label>
              <select
                className="form-select"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as CustomerType })}
              >
                <option value="RETAIL">Retail</option>
                <option value="WHOLESALE">Wholesale</option>
                <option value="DISTRIBUTOR">Distributor</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Customer Status</label>
              <select
                className="form-select"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as CustomerStatus })}
              >
                <option value="LEAD">Lead</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">GST Number (Optional)</label>
              <input
                type="text"
                className="form-input"
                value={formData.gstNumber}
                onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                placeholder="e.g. 29ABCDE1234F1Z5"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Next Follow-up Date (Optional)</label>
              <input
                type="date"
                className="form-input"
                value={formData.followUpDate}
                onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Physical Address *</label>
            <input
              type="text"
              className="form-input"
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="e.g. #14 Commercial Street, Bangalore"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Internal Notes / Requirements</label>
            <textarea
              className="form-textarea"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add key background, product interests, payment terms..."
            />
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setIsCreateOpen(false);
                setEditingCustomer(null);
              }}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingCustomer ? 'Update Customer' : 'Create Customer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
