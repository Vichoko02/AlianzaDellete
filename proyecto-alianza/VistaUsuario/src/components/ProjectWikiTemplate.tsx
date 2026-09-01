import { useState, useEffect, useRef } from "react";
import logoAlianza from "../assets/ALIANZA_VECTORIZADO.svg";
import Footer from "./Footer";

// ─── INTERFACES ───────────────────────────────────────────────────────────────

export interface StaffMember {
  nombre: string;
  rol: string;
  imagen?: string;
}

export interface StaffGroup {
  categoria: string;
  miembros: StaffMember[];
}

export interface GalleryImage {
  src: string;
  alt: string;
}

export interface Personaje {
  nombre: string;
  imagen?: string;
  rol: string;
  descripcion: string;
  actorVoz?: string;
  imagenActorVoz?: string;
}

export interface SeccionPersonalizada {
  id: string;
  titulo: string;
  descripcion?: string;
  miembros?: {
    nombre: string;
    imagen?: string;
    descripcion: string;
    rol?: string;
  }[];
}

export interface ProjectWikiData {
  id: string;
  nombre: string;
  banner: string;
  logo?: string;
  estado: string;
  videoUrl?: string;
  videoLocal?: string;
  sinopsis: string;
  creador: {
    nombre: string;
    imagen?: string;
    descripcion: string;
    redes?: {
      instagram?: string;
      twitter?: string;
      youtube?: string;
      tiktok?: string;
      discord?: string;
      patreon?: string;
      kofi?: string;
      buymeacoffee?: string;
      vaquite?: string;
      facebook?: string;
    };
    obras?: { titulo: string; url?: string }[];
  };
  redes: {
    instagram?: string;
    twitter?: string;
    youtube?: string;
    tiktok?: string;
    discord?: string;
    patreon?: string;
    kofi?: string;
    buymeacoffee?: string;
    vaquite?: string;
    facebook?: string;
  };
  apoyanos?: {
    patreon?: string;
    kofi?: string;
    buymeacoffee?: string;
    vaquite?: string;
  };
  carrusel: string[];
  personajes?: Personaje[];
  staff: StaffGroup[];
  seccionesExtra?: SeccionPersonalizada[];
  galeria: GalleryImage[];
}

// ─── ICONOS ───────────────────────────────────────────────────────────────────

const iconos: Record<string, string> = {
  instagram: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z",
  facebook: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
  twitter:   "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  youtube:   "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
  tiktok:    "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z",
  discord:   "M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026c.462-.62.874-1.275 1.226-1.963.021-.04.001-.088-.041-.104a13.201 13.201 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.245.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028z",
  patreon:   "M0 .5h4.219v23H0zm15.384.5c-6.272 0-9.384 3.4-9.384 8.6 0 5.2 3.112 8.6 9.384 8.6C21.656 18.2 24 15 24 9.6 24 4.2 21.656.5 15.384.5z",
  kofi:      "M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.073-.121-.092-.4-.301a.538.538 0 0 1-.073-.225l.013-5.389c.003-.165.126-.317.326-.298l2.exploit.01c.203 0 .381.132.392.325.022.401-.012.856.021 1.108.055.408.359.657.783.616l.682-.06c.218-.019.401.135.412.352l.029.596c.011.217-.148.408-.366.427l-.698.063zm4.566 0l-.698-.063c-.218-.019-.377-.21-.366-.427l.029-.596c.011-.217.194-.371.412-.352l.682.06c.424.041.728-.208.783-.616.033-.252-.001-.707.021-1.108.011-.193.189-.325.392-.325l2.02-.01c.2-.019.323.133.326.298l.013 5.389a.538.538 0 0 1-.073.225c-.279.209-.324.228-.4.301-.189.096-.31-.023-.31-.023s-2.765-2.523-4.011-3.976l-.822-.777z",
  buymeacoffee: "M20.216 6.415l-.132-.666c-.119-.598-.388-1.163-1.001-1.379-.197-.069-.42-.098-.57-.241-.152-.143-.196-.366-.231-.572l-.201-1.158C18.005.35 16.48 0 15.22 0H8.781c-1.261 0-2.786.35-2.86 2.4l-.2 1.158c-.036.206-.08.43-.23.572-.151.143-.375.172-.572.241-.613.217-.883.782-1.001 1.38l-.132.665-1.054 5.296c-.178.894-.046 1.822.422 2.619.574.984 1.598 1.59 2.709 1.59h12.234c1.112 0 2.135-.606 2.709-1.59.468-.797.6-1.725.422-2.619l-1.053-5.296zm-11.79 4.261c-.246.035-.468-.136-.504-.381l-.464-3.277c-.036-.245.136-.468.381-.504.245-.035.467.136.503.381l.465 3.277c.035.245-.136.467-.381.504zm4.25.901c-.246 0-.446-.2-.446-.446v-3.307c0-.246.2-.446.446-.446.245 0 .445.2.445.446v3.307c0 .246-.2.446-.445.446zm3.83-.901c-.245-.037-.416-.259-.381-.504l.465-3.277c.036-.245.258-.416.503-.381.245.036.417.259.381.504l-.464 3.277c-.036.245-.259.416-.504.381zM16 21h-4v-4h4v4zm-1-5H9v4h1v3h4v-3h1v-4z",
  vaquite:   "M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.418 0-8-3.582-8-8s3.582-8 8-8 8 3.582 8 8-3.582 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z",
};

const apoyanosMeta: Record<string, { label: string; color: string }> = {
  patreon:       { label: "Patreon",         color: "#FF424D" },
  kofi:          { label: "Ko-fi",           color: "#29ABE0" },
  buymeacoffee:  { label: "Buy me a coffee", color: "#FFDD00" },
  vaquite:       { label: "Vaquite",         color: "#6C63FF" },
};

// ─── SUBCOMPONENTES ───────────────────────────────────────────────────────────

function SocialIcon({ red, url }: { red: string; url: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="wiki-social-btn" aria-label={red}>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <path d={iconos[red]} />
      </svg>
    </a>
  );
}

function PersonajeModal({ personaje, onClose }: { personaje: Personaje; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", h); document.body.style.overflow = ""; };
  }, [onClose]);

  return (
    <div className="personaje-overlay" onClick={onClose}>
      <div className="personaje-modal" onClick={e => e.stopPropagation()}>
        <button className="socio-modal-close" onClick={onClose}>✕</button>
        <div className="personaje-modal-main">
          <div className="personaje-modal-img">
            {personaje.imagen
              ? <img src={personaje.imagen} alt={personaje.nombre} />
              : <span>{personaje.nombre.charAt(0)}</span>
            }
          </div>
          <div className="personaje-modal-info">
            <span className="personaje-modal-rol">{personaje.rol}</span>
            <h2 className="personaje-modal-nombre">{personaje.nombre}</h2>
            <p className="personaje-modal-desc">{personaje.descripcion}</p>
            {personaje.actorVoz && (
              <div className="personaje-modal-va">
                {personaje.imagenActorVoz && (
                  <img src={personaje.imagenActorVoz} alt={personaje.actorVoz} className="personaje-va-img" />
                )}
                <div>
                  <span className="personaje-va-label">Actor de Voz</span>
                  <span className="personaje-va-nombre">{personaje.actorVoz}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TEMPLATE PRINCIPAL ───────────────────────────────────────────────────────

export default function ProjectWikiTemplate({ data }: { data: ProjectWikiData }) {
  const [carruselIdx, setCarruselIdx] = useState(0);
  const [carruselDir, setCarruselDir] = useState<"left"|"right">("right");
  const [animating, setAnimating] = useState(false);
  const [staffAbierto, setStaffAbierto] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [personajeActivo, setPersonajeActivo] = useState<Personaje | null>(null);
  const [isVerticalCarrusel, setIsVerticalCarrusel] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => document.body.classList.contains("dark-theme"));

  // Detectar cambios de tema
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.body.classList.contains("dark-theme"));
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Detectar aspect ratio de imágenes del carrusel
  useEffect(() => {
    if (data.carrusel.length === 0) return;

    let loadedCount = 0;
    let verticalCount = 0;

    const checkAspectRatio = (src: string) => {
      const img = new Image();
      img.onload = () => {
        const ratio = img.width / img.height;
        // 9:16 = 0.5625, consideramos vertical si ratio < 0.7
        if (ratio < 0.7) verticalCount++;
        loadedCount++;

        // Si hemos cargado todas las imágenes, decide el layout
        if (loadedCount === data.carrusel.length) {
          const isVertical = verticalCount / data.carrusel.length > 0.5;
          setIsVerticalCarrusel(isVertical);
        }
      };
      img.src = src;
    };

    data.carrusel.forEach(checkAspectRatio);
  }, [data.carrusel]);

  const navigate = (dir: "left" | "right") => {
    if (animating) return;
    setCarruselDir(dir);
    setAnimating(true);
    setTimeout(() => {
      setCarruselIdx(i => dir === "right" ? (i+1) % data.carrusel.length : (i-1+data.carrusel.length) % data.carrusel.length);
      setAnimating(false);
    }, 380);
  };

  const prev = () => navigate("left");
  const next = () => navigate("right");

  useEffect(() => {
    if (data.carrusel.length <= 1) return;
    const t = setTimeout(() => next(), 6000);
    return () => clearTimeout(t);
  }, [carruselIdx, animating]);

  const bannerRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const onScroll = () => {
      if (bannerRef.current) bannerRef.current.style.transform = `translateY(${window.scrollY * 0.35}px)`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const redesActivas  = Object.entries(data.redes).filter(([, url]) => url);
  const apoyanosList  = data.apoyanos ? Object.entries(data.apoyanos).filter(([, url]) => url) : [];

  const estadoClass =
    data.estado.toLowerCase().includes("producción") ? "wiki-estado--produccion" :
    data.estado.toLowerCase().includes("emisión")    ? "wiki-estado--emision"    :
    data.estado.toLowerCase().includes("finalizado") ? "wiki-estado--finalizado" :
    data.estado.toLowerCase().includes("pausado")    ? "wiki-estado--pausado"    :
    data.estado.toLowerCase().includes("cancelado")  ? "wiki-estado--cancelado"  :
    data.estado.toLowerCase().includes("pronto")     ? "wiki-estado--pronto"     : "";

  const navLinks = [
    { label: "Sinopsis",    href: "#sinopsis" },
    { label: "Galería",     href: "#galeria-visual" },
    { label: "Creador",     href: "#creador" },
    { label: "Staff",       href: "#staff" },
    { label: "Arte",        href: "#arte" },
  ];

  return (
    <div className="wiki-page">

      {/* LIGHTBOX */}
      {lightbox && (
        <div className="wiki-lightbox" onClick={() => setLightbox(null)}>
          <button className="wiki-lightbox-close" onClick={() => setLightbox(null)}>✕</button>
          <img src={lightbox} alt="Vista completa" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* MODAL PERSONAJE */}
      {personajeActivo && (
        <PersonajeModal personaje={personajeActivo} onClose={() => setPersonajeActivo(null)} />
      )}

      {/* HEADER */}
      <header className="wiki-header">
        <div className="wiki-header-inner">
          <nav className="wiki-header-nav wiki-header-nav--left">
            <a href="#sinopsis">Sinopsis</a>
            <a href="#galeria-visual">Galería</a>
          </nav>
          <a href="/" className="wiki-home-logo" aria-label="Volver al inicio">
            <img src={logoAlianza} alt="Alianza" />
          </a>
          <nav className="wiki-header-nav wiki-header-nav--right">
            <a href="#creador">Creador</a>
            <a href="#staff">Staff</a>
            <a href="#arte">Arte</a>
          </nav>
          <button
            className={`hamburger wiki-hamburger ${menuAbierto ? "open" : ""}`}
            onClick={() => setMenuAbierto(!menuAbierto)}
            aria-expanded={menuAbierto}
            aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
          >
            <span /><span /><span />
          </button>
        </div>
        <div className={`nav-dropdown wiki-nav-dropdown ${menuAbierto ? "open" : ""}`}>
          <ul>
            {navLinks.map((l, i) => (
              <li key={l.label} style={{ "--i": i } as React.CSSProperties}>
                <a href={l.href} onClick={() => setMenuAbierto(false)}>
                  {l.label}<span className="nav-arrow">→</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </header>

      {/* BANNER */}
      <section className="wiki-banner">
        <img ref={bannerRef} src={data.banner} alt={`Banner de ${data.nombre}`} className="wiki-banner-img wiki-banner-parallax" />
        <div className="wiki-banner-overlay">
          <div className="wiki-banner-content">
            {data.logo && <img src={data.logo} alt={data.nombre} className="wiki-banner-logo" />}
            <span className={`wiki-estado ${estadoClass}`}>{data.estado}</span>
          </div>
        </div>
      </section>

      {/* BARRA: REDES + APÓYANOS */}
      <div className="wiki-bars-wrapper">
        {redesActivas.length > 0 && (
          <div className="wiki-socials-bar">
            <span className="wiki-socials-label">apoya este proyecto</span>
            <div className="wiki-socials-icons">
              {redesActivas.map(([red, url]) => <SocialIcon key={red} red={red} url={url!} />)}
            </div>
          </div>
        )}
        {apoyanosList.length > 0 && (
          <div className="wiki-apoyanos-bar">
            <span className="wiki-socials-label">Apóyanos</span>
            <div className="wiki-socials-icons">
              {apoyanosList.map(([plat, url]) => {
                const meta = apoyanosMeta[plat];
                if (!meta) return null;
                return (
                  <a
                    key={plat}
                    href={url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="wiki-social-btn wiki-apoyanos-btn"
                    aria-label={meta.label}
                    title={meta.label}
                    style={{ "--plat-color": meta.color } as React.CSSProperties}
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d={iconos[plat]} />
                    </svg>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* SINOPSIS + VIDEO */}
      <section className="wiki-sinopsis-section" id="sinopsis">
        <div className={`wiki-video-box ${data.videoUrl && data.videoUrl.includes('/shorts/') ? 'wiki-video-box--short' : ''} ${data.videoUrl && data.videoUrl.includes('tiktok.com') ? 'wiki-video-box--tiktok' : ''}`}>
          {data.videoLocal ? (
            // Video local
            <video 
              src={data.videoLocal} 
              title={`Trailer de ${data.nombre}`} 
              controls
              style={{ width: '100%', height: '100%' }}
            />
          ) : data.videoUrl ? (
            // URL de YouTube
            data.videoUrl.includes('youtube.com') || data.videoUrl.includes('youtu.be') ? (
              <iframe src={data.videoUrl} title={`Trailer de ${data.nombre}`} allowFullScreen frameBorder="0" />
            ) : data.videoUrl.includes('tiktok.com') && data.videoUrl.includes('/video/') ? (
              // TikTok embed completo
              <div className="wiki-tiktok-embed">
                <iframe
                  src={`https://www.tiktok.com/embed/${data.videoUrl.split('/video/')[1]}?theme=${isDarkMode ? 'dark' : 'light'}`}
                  title="TikTok video"
                  frameBorder="0"
                  allowFullScreen
                  allow="autoplay; encrypted-media"
                />
              </div>
            ) : (
              // Otro tipo de URL (video directo)
              <video 
                src={data.videoUrl} 
                title={`Trailer de ${data.nombre}`} 
                controls
                style={{ width: '100%', height: '100%' }}
              />
            )
          ) : (
            <div className="wiki-video-placeholder"><span>▶ Trailer / Avance</span></div>
          )}
        </div>
        <div className="wiki-sinopsis-text">
          <h2 className="wiki-section-title">Sinopsis</h2>
          <p>{data.sinopsis}</p>
        </div>
      </section>

      {/* CREADOR */}
      <section className="wiki-creador-section" id="creador">
        <h2 className="wiki-section-title">Creador</h2>
        <div className="wiki-creador-inner">
          <div
            className={`wiki-creador-img-box ${data.creador.imagen ? "wiki-clickable" : ""}`}
            onClick={() => data.creador.imagen && setLightbox(data.creador.imagen)}
          >
            {data.creador.imagen
              ? <img src={data.creador.imagen} alt={data.creador.nombre} />
              : <div className="wiki-creador-placeholder">{data.creador.nombre.charAt(0)}</div>
            }
          </div>
          <div className="wiki-creador-bio">
            <h3>{data.creador.nombre}</h3>
            {data.creador.redes && Object.entries(data.creador.redes).some(([, v]) => v) && (
              <div className="wiki-creador-redes">
                {Object.entries(data.creador.redes).filter(([, v]) => v).map(([red, url]) => (
                  <a key={red} href={url!} target="_blank" rel="noopener noreferrer"
                    className="wiki-social-btn wiki-creador-red" aria-label={red}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d={iconos[red]} />
                    </svg>
                  </a>
                ))}
              </div>
            )}
            <p>{data.creador.descripcion}</p>
            {data.creador.obras && data.creador.obras.length > 0 && (
              <div className="wiki-creador-obras">
                <span className="wiki-creador-obras-label">Otras obras</span>
                <div className="wiki-creador-obras-lista">
                  {data.creador.obras.map((obra, i) =>
                    obra.url
                      ? <a key={i} href={obra.url} target="_blank" rel="noopener noreferrer" className="wiki-obra-tag">{obra.titulo}</a>
                      : <span key={i} className="wiki-obra-tag">{obra.titulo}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CARRUSEL */}
      <section className={`wiki-carrusel-section ${isVerticalCarrusel ? "wiki-carrusel--vertical" : ""}`} id="galeria-visual">
        {data.carrusel.length > 0 ? (
          <>
            <div className="wiki-carrusel-track">
              <div className="wiki-carrusel-slide wiki-carrusel-slide--side" onClick={prev}>
                <img src={data.carrusel[(carruselIdx-1+data.carrusel.length)%data.carrusel.length]} alt="Anterior" />
                <div className="wiki-carrusel-side-hint">‹</div>
              </div>
              <div className={`wiki-carrusel-slide wiki-carrusel-slide--center ${animating ? `wiki-carrusel-exit-${carruselDir}` : "wiki-carrusel-enter"}`}>
                <img src={data.carrusel[carruselIdx]} alt={`Imagen ${carruselIdx+1}`} />
                <div className="wiki-carrusel-center-overlay">
                  <span className="wiki-carrusel-counter">{carruselIdx+1} / {data.carrusel.length}</span>
                </div>
              </div>
              <div className="wiki-carrusel-slide wiki-carrusel-slide--side" onClick={next}>
                <img src={data.carrusel[(carruselIdx+1)%data.carrusel.length]} alt="Siguiente" />
                <div className="wiki-carrusel-side-hint">›</div>
              </div>
            </div>
            <div className="wiki-carrusel-dots">
              {data.carrusel.map((_, i) => (
                <button key={i} className={`wiki-dot ${i===carruselIdx?"activo":""}`}
                  onClick={() => { if (!animating) setCarruselIdx(i); }} aria-label={`Ir a imagen ${i+1}`} />
              ))}
            </div>
          </>
        ) : (
          <div className="wiki-carrusel-track">
            <div className="wiki-carrusel-slide wiki-carrusel-slide--side"><div className="wiki-video-placeholder" /></div>
            <div className="wiki-carrusel-slide wiki-carrusel-slide--center"><div className="wiki-video-placeholder"><span>Carrusel interactivo</span></div></div>
            <div className="wiki-carrusel-slide wiki-carrusel-slide--side"><div className="wiki-video-placeholder" /></div>
          </div>
        )}
      </section>

      {/* PERSONAJES */}
      {data.personajes && data.personajes.length > 0 && (
        <section className="wiki-personajes-section" id="personajes">
          <div className="wiki-personajes-inner">
            <h2 className="wiki-section-title">Personajes</h2>
            <div className="wiki-personajes-grid">
              {data.personajes.map((p, i) => (
                <button key={i} className="wiki-personaje-card" onClick={() => setPersonajeActivo(p)}>
                  <div className="wiki-personaje-img">
                    {p.imagen
                      ? <img src={p.imagen} alt={p.nombre} />
                      : <span>{p.nombre.charAt(0)}</span>
                    }
                  </div>
                  <div className="wiki-personaje-info">
                    <span className="wiki-personaje-rol">{p.rol}</span>
                    <h3 className="wiki-personaje-nombre">{p.nombre}</h3>
                    {p.actorVoz && (
                      <span className="wiki-personaje-va">VA: {p.actorVoz}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* STAFF */}
      <section className="wiki-staff-section" id="staff">
        <button className={`wiki-staff-toggle ${staffAbierto?"abierto":""}`} onClick={() => setStaffAbierto(!staffAbierto)}>
          <span>STAFF</span>
          <svg viewBox="0 0 24 24" width="22" height="22" className="wiki-staff-arrow">
            <path fill="currentColor" d="M7 10l5 5 5-5z" />
          </svg>
        </button>
        <div className={`wiki-staff-content ${staffAbierto?"visible":""}`}>
          {data.staff.map((grupo, grupoIdx) => (
            <div key={grupo.categoria} className="wiki-staff-grupo">
              <h3 className="wiki-staff-categoria">{grupo.categoria}</h3>
              <div className={`wiki-staff-grid ${grupoIdx===0?"wiki-staff-grid--directores":""}`}>
                {grupo.miembros.map((m, i) => (
                  <div key={`${grupo.categoria}-${i}`}
                    className={`wiki-staff-avatar ${grupoIdx===0?"wiki-staff-avatar--director":""} ${m.imagen?"wiki-clickable":""}`}
                    onClick={() => m.imagen && setLightbox(m.imagen)}
                  >
                    <div className="wiki-avatar-img">
                      {m.imagen ? <img src={m.imagen} alt={m.nombre} /> : <span>{m.nombre.charAt(0)}</span>}
                    </div>
                    <p className="wiki-avatar-name">{m.nombre}</p>
                    <p className="wiki-avatar-rol">{m.rol}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECCIONES PERSONALIZADAS */}
      {data.seccionesExtra && data.seccionesExtra.map(seccion => (
        <section key={seccion.id} className="wiki-extra-section" id={seccion.id}>
          <h2 className="wiki-section-title">{seccion.titulo}</h2>
          {seccion.descripcion && <p className="wiki-extra-intro">{seccion.descripcion}</p>}
          {seccion.miembros && seccion.miembros.map((m, i) => (
            <div key={i} className="wiki-creador-inner wiki-extra-miembro">
              <div className="wiki-creador-img-box">
                {m.imagen ? <img src={m.imagen} alt={m.nombre} /> : <div className="wiki-creador-placeholder">{m.nombre.charAt(0)}</div>}
              </div>
              <div className="wiki-creador-bio">
                <h3>{m.nombre}</h3>
                {m.rol && <span className="wiki-extra-rol">{m.rol}</span>}
                <p>{m.descripcion}</p>
              </div>
            </div>
          ))}
        </section>
      ))}

      {/* GALERÍA */}
      <section className="wiki-arte-section" id="arte">
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "4rem 2rem" }}>
          <h2 className="wiki-section-title">Arte del Proyecto</h2>
          {data.galeria.length > 0 ? (
            <div className="wiki-arte-mosaic">
              {data.galeria.map((img, i) => (
                <div key={i} className="wiki-arte-item wiki-clickable" onClick={() => setLightbox(img.src)}>
                  <img src={img.src} alt={img.alt} />
                  <div className="wiki-arte-hover">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                      <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="wiki-arte-mosaic wiki-arte-placeholder">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="wiki-arte-item wiki-arte-empty" />)}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}