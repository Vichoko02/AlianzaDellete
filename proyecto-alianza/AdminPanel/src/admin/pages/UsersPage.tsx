import { useState, useEffect } from 'react';
import { usersApi } from '../../services/api';
import { User, UserRole } from '../../types';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await usersApi.getAll();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (email: string, role: UserRole) => {
    try {
      await usersApi.enrollUser(email, role);
      setShowModal(false);
      loadUsers();
    } catch (error) {
      console.error('Error enrolling user:', error);
      alert('Error al enrolar usuario');
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

  const getRoleBadgeClass = (role: string) => {
    const classes: Record<string, string> = {
      alianza: 'admin-badge-danger',
      jefe_proyecto: 'admin-badge-warning',
      staff: 'admin-badge-info',
      user: 'admin-badge-success',
    };
    return classes[role] || 'admin-badge-info';
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      alianza: 'Alianza',
      jefe_proyecto: 'Jefe de Proyecto',
      staff: 'Staff',
      user: 'Usuario',
    };
    return labels[role] || role;
  };

  if (loading) {
    return (
      <div className="admin-content">
        <header className="admin-header">
          <h1 className="admin-header-title">Usuarios</h1>
        </header>
        <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando...</div>
      </div>
    );
  }

  return (
    <div className="admin-content">
      <header className="admin-header">
        <h1 className="admin-header-title">Usuarios</h1>
        <div className="admin-header-actions">
          <button className="admin-btn admin-btn-primary" onClick={() => setShowModal(true)}>
            + Enrolar Usuario
          </button>
        </div>
      </header>

      <div className="admin-card">
        {users.length > 0 ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Fecha de registro</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.uid}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          background: '#e60000',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: 14,
                        }}
                      >
                        {user.displayName?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <span style={{ fontWeight: 600 }}>{user.displayName || 'Sin nombre'}</span>
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`admin-badge ${getRoleBadgeClass(user.role)}`}>
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td>{formatDate(user.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="admin-empty">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z" />
            </svg>
            <p>No hay usuarios</p>
          </div>
        )}
      </div>

      {showModal && (
        <EnrollUserModal
          onClose={() => setShowModal(false)}
          onEnroll={handleEnroll}
        />
      )}
    </div>
  );
}

function EnrollUserModal({
  onClose,
  onEnroll,
}: {
  onClose: () => void;
  onEnroll: (email: string, role: UserRole) => void;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.STAFF);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onEnroll(email, role);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" style={{ maxWidth: 450 }} onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h2 className="admin-modal-title">Enrolar Usuario</h2>
          <button className="admin-modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="admin-modal-body">
            <div className="admin-form-group">
              <label className="admin-form-label">Email del usuario</label>
              <input
                type="email"
                className="admin-form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@ejemplo.com"
                required
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Rol</label>
              <select
                className="admin-form-select"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
              >
                <option value={UserRole.JEFE_PROYECTO}>Jefe de Proyecto</option>
                <option value={UserRole.STAFF}>Staff</option>
              </select>
            </div>

            <p style={{ fontSize: 13, color: '#666', marginTop: '1rem' }}>
              El usuario debe estar previamente registrado con este email. Solo se le asignará un rol de administración.
            </p>
          </div>

          <div className="admin-modal-footer">
            <button type="button" className="admin-btn admin-btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="admin-btn admin-btn-primary" disabled={loading}>
              {loading ? 'Enrolando...' : 'Enrolar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
