import { useState } from "react";
import { useTextos } from "../textos";
import QuizModal from "./QuizModal";

export default function Join() {
  const [abierto, setAbierto] = useState(false);
  const [quizAbierto, setQuizAbierto] = useState(false);
  const t = useTextos();

  const pasos = [1, 2, 3].map((n) => ({
    numero: String(n).padStart(2, "0"),
    titulo: t(`unete.paso${n}.titulo`),
    texto: t(`unete.paso${n}.texto`),
  })).filter((p) => p.titulo || p.texto);

  return (
    <section className="join-section" id="unete">
      <div className="join-topline" />

      <div className="join-inner">
        <button
          className={`join-header ${abierto ? "activo" : ""}`}
          onClick={() => setAbierto(!abierto)}
          aria-expanded={abierto}
        >
          <div className="join-header-left">
            <span className="join-eyebrow">{t("unete.antetitulo")}</span>
            <h2 className="join-title">{t("unete.titulo")}</h2>
          </div>
          <div className="join-header-right">
            <span className="join-cta">{abierto ? "Cerrar" : "Ver más"}</span>
            <svg
              className="join-chevron"
              viewBox="0 0 24 24"
              width="28"
              height="28"
            >
              <path fill="currentColor" d="M7 10l5 5 5-5z" />
            </svg>
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
            <button className="btn-primary join-postular" onClick={() => setQuizAbierto(true)}>
              {t("unete.boton")}
            </button>
          </div>
        </div>
      </div>

      <div className="join-topline" />

      {quizAbierto && <QuizModal onClose={() => setQuizAbierto(false)} />}
    </section>
  );
}
