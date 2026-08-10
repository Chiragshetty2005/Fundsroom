import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';
import { LogoutIcon } from '../common/Icons';

export const Topbar: React.FC = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="topbar">
      <div className="topbar-title-section">
        {/* Dynamic breadcrumb or page title */}
      </div>

      <div className="topbar-actions">
        <div className="user-badge-pill">
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <span className="user-name">{user.name}</span>
            <span className="user-role-label">{user.email}</span>
          </div>
          <Badge type="role" value={user.role} />
        </div>

        <button
          className="btn btn-secondary btn-sm"
          onClick={logout}
          title="Sign out"
          style={{ padding: '0.45rem 0.75rem' }}
        >
          <LogoutIcon size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
};
