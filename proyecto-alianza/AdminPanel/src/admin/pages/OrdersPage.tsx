import { useState, useEffect } from 'react';
import { ordersApi } from '../../services/api';
import { Order } from '../../types';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const loadOrders = async () => {
    try {
      const data = await ordersApi.getAll(statusFilter || undefined, 1);
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      await ordersApi.updateStatus(orderId, newStatus);
      loadOrders();
      setSelectedOrder(null);
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
    }).format(amount / 100);
  };

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadgeClass = (status: string) => {
    const classes: Record<string, string> = {
      pending: 'admin-badge-warning',
      paid: 'admin-badge-success',
      processing: 'admin-badge-info',
      shipped: 'admin-badge-info',
      delivered: 'admin-badge-success',
      cancelled: 'admin-badge-danger',
    };
    return classes[status] || 'admin-badge-info';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      paid: 'Pagado',
      processing: 'Procesando',
      shipped: 'Enviado',
      delivered: 'Entregado',
      cancelled: 'Cancelado',
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="admin-content">
        <header className="admin-header">
          <h1 className="admin-header-title">Órdenes</h1>
        </header>
        <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando...</div>
      </div>
    );
  }

  return (
    <div className="admin-content">
      <header className="admin-header">
        <h1 className="admin-header-title">Órdenes</h1>
        <div className="admin-header-actions">
          <select
            className="admin-form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: 'auto' }}
          >
            <option value="">Todos los estados</option>
            <option value="pending">Pendiente</option>
            <option value="paid">Pagado</option>
            <option value="processing">Procesando</option>
            <option value="shipped">Enviado</option>
            <option value="delivered">Entregado</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>
      </header>

      <div className="admin-card">
        {orders.length > 0 ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Orden</th>
                <th>Cliente</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td style={{ fontWeight: 600 }}>{order.orderNumber}</td>
                  <td>{order.userId || 'Cliente'}</td>
                  <td>{formatCurrency(order.total, order.currency)}</td>
                  <td>
                    <span className={`admin-badge ${getStatusBadgeClass(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </td>
                  <td>{formatDate(order.createdAt)}</td>
                  <td>
                    <button
                      className="admin-btn admin-btn-sm admin-btn-secondary"
                      onClick={() => setSelectedOrder(order)}
                    >
                      Ver Detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="admin-empty">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
            </svg>
            <p>No hay órdenes</p>
          </div>
        )}
      </div>

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdateStatus={handleUpdateStatus}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          getStatusBadgeClass={getStatusBadgeClass}
          getStatusLabel={getStatusLabel}
        />
      )}
    </div>
  );
}

function OrderDetailModal({
  order,
  onClose,
  onUpdateStatus,
  formatCurrency,
  formatDate,
  getStatusBadgeClass,
  getStatusLabel,
}: {
  order: Order;
  onClose: () => void;
  onUpdateStatus: (id: string, status: string) => void;
  formatCurrency: (amount: number, currency?: string) => string;
  formatDate: (date?: string) => string;
  getStatusBadgeClass: (status: string) => string;
  getStatusLabel: (status: string) => string;
}) {
  const statuses = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'];

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" style={{ maxWidth: 700 }} onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h2 className="admin-modal-title">Orden {order.orderNumber}</h2>
          <button className="admin-modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        <div className="admin-modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <div className="admin-form-label">Estado</div>
              <span className={`admin-badge ${getStatusBadgeClass(order.status)}`} style={{ fontSize: 14, padding: '6px 12px' }}>
                {getStatusLabel(order.status)}
              </span>
            </div>
            <div>
              <div className="admin-form-label">Fecha</div>
              <div>{formatDate(order.createdAt)}</div>
            </div>
          </div>

          {order.shippingAddress && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div className="admin-form-label">Dirección de Envío</div>
              <div style={{ background: '#f5f5f5', padding: '1rem', borderRadius: 8 }}>
                <div>{order.shippingAddress.name}</div>
                <div>{order.shippingAddress.street}</div>
                <div>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}</div>
                <div>{order.shippingAddress.country}</div>
              </div>
            </div>
          )}

          <div className="admin-form-label">Productos</div>
          <table className="admin-table" style={{ marginBottom: '1rem' }}>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Precio</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, i) => (
                <tr key={i}>
                  <td>{item.productName} - {item.variantName}</td>
                  <td>{item.quantity}</td>
                  <td>{formatCurrency(item.unitPrice, order.currency)}</td>
                  <td>{formatCurrency(item.subtotal, order.currency)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} style={{ textAlign: 'right', fontWeight: 600 }}>Total:</td>
                <td style={{ fontWeight: 600 }}>{formatCurrency(order.total, order.currency)}</td>
              </tr>
            </tfoot>
          </table>

          <div className="admin-form-group">
            <label className="admin-form-label">Actualizar Estado</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {statuses.map((status) => (
                <button
                  key={status}
                  className={`admin-btn admin-btn-sm ${order.status === status ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
                  onClick={() => onUpdateStatus(order.id, status)}
                  disabled={order.status === status}
                >
                  {getStatusLabel(status)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="admin-modal-footer">
          <button className="admin-btn admin-btn-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
