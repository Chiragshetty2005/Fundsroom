import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/common/Badge';
import { PlusIcon, SearchIcon } from '../components/common/Icons';
import { Pagination } from '../components/common/Pagination';
import type { ChallanStatus, PaginatedResponse, SalesChallan } from '../types';

export const ChallansPage: React.FC = () => {
  const { hasRole } = useAuth();
  const { showToast } = useToast();

  const [challans, setChallans] = useState<SalesChallan[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const loadChallans = async () => {
    setLoading(true);
    try {
      const res = await api.get<PaginatedResponse<SalesChallan>>('/challans', {
        params: {
          search: search || undefined,
          status: statusFilter || undefined,
          page,
          limit: 10,
        },
      });
      setChallans(res.data);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } catch (error: any) {
      showToast(error.message || 'Failed to load challans.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadChallans();
    }, 200);
    return () => clearTimeout(timer);
  }, [search, statusFilter, page]);

  return (
    <div>
      <div className="action-bar">
        <div>
          <h1 className="page-title">Sales Challans</h1>
          <p className="page-subtitle">Delivery challans with inventory deductions</p>
        </div>

        {hasRole('ADMIN', 'SALES') && (
          <Link to="/challans/new" className="btn btn-primary">
            <PlusIcon size={16} />
            <span>Create challan</span>
          </Link>
        )}
      </div>

      {/* Filter and search */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <SearchIcon className="search-icon" size={15} />
          <input
            type="text"
            className="form-input"
            placeholder="Search by challan number or customer"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <button
          type="button"
          className={`filter-toggle ${!statusFilter ? 'active' : ''}`}
          onClick={() => { setStatusFilter(''); setPage(1); }}
        >
          All
        </button>
        <button
          type="button"
          className={`filter-toggle ${statusFilter === 'CONFIRMED' ? 'active' : ''}`}
          onClick={() => { setStatusFilter('CONFIRMED'); setPage(1); }}
        >
          Confirmed
        </button>
        <button
          type="button"
          className={`filter-toggle ${statusFilter === 'DRAFT' ? 'active' : ''}`}
          onClick={() => { setStatusFilter('DRAFT'); setPage(1); }}
        >
          Drafts
        </button>
        <button
          type="button"
          className={`filter-toggle ${statusFilter === 'CANCELLED' ? 'active' : ''}`}
          onClick={() => { setStatusFilter('CANCELLED'); setPage(1); }}
        >
          Cancelled
        </button>
      </div>

      {/* Challan Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Challan</th>
              <th>Customer</th>
              <th>Qty</th>
              <th>Status</th>
              <th>Created by</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  Loading...
                </td>
              </tr>
            ) : challans.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  {search || statusFilter
                    ? 'No challans match the current filters.'
                    : 'No challans created yet. Create your first challan to start tracking deliveries.'}
                </td>
              </tr>
            ) : (
              challans.map((ch) => (
                <tr key={ch.id}>
                  <td>
                    <Link
                      to={`/challans/${ch.id}`}
                      className="mono"
                      style={{ color: 'var(--accent)', fontWeight: 600 }}
                    >
                      {ch.challanNumber}
                    </Link>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '13px' }}>
                      {ch.customer?.name}
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {ch.customer?.businessName} · {ch.customer?.mobile}
                    </span>
                  </td>
                  <td>
                    <span className="tabular" style={{ fontWeight: 600 }}>{ch.totalQuantity}</span>
                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>
                      {ch._count?.items || ch.items?.length || 0} lines
                    </span>
                  </td>
                  <td>
                    <Badge type="challan-status" value={ch.status} />
                  </td>
                  <td>
                    <div style={{ fontSize: '13px' }}>{ch.createdBy?.name}</div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {ch.createdBy?.role}
                    </span>
                  </td>
                  <td>
                    <span className="tabular" style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                      {new Date(ch.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td>
                    <Link to={`/challans/${ch.id}`} className="btn btn-secondary btn-sm row-actions">
                      View
                    </Link>
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
    </div>
  );
};
