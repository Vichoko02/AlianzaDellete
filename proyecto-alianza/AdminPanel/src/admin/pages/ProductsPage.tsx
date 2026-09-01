import { useState, useEffect } from 'react';
import { productsApi } from '../../services/api';
import { Product } from '../../types';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await productsApi.getAll();
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;
    
    try {
      await productsApi.delete(id);
      setProducts(products.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
    }).format(amount / 100);
  };

  const getCategoryBadge = (category: string) => {
    const classes: Record<string, string> = {
      ropa: 'admin-badge-info',
      accesorios: 'admin-badge-warning',
      digital: 'admin-badge-success',
      impresos: 'admin-badge-danger',
    };
    return classes[category] || 'admin-badge-info';
  };

  if (loading) {
    return (
      <div className="admin-content">
        <header className="admin-header">
          <h1 className="admin-header-title">Productos</h1>
        </header>
        <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando...</div>
      </div>
    );
  }

  return (
    <div className="admin-content">
      <header className="admin-header">
        <h1 className="admin-header-title">Productos</h1>
        <div className="admin-header-actions">
          <button className="admin-btn admin-btn-primary" onClick={() => setShowModal(true)}>
            + Nuevo Producto
          </button>
        </div>
      </header>

      <div className="admin-card">
        {products.length > 0 ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Precio</th>
                <th>Categoría</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {product.images?.[0] && (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8 }}
                        />
                      )}
                      <div>
                        <div style={{ fontWeight: 600 }}>{product.name}</div>
                        <div style={{ fontSize: 12, color: '#666' }}>{product.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td>{formatCurrency(product.price, product.currency)}</td>
                  <td>
                    <span className={`admin-badge ${getCategoryBadge(product.category)}`}>
                      {product.category}
                    </span>
                  </td>
                  <td>
                    <span className={`admin-badge ${product.isActive ? 'admin-badge-success' : 'admin-badge-danger'}`}>
                      {product.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div className="admin-actions">
                      <button
                        className="admin-action-btn"
                        onClick={() => {
                          setEditingProduct(product);
                          setShowModal(true);
                        }}
                        title="Editar"
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                        </svg>
                      </button>
                      <button
                        className="admin-action-btn danger"
                        onClick={() => handleDelete(product.id)}
                        title="Eliminar"
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="admin-empty">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 6h-2c0-2.21-1.79-4-4-4S8 3.79 8 6H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6-2c1.1 0 2 .9 2 2h-4c0-1.1.9-2 2-2zm6 16H6V8h2v2c0 .55.45 1 1 1s1-.45 1-1V8h4v2c0 .55.45 1 1 1s1-.45 1-1V8h2v12z" />
            </svg>
            <p>No hay productos registrados</p>
          </div>
        )}
      </div>

      {showModal && (
        <ProductModal
          product={editingProduct}
          onClose={() => {
            setShowModal(false);
            setEditingProduct(null);
          }}
          onSave={() => {
            setShowModal(false);
            setEditingProduct(null);
            loadProducts();
          }}
        />
      )}
    </div>
  );
}

function ProductModal({
  product,
  onClose,
  onSave,
}: {
  product: Product | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product ? product.price / 100 : 0,
    category: product?.category || 'ropa',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        ...formData,
        price: formData.price * 100,
      };

      if (product) {
        await productsApi.update(product.id, data);
      } else {
        await productsApi.create(data);
      }
      onSave();
    } catch (error) {
      console.error('Error saving product:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h2 className="admin-modal-title">
            {product ? 'Editar Producto' : 'Nuevo Producto'}
          </h2>
          <button className="admin-modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="admin-modal-body">
            <div className="admin-form-group">
              <label className="admin-form-label">Nombre</label>
              <input
                type="text"
                className="admin-form-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Descripción</label>
              <textarea
                className="admin-form-textarea"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="admin-form-group">
                <label className="admin-form-label">Precio (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  className="admin-form-input"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                  required
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Categoría</label>
                <select
                  className="admin-form-select"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="ropa">Ropa</option>
                  <option value="accesorios">Accesorios</option>
                  <option value="digital">Digital</option>
                  <option value="impresos">Impresos</option>
                </select>
              </div>
            </div>
          </div>

          <div className="admin-modal-footer">
            <button type="button" className="admin-btn admin-btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="admin-btn admin-btn-primary" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
