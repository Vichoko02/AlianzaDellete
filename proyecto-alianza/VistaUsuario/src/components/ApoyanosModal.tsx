import { useEffect } from "react";
import { useEnlaces, useTextos } from "../textos";

const ICONO_INSTAGRAM = "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z";

interface ApoyanosModalProps {
  onClose: () => void;
}

// Íconos y colores son parte del diseño; las opciones (nombre, descripción y enlace) se editan en el panel.
const iconosRedes: Record<string, { color: string; path: string }> = {
  patreon: { color: "#FF424D", path: "M0 .5h4.219v23H0zm15.384.5c-6.272 0-9.384 3.4-9.384 8.6 0 5.2 3.112 8.6 9.384 8.6C21.656 18.2 24 15 24 9.6 24 4.2 21.656.5 15.384.5z" },
  instagram: { color: "#E1306C", path: ICONO_INSTAGRAM },
  twitter: { color: "#ffffff", path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" },
  youtube: { color: "#FF0000", path: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" },
};
const iconoGenerico = { color: "#888888", path: "M10.59 13.41a1.996 1.996 0 0 1 0-2.82l3.18-3.18a2 2 0 1 1 2.83 2.83l-1.06 1.06 1.41 1.41 1.06-1.06a4 4 0 0 0-5.66-5.66l-3.18 3.18a4 4 0 0 0 0 5.66l1.42-1.42zm2.82-2.82a1.996 1.996 0 0 1 0 2.82l-3.18 3.18a2 2 0 1 1-2.83-2.83l1.06-1.06-1.41-1.41-1.06 1.06a4 4 0 0 0 5.66 5.66l3.18-3.18a4 4 0 0 0 0-5.66l-1.42 1.42z" };


export default function ApoyanosModal({ onClose }: ApoyanosModalProps) {
  const t = useTextos();
  const redes = useEnlaces("apoyanos").map((e) => ({
    nombre: e.etiqueta || e.plataforma,
    descripcion: e.descripcion ?? "",
    url: e.url,
    ...(iconosRedes[e.plataforma] ?? iconoGenerico),
  }));
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="apoyanos-overlay" onClick={onClose}>
      <div className="apoyanos-modal" onClick={(e) => e.stopPropagation()}>

        <button className="socio-modal-close" onClick={onClose} aria-label="Cerrar">✕</button>

        <div className="apoyanos-header">
          <h2 className="apoyanos-titulo">{t("apoyanos.titulo")}</h2>
          <p className="apoyanos-subtitulo">{t("apoyanos.subtitulo")}</p>
        </div>

        <div className="apoyanos-lista">
          {redes.map((red) => (
            <a
              key={`${red.nombre}-${red.url}`}
              href={red.url}
              target="_blank"
              rel="noopener noreferrer"
              className="apoyanos-item"
              style={{ "--red-color": red.color } as React.CSSProperties}
            >
              <div className="apoyanos-icono">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                  <path d={red.path} />
                </svg>
              </div>
              <div className="apoyanos-info">
                <span className="apoyanos-nombre">{red.nombre}</span>
                <span className="apoyanos-desc">{red.descripcion}</span>
              </div>
              <svg className="apoyanos-arrow" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 17L17 7M7 7h10v10"/>
              </svg>
            </a>
          ))}
        </div>

      </div>
    </div>
  );
}
