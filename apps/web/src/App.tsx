import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AppLayout } from './components/layout/AppLayout';
import { CommandPalette } from './components/common/CommandPalette';
import { RoleProtectedRoute } from './components/common/RoleProtectedRoute';
import { DashboardPage } from './pages/DashboardPage';
import { CustomersPage } from './pages/CustomersPage';
import { CustomerDetailPage } from './pages/CustomerDetailPage';
import { ProductsPage } from './pages/ProductsPage';
import { InventoryPage } from './pages/InventoryPage';
import { ChallansPage } from './pages/ChallansPage';
import { CreateChallanPage } from './pages/CreateChallanPage';
import { ChallanDetailPage } from './pages/ChallanDetailPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { LoginPage } from './pages/LoginPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: 'var(--bg-primary)',
          color: 'var(--text-secondary)',
        }}
      >
        <div style={{ textAlign: 'center', fontSize: '14px' }}>
          Loading...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <CommandPalette />
          <Routes>
            {/* Public Auth Route */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />

            {/* Protected Operations Portal Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />

              {/* CRM - Customers */}
              <Route
                path="customers"
                element={
                  <RoleProtectedRoute allowedRoles={['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS']}>
                    <CustomersPage />
                  </RoleProtectedRoute>
                }
              />
              <Route
                path="customers/:id"
                element={
                  <RoleProtectedRoute allowedRoles={['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS']}>
                    <CustomerDetailPage />
                  </RoleProtectedRoute>
                }
              />

              {/* Products Catalog */}
              <Route
                path="products"
                element={
                  <RoleProtectedRoute allowedRoles={['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS']}>
                    <ProductsPage />
                  </RoleProtectedRoute>
                }
              />

              {/* Inventory Movements */}
              <Route
                path="inventory"
                element={
                  <RoleProtectedRoute allowedRoles={['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS']}>
                    <InventoryPage />
                  </RoleProtectedRoute>
                }
              />

              {/* Sales Challans */}
              <Route
                path="challans"
                element={
                  <RoleProtectedRoute allowedRoles={['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS']}>
                    <ChallansPage />
                  </RoleProtectedRoute>
                }
              />
              <Route
                path="challans/new"
                element={
                  <RoleProtectedRoute allowedRoles={['ADMIN', 'SALES']}>
                    <CreateChallanPage />
                  </RoleProtectedRoute>
                }
              />
              <Route
                path="challans/:id"
                element={
                  <RoleProtectedRoute allowedRoles={['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS']}>
                    <ChallanDetailPage />
                  </RoleProtectedRoute>
                }
              />

              {/* Admin User Management */}
              <Route
                path="admin"
                element={
                  <RoleProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminUsersPage />
                  </RoleProtectedRoute>
                }
              />
              <Route
                path="users"
                element={
                  <RoleProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminUsersPage />
                  </RoleProtectedRoute>
                }
              />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
