import { useState, useEffect } from 'react';
import { ordersApi, productsApi, usersApi } from '../../services/api';

interface Stats {
  totalOrders: number;
  pendingOrders: number;
  totalProducts: number;
  totalUsers: number;
  revenue: number;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
  userEmail?: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalOrders: 0,
    pendingOrders: 0,
    totalProducts: 0,
    totalUsers: 0,
    revenue: 0,
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [ordersData, productsData, usersData, revenueData] = await Promise.all([
        ordersApi.getStats().catch(() => ({ byStatus: {}, total: 0 })),
        productsApi.getAll().catch(() => []),
        usersApi.getAll().catch(() => ({ total: 0 })),
        ordersApi.getRevenue('month').catch(() => ({ totalRevenue: 0 })),
      ]);

      setStats({
        totalOrders: ordersData.total || 0,
        pendingOrders: ordersData.byStatus?.pending || 0,
        totalProducts: Array.isArray(productsData) ? productsData.length : 0,
        totalUsers: usersData.total || 0,
        revenue: revenueData.totalRevenue || 0,
      });

      const orders = await ordersApi.getAll(undefined, 1).catch(() => ({ orders: [] }));
      setRecentOrders(orders.orders?.slice(0, 5) || []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'paid':
      case 'delivered':
        return 'admin-badge-success';
      case 'pending':
      case 'processing':
        return 'admin-badge-warning';
      case 'cancelled':
        return 'admin-badge-danger';
      default:
        return 'admin-badge-info';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="admin-content">
        <header className="admin-header">
          <h1 className="admin-header-title">Dashboard</h1>
        </header>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          Cargando...
        </div>
      </div>
    );
  }

  return (
    <div className="admin-content">
      <header className="admin-header">
        <h1 className="admin-header-title">Dashboard</h1>
      </header>

      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-icon red">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
            </svg>
          </div>
          <div className="admin-stat-content">
            <div className="admin-stat-value">{stats.totalOrders}</div>
            <div className="admin-stat-label">Total Órdenes</div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon yellow">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
            </svg>
          </div>
          <div className="admin-stat-content">
            <div className="admin-stat-value">{stats.pendingOrders}</div>
            <div className="admin-stat-label">Órdenes Pendientes</div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon blue">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 6h-2c0-2.21-1.79-4-4-4S8 3.79 8 6H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6-2c1.1 0 2 .9 2 2h-4c0-1.1.9-2 2-2zm6 16H6V8h2v2c0 .55.45 1 1 1s1-.45 1-1V8h4v2c0 .55.45 1 1 1s1-.45 1-1V8h2v12z" />
            </svg>
          </div>
          <div className="admin-stat-content">
            <div className="admin-stat-value">{stats.totalProducts}</div>
            <div className="admin-stat-label">Productos</div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon green">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
          <div className="admin-stat-content">
            <div className="admin-stat-value">{stats.totalUsers}</div>
            <div className="admin-stat-label">Usuarios</div>
          </div>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">Órdenes Recientes</h2>
        </div>

        {recentOrders.length > 0 ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Orden</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id}>
                  <td>{order.orderNumber}</td>
                  <td>{formatCurrency(order.total)}</td>
                  <td>
                    <span className={`admin-badge ${getStatusBadgeClass(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td>{formatDate(order.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="admin-empty">
            <p>No hay órdenes recientes</p>
          </div>
        )}
      </div>
    </div>
  );
}
