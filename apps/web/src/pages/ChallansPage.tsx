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

  // Filters
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
      {/* Action Header */}
      <div className="action-bar">
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
            Sales Challans
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Order delivery challans, automatic inventory deductions, and line-item snapshots
          </p>
        </div>

        {hasRole('ADMIN', 'SALES') && (
          <Link to="/challans/new" className="btn btn-primary">
            <PlusIcon size={18} />
            <span>Create Sales Challan</span>
          </Link>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-input-wrapper" style={{ minWidth: '280px' }}>
            <SearchIcon className="search-icon" size={16} />
            <input
              type="text"
              className="form-input"
              placeholder="Search by Challan # or Customer name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              className={`btn btn-sm ${!statusFilter ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => {
                setStatusFilter('');
                setPage(1);
              }}
            >
              All
            </button>
            <button
              type="button"
              className={`btn btn-sm ${statusFilter === 'CONFIRMED' ? 'btn-success' : 'btn-secondary'}`}
              onClick={() => {
                setStatusFilter('CONFIRMED');
                setPage(1);
              }}
            >
              Confirmed
            </button>
            <button
              type="button"
              className={`btn btn-sm ${statusFilter === 'DRAFT' ? 'btn-warning' : 'btn-secondary'}`}
              onClick={() => {
                setStatusFilter('DRAFT');
                setPage(1);
              }}
            >
              Drafts
            </button>
            <button
              type="button"
              className={`btn btn-sm ${statusFilter === 'CANCELLED' ? 'btn-danger' : 'btn-secondary'}`}
              onClick={() => {
                setStatusFilter('CANCELLED');
                setPage(1);
              }}
            >
              Cancelled
            </button>
          </div>
        </div>
      </div>

      {/* Challan Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Challan Number</th>
              <th>Customer & Business</th>
              <th>Total Units</th>
              <th>Status</th>
              <th>Created By</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  Loading sales challans...
                </td>
              </tr>
            ) : challans.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No sales challans found.
                </td>
              </tr>
            ) : (
              challans.map((ch) => (
                <tr key={ch.id}>
                  <td>
                    <Link
                      to={`/challans/${ch.id}`}
                      style={{
                        color: 'var(--text-accent)',
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.95rem',
                      }}
                    >
                      {ch.challanNumber}
                    </Link>
                  </td>
                  <td>
                    <strong style={{ color: '#fff', fontSize: '0.925rem', display: 'block' }}>
                      {ch.customer?.name}
                    </strong>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {ch.customer?.businessName} &bull; {ch.customer?.mobile}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: '#fff' }}>{ch.totalQuantity} units</span>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      ({ch._count?.items || ch.items?.length || 0} line items)
                    </span>
                  </td>
                  <td>
                    <Badge type="challan-status" value={ch.status} />
                  </td>
                  <td>
                    <div>{ch.createdBy?.name}</div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {ch.createdBy?.role}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {new Date(ch.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td>
                    <Link to={`/challans/${ch.id}`} className="btn btn-secondary btn-sm">
                      View Official Slip
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
