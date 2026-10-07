import { Link } from "react-router-dom";

/** Una tarjeta abre una ventana (alHacerClic) o lleva a otra página (enlace). */
export interface Tarjeta {
  nombre: string;
  imagen?: string | null;
  enlace?: string;
  alHacerClic?: () => void;
}

/** Grilla de tarjetas de la portada (asociados y proyectos). */
export default function SeccionTarjetas({ titulo, idSeccion, tarjetas }: { titulo: string; idSeccion: string; tarjetas: Tarjeta[] }) {
  return (
    <section className="projects" id={idSeccion}>
      <div className="about-us-title-container">
        <h2 className="about-us-title">{titulo}</h2>
      </div>
      <div className="grid-projects">
        {tarjetas.map((tarjeta, indice) => {
          const contenido = (
            <>
              {tarjeta.imagen && <img src={tarjeta.imagen} alt={`Imagen de ${tarjeta.nombre}`} />}
              <h3>{tarjeta.nombre}</h3>
            </>
          );

          // 1. Tarjeta que abre una ventana.
          if (tarjeta.alHacerClic) {
            return <button key={indice} className="project-card project-card--btn" onClick={tarjeta.alHacerClic}>{contenido}</button>;
          }
          // 2. Enlace dentro del sitio.
          if (tarjeta.enlace?.startsWith("/")) {
            return <Link key={indice} to={tarjeta.enlace} className="project-card">{contenido}</Link>;
          }
          // 3. Enlace a otro sitio.
          return (
            <a key={indice} href={tarjeta.enlace || "#"} className="project-card" target={tarjeta.enlace ? "_blank" : undefined} rel="noopener noreferrer">
              {contenido}
            </a>
          );
        })}
      </div>
    </section>
  );
}
