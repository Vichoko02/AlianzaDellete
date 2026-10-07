import { useState } from "react";
import tituloSobreNosotros from "../assets/SOBRE_NOSOTROS.svg";
import { useTextos } from "../textos";
import Icono from "./Icono";

/** Sección desplegable «Sobre nosotros». */
export default function SobreNosotros() {
  const t = useTextos();
  const [abierto, setAbierto] = useState(false);

  return (
    <section id="about" className="about-section">
      <div className="content-wrapper">
        <button className={`about-toggle ${abierto ? "activo" : ""}`} onClick={() => setAbierto(!abierto)} aria-expanded={abierto}>
          <div className="about-us-title-container">
            <img src={tituloSobreNosotros} alt={t("inicio.sobre.titulo")} className="about-us-image" />
          </div>
          <Icono nombre="desplegar" tamano={32} clase="about-arrow" />
        </button>

        <div className={`about-content ${abierto ? "visible" : ""}`}>
          <p>
            {t("inicio.sobre.texto")}{" "}
            <strong>{t("inicio.sobre.destacado")}</strong>
          </p>
        </div>
      </div>
    </section>
  );
}
