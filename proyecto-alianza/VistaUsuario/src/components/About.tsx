import { useState } from "react";
import titleSobreNosotros from "../assets/SOBRE_NOSOTROS.svg";

export default function About() {
  const [abierto, setAbierto] = useState(false);

  return (
    <section id="about" className="about-section">
      <div className="content-wrapper">

        {/* SVG + flecha como botón */}
        <button
          className={`about-toggle ${abierto ? "activo" : ""}`}
          onClick={() => setAbierto(!abierto)}
          aria-expanded={abierto}
        >
          <div className="about-us-title-container">
            <img src={titleSobreNosotros} alt="Sobre Nosotros" className="about-us-image" />
          </div>
          <svg
            className="about-arrow"
            viewBox="0 0 24 24"
            width="32"
            height="32"
          >
            <path fill="currentColor" d="M7 10l5 5 5-5z" />
          </svg>
        </button>

        {/* Contenido desplegable */}
        <div className={`about-content ${abierto ? "visible" : ""}`}>
          <p>
            Somos una alianza de creadores independientes unidos por la pasión de contar
            historias y llevar sus proyectos al siguiente nivel a través de la
            colaboración.{" "}
            <strong>Conoce a nuestros talentos/asociados.</strong>
          </p>
        </div>

      </div>
    </section>
  );
}
