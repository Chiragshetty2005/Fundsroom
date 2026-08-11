import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/common/Badge';
import { PlusIcon, SearchIcon, TrashIcon, UsersIcon } from '../components/common/Icons';
import { Modal } from '../components/common/Modal';
import { StatCard } from '../components/common/StatCard';
import type { AdminUserItem, Role } from '../types';

const ROLES: Role[] = ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS', 'USER'];

export const AdminUsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');

  // Add User Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'USER' as Role,
  });

  // Role Edit Modal State
  const [editingUser, setEditingUser] = useState<AdminUserItem | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role>('USER');
  const [updatingRole, setUpdatingRole] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: AdminUserItem[] }>('/users');
      setUsers(res.data);
    } catch (error: any) {
      showToast(error.message || 'Failed to load users list.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.password) {
      showToast('Please fill all required fields.', 'error');
      return;
    }

    if (newUser.password.length < 6) {
      showToast('Password must be at least 6 characters.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/users', newUser);
      showToast(`User ${newUser.name} created with role ${newUser.role}.`, 'success');
      setIsAddOpen(false);
      setNewUser({ name: '', email: '', password: '', role: 'USER' });
      loadUsers();
    } catch (error: any) {
      showToast(error.message || 'Failed to create user.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenRoleModal = (u: AdminUserItem) => {
    setEditingUser(u);
    setSelectedRole(u.role);
  };

  const handleSaveRoleChange = async () => {
    if (!editingUser) return;
    setUpdatingRole(true);
    try {
      await api.patch(`/users/${editingUser.id}/role`, { role: selectedRole });
      showToast(`Updated role for ${editingUser.name} to ${selectedRole}.`, 'success');
      setEditingUser(null);
      loadUsers();
    } catch (error: any) {
      showToast(error.message || 'Failed to update role.', 'error');
    } finally {
      setUpdatingRole(false);
    }
  };

  const handleQuickRoleChange = async (userId: string, targetRole: Role) => {
    try {
      await api.patch(`/users/${userId}/role`, { role: targetRole });
      showToast(`Role updated to ${targetRole}.`, 'success');
      loadUsers();
    } catch (error: any) {
      showToast(error.message || 'Failed to change role.', 'error');
    }
  };

  const handleDeleteUser = async (u: AdminUserItem) => {
    if (u.id === currentUser?.id) {
      showToast('You cannot delete your own logged-in account.', 'error');
      return;
    }

    if (!window.confirm(`Are you sure you want to remove user "${u.name}" (${u.email})?`)) {
      return;
    }

    try {
      await api.delete(`/users/${u.id}`);
      showToast(`User ${u.name} has been removed.`, 'success');
      loadUsers();
    } catch (error: any) {
      showToast(error.message || 'Failed to delete user.', 'error');
    }
  };

  // Filtered list
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = !roleFilter || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Role summary stats
  const totalCount = users.length;
  const adminCount = users.filter((u) => u.role === 'ADMIN').length;
  const salesCount = users.filter((u) => u.role === 'SALES').length;
  const warehouseCount = users.filter((u) => u.role === 'WAREHOUSE').length;
  const accountsCount = users.filter((u) => u.role === 'ACCOUNTS').length;
  const pendingUserCount = users.filter((u) => u.role === 'USER').length;

  return (
    <div>
      <div className="action-bar">
        <div>
          <h1 className="page-title">User & Role Management</h1>
          <p className="page-subtitle">Configure system users, role-based access, and operational permissions</p>
        </div>

        <button className="btn btn-primary" onClick={() => setIsAddOpen(true)}>
          <PlusIcon size={16} />
          <span>Add User</span>
        </button>
      </div>

      {/* Role Distribution Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <StatCard
          label="Total Users"
          value={loading ? '—' : totalCount}
          icon={<UsersIcon size={18} />}
          variant="primary"
        />
        <StatCard
          label="Admins"
          value={loading ? '—' : adminCount}
          icon={<span style={{ fontWeight: 700, fontSize: '13px' }}>ADM</span>}
          variant="primary"
        />
        <StatCard
          label="Sales Team"
          value={loading ? '—' : salesCount}
          icon={<span style={{ fontWeight: 700, fontSize: '13px' }}>SAL</span>}
          variant="info"
        />
        <StatCard
          label="Warehouse Team"
          value={loading ? '—' : warehouseCount}
          icon={<span style={{ fontWeight: 700, fontSize: '13px' }}>WH</span>}
          variant="warning"
        />
        <StatCard
          label="Accounts Team"
          value={loading ? '—' : accountsCount}
          icon={<span style={{ fontWeight: 700, fontSize: '13px' }}>ACC</span>}
          variant="success"
        />
        <StatCard
          label="Standard Users (Pending)"
          value={loading ? '—' : pendingUserCount}
          icon={<span style={{ fontWeight: 700, fontSize: '13px' }}>USR</span>}
          variant={pendingUserCount > 0 ? 'warning' : 'primary'}
        />
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <SearchIcon className="search-icon" size={15} />
          <input
            type="text"
            className="form-input"
            placeholder="Search by user name or email address"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="form-select"
          style={{ width: '170px' }}
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">All Roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r} ({users.filter((u) => u.role === r).length})
            </option>
          ))}
        </select>
      </div>

      {/* Users Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Current Role</th>
              <th>Change Role</th>
              <th>Recorded Activity</th>
              <th>Joined Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  Loading system users...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  {search || roleFilter
                    ? 'No users match the search criteria.'
                    : 'No users found in the system.'}
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => {
                const isSelf = u.id === currentUser?.id;
                const totalActivity =
                  (u._count?.createdChallans || 0) +
                  (u._count?.stockMovements || 0) +
                  (u._count?.createdFollowUps || 0);

                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'var(--bg-tertiary)',
                            border: '1px solid var(--border)',
                            display: 'grid',
                            placeItems: 'center',
                            fontWeight: 600,
                            fontSize: '12px',
                            color: 'var(--accent)',
                          }}
                        >
                          {u.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>
                            {u.name} {isSelf && <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 500 }}>(You)</span>}
                          </div>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge type="role" value={u.role} />
                    </td>
                    <td>
                      <select
                        className="form-select"
                        style={{ width: '135px', padding: '4px 8px', fontSize: '12px', height: '32px' }}
                        value={u.role}
                        onChange={(e) => handleQuickRoleChange(u.id, e.target.value as Role)}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <span className="tabular" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {totalActivity > 0 ? (
                          <span>
                            {u._count?.createdChallans || 0} challans · {u._count?.stockMovements || 0} moves · {u._count?.createdFollowUps || 0} notes
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>No records</span>
                        )}
                      </span>
                    </td>
                    <td>
                      <span className="tabular" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {new Date(u.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions" style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenRoleModal(u)}
                        >
                          Details
                        </button>

                        {!isSelf && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-icon"
                            title="Delete user"
                            onClick={() => handleDeleteUser(u)}
                            style={{ color: 'var(--danger-text)' }}
                          >
                            <TrashIcon size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add New User"
        size="md"
      >
        <form onSubmit={handleCreateUser}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="e.g. Jordan Miller"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              required
              placeholder="jordan@minierp.local"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Temporary Password</label>
            <input
              type="password"
              className="form-input"
              required
              placeholder="Minimum 6 characters"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Assign Initial Role</label>
            <select
              className="form-select"
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value as Role })}
            >
              <option value="USER">USER (Standard default, view dashboard only)</option>
              <option value="SALES">SALES (Manage customers, leads, create challans)</option>
              <option value="WAREHOUSE">WAREHOUSE (Manage products, adjust inventory)</option>
              <option value="ACCOUNTS">ACCOUNTS (Read-only access across modules)</option>
              <option value="ADMIN">ADMIN (Full access + User management)</option>
            </select>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsAddOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Change Role Modal */}
      <Modal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title={editingUser ? `Manage Role for ${editingUser.name}` : 'Change Role'}
      >
        {editingUser && (
          <div>
            <div style={{ marginBottom: '16px', background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{editingUser.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{editingUser.email}</div>
              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Current Role:</span>
                <Badge type="role" value={editingUser.role} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Select New Role</label>
              <select
                className="form-select"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as Role)}
              >
                <option value="ADMIN">ADMIN (Full Administrator)</option>
                <option value="SALES">SALES (CRM & Sales Challans)</option>
                <option value="WAREHOUSE">WAREHOUSE (Product Catalog & Inventory)</option>
                <option value="ACCOUNTS">ACCOUNTS (Read-Only Financials & Audits)</option>
                <option value="USER">USER (Standard Base Access)</option>
              </select>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, marginTop: '8px' }}>
              <strong>Permission Breakdown:</strong>
              <ul style={{ paddingLeft: '16px', marginTop: '4px' }}>
                <li><strong>ADMIN:</strong> Manage all resources and assign user roles.</li>
                <li><strong>SALES:</strong> Create & edit customers, record follow-ups, issue challans.</li>
                <li><strong>WAREHOUSE:</strong> Create & edit products, perform manual stock adjustments.</li>
                <li><strong>ACCOUNTS:</strong> Complete read-only view of CRM, Inventory, and Challans.</li>
                <li><strong>USER:</strong> Default entry-level role awaiting assignment.</li>
              </ul>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setEditingUser(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveRoleChange}
                disabled={updatingRole}
              >
                {updatingRole ? 'Updating...' : 'Save Role'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
