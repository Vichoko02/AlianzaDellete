import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import AdminLayout, { ProtectedRoute } from './shared/components/AdminLayout';
import LoginPage from './admin/pages/LoginPage';
import Dashboard from './admin/pages/Dashboard';
import ProductsPage from './admin/pages/ProductsPage';
import OrdersPage from './admin/pages/OrdersPage';
import NewsPage from './admin/pages/NewsPage';
import WikiPage from './admin/pages/WikiPage';
import UsersPage from './admin/pages/UsersPage';
import ProjectsPage from './admin/pages/ProjectsPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/admin/login" element={<LoginPage />} />
          
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={['alianza', 'jefe_proyecto', 'staff']}>
                <AdminLayout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/orders" element={<OrdersPage />} />
                    <Route path="/products" element={<ProductsPage />} />
                    <Route path="/news" element={<NewsPage />} />
                    <Route path="/wiki" element={<WikiPage />} />
                    <Route path="/users" element={
                      <ProtectedRoute allowedRoles={['alianza']}>
                        <UsersPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/projects" element={<ProjectsPage />} />
                    <Route path="*" element={<Navigate to="/admin" replace />} />
                  </Routes>
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
