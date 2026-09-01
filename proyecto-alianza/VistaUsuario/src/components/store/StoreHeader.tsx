import { useState } from "react";
import { Link } from "react-router-dom";
import logoAlianza from "../../assets/ALIANZA_VECTORIZADO.svg";

export default function StoreHeader() {
  const [menuAbierto, setMenuAbierto] = useState(false);

  const leftLinks = [
    { label: "Novedades", href: "#" },
    { label: "Ofertas", href: "#ofertas" },
  ];

  const rightLinks = [
    { label: "Populares", href: "#populares" },
    { label: "Noticias", href: "/news" },
  ];

  return (
    <header className="wiki-header">
      <div className="wiki-header-inner">
        <nav className="wiki-header-nav wiki-header-nav--left">
          {leftLinks.map(link => (
            <a key={link.label} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
        <Link to="/" className="wiki-home-logo">
          <img src={logoAlianza} alt="Alianza" />
        </Link>
        <nav className="wiki-header-nav wiki-header-nav--right">
          {rightLinks.map(link => (
            <a key={link.label} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
        <button
          className={`hamburger wiki-hamburger ${menuAbierto ? "open" : ""}`}
          onClick={() => setMenuAbierto(!menuAbierto)}
          aria-expanded={menuAbierto}
          aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
        >
          <span /><span /><span />
        </button>
      </div>
      <div className={`nav-dropdown wiki-nav-dropdown ${menuAbierto ? "open" : ""}`}>
        <ul>
          {leftLinks.map((l, i) => (
            <li key={l.label} style={{ "--i": i } as React.CSSProperties}>
              <a href={l.href} onClick={() => setMenuAbierto(false)}>
                {l.label}<span className="nav-arrow">→</span>
              </a>
            </li>
          ))}
          {rightLinks.map((l, i) => (
            <li key={l.label} style={{ "--i": i + leftLinks.length } as React.CSSProperties}>
              <a href={l.href} onClick={() => setMenuAbierto(false)}>
                {l.label}<span className="nav-arrow">→</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
