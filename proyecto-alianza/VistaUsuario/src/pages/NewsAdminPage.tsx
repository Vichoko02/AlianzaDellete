import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Noticia } from "./NewsPage";
import logoAlianza from "../assets/ALIANZA_VECTORIZADO.svg";

const NOTICIAS_KEY = "alianza_noticias";

function getNoticias(): Noticia[] {
  const stored = localStorage.getItem(NOTICIAS_KEY);
  return stored ? JSON.parse(stored) : [];
}

function saveNoticias(noticias: Noticia[]) {
  localStorage.setItem(NOTICIAS_KEY, JSON.stringify(noticias));
}

export default function NewsAdminPage() {
  const navigate = useNavigate();
  const [noticias, setNoticias] = useState<Noticia[]>([]);

  useEffect(() => {
    setNoticias(getNoticias());
  }, []);

  const handleDelete = (id: string) => {
    if (confirm("¿Eliminar esta noticia?")) {
      const updated = noticias.filter((n) => n.id !== id);
      saveNoticias(updated);
      setNoticias(updated);
    }
  };

  return (
    <div className="news-admin-page">
      <header className="news-admin-header">
        <Link to="/news" className="news-admin-back">
          ← Volver a Noticias
        </Link>
        <Link to="/" className="news-admin-logo">
          <img src={logoAlianza} alt="Alianza" />
        </Link>
        <Link to="/news/admin/new" className="news-admin-new-btn">
          + Nueva Noticia
        </Link>
      </header>

      <div className="news-admin-container">
        <h1>Panel de Administración de Noticias</h1>
        <p className="news-admin-subtitle">Gestiona las noticias de La Alianza</p>

        <div className="news-admin-list">
          {noticias.length === 0 ? (
            <div className="news-admin-empty">
              <p>No hay noticias aún.</p>
              <Link to="/news/admin/new" className="news-admin-empty-btn">
                Crear primera noticia
              </Link>
            </div>
          ) : (
            noticias.map((noticia) => (
              <div key={noticia.id} className="news-admin-item">
                <img src={noticia.imagen} alt={noticia.titulo} className="news-admin-item-img" />
                <div className="news-admin-item-content">
                  <div className="news-admin-item-meta">
                    <span className="news-admin-item-proyecto">{noticia.proyecto}</span>
                    <span className="news-admin-item-fecha">{noticia.fecha}</span>
                    {noticia.destacada && <span className="news-admin-item-badge">Destacada</span>}
                  </div>
                  <h3 className="news-admin-item-title">{noticia.titulo}</h3>
                  <p className="news-admin-item-excerpt">{noticia.contenido.substring(0, 100)}...</p>
                </div>
                <div className="news-admin-item-actions">
                  <button
                    className="news-admin-btn news-admin-btn-edit"
                    onClick={() => navigate(`/news/edit/${noticia.id}`)}
                  >
                    Editar
                  </button>
                  <button
                    className="news-admin-btn news-admin-btn-delete"
                    onClick={() => handleDelete(noticia.id)}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
