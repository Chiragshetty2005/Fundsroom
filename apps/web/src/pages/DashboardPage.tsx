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
  const { user } = useAuth();
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

  return (
    <div>
      {/* Header Greeting */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Operations Command Center
          </span>
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
          Welcome back, {user?.name}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Here is your live distribution, CRM, and inventory summary for today.
        </p>
      </div>

      {/* KPI Stats Grid */}
      <div className="stats-grid">
        <StatCard
          label="Total Customers"
          value={loading ? '...' : customerCount}
          icon={<UsersIcon size={22} />}
          variant="primary"
        />
        <StatCard
          label="Active Leads"
          value={loading ? '...' : leadCount}
          icon={<UsersIcon size={22} />}
          variant="info"
        />
        <StatCard
          label="Catalog Products"
          value={loading ? '...' : productCount}
          icon={<ProductsIcon size={22} />}
          variant="success"
        />
        <StatCard
          label="Low Stock Alerts"
          value={loading ? '...' : lowStockProducts.length}
          icon={<AlertTriangleIcon size={22} />}
          variant={lowStockProducts.length > 0 ? 'warning' : 'primary'}
        />
      </div>

      {/* Two-Column Detail Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Urgent Restock Alerts Panel */}
        <div className="glass-card">
          <div className="card-header">
            <div>
              <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: 'var(--warning)' }}>⚠️</span>
                <span>Low Stock Inventory Alerts</span>
              </h2>
              <p className="card-subtitle">Items at or below minimum threshold</p>
            </div>
            <Link to="/products" className="btn btn-secondary btn-sm">
              View Catalog
            </Link>
          </div>

          {lowStockProducts.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              ✅ All products currently maintain healthy stock levels.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {lowStockProducts.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    background: 'rgba(239, 68, 68, 0.06)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div>
                    <strong style={{ color: '#fff', fontSize: '0.95rem', display: 'block' }}>{p.name}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      SKU: {p.sku} &bull; Location: {p.warehouseLocation}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: '#fca5a5', fontWeight: 800, fontSize: '1.1rem' }}>
                      {p.currentStock} units
                    </span>
                    <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Alert at &le; {p.minimumStockAlertQuantity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming CRM Follow-ups Panel */}
        <div className="glass-card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Upcoming CRM Follow-ups</h2>
              <p className="card-subtitle">Scheduled customer conversations</p>
            </div>
            <Link to="/customers" className="btn btn-secondary btn-sm">
              View CRM
            </Link>
          </div>

          {upcomingFollowUps.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No scheduled follow-ups. Select a customer in CRM to schedule one!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {upcomingFollowUps.map((c) => (
                <Link
                  key={c.id}
                  to={`/customers/${c.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div>
                    <strong style={{ color: '#fff', fontSize: '0.95rem', display: 'block' }}>{c.name}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {c.businessName} &bull; {c.mobile}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <Badge type="customer-status" value={c.status} />
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--accent-primary)', marginTop: '0.25rem' }}>
                      📅 {new Date(c.followUpDate!).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Sales Challans Table */}
      <div className="glass-card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Recent Sales Challans</h2>
            <p className="card-subtitle">Latest fulfillment orders and draft notes</p>
          </div>
          <Link to="/challans/new" className="btn btn-primary btn-sm">
            + New Sales Challan
          </Link>
        </div>

        {recentChallans.length === 0 ? (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No sales challans created yet.
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Challan #</th>
                  <th>Customer</th>
                  <th>Total Units</th>
                  <th>Status</th>
                  <th>Created Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentChallans.map((challan) => (
                  <tr key={challan.id}>
                    <td>
                      <strong style={{ color: 'var(--text-accent)' }}>{challan.challanNumber}</strong>
                    </td>
                    <td>
                      <div>{challan.customer?.name}</div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {challan.customer?.businessName}
                      </span>
                    </td>
                    <td>{challan.totalQuantity} items</td>
                    <td>
                      <Badge type="challan-status" value={challan.status} />
                    </td>
                    <td>{new Date(challan.createdAt).toLocaleDateString()}</td>
                    <td>
                      <Link to={`/challans/${challan.id}`} className="btn btn-secondary btn-sm">
                        View Details
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
