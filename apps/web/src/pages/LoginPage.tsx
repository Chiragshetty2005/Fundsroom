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
  { role: 'USER', label: 'User', email: 'user@minierp.local' },
];

export const LoginPage: React.FC = () => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  
  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Sign up fields
  const [name, setName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, signup } = useAuth();
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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !signupEmail.trim() || !signupPassword) {
      showToast('Please fill out all required fields.', 'error');
      return;
    }

    if (signupPassword.length < 6) {
      showToast('Password must be at least 6 characters.', 'error');
      return;
    }

    if (signupPassword !== confirmPassword) {
      showToast('Passwords do not match. Please verify.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await signup(name.trim(), signupEmail.trim(), signupPassword);
      showToast('Account created successfully! Welcome to Mini ERP.', 'success');
      navigate('/');
    } catch (error: any) {
      showToast(error.message || 'Sign-up failed. Please try again.', 'error');
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
      <div className="login-card" style={{ maxWidth: '440px' }}>
        <div className="login-header">
          <div
            style={{
              width: '44px',
              height: '44px',
              background: 'var(--accent)',
              borderRadius: 'var(--radius-md)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="login-title">Mini ERP</h1>
          <p className="login-subtitle">
            Enterprise resource planning & operations portal
          </p>
        </div>

        {/* Auth Mode Switcher */}
        <div
          style={{
            display: 'flex',
            background: 'var(--bg-secondary)',
            padding: '4px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '20px',
            border: '1px solid var(--border)',
          }}
        >
          <button
            type="button"
            className={`btn btn-sm ${mode === 'signin' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              flex: 1,
              border: 'none',
              background: mode === 'signin' ? 'var(--accent)' : 'transparent',
              color: mode === 'signin' ? '#fff' : 'var(--text-secondary)',
              fontWeight: 600,
            }}
            onClick={() => setMode('signin')}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`btn btn-sm ${mode === 'signup' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              flex: 1,
              border: 'none',
              background: mode === 'signup' ? 'var(--accent)' : 'transparent',
              color: mode === 'signup' ? '#fff' : 'var(--text-secondary)',
              fontWeight: 600,
            }}
            onClick={() => setMode('signup')}
          >
            Create Account
          </button>
        </div>

        {mode === 'signin' ? (
          /* Sign In Form */
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
              style={{ width: '100%', padding: '11px', marginTop: '6px', fontWeight: 600 }}
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        ) : (
          /* Sign Up Form */
          <form onSubmit={handleSignup} style={{ marginBottom: '24px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="signup-name">
                Full Name
              </label>
              <input
                id="signup-name"
                type="text"
                className="form-input"
                placeholder="Alex Morgan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="signup-email">
                Email address
              </label>
              <input
                id="signup-email"
                type="email"
                className="form-input"
                placeholder="alex@company.com"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="signup-password">
                Password
              </label>
              <input
                id="signup-password"
                type="password"
                className="form-input"
                placeholder="At least 6 characters"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="signup-confirm-password">
                Confirm Password
              </label>
              <input
                id="signup-confirm-password"
                type="password"
                className="form-input"
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <div
              style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                background: 'var(--bg-secondary)',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '14px',
                lineHeight: 1.4,
              }}
            >
              New accounts are created with standard <strong>USER</strong> role. An administrator can elevate your access to Sales, Warehouse, Accounts, or Admin.
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{ width: '100%', padding: '11px', fontWeight: 600 }}
            >
              {isSubmitting ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        )}

        {/* Demo Accounts Quick-Select */}
        <div className="login-divider">
          <span>Quick test logins</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
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
              <span style={{ fontWeight: 600, fontSize: '12px' }}>{account.label}</span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '100%' }}>
                {account.email}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
