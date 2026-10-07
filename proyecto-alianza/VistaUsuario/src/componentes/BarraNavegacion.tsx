import { useState, useEffect } from "react";
import { useTextos } from "../textos";
import VentanaApoyanos from "./VentanaApoyanos";
import Icono from "./Icono";

/** Menú de la portada. En pantallas chicas se abre como lista desplegable. */
export default function BarraNavegacion() {
  const t = useTextos();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [apoyanosAbierto, setApoyanosAbierto] = useState(false);
  const enlaces = [
    { texto: t("nav.sobre"), destino: "#about", abreApoyanos: false },
    { texto: t("nav.miembros"), destino: "#proyectos", abreApoyanos: false },
    { texto: t("nav.unete"), destino: "#unete", abreApoyanos: false },
    { texto: t("nav.apoyanos"), destino: "#", abreApoyanos: true },
  ];

  // 1. Escape cierra el menú.
  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => { if (e.key === "Escape" && menuAbierto) setMenuAbierto(false); };
    document.addEventListener("keydown", alPresionar);
    return () => document.removeEventListener("keydown", alPresionar);
  }, [menuAbierto]);

  // 2. Un clic fuera del menú también lo cierra.
  useEffect(() => {
    if (!menuAbierto) return;
    const alHacerClic = (e: MouseEvent) => {
      const barra = document.querySelector(".navbar");
      if (barra && !barra.contains(e.target as Node)) setMenuAbierto(false);
    };
    document.addEventListener("mousedown", alHacerClic);
    return () => document.removeEventListener("mousedown", alHacerClic);
  }, [menuAbierto]);

  function alElegir(enlace: (typeof enlaces)[number], e: React.MouseEvent) {
    if (!enlace.abreApoyanos) return;
    e.preventDefault();
    setApoyanosAbierto(true);
    setMenuAbierto(false);
  }

  return (
    <>
      <header className="navbar">
        <nav className="navbar-inner">
          <ul className="nav-links-desktop">
            {enlaces.map((enlace) => (
              <li key={enlace.texto}>
                <a href={enlace.destino} onClick={(e) => alElegir(enlace, e)}>{enlace.texto}</a>
              </li>
            ))}
          </ul>
          <button
            className={`hamburger ${menuAbierto ? "open" : ""}`}
            aria-expanded={menuAbierto}
            aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setMenuAbierto(!menuAbierto)}
          >
            <span /><span /><span />
          </button>
        </nav>

        <div className={`nav-dropdown ${menuAbierto ? "open" : ""}`} aria-hidden={!menuAbierto}>
          <ul>
            {enlaces.map((enlace, i) => (
              <li key={enlace.texto} style={{ "--i": i } as React.CSSProperties}>
                <a href={enlace.destino} onClick={(e) => { alElegir(enlace, e); setMenuAbierto(false); }}>
                  {enlace.texto}
                  <span className="nav-arrow"><Icono nombre="flecha-derecha" tamano={16} /></span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="join-topline" />
      </header>

      {apoyanosAbierto && <VentanaApoyanos alCerrar={() => setApoyanosAbierto(false)} />}
    </>
  );
}
