import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ChallanIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DashboardIcon,
  InventoryIcon,
  ProductsIcon,
  UsersIcon,
} from '../common/Icons';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const { hasRole } = useAuth();

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-brand">
        <div className="brand-icon-wrapper">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <div className="brand-text">
          <div className="brand-title">Mini ERP</div>
          <div className="brand-tag">Operations</div>
        </div>
        <button
          className="sidebar-toggle"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRightIcon size={14} /> : <ChevronLeftIcon size={14} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          title="Dashboard"
        >
          <DashboardIcon size={18} />
          <span>Dashboard</span>
        </NavLink>

        {hasRole('ADMIN', 'SALES', 'ACCOUNTS') && (
          <NavLink
            to="/customers"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            title="CRM"
          >
            <UsersIcon size={18} />
            <span>CRM</span>
          </NavLink>
        )}

        <NavLink
          to="/products"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          title="Products"
        >
          <ProductsIcon size={18} />
          <span>Products</span>
        </NavLink>

        <NavLink
          to="/inventory"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          title="Inventory"
        >
          <InventoryIcon size={18} />
          <span>Inventory</span>
        </NavLink>

        <NavLink
          to="/challans"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          title="Sales Challans"
        >
          <ChallanIcon size={18} />
          <span>Sales Challans</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-footer-text" style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
          Mini ERP v1.0
        </div>
      </div>
    </aside>
  );
};
