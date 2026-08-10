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

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

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
        showToast('Customer updated.', 'success');
        setEditingCustomer(null);
      } else {
        await api.post('/customers', formData);
        showToast('Customer added.', 'success');
        setIsCreateOpen(false);
      }
      loadCustomers();
    } catch (error: any) {
      showToast(error.message || 'Failed to save customer.', 'error');
    }
  };

  const isOverdue = (dateStr: string) => new Date(dateStr) < new Date();

  return (
    <div>
      <div className="action-bar">
        <div>
          <h1 className="page-title">CRM</h1>
          <p className="page-subtitle">Customer profiles, lead stages, and follow-up notes</p>
        </div>

        {hasRole('ADMIN', 'SALES') && (
          <button className="btn btn-primary" onClick={handleOpenCreate}>
            <PlusIcon size={16} />
            <span>Add customer</span>
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
            placeholder="Search by name, business, or mobile"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <select
          className="form-select"
          style={{ width: '140px' }}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="LEAD">Lead</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>

        <select
          className="form-select"
          style={{ width: '150px' }}
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All types</option>
          <option value="RETAIL">Retail</option>
          <option value="WHOLESALE">Wholesale</option>
          <option value="DISTRIBUTOR">Distributor</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Contact</th>
              <th>Type</th>
              <th>Status</th>
              <th>Follow-up</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  Loading...
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  {search || statusFilter || typeFilter
                    ? 'No customers match the current filters.'
                    : 'No customers yet. Add your first lead to start tracking follow-ups.'}
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link
                      to={`/customers/${c.id}`}
                      style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '13px', display: 'block' }}
                    >
                      {c.name}
                    </Link>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {c.businessName} {c.gstNumber ? `· GST: ${c.gstNumber}` : ''}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: '13px' }}>{c.mobile}</div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{c.email}</span>
                  </td>
                  <td>
                    <Badge type="customer-type" value={c.type} />
                  </td>
                  <td>
                    <Badge type="customer-status" value={c.status} />
                  </td>
                  <td>
                    {c.followUpDate ? (
                      <span
                        className={`tabular ${isOverdue(c.followUpDate) ? 'overdue' : ''}`}
                        style={{
                          fontSize: '13px',
                          fontWeight: 500,
                          color: isOverdue(c.followUpDate) ? 'var(--danger-text)' : 'var(--text-secondary)',
                        }}
                      >
                        {new Date(c.followUpDate).toLocaleDateString()}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                    )}
                  </td>
                  <td>
                    <div className="row-actions" style={{ display: 'flex', gap: '6px' }}>
                      <Link to={`/customers/${c.id}`} className="btn btn-secondary btn-sm">
                        View
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
        title={editingCustomer ? 'Edit customer' : 'Add customer'}
        size="lg"
      >
        <form onSubmit={handleSaveCustomer}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <div className="form-group">
              <label className="form-label">Full name</label>
              <input
                type="text"
                className="form-input"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Business name</label>
              <input
                type="text"
                className="form-input"
                required
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                placeholder="Apex Electronics Ltd"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mobile number</label>
              <input
                type="text"
                className="form-input"
                required
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                placeholder="+91 98765 43210"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email address</label>
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
              <label className="form-label">Customer type</label>
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
              <label className="form-label">Status</label>
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
              <label className="form-label">GST number (optional)</label>
              <input
                type="text"
                className="form-input"
                value={formData.gstNumber}
                onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                placeholder="29ABCDE1234F1Z5"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Next follow-up date</label>
              <input
                type="date"
                className="form-input"
                value={formData.followUpDate}
                onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Address</label>
            <input
              type="text"
              className="form-input"
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="#14 Commercial Street, Bangalore"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea
              className="form-textarea"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Key background, product interests, payment terms"
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
              {editingCustomer ? 'Update customer' : 'Add customer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
