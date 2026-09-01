import { useState, useEffect } from 'react';
import { projectsApi } from '../../services/api';
import { Project } from '../../types';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await projectsApi.getAll();
      setProjects(data);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este proyecto?')) return;
    
    try {
      await projectsApi.delete(id);
      setProjects(projects.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  if (loading) {
    return (
      <div className="admin-content">
        <header className="admin-header">
          <h1 className="admin-header-title">Proyectos</h1>
        </header>
        <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando...</div>
      </div>
    );
  }

  return (
    <div className="admin-content">
      <header className="admin-header">
        <h1 className="admin-header-title">Proyectos</h1>
        <div className="admin-header-actions">
          <button className="admin-btn admin-btn-primary" onClick={() => setShowModal(true)}>
            + Nuevo Proyecto
          </button>
        </div>
      </header>

      <div className="admin-card">
        {projects.length > 0 ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Proyecto</th>
                <th>Slug</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {project.imageUrl && (
                        <img
                          src={project.imageUrl}
                          alt={project.name}
                          style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8 }}
                        />
                      )}
                      <div>
                        <div style={{ fontWeight: 600 }}>{project.name}</div>
                        {project.description && (
                          <div style={{ fontSize: 12, color: '#666' }}>{project.description.substring(0, 50)}...</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>{project.slug}</td>
                  <td>
                    <span className={`admin-badge ${project.isActive ? 'admin-badge-success' : 'admin-badge-danger'}`}>
                      {project.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div className="admin-actions">
                      <button
                        className="admin-action-btn"
                        onClick={() => {
                          setEditingProject(project);
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
                        onClick={() => handleDelete(project.id)}
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
              <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z" />
            </svg>
            <p>No hay proyectos</p>
          </div>
        )}
      </div>

      {showModal && (
        <ProjectModal
          project={editingProject}
          onClose={() => {
            setShowModal(false);
            setEditingProject(null);
          }}
          onSave={() => {
            setShowModal(false);
            setEditingProject(null);
            loadProjects();
          }}
        />
      )}
    </div>
  );
}

function ProjectModal({
  project,
  onClose,
  onSave,
}: {
  project: Project | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    name: project?.name || '',
    description: project?.description || '',
    imageUrl: project?.imageUrl || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (project) {
        await projectsApi.update(project.id, formData);
      } else {
        await projectsApi.create(formData);
      }
      onSave();
    } catch (error) {
      console.error('Error saving project:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h2 className="admin-modal-title">
            {project ? 'Editar Proyecto' : 'Nuevo Proyecto'}
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

            <div className="admin-form-group">
              <label className="admin-form-label">URL de Imagen</label>
              <input
                type="url"
                className="admin-form-input"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder="https://..."
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
