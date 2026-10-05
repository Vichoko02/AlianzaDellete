import Carrusel from "./Carrusel";
import BarraNavegacion from "./BarraNavegacion";
import logoAlianza from "../assets/ALIANZA_VECTORIZADO.svg";

/** Parte superior de la portada: banners, logo (que cambia el tema) y menú. */
export default function Cabecera({ alCambiarTema }: { alCambiarTema: () => void }) {
  return (
    <header>
      <div className="header-main-container">
        <Carrusel />
        <div className="header-logo-overlay">
          <img src={logoAlianza} alt="Alianza Logo" onClick={alCambiarTema} style={{ cursor: "pointer" }} />
        </div>
        <div className="carousel-gradient-overlay"></div>
      </div>
      <BarraNavegacion />
    </header>
  );
}
