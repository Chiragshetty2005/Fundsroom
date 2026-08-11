import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/common/Badge';
import {
  AlertTriangleIcon,
  ChallanIcon,
  ProductsIcon,
  UsersIcon,
} from '../components/common/Icons';
import { StatCard } from '../components/common/StatCard';
import type { Customer, PaginatedResponse, Product, SalesChallan } from '../types';

export const DashboardPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const [loading, setLoading] = useState(true);

  const [customerCount, setCustomerCount] = useState(0);
  const [leadCount, setLeadCount] = useState(0);
  const [productCount, setProductCount] = useState(0);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [recentChallans, setRecentChallans] = useState<SalesChallan[]>([]);
  const [upcomingFollowUps, setUpcomingFollowUps] = useState<Customer[]>([]);

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      try {
        const [customersRes, lowStockRes, productsRes, challansRes] = await Promise.allSettled([
          api.get<PaginatedResponse<Customer>>('/customers?limit=50'),
          api.get<PaginatedResponse<Product>>('/products?lowStock=true&limit=6'),
          api.get<PaginatedResponse<Product>>('/products?limit=1'),
          api.get<PaginatedResponse<SalesChallan>>('/challans?limit=5'),
        ]);

        if (customersRes.status === 'fulfilled') {
          const all = customersRes.value.data;
          setCustomerCount(customersRes.value.pagination.total);
          setLeadCount(all.filter((c) => c.status === 'LEAD').length);
          setUpcomingFollowUps(
            all
              .filter((c) => c.followUpDate)
              .sort((a, b) => new Date(a.followUpDate!).getTime() - new Date(b.followUpDate!).getTime())
              .slice(0, 5),
          );
        }

        if (productsRes.status === 'fulfilled') {
          setProductCount(productsRes.value.pagination.total);
        }

        if (lowStockRes.status === 'fulfilled') {
          setLowStockProducts(lowStockRes.value.data);
        }

        if (challansRes.status === 'fulfilled') {
          setRecentChallans(challansRes.value.data);
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const isOverdue = (dateStr: string) => {
    return new Date(dateStr) < new Date();
  };

  return (
    <div>
      <div className="action-bar">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Overview for {user?.name}</p>
        </div>
      </div>

      {/* Role Assignment Notice for default USER */}
      {user?.role === 'USER' && (
        <div
          style={{
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '4px' }}>
              Account Pending Role Assignment
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
              Your account currently holds the standard <strong>USER</strong> role. An administrator can elevate your access to <strong>SALES</strong>, <strong>WAREHOUSE</strong>, <strong>ACCOUNTS</strong>, or <strong>ADMIN</strong> in the User Admin console.
            </p>
          </div>
          <Badge type="role" value="USER" />
        </div>
      )}

      {/* KPI Stats */}
      <div className="stats-grid">
        <Link to="/customers" className="stat-card-link">
          <StatCard
            label="Total Customers"
            value={loading ? '—' : customerCount}
            icon={<UsersIcon size={18} />}
            variant="primary"
          />
        </Link>
        <Link to="/customers?status=LEAD" className="stat-card-link">
          <StatCard
            label="Open Leads"
            value={loading ? '—' : leadCount}
            icon={<UsersIcon size={18} />}
            variant="info"
          />
        </Link>
        <Link to="/products" className="stat-card-link">
          <StatCard
            label="Products"
            value={loading ? '—' : productCount}
            icon={<ProductsIcon size={18} />}
            variant="success"
          />
        </Link>
        <Link to="/products?lowStock=true" className="stat-card-link">
          <StatCard
            label="Low Stock Alerts"
            value={loading ? '—' : lowStockProducts.length}
            icon={<AlertTriangleIcon size={18} />}
            variant={lowStockProducts.length > 0 ? 'warning' : 'primary'}
          />
        </Link>
      </div>

      {/* Two-column detail panels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        {/* Low Stock Alerts */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Low Stock Alerts</h2>
              <p className="card-subtitle">Items at or below minimum threshold</p>
            </div>
            <Link to="/products" className="btn btn-secondary btn-sm">
              View all
            </Link>
          </div>

          {lowStockProducts.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 16px' }}>
              <p className="empty-state-text">All products are above their minimum stock levels.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {lowStockProducts.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{p.name}</div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      <span className="mono">{p.sku}</span> · {p.warehouseLocation}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="tabular" style={{ color: 'var(--danger-text)', fontWeight: 600, fontSize: '14px' }}>
                      {p.currentStock}
                    </span>
                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>
                      min: {p.minimumStockAlertQuantity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Follow-ups */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Upcoming Follow-ups</h2>
              <p className="card-subtitle">Scheduled customer conversations</p>
            </div>
            <Link to="/customers" className="btn btn-secondary btn-sm">
              View CRM
            </Link>
          </div>

          {upcomingFollowUps.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 16px' }}>
              <p className="empty-state-text">
                No scheduled follow-ups. Open a customer record in CRM to schedule one.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {upcomingFollowUps.map((c) => (
                <Link
                  key={c.id}
                  to={`/customers/${c.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    transition: 'border-color 100ms ease',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{c.name}</div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {c.businessName} · {c.mobile}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <Badge type="customer-status" value={c.status} />
                    <span
                      className={`tabular ${isOverdue(c.followUpDate!) ? 'overdue' : ''}`}
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        marginTop: '4px',
                        color: isOverdue(c.followUpDate!) ? 'var(--danger-text)' : 'var(--text-secondary)',
                        fontWeight: 500,
                      }}
                    >
                      {new Date(c.followUpDate!).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Sales Challans */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Recent Challans</h2>
            <p className="card-subtitle">Latest fulfillment orders</p>
          </div>
          {hasRole('ADMIN', 'SALES') && (
            <Link to="/challans/new" className="btn btn-primary btn-sm">
              <span>New challan</span>
            </Link>
          )}
        </div>

        {recentChallans.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 16px' }}>
            <p className="empty-state-text">
              No challans created yet. Create your first sales challan to start tracking deliveries.
            </p>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Challan</th>
                  <th>Customer</th>
                  <th>Qty</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recentChallans.map((challan) => (
                  <tr key={challan.id}>
                    <td>
                      <Link to={`/challans/${challan.id}`} className="mono" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                        {challan.challanNumber}
                      </Link>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{challan.customer?.name}</div>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {challan.customer?.businessName}
                      </span>
                    </td>
                    <td>
                      <span className="tabular">{challan.totalQuantity}</span>
                    </td>
                    <td>
                      <Badge type="challan-status" value={challan.status} />
                    </td>
                    <td>
                      <span className="tabular" style={{ color: 'var(--text-muted)' }}>
                        {new Date(challan.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td>
                      <Link to={`/challans/${challan.id}`} className="btn btn-secondary btn-sm row-actions">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
