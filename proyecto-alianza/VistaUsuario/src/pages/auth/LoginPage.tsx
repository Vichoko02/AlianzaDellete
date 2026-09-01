import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // TODO: Integrar con Firebase Auth
    // Por ahora simulamos el login
    try {
      // Simulación de login
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log("Login:", { email, password });
      // Redirigir según el rol (simulado)
      navigate("/");
    } catch (err) {
      setError("Credenciales inválidas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1 className="auth-title">Iniciar Sesión</h1>
        
        {error && <div className="auth-error">{error}</div>}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="tu@email.com"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>
          
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? "Cargando..." : "Entrar"}
          </button>
        </form>
        
        <div className="auth-links">
          <Link to="/register">¿No tienes cuenta? Regístrate</Link>
          <span className="auth-divider">•</span>
          <a href="#">¿Olvidaste tu contraseña?</a>
        </div>
        
        <div className="auth-back">
          <Link to="/">&larr; Volver al inicio</Link>
        </div>
      </div>
    </div>
  );
}
