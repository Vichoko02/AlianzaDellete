import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function SolicitarAccesoPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    nombre: "",
    proyectoInteres: "",
    mensaje: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const proyectos = [
    "MAF Studios",
    "Garabato Studio",
    "Metrecalia",
    "Crunch",
    "Crunch Fizz",
    "Tecnosis",
    "Emesis Blue",
    "Triple Boca",
    "TBFAJ",
    "CGD Studio",
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // TODO: Guardar solicitud en Firestore
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log("Solicitud:", formData);
      setSuccess(true);
      setTimeout(() => navigate("/"), 2000);
    } catch (err) {
      console.error("Error al enviar solicitud");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-success">
            <h2>¡Solicitud enviada!</h2>
            <p>Un administrador revisará tu solicitud y te contactará pronto.</p>
            <Link to="/">&larr; Volver al inicio</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1 className="auth-title">Solicitar Acceso al Equipo</h1>
        <p className="auth-subtitle">
          Completa el formulario para solicitar acceso como miembro del equipo.
        </p>
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="nombre">Nombre completo</label>
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
            <label htmlFor="proyectoInteres">Proyecto de interés</label>
            <select
              id="proyectoInteres"
              name="proyectoInteres"
              value={formData.proyectoInteres}
              onChange={handleChange}
              required
            >
              <option value="">Selecciona un proyecto</option>
              {proyectos.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="mensaje">Mensaje (opcional)</label>
            <textarea
              id="mensaje"
              name="mensaje"
              value={formData.mensaje}
              onChange={handleChange}
              placeholder="Cuéntanos sobre ti y por qué quieres unirte..."
              rows={4}
            />
          </div>
          
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? "Enviando..." : "Enviar Solicitud"}
          </button>
        </form>
        
        <div className="auth-back">
          <Link to="/register">¿Solo quieres comprar merch?</Link>
        </div>
      </div>
    </div>
  );
}
