import React from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Badge } from './Badge';
import { AlertTriangleIcon } from './Icons';
import type { Role } from '../../types';

interface RoleProtectedRouteProps {
  allowedRoles: Role[];
  children: React.ReactNode;
}

export const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '60vh',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--text-secondary)',
          fontSize: '14px',
        }}
      >
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return (
      <div
        style={{
          minHeight: '70vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}
      >
        <div
          className="card"
          style={{
            maxWidth: '480px',
            width: '100%',
            textAlign: 'center',
            padding: '36px 28px',
            border: '1px solid var(--border)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.12)',
              color: 'var(--danger-text)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}
          >
            <AlertTriangleIcon size={28} />
          </div>

          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
            403 — Access Restricted
          </h2>

          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '20px' }}>
            Your account does not have sufficient operational permissions to view this section.
          </p>

          <div
            style={{
              background: 'var(--bg-secondary)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '13px',
              border: '1px solid var(--border)',
            }}
          >
            <span style={{ color: 'var(--text-muted)' }}>Your Current Role:</span>
            <Badge type="role" value={user?.role || 'USER'} />
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <Link to="/" className="btn btn-primary" style={{ padding: '8px 20px' }}>
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
