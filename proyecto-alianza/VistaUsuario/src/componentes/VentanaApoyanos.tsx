import { plataformaDe } from "../iconos";
import Icono from "./Icono";
import { useEnlaces, useTextos } from "../textos";
import { useVentanaAbierta } from "../ventana";

/** Formas de apoyar a la Alianza. Las opciones (nombre, descripción y enlace) se editan en el panel. */
export default function VentanaApoyanos({ alCerrar }: { alCerrar: () => void }) {
  const t = useTextos();
  const opciones = useEnlaces("apoyanos").map((enlace) => ({ ...enlace, icono: plataformaDe(enlace.plataforma) }));
  useVentanaAbierta(alCerrar);

  return (
    <div className="apoyanos-overlay" onClick={alCerrar}>
      <div className="apoyanos-modal" onClick={(e) => e.stopPropagation()}>
        <button className="socio-modal-close" onClick={alCerrar} aria-label="Cerrar"><Icono nombre="cerrar" tamano={18} /></button>

        <div className="apoyanos-header">
          <h2 className="apoyanos-titulo">{t("apoyanos.titulo")}</h2>
          <p className="apoyanos-subtitulo">{t("apoyanos.subtitulo")}</p>
        </div>

        <div className="apoyanos-lista">
          {opciones.map((opcion) => (
            <a key={`${opcion.plataforma}-${opcion.url}`} href={opcion.url} target="_blank" rel="noopener noreferrer" className="apoyanos-item"
              style={{ "--red-color": opcion.icono.color } as React.CSSProperties}>
              <div className="apoyanos-icono">
                <Icono nombre={opcion.plataforma} tamano={22} />
              </div>
              <div className="apoyanos-info">
                <span className="apoyanos-nombre">{opcion.etiqueta || opcion.icono.nombre}</span>
                <span className="apoyanos-desc">{opcion.descripcion ?? ""}</span>
              </div>
              <Icono nombre="enlace-externo" tamano={16} clase="apoyanos-arrow" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
