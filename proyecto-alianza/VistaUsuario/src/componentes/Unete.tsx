import { useState } from "react";
import { useTextos } from "../textos";
import VentanaPostulacion from "./VentanaPostulacion";
import Icono from "./Icono";

/** Sección «Únete»: explica los pasos y abre el formulario de postulación. */
export default function Unete() {
  const t = useTextos();
  const [abierto, setAbierto] = useState(false);
  const [postulacionAbierta, setPostulacionAbierta] = useState(false);
  const pasos = [1, 2, 3]
    .map((n) => ({ numero: String(n).padStart(2, "0"), titulo: t(`unete.paso${n}.titulo`), texto: t(`unete.paso${n}.texto`) }))
    .filter((paso) => paso.titulo || paso.texto);

  return (
    <section className="join-section" id="unete">
      <div className="join-topline" />

      <div className="join-inner">
        <button className={`join-header ${abierto ? "activo" : ""}`} onClick={() => setAbierto(!abierto)} aria-expanded={abierto}>
          <div className="join-header-left">
            <span className="join-eyebrow">{t("unete.antetitulo")}</span>
            <h2 className="join-title">{t("unete.titulo")}</h2>
          </div>
          <div className="join-header-right">
            <span className="join-cta">{abierto ? "Cerrar" : "Ver más"}</span>
            <Icono nombre="desplegar" tamano={28} clase="join-chevron" />
          </div>
        </button>

        <div className={`join-body ${abierto ? "visible" : ""}`}>
          {t("unete.intro1") && <p className="join-intro">{t("unete.intro1")}</p>}
          {t("unete.intro2") && <p className="join-intro">{t("unete.intro2")}</p>}

          <div className="join-pasos">
            {pasos.map((paso) => (
              <div key={paso.numero} className="join-paso">
                <span className="join-paso-num">{paso.numero}</span>
                <div className="join-paso-content">
                  <h3 className="join-paso-titulo">{paso.titulo}</h3>
                  <p className="join-paso-texto">{paso.texto}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="join-postular-wrapper">
            <button className="btn-primary join-postular" onClick={() => setPostulacionAbierta(true)}>{t("unete.boton")}</button>
          </div>
        </div>
      </div>

      <div className="join-topline" />

      {postulacionAbierta && <VentanaPostulacion alCerrar={() => setPostulacionAbierta(false)} />}
    </section>
  );
}
