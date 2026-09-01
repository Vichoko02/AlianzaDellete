import { useState } from "react";

const pasos = [
  {
    numero: "01",
    titulo: "Revisa nuestros proyectos",
    texto: "Tener un proyecto claro y definido es fundamental para poder formar parte de la Alianza, así que te recomendamos revisar nuestros proyectos actuales para entender mejor el tipo de contenido que apoyamos.",
  },
  {
    numero: "02",
    titulo: "Prepara tu propuesta",
    texto: "Reúne ejemplos de tu trabajo: animaciones, voces, música, arte... y elabora una propuesta clara de tu proyecto.",
  },
  {
    numero: "03",
    titulo: "Envíanos tu propuesta",
    texto: "Mándanos tu propuesta de proyecto a nuestro correo oficial con tu portafolio y área de interés.",
  },
];

export default function Join() {
  const [abierto, setAbierto] = useState(false);

  return (
    <section className="join-section">
      <div className="join-topline" />

      <div className="join-inner">
        <button
          className={`join-header ${abierto ? "activo" : ""}`}
          onClick={() => setAbierto(!abierto)}
          aria-expanded={abierto}
        >
          <div className="join-header-left">
            <span className="join-eyebrow">Programa de Patrocinios</span>
            <h2 className="join-title">¿Cómo unirte?</h2>
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
          <p className="join-intro">
            En la Alianza estamos bastante conscientes del esfuerzo titánico que se requiere para poder sacar adelante un proyecto, 
            añadido a los marcados prejuicios que acarrean los proyectos independientes en Latinoamérica, hacen casi imposible poder 
            sacar un proyecto adelante.
          </p>
          <p className="join-intro">
            Así que si tu proyecto necesita apoyo y quieres más información para poder formar parte de este movimiento, 
            envíanos tu propuesta a nuestro correo oficial.
          </p>

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

          <div className="join-email-icon-wrapper">
            <a 
              href="mailto:postulantesalianza@gmail.com" 
              className="join-email-icon"
              aria-label="Enviar correo"
            >
              <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>

      <div className="join-topline" />
    </section>
  );
}
