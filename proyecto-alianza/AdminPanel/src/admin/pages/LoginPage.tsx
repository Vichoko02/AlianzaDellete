import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import iconInstagram from '../../assets/instagram-color.svg';
import iconTwitter from '../../assets/twitter.svg';
import iconYoutube from '../../assets/youtube-color2.svg';

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const isDarkMode = localStorage.getItem('adminDarkMode') === 'true' ||
      (!localStorage.getItem('adminDarkMode') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.body.classList.toggle('dark-theme', isDarkMode);
  }, []);

  if (isLoading) {
    return (
      <div className="admin-login-wrapper">
        <div className="admin-login-page">
          <div className="admin-login-card">
            <p className="admin-login-loading">Cargando...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-wrapper">
      <div className="admin-login-page">
        <div className="admin-login-card">
          <div className="admin-login-logo">
            <h1 className="admin-login-title">Login administrativo</h1>
          </div>

          {error && (
            <div className="admin-login-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="admin-login-form">
            <div className="admin-form-group">
              <label className="admin-form-label">Email</label>
              <input
                type="email"
                className="admin-form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@alianza.com"
                required
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Contraseña</label>
              <input
                type="password"
                className="admin-form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              className="admin-btn admin-btn-primary admin-login-btn"
              disabled={loading}
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>
        </div>
      </div>

      <footer className="admin-login-footer">
        <div className="socials">
          <a href="https://www.instagram.com/somos_laalianza/" target="_blank" rel="noopener noreferrer">
            <img src={iconInstagram} alt="Instagram" />
          </a>
          <a href="https://x.com/Somos_LaAlianza" target="_blank" rel="noopener noreferrer">
            <img src={iconTwitter} alt="Twitter" />
          </a>
          <a href="https://www.youtube.com/@Somos_LaAlianza" target="_blank" rel="noopener noreferrer">
            <img src={iconYoutube} alt="YouTube" />
          </a>
        </div>
        <p>2026 Alianza</p>
      </footer>
    </div>
  );
}
