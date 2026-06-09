import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
import InvoiceReviewPage from './pages/InvoiceReviewPage.jsx';
import VendorsPage from './pages/VendorsPage.jsx';

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

          {/* Dashboard & Workspace Routes wrapped in MainLayout & ProtectedRoute */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <DashboardPage />
                </MainLayout>
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
            path="/review/:invoiceId"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={['Admin', 'Manager', 'AccountsExecutive']}>
                  <MainLayout>
                    <InvoiceReviewPage />
                  </MainLayout>
                </RoleProtectedRoute>
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
