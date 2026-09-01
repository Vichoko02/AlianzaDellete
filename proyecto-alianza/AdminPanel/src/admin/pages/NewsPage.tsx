import { useState, useEffect } from 'react';
import { newsApi } from '../../services/api';
import { News } from '../../types';

export default function NewsPage() {
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingNews, setEditingNews] = useState<News | null>(null);

  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async () => {
    try {
      const data = await newsApi.getAll();
      setNews(data);
    } catch (error) {
      console.error('Error loading news:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta noticia?')) return;
    
    try {
      await newsApi.delete(id);
      setNews(news.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error deleting news:', error);
    }
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
          <h1 className="admin-header-title">Noticias</h1>
        </header>
        <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando...</div>
      </div>
    );
  }

  return (
    <div className="admin-content">
      <header className="admin-header">
        <h1 className="admin-header-title">Noticias</h1>
        <div className="admin-header-actions">
          <button className="admin-btn admin-btn-primary" onClick={() => setShowModal(true)}>
            + Nueva Noticia
          </button>
        </div>
      </header>

      <div className="admin-card">
        {news.length > 0 ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {news.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {item.coverImage && (
                        <img
                          src={item.coverImage}
                          alt={item.title}
                          style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8 }}
                        />
                      )}
                      <div>
                        <div style={{ fontWeight: 600 }}>{item.title}</div>
                        <div style={{ fontSize: 12, color: '#666' }}>{item.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`admin-badge ${item.status === 'published' ? 'admin-badge-success' : 'admin-badge-warning'}`}>
                      {item.status === 'published' ? 'Publicado' : 'Borrador'}
                    </span>
                  </td>
                  <td>{formatDate(item.publishedAt || item.createdAt)}</td>
                  <td>
                    <div className="admin-actions">
                      <button
                        className="admin-action-btn"
                        onClick={() => {
                          setEditingNews(item);
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
                        onClick={() => handleDelete(item.id)}
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
              <path d="M22 3l-1.67 1.67L18.67 3 17 4.67 15.33 3l-1.66 1.67L12 3l-1.67 1.67L8.67 3 7 4.67 5.33 3 3.67 4.67 2 3v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V3z" />
            </svg>
            <p>No hay noticias</p>
          </div>
        )}
      </div>

      {showModal && (
        <NewsModal
          newsItem={editingNews}
          onClose={() => {
            setShowModal(false);
            setEditingNews(null);
          }}
          onSave={() => {
            setShowModal(false);
            setEditingNews(null);
            loadNews();
          }}
        />
      )}
    </div>
  );
}

function NewsModal({
  newsItem,
  onClose,
  onSave,
}: {
  newsItem: News | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    title: newsItem?.title || '',
    content: newsItem?.content || '',
    excerpt: newsItem?.excerpt || '',
    coverImage: newsItem?.coverImage || '',
    status: newsItem?.status || 'draft',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (newsItem) {
        await newsApi.update(newsItem.id, formData);
      } else {
        await newsApi.create(formData);
      }
      onSave();
    } catch (error) {
      console.error('Error saving news:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h2 className="admin-modal-title">
            {newsItem ? 'Editar Noticia' : 'Nueva Noticia'}
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
              <label className="admin-form-label">Título</label>
              <input
                type="text"
                className="admin-form-input"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Extracto</label>
              <input
                type="text"
                className="admin-form-input"
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                placeholder="Breve descripción para previews"
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">URL de Imagen</label>
              <input
                type="url"
                className="admin-form-input"
                value={formData.coverImage}
                onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Contenido</label>
              <textarea
                className="admin-form-textarea"
                style={{ minHeight: 200 }}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                required
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Estado</label>
              <select
                className="admin-form-select"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="draft">Borrador</option>
                <option value="published">Publicado</option>
              </select>
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
