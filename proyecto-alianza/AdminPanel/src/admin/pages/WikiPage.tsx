import { useState, useEffect } from 'react';
import { wikiApi, projectsApi } from '../../services/api';
import { Wiki, Project } from '../../types';

export default function WikiPage() {
  const [wikis, setWikis] = useState<Wiki[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingWiki, setEditingWiki] = useState<Wiki | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [wikisData, projectsData] = await Promise.all([
        wikiApi.getAll(),
        projectsApi.getAll(),
      ]);
      setWikis(wikisData);
      setProjects(projectsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta wiki?')) return;
    
    try {
      await wikiApi.delete(id);
      setWikis(wikis.filter(w => w.id !== id));
    } catch (error) {
      console.error('Error deleting wiki:', error);
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

  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || projectId;
  };

  if (loading) {
    return (
      <div className="admin-content">
        <header className="admin-header">
          <h1 className="admin-header-title">Wikis</h1>
        </header>
        <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando...</div>
      </div>
    );
  }

  return (
    <div className="admin-content">
      <header className="admin-header">
        <h1 className="admin-header-title">Wikis</h1>
        <div className="admin-header-actions">
          <button className="admin-btn admin-btn-primary" onClick={() => setShowModal(true)}>
            + Nueva Wiki
          </button>
        </div>
      </header>

      <div className="admin-card">
        {wikis.length > 0 ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Proyecto</th>
                <th>Estado</th>
                <th>Última edición</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {wikis.map((wiki) => (
                <tr key={wiki.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{wiki.title}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>{wiki.slug}</div>
                  </td>
                  <td>{getProjectName(wiki.projectId)}</td>
                  <td>
                    <span className={`admin-badge ${wiki.status === 'published' ? 'admin-badge-success' : 'admin-badge-warning'}`}>
                      {wiki.status === 'published' ? 'Publicada' : 'Borrador'}
                    </span>
                  </td>
                  <td>{formatDate(wiki.updatedAt)}</td>
                  <td>
                    <div className="admin-actions">
                      <button
                        className="admin-action-btn"
                        onClick={() => {
                          setEditingWiki(wiki);
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
                        onClick={() => handleDelete(wiki.id)}
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
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93z" />
            </svg>
            <p>No hay wikis</p>
          </div>
        )}
      </div>

      {showModal && (
        <WikiModal
          wiki={editingWiki}
          projects={projects}
          onClose={() => {
            setShowModal(false);
            setEditingWiki(null);
          }}
          onSave={() => {
            setShowModal(false);
            setEditingWiki(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

function WikiModal({
  wiki,
  projects,
  onClose,
  onSave,
}: {
  wiki: Wiki | null;
  projects: Project[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    projectId: wiki?.projectId || '',
    title: wiki?.title || '',
    content: wiki?.content || '',
    coverImage: wiki?.coverImage || '',
    status: wiki?.status || 'draft',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (wiki) {
        await wikiApi.update(wiki.id, formData);
      } else {
        await wikiApi.create(formData);
      }
      onSave();
    } catch (error) {
      console.error('Error saving wiki:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" style={{ maxWidth: 700 }} onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h2 className="admin-modal-title">
            {wiki ? 'Editar Wiki' : 'Nueva Wiki'}
          </h2>
          <button className="admin-modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="admin-modal-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="admin-form-group">
                <label className="admin-form-label">Proyecto</label>
                <select
                  className="admin-form-select"
                  value={formData.projectId}
                  onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                  required
                >
                  <option value="">Seleccionar proyecto</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Estado</label>
                <select
                  className="admin-form-select"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="draft">Borrador</option>
                  <option value="published">Publicada</option>
                </select>
              </div>
            </div>

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
              <label className="admin-form-label">URL de Imagen</label>
              <input
                type="url"
                className="admin-form-input"
                value={formData.coverImage}
                onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Contenido</label>
              <textarea
                className="admin-form-textarea"
                style={{ minHeight: 300 }}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                required
              />
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
