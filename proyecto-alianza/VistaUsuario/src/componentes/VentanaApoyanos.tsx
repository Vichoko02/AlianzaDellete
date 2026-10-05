import { iconoDe } from "../iconos";
import { useEnlaces, useTextos } from "../textos";
import { useVentanaAbierta } from "../ventana";

/** Formas de apoyar a la Alianza. Las opciones (nombre, descripción y enlace) se editan en el panel. */
export default function VentanaApoyanos({ alCerrar }: { alCerrar: () => void }) {
  const t = useTextos();
  const opciones = useEnlaces("apoyanos").map((enlace) => ({ ...enlace, icono: iconoDe(enlace.plataforma) }));
  useVentanaAbierta(alCerrar);

  return (
    <div className="apoyanos-overlay" onClick={alCerrar}>
      <div className="apoyanos-modal" onClick={(e) => e.stopPropagation()}>
        <button className="socio-modal-close" onClick={alCerrar} aria-label="Cerrar">✕</button>

        <div className="apoyanos-header">
          <h2 className="apoyanos-titulo">{t("apoyanos.titulo")}</h2>
          <p className="apoyanos-subtitulo">{t("apoyanos.subtitulo")}</p>
        </div>

        <div className="apoyanos-lista">
          {opciones.map((opcion) => (
            <a key={`${opcion.plataforma}-${opcion.url}`} href={opcion.url} target="_blank" rel="noopener noreferrer" className="apoyanos-item"
              style={{ "--red-color": opcion.icono.color } as React.CSSProperties}>
              <div className="apoyanos-icono">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d={opcion.icono.ruta} /></svg>
              </div>
              <div className="apoyanos-info">
                <span className="apoyanos-nombre">{opcion.etiqueta || opcion.icono.nombre}</span>
                <span className="apoyanos-desc">{opcion.descripcion ?? ""}</span>
              </div>
              <svg className="apoyanos-arrow" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 17L17 7M7 7h10v10" />
              </svg>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
