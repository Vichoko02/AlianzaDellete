import { useState, useEffect } from "react";
import ApoyanosModal from "./ApoyanosModal";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [modalApoyanos, setModalApoyanos] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) setIsOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const nav = document.querySelector(".navbar");
      if (nav && !nav.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const links = [
    //{ label: "Tienda",         href: "/store",                            external: false, modal: false },
    { label: "Sobre Nosotros", href: "#about",                            external: false, modal: false },
    //{ label: "Noticias",       href: "/news",                             external: false, modal: false },
    { label: "Miembros",       href: "#proyectos",                        external: false, modal: false },
    { label: "Apóyanos",       href: "#",                                 external: false, modal: true },
  ];

  const handleClick = (link: typeof links[0], e: React.MouseEvent) => {
    if (link.modal) {
      e.preventDefault();
      setModalApoyanos(true);
      setIsOpen(false);
    }
  };

  return (
    <>
      <header className="navbar">
        <nav className="navbar-inner">
          <ul className="nav-links-desktop">
            {links.map((l) => (
              <li key={l.label}>
                <a
                  href={l.href}
                  {...(l.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  onClick={(e) => handleClick(l, e)}
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <button
            className={`hamburger ${isOpen ? "open" : ""}`}
            aria-expanded={isOpen}
            aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setIsOpen(!isOpen)}
          >
            <span /><span /><span />
          </button>
        </nav>

        <div className={`nav-dropdown ${isOpen ? "open" : ""}`} aria-hidden={!isOpen}>
          <ul>
            {links.map((l, i) => (
              <li key={l.label} style={{ "--i": i } as React.CSSProperties}>
                <a
                  href={l.href}
                  {...(l.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  onClick={(e) => { handleClick(l, e); setIsOpen(false); }}
                >
                  {l.label}
                  <span className="nav-arrow">→</span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="join-topline" />
      </header>

      {modalApoyanos && <ApoyanosModal onClose={() => setModalApoyanos(false)} />}
    </>
  );
}
