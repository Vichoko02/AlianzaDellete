import { ReactNode, useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import AdminSidebar from './AdminSidebar';
import ThemeToggle from './ThemeToggle';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('adminDarkMode');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.body.classList.toggle('dark-theme', isDarkMode);
    localStorage.setItem('adminDarkMode', String(isDarkMode));
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(prev => !prev);

  if (isLoading) {
    return (
      <div className="admin-login-page">
        <div className="admin-login-card">
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <main className="admin-main">
        <header className="admin-header">
          <div className="admin-header-left">
            <h1 className="admin-header-title"></h1>
          </div>
          <div className="admin-header-actions">
            <ThemeToggle isDarkMode={isDarkMode} onToggle={toggleTheme} />
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user, hasRole } = useAuth();

  if (isLoading) {
    return (
      <div className="admin-login-page">
        <div className="admin-login-card">
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  if (allowedRoles && !hasRole(allowedRoles as any)) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}
