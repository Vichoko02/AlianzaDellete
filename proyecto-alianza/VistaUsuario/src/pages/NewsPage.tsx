import { useState } from "react";
import NewsHeader from "../components/news/NewsHeader";
import Footer from "../components/Footer";
import imgCrunch from "../assets/Crunch/Crunch.webp";
import imgMetrecalia from "../assets/Metrecalia/Metrecalia.webp";
import imgTripleBoca from "../assets/TripleBoca/TripleBoca.webp";
import bannerCrunch from "../assets/Banner/CrunchBanner.webp";
import bannerMetrecalia from "../assets/Banner/MetrecaliaBanner.webp";
import bannerArmados from "../assets/Banner/ArmadosBanner.webp";
import bannerTBTF from "../assets/Banner/TBTFBanner.webp";

export interface Noticia {
  id: string;
  titulo: string;
  contenido: string;
  imagen: string;
  proyecto: string;
  proyectoImagen: string;
  fecha: string;
  destacada: boolean;
}

const NOTICIAS_KEY = "alianza_noticias";

const noticiasDefault: Noticia[] = [
  {
    id: "1",
    titulo: "Triple Boca Episode 1 ya disponible",
    contenido: "¡El primer episodio completo de Triple Boca ya está aquí! Acompaña a Micu, Newu y Techo en su nueva aventura por Latinoamérica. Un episodio lleno de música, humor y mucho corazón.",
    imagen: imgTripleBoca,
    proyecto: "Triple Boca",
    proyectoImagen: imgTripleBoca,
    fecha: "15 Mar 2026",
    destacada: true,
  },
  {
    id: "2",
    titulo: "Crunch Fizz: Nuevo trailer revelado",
    contenido: "El trailer oficial de Crunch Fizz ha sido liberado. Prepárate para una experiencia visual única con la nueva serie de animación de La Alianza.",
    imagen: imgCrunch,
    proyecto: "Crunch Fizz",
    proyectoImagen: imgCrunch,
    fecha: "10 Mar 2026",
    destacada: true,
  },
  {
    id: "3",
    titulo: "Metrecalia: Temporada 2 confirmada",
    contenido: "¡Grandes noticias! La segunda temporada de Metrecalia ha sido confirmada. El equipo trabaja duro para traerte más episodios pronto.",
    imagen: imgMetrecalia,
    proyecto: "Metrecalia",
    proyectoImagen: imgMetrecalia,
    fecha: "5 Mar 2026",
    destacada: false,
  },
];

function getNoticias(): Noticia[] {
  const stored = localStorage.getItem(NOTICIAS_KEY);
  if (!stored) {
    localStorage.setItem(NOTICIAS_KEY, JSON.stringify(noticiasDefault));
    return noticiasDefault;
  }
  return JSON.parse(stored);
}

export default function NewsPage() {
  const [noticiaExpandida, setNoticiaExpandida] = useState<string | null>(null);

  const [noticias] = useState<Noticia[]>(() => getNoticias());

  const noticiasDestacadas = noticias.filter((n) => n.destacada);
  const otrasNoticias = noticias.filter((n) => !n.destacada);

  const heroImages = [bannerTBTF, bannerMetrecalia, bannerCrunch, bannerArmados];
  const heroImagesDoble = [...heroImages, ...heroImages];

  return (
    <div className="news-page">
      <NewsHeader />

      <div className="news-hero">
        <div className="header-carousel-container">
          <div className="carousel-track">
            {heroImagesDoble.map((src, index) => (
              <img key={index} src={src} alt={`Banner noticias ${index}`} />
            ))}
          </div>
        </div>
        <div className="news-hero-overlay"></div>
        <div className="news-hero-content">
          <h1>Noticias</h1>
          <p>Últimas novedades de La Alianza y sus proyectos</p>
        </div>
      </div>

      {noticiasDestacadas.length > 0 && (
        <section className="news-featured" id="noticias">
          <div className="news-featured-grid">
            {noticiasDestacadas.map((noticia) => (
              <article
                key={noticia.id}
                className={`news-card news-card--featured ${noticiaExpandida === noticia.id ? "expanded" : ""}`}
                onClick={() => setNoticiaExpandida(noticiaExpandida === noticia.id ? null : noticia.id)}
              >
                <div className="news-card-image">
                  <img src={noticia.imagen} alt={noticia.titulo} />
                  <div className="news-card-badge">Destacada</div>
                </div>
                <div className="news-card-content">
                  <div className="news-card-meta">
                    <img src={noticia.proyectoImagen} alt={noticia.proyecto} className="news-card-proyecto" />
                    <span>{noticia.proyecto}</span>
                    <span className="news-card-date">{noticia.fecha}</span>
                  </div>
                  <h2 className="news-card-title">{noticia.titulo}</h2>
                  <p className="news-card-excerpt">{noticia.contenido}</p>
                  <div className="news-card-actions">
                    <button className="news-card-btn" onClick={(e) => { e.stopPropagation(); setNoticiaExpandida(noticiaExpandida === noticia.id ? null : noticia.id); }}>
                      {noticiaExpandida === noticia.id ? "Leer menos" : "Leer más"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {otrasNoticias.length > 0 && (
        <section className="news-all">
          <h2>Más Noticias</h2>
          <div className="news-list">
            {otrasNoticias.map((noticia) => (
              <article
                key={noticia.id}
                className={`news-list-item ${noticiaExpandida === noticia.id ? "expanded" : ""}`}
                onClick={() => setNoticiaExpandida(noticiaExpandida === noticia.id ? null : noticia.id)}
              >
                <img src={noticia.imagen} alt={noticia.titulo} className="news-list-image" />
                <div className="news-list-content">
                  <div className="news-card-meta">
                    <img src={noticia.proyectoImagen} alt={noticia.proyecto} className="news-card-proyecto" />
                    <span>{noticia.proyecto}</span>
                    <span className="news-card-date">{noticia.fecha}</span>
                  </div>
                  <h3 className="news-list-title">{noticia.titulo}</h3>
                  <p className={`news-list-excerpt ${noticiaExpandida === noticia.id ? "visible" : ""}`}>
                    {noticia.contenido}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {noticias.length === 0 && (
        <div className="news-empty">
          <p>No hay noticias aún.</p>
        </div>
      )}

      <Footer />
    </div>
  );
}
