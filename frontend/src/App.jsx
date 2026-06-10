import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ProtectedRoute, RoleProtectedRoute } from './components/ProtectedRoute.jsx';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage.jsx';
import CreatePurchaseOrderPage from './pages/CreatePurchaseOrderPage.jsx';
import EditPurchaseOrderPage from './pages/EditPurchaseOrderPage.jsx';
import InvoicesPage from './pages/InvoicesPage.jsx';
import UploadInvoicePage from './pages/UploadInvoicePage.jsx';
import InvoiceDetailsPage from './pages/InvoiceDetailsPage.jsx';
import ValidationWorkspacePage from './pages/ValidationWorkspacePage.jsx';
import ValidationQueuePage from './pages/ValidationQueuePage.jsx';
import VendorsPage from './pages/VendorsPage.jsx';
import ExceptionsPage from './pages/ExceptionsPage.jsx';
import ExceptionDetailsPage from './pages/ExceptionDetailsPage.jsx';
import PaymentWorkbenchPage from './pages/PaymentWorkbenchPage.jsx';
import WorkspacePage from './pages/WorkspacePage.jsx';
import NotificationCenter from './pages/NotificationCenter.jsx';

/**
 * Main App Component configuring client-side routing and providers.
 */
function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Authentication Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Root Redirect to Dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Dashboard Route wrapped in MainLayout, ProtectedRoute, and RoleProtectedRoute */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={['Admin', 'Manager', 'AccountsExecutive']}>
                  <MainLayout>
                    <DashboardPage />
                  </MainLayout>
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />

          {/* Vendor Management Routes */}
          <Route
            path="/vendors"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={['Admin', 'Manager', 'AccountsExecutive']}>
                  <MainLayout>
                    <VendorsPage />
                  </MainLayout>
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />

          {/* Purchase Order Management Routes */}
          <Route
            path="/purchase-orders"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={['Admin', 'Manager', 'AccountsExecutive']}>
                  <MainLayout>
                    <PurchaseOrdersPage />
                  </MainLayout>
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/purchase-orders/create"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={['Admin', 'Manager']}>
                  <MainLayout>
                    <CreatePurchaseOrderPage />
                  </MainLayout>
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/purchase-orders/edit/:id"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={['Admin', 'Manager']}>
                  <MainLayout>
                    <EditPurchaseOrderPage />
                  </MainLayout>
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />

          {/* Invoice Ingestion Routes */}
          <Route
            path="/invoices"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={['Admin', 'Manager', 'AccountsExecutive']}>
                  <MainLayout>
                    <InvoicesPage />
                  </MainLayout>
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/invoices/upload"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={['Admin', 'Manager', 'AccountsExecutive']}>
                  <MainLayout>
                    <UploadInvoicePage />
                  </MainLayout>
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/invoices/:id"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={['Admin', 'Manager', 'AccountsExecutive']}>
                  <MainLayout>
                    <InvoiceDetailsPage />
                  </MainLayout>
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/validation/:invoiceId"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={['Admin', 'Manager', 'AccountsExecutive']}>
                  <MainLayout>
                    <ValidationWorkspacePage />
                  </MainLayout>
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/validation"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={['Admin', 'Manager', 'AccountsExecutive']}>
                  <MainLayout>
                    <ValidationQueuePage />
                  </MainLayout>
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/exceptions"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={['Admin', 'Manager', 'AccountsExecutive']}>
                  <MainLayout>
                    <ExceptionsPage />
                  </MainLayout>
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/exceptions/:id"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={['Admin', 'Manager', 'AccountsExecutive']}>
                  <MainLayout>
                    <ExceptionDetailsPage />
                  </MainLayout>
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/payment-workbench"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={['Admin', 'Manager', 'AccountsExecutive']}>
                  <MainLayout>
                    <PaymentWorkbenchPage />
                  </MainLayout>
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/workspace/:invoiceId"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={['Admin', 'Manager', 'AccountsExecutive']}>
                  <MainLayout>
                    <WorkspacePage />
                  </MainLayout>
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <NotificationCenter />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* 404 Route */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
