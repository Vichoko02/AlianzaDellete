import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import defaultAvatar from "../../assets/alianza-blanco.svg";

export default function RegisterPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    password: "",
    confirmarPassword: "",
  });
  const [avatar, setAvatar] = useState<string>(defaultAvatar);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmarPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (formData.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setLoading(true);

    // TODO: Integrar con Firebase Auth
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log("Registro:", { ...formData, avatar });
      navigate("/");
    } catch (err) {
      setError("Error al registrar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container register-container">
        <h1 className="auth-title">Crear Cuenta</h1>
        
        {error && <div className="auth-error">{error}</div>}
        
        <div className="avatar-section">
          <div className="avatar-preview" onClick={triggerFileInput}>
            <img src={avatar} alt="Avatar" />
            <div className="avatar-overlay">
              <span>Cambiar foto</span>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            style={{ display: "none" }}
          />
        </div>
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="nombre">Nombre</label>
            <input
              type="text"
              id="nombre"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              required
              placeholder="Tu nombre"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="tu@email.com"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmarPassword">Confirmar Contraseña</label>
            <input
              type="password"
              id="confirmarPassword"
              name="confirmarPassword"
              value={formData.confirmarPassword}
              onChange={handleChange}
              required
              placeholder="Repite la contraseña"
            />
          </div>
          
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? "Creando cuenta..." : "Registrarse"}
          </button>
        </form>
        
        <div className="auth-links">
          <span>¿Ya tienes cuenta?</span>
          <Link to="/login"> Inicia sesión</Link>
        </div>
        
        <div className="auth-back">
          <Link to="/">&larr; Volver al inicio</Link>
        </div>
      </div>
    </div>
  );
}
