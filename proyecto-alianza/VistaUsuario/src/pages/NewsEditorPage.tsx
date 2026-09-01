import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import type { Noticia } from "./NewsPage";
import imgCrunch from "../assets/Crunch/Crunch.webp";
import imgMetrecalia from "../assets/Metrecalia/Metrecalia.webp";
import imgTripleBoca from "../assets/TripleBoca/TripleBoca.webp";
import imgGarabato from "../assets/Garabato/Garabato-studio.webp";
import imgArmados from "../assets/Armados/Armados.webp";
import imgCrunchFizz from "../assets/CrunchFizz/CrunchFizz.webp";
import imgTecnosis from "../assets/Tecnosis/Tecnosis.webp";
import imgEmesis from "../assets/Emesis/emesisblue.webp";
import imgTBTF from "../assets/TheBraveAndTheFuriousAndTheJackass/TBTF.webp";
import logoAlianza from "../assets/ALIANZA_VECTORIZADO.svg";

const NOTICIAS_KEY = "alianza_noticias";

const proyectosDisponibles = [
  { nombre: "Triple Boca", imagen: imgTripleBoca },
  { nombre: "Crunch", imagen: imgCrunch },
  { nombre: "Crunch Fizz", imagen: imgCrunchFizz },
  { nombre: "Metrecalia", imagen: imgMetrecalia },
  { nombre: "Garabato Studio", imagen: imgGarabato },
  { nombre: "MAF Studios", imagen: imgArmados },
  { nombre: "Tecnosis", imagen: imgTecnosis },
  { nombre: "Emesis Blue", imagen: imgEmesis },
  { nombre: "TBFAJ", imagen: imgTBTF },
];

function getNoticias(): Noticia[] {
  const stored = localStorage.getItem(NOTICIAS_KEY);
  return stored ? JSON.parse(stored) : [];
}

function saveNoticias(noticias: Noticia[]) {
  localStorage.setItem(NOTICIAS_KEY, JSON.stringify(noticias));
}

function generarId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatearFecha(date: Date): string {
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${date.getDate()} ${meses[date.getMonth()]} ${date.getFullYear()}`;
}

export default function NewsEditorPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [proyecto, setProyecto] = useState(proyectosDisponibles[0].nombre);
  const [proyectoImagen, setProyectoImagen] = useState(proyectosDisponibles[0].imagen);
  const [destacada, setDestacada] = useState(false);
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    if (isEditing) {
      const noticias = getNoticias();
      const noticia = noticias.find((n) => n.id === id);
      if (noticia) {
        setTitulo(noticia.titulo);
        setContenido(noticia.contenido);
        setProyecto(noticia.proyecto);
        setProyectoImagen(noticia.proyectoImagen);
        setDestacada(noticia.destacada);
      }
    }
  }, [id, isEditing]);

  const handleProyectoChange = (nombre: string) => {
    setProyecto(nombre);
    const proj = proyectosDisponibles.find((p) => p.nombre === nombre);
    if (proj) {
      setProyectoImagen(proj.imagen);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!titulo.trim() || !contenido.trim()) {
      alert("Completa todos los campos");
      return;
    }

    const noticia: Noticia = {
      id: isEditing ? id! : generarId(),
      titulo: titulo.trim(),
      contenido: contenido.trim(),
      imagen: proyectoImagen,
      proyecto,
      proyectoImagen,
      fecha: formatearFecha(new Date()),
      destacada,
    };

    const noticias = getNoticias();

    if (isEditing) {
      const index = noticias.findIndex((n) => n.id === id);
      if (index !== -1) {
        noticias[index] = noticia;
      }
    } else {
      noticias.unshift(noticia);
    }

    saveNoticias(noticias);
    setGuardado(true);
    setTimeout(() => navigate("/news"), 1500);
  };

  return (
    <div className="news-editor-page">
      <header className="news-editor-header">
        <Link to="/news/admin" className="news-editor-back">
          ← Panel de Noticias
        </Link>
        <Link to="/" className="news-editor-logo">
          <img src={logoAlianza} alt="Alianza" />
        </Link>
        <div className="news-editor-spacer" />
      </header>

      <div className="news-editor-container">
        <h1>{isEditing ? "Editar Noticia" : "Nueva Noticia"}</h1>

        {guardado && (
          <div className="news-editor-success">
            ¡Noticia guardada! Redirigiendo...
          </div>
        )}

        <form onSubmit={handleSubmit} className="news-editor-form">
          <div className="news-editor-field">
            <label>Título</label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Título de la noticia"
              required
            />
          </div>

          <div className="news-editor-field">
            <label>Contenido</label>
            <textarea
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              placeholder="Contenido de la noticia..."
              rows={6}
              required
            />
          </div>

          <div className="news-editor-row">
            <div className="news-editor-field">
              <label>Proyecto</label>
              <select
                value={proyecto}
                onChange={(e) => handleProyectoChange(e.target.value)}
              >
                {proyectosDisponibles.map((p) => (
                  <option key={p.nombre} value={p.nombre}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="news-editor-field news-editor-field--checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={destacada}
                  onChange={(e) => setDestacada(e.target.checked)}
                />
                Noticia destacada
              </label>
            </div>
          </div>

          <div className="news-editor-preview">
            <label>Vista previa del proyecto:</label>
            <img src={proyectoImagen} alt={proyecto} className="news-editor-preview-img" />
            <span>{proyecto}</span>
          </div>

          <div className="news-editor-actions">
            <button type="submit" className="news-editor-save">
              {isEditing ? "Guardar Cambios" : "Publicar Noticia"}
            </button>
            <button type="button" className="news-editor-cancel" onClick={() => navigate("/news")}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
