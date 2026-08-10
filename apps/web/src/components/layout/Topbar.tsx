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
        >
          <LogoutIcon size={14} />
          <span>Sign out</span>
        </button>
      </div>
    </header>
  );
};
