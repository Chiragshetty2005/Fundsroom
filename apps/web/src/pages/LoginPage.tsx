import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { Role } from '../types';

interface DemoAccount {
  role: Role;
  label: string;
  email: string;
  badgeClass: string;
  description: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: 'ADMIN',
    label: 'Admin',
    email: 'admin@minierp.local',
    badgeClass: 'primary',
    description: 'Full administrative access across all modules',
  },
  {
    role: 'SALES',
    label: 'Sales Executive',
    email: 'sales@minierp.local',
    badgeClass: 'info',
    description: 'Customer CRM management & sales challan issuance',
  },
  {
    role: 'WAREHOUSE',
    label: 'Warehouse Staff',
    email: 'warehouse@minierp.local',
    badgeClass: 'warning',
    description: 'Product catalog & manual inventory adjustments',
  },
  {
    role: 'ACCOUNTS',
    label: 'Accounts Team',
    email: 'accounts@minierp.local',
    badgeClass: 'success',
    description: 'Read-only financial overview & challan records',
  },
];

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('localTestPass123');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Please enter both email and password.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email, password);
      showToast('Signed in successfully! Welcome back.', 'success');
      navigate('/');
    } catch (error: any) {
      showToast(error.message || 'Login failed. Check credentials.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectDemoRole = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('localTestPass123');
    setIsSubmitting(true);
    try {
      await login(demoEmail, 'localTestPass123');
      showToast(`Signed in as ${demoEmail}`, 'success');
      navigate('/');
    } catch (error: any) {
      showToast(error.message || 'Login failed.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        position: 'relative',
      }}
    >
      <div
        style={{
          width: 'min(100%, 480px)',
          background: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          padding: '2.5rem',
          backdropFilter: 'blur(20px)',
          boxShadow: 'var(--shadow-lg)',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              background: 'var(--accent-gradient)',
              borderRadius: 'var(--radius-lg)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              boxShadow: 'var(--accent-glow)',
              color: '#fff',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.35rem' }}>
            Mini ERP + CRM
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Internal Wholesale & Distribution Operations Portal
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ marginBottom: '2rem' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Work Email Address
            </label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="e.g. admin@minierp.local"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
            style={{ width: '100%', padding: '0.85rem', marginTop: '0.5rem', fontSize: '0.95rem' }}
          >
            {isSubmitting ? 'Signing in...' : 'Sign In to Portal'}
          </button>
        </form>

        {/* Quick Demo Logins for evaluators */}
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1rem',
              color: 'var(--text-muted)',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
            <span>1-Click Test Login (Evaluation)</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.role}
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => selectDemoRole(account.email)}
                disabled={isSubmitting}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '0.65rem 0.85rem',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', width: '100%' }}>
                  <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.85rem' }}>{account.label}</span>
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{account.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
