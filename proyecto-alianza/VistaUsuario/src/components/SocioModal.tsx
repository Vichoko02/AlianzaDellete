import { useEffect } from "react";

export interface Socio {
  nombre: string;
  imagen: string;
  descripcion: string;
  redes: {
    instagram?: string;
    twitter?: string;
    youtube?: string;
    tiktok?: string;
    twitch?: string;
    kick?: string;
    doblaje?: string;
    facebook?: string;
  };
  proyectos?: {
    nombre: string;
    imagen: string;
    enlace?: string;
  }[];
}

const redIconos: Record<string, { path: string; label: string; color: string }> = {
  instagram: {
    label: "Instagram",
    color: "#E1306C",
    path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z",
  },
  twitter: {
    label: "Twitter/X",
    color: "#ffffff",
    path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  },
  youtube: {
    label: "YouTube",
    color: "#FF0000",
    path: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
  },
  tiktok: {
    label: "TikTok",
    color: "#ffffff",
    path: "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z",
  },
  twitch: {
    label: "Twitch",
    color: "#9146FF",
    path: "M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z",
  },
  kick: {
    label: "Kick",
    color: "#53FC18",
    path: "M4 2h3v8l6-8h4L10 12l7 10h-4l-6-8v8H4z",
  },
  doblaje: {
    label: "Doblaje Wiki",
    color: "#f8c300",
    path: "M12 1a11 11 0 1 0 0 22A11 11 0 0 0 12 1zm0 2a9 9 0 1 1 0 18A9 9 0 0 1 12 3zm-1 4v10l8-5z",
  },
  facebook: {
    label: "Facebook",
    color: "#1877F2",
    path: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
  },
};

interface SocioModalProps {
  socio: Socio;
  onClose: () => void;
}

export default function SocioModal({ socio, onClose }: SocioModalProps) {
  // Cerrar con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const redesActivas = Object.entries(socio.redes).filter(([, url]) => url);

  return (
    <div className="socio-modal-overlay" onClick={onClose}>
      <div className="socio-modal" onClick={(e) => e.stopPropagation()}>

        {/* Botón cerrar */}
        <button className="socio-modal-close" onClick={onClose} aria-label="Cerrar">✕</button>

        {/* Contenido principal */}
        <div className="socio-modal-main">

          {/* Imagen */}
          <div className="socio-modal-img-box">
            <img src={socio.imagen} alt={socio.nombre} />
          </div>

          {/* Info */}
          <div className="socio-modal-info">
            <h2 className="socio-modal-nombre">{socio.nombre}</h2>

            {/* Redes */}
            {redesActivas.length > 0 && (
              <div className="socio-modal-redes">
                {redesActivas.map(([red, url]) => {
                  const icono = redIconos[red];
                  if (!icono) return null;
                  return (
                    <a
                      key={red}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="socio-modal-red-btn"
                      aria-label={icono.label}
                      style={{ "--red-color": icono.color } as React.CSSProperties}
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                        <path d={icono.path} />
                      </svg>
                    </a>
                  );
                })}
              </div>
            )}

            <p className="socio-modal-desc">{socio.descripcion}</p>
          </div>
        </div>

        {/* Proyectos relacionados */}
        {socio.proyectos && socio.proyectos.length > 0 && (
          <div className="socio-modal-proyectos">
            <h3 className="socio-modal-proyectos-titulo">Proyectos</h3>
            <div className="socio-modal-proyectos-grid">
              {socio.proyectos.map((p, i) => (
                <a
                  key={i}
                  href={p.enlace || "#"}
                  className="socio-modal-proyecto-card"
                  onClick={onClose}
                >
                  <img src={p.imagen} alt={p.nombre} />
                  <span>{p.nombre}</span>
                </a>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}