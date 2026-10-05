import { urlMedio, type Socio } from "../api";
import { ICONOS } from "../iconos";
import { useTextos } from "../textos";
import { useVentanaAbierta } from "../ventana";

/** Ficha de un socio: imagen, redes, descripción y los proyectos en los que participa. */
export default function VentanaSocio({ socio, alCerrar }: { socio: Socio; alCerrar: () => void }) {
  const t = useTextos();
  const redes = Object.entries(socio.redes).filter(([plataforma, url]) => url && ICONOS[plataforma]);
  useVentanaAbierta(alCerrar);

  return (
    <div className="socio-modal-overlay" onClick={alCerrar}>
      <div className="socio-modal" onClick={(e) => e.stopPropagation()}>
        <button className="socio-modal-close" onClick={alCerrar} aria-label="Cerrar">✕</button>

        <div className="socio-modal-main">
          <div className="socio-modal-img-box">
            {socio.imagen && <img src={urlMedio(socio.imagen)} alt={socio.nombre} />}
          </div>

          <div className="socio-modal-info">
            <h2 className="socio-modal-nombre">{socio.nombre}</h2>
            {redes.length > 0 && (
              <div className="socio-modal-redes">
                {redes.map(([plataforma, url]) => {
                  const icono = ICONOS[plataforma];
                  return (
                    <a key={plataforma} href={url} target="_blank" rel="noopener noreferrer" className="socio-modal-red-btn"
                      aria-label={icono.nombre} style={{ "--red-color": icono.color } as React.CSSProperties}>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d={icono.ruta} /></svg>
                    </a>
                  );
                })}
              </div>
            )}
            <p className="socio-modal-desc">{socio.descripcion}</p>
          </div>
        </div>

        {socio.proyectos.length > 0 && (
          <div className="socio-modal-proyectos">
            <h3 className="socio-modal-proyectos-titulo">{t("socio.proyectos")}</h3>
            <div className="socio-modal-proyectos-grid">
              {socio.proyectos.map((proyecto) => (
                <a key={proyecto.enlace} href={proyecto.enlace} className="socio-modal-proyecto-card" onClick={alCerrar}>
                  {proyecto.imagen && <img src={urlMedio(proyecto.imagen)} alt={proyecto.nombre} />}
                  <span>{proyecto.nombre}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
