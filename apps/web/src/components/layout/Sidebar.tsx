import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ChallanIcon,
  DashboardIcon,
  InventoryIcon,
  ProductsIcon,
  UsersIcon,
} from '../common/Icons';

export const Sidebar: React.FC = () => {
  const { hasRole } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon-wrapper">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <div>
          <div className="brand-title">Mini ERP</div>
          <div className="brand-tag">Operations Portal</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <DashboardIcon size={18} />
          <span>Dashboard</span>
        </NavLink>

        {hasRole('ADMIN', 'SALES', 'ACCOUNTS') && (
          <NavLink
            to="/customers"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <UsersIcon size={18} />
            <span>Customer CRM</span>
          </NavLink>
        )}

        <NavLink
          to="/products"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <ProductsIcon size={18} />
          <span>Products Catalog</span>
        </NavLink>

        <NavLink
          to="/inventory"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <InventoryIcon size={18} />
          <span>Stock Ledger</span>
        </NavLink>

        <NavLink
          to="/challans"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <ChallanIcon size={18} />
          <span>Sales Challans</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          Mini ERP v1.0.0 &bull; Enterprise
        </div>
      </div>
    </aside>
  );
};
