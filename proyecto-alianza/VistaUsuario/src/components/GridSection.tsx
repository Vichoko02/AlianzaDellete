import { Link } from "react-router-dom";

interface CardItem {
  nombre: string;
  imagen: string;
  enlace?: string;
  onCardClick?: () => void;
}

interface GridSectionProps {
  titulo: string;
  idSeccion: string;
  items: CardItem[];
}

function isInternal(url?: string) {
  return url && url.startsWith("/");
}

export default function GridSection({ titulo, idSeccion, items }: GridSectionProps) {
  return (
    <section className="projects" id={idSeccion}>
      <div className="about-us-title-container">
        <h2 className="about-us-title">{titulo}</h2>
      </div>
      <div className="grid-projects">
        {items.map((item, index) => {
          if (item.onCardClick) {
            return (
              <button
                key={index}
                className="project-card project-card--btn"
                onClick={item.onCardClick}
              >
                <img src={item.imagen} alt={`Imagen de ${item.nombre}`} />
                <h3>{item.nombre}</h3>
              </button>
            );
          }

          // Enlace interno → React Router Link
          if (isInternal(item.enlace)) {
            return (
              <Link to={item.enlace!} className="project-card" key={index}>
                <img src={item.imagen} alt={`Imagen de ${item.nombre}`} />
                <h3>{item.nombre}</h3>
              </Link>
            );
          }

          // Enlace externo o # → <a>
          return (
            <a
              href={item.enlace || "#"}
              className="project-card"
              key={index}
              target={item.enlace && item.enlace !== "#" ? "_blank" : undefined}
              rel="noopener noreferrer"
            >
              <img src={item.imagen} alt={`Imagen de ${item.nombre}`} />
              <h3>{item.nombre}</h3>
            </a>
          );
        })}
      </div>
    </section>
  );
}