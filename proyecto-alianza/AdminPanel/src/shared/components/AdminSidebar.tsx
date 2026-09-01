import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const navItems = [
  {
    section: 'Principal',
    items: [
      { path: '/admin', label: 'Dashboard', icon: DashboardIcon },
      { path: '/admin/orders', label: 'Órdenes', icon: OrdersIcon },
    ],
  },
  {
    section: 'Gestión',
    items: [
      { path: '/admin/products', label: 'Productos', icon: ProductsIcon },
      { path: '/admin/news', label: 'Noticias', icon: NewsIcon },
      { path: '/admin/wiki', label: 'Wikis', icon: WikiIcon },
      { path: '/admin/projects', label: 'Proyectos', icon: ProjectsIcon },
    ],
  },
  {
    section: 'Usuarios',
    items: [
      { path: '/admin/users', label: 'Usuarios', icon: UsersIcon },
    ],
  },
  {
    section: 'Sistema',
    items: [
      { path: '/admin/settings', label: 'Configuración', icon: SettingsIcon },
    ],
  },
];

export default function AdminSidebar() {
  const { user, logout, hasRole } = useAuth();
  const location = useLocation();

  const canViewSection = (section: string) => {
    switch (section) {
      case 'Usuarios':
        return hasRole(['alianza']);
      case 'Sistema':
        return hasRole(['alianza']);
      default:
        return true;
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'alianza':
        return 'Administrador';
      case 'jefe_proyecto':
        return 'Jefe de Proyecto';
      case 'staff':
        return 'Staff';
      default:
        return 'Usuario';
    }
  };

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-header">
        <Link to="/admin" className="admin-sidebar-logo">
          ALIANZA<span>ADMIN</span>
        </Link>
      </div>

      <nav className="admin-nav">
        {navItems.map((section) =>
          canViewSection(section.section) ? (
            <div key={section.section} className="admin-nav-section">
              <div className="admin-nav-section-title">{section.section}</div>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path ||
                  (item.path !== '/admin' && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`admin-nav-link ${isActive ? 'active' : ''}`}
                  >
                    <Icon />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ) : null
        )}
      </nav>

      <div className="admin-sidebar-footer">
        <div className="admin-user-info">
          <div className="admin-user-avatar">
            {getInitials(user?.displayName)}
          </div>
          <div className="admin-user-details">
            <div className="admin-user-name">{user?.displayName || 'Usuario'}</div>
            <div className="admin-user-role">{getRoleLabel(user?.role)}</div>
          </div>
        </div>
        <button className="admin-logout-btn" onClick={logout}>
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
    </svg>
  );
}

function OrdersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
    </svg>
  );
}

function ProductsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 6h-2c0-2.21-1.79-4-4-4S8 3.79 8 6H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6-2c1.1 0 2 .9 2 2h-4c0-1.1.9-2 2-2zm6 16H6V8h2v2c0 .55.45 1 1 1s1-.45 1-1V8h4v2c0 .55.45 1 1 1s1-.45 1-1V8h2v12z" />
    </svg>
  );
}

function NewsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M22 3l-1.67 1.67L18.67 3 17 4.67 15.33 3l-1.66 1.67L12 3l-1.67 1.67L8.67 3 7 4.67 5.33 3 3.67 4.67 2 3v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V3zM11 19H4v-6h7v6zm9 0h-7v-2h7v2zm0-4h-7v-2h7v2zm0-4H4V5h16v6z" />
    </svg>
  );
}

function WikiIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
    </svg>
  );
}

function ProjectsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
    </svg>
  );
}
