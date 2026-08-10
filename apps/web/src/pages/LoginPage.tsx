import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { Role } from '../types';

interface DemoAccount {
  role: Role;
  label: string;
  email: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  { role: 'ADMIN', label: 'Admin', email: 'admin@minierp.local' },
  { role: 'SALES', label: 'Sales', email: 'sales@minierp.local' },
  { role: 'WAREHOUSE', label: 'Warehouse', email: 'warehouse@minierp.local' },
  { role: 'ACCOUNTS', label: 'Accounts', email: 'accounts@minierp.local' },
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
      showToast('Enter both email and password to sign in.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email, password);
      showToast('Signed in successfully.', 'success');
      navigate('/');
    } catch (error: any) {
      showToast(error.message || 'Sign-in failed. Check your credentials and try again.', 'error');
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
      showToast(error.message || 'Sign-in failed.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div
            style={{
              width: '40px',
              height: '40px',
              background: 'var(--accent)',
              borderRadius: 'var(--radius-md)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              color: '#fff',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="login-title">Mini ERP</h1>
          <p className="login-subtitle">
            Operations portal for wholesale and distribution
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ marginBottom: '24px' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              className="form-input"
              placeholder="admin@minierp.local"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              className="form-input"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
            style={{ width: '100%', padding: '10px', marginTop: '4px' }}
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="login-divider">
          <span>Test accounts</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
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
                padding: '8px 10px',
                textAlign: 'left',
              }}
            >
              <span style={{ fontWeight: 600, fontSize: '13px' }}>{account.label}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{account.email}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
