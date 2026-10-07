import { useState, useEffect, useRef, useContext } from "react";
import logoAlianza from "../assets/ALIANZA_VECTORIZADO.svg";
import Pie from "./Pie";
import type { MiembroEquipo, Personaje, Socio, Wiki } from "../api";
import { PLATAFORMAS } from "../iconos";
import { SitioContexto, useTextos } from "../textos";
import VentanaSocio from "./VentanaSocio";
import { useVentanaAbierta } from "../ventana";
import Icono from "./Icono";

// Página de un proyecto. Se lee en el orden en que aparece en pantalla:
// menú → cabecera → redes y apoyo → sinopsis y video → creador → carrusel → personajes → equipo → galería → pie.

/** Clases de diseño para los estados de siempre; un estado nuevo usa el color que se le dio en el panel. */
const CLASES_ESTADO: Record<string, string> = {
  "en-produccion": "wiki-estado--produccion", "en-emision": "wiki-estado--emision", finalizado: "wiki-estado--finalizado",
  pausado: "wiki-estado--pausado", cancelado: "wiki-estado--cancelado", pronto: "wiki-estado--pronto",
};

/** Botones redondos de redes (o de plataformas de apoyo, con su color). */
function BotonesRedes({ redes, tamano = 20, conColor = false, clase = "" }: { redes: [string, string][]; tamano?: number; conColor?: boolean; clase?: string }) {
  return (
    <>
      {redes.filter(([plataforma]) => PLATAFORMAS[plataforma]).map(([plataforma, url]) => {
        const icono = PLATAFORMAS[plataforma];
        return (
          <a key={plataforma} href={url} target="_blank" rel="noopener noreferrer" className={`wiki-social-btn ${clase}`}
            aria-label={icono.nombre} title={conColor ? icono.nombre : undefined}
            style={conColor ? ({ "--plat-color": icono.color } as React.CSSProperties) : undefined}>
            <Icono nombre={plataforma} tamano={tamano} />
          </a>
        );
      })}
    </>
  );
}

/** Ficha ampliada de un personaje. */
function VentanaPersonaje({ personaje, alCerrar }: { personaje: Personaje; alCerrar: () => void }) {
  const t = useTextos();
  useVentanaAbierta(alCerrar);

  return (
    <div className="personaje-overlay" onClick={alCerrar}>
      <div className="personaje-modal" onClick={(e) => e.stopPropagation()}>
        <button className="socio-modal-close" onClick={alCerrar} aria-label="Cerrar"><Icono nombre="cerrar" tamano={18} /></button>
        <div className="personaje-modal-main">
          <div className="personaje-modal-img">
            {personaje.imagen ? <img src={personaje.imagen} alt={personaje.nombre} /> : <span>{personaje.nombre.charAt(0)}</span>}
          </div>
          <div className="personaje-modal-info">
            <span className="personaje-modal-rol">{personaje.rol}</span>
            <h2 className="personaje-modal-nombre">{personaje.nombre}</h2>
            <p className="personaje-modal-desc">{personaje.descripcion}</p>
            {personaje.actorVoz && (
              <div className="personaje-modal-va">
                {personaje.imagenActorVoz && <img src={personaje.imagenActorVoz} alt={personaje.actorVoz} className="personaje-va-img" />}
                <div>
                  <span className="personaje-va-label">{t("wiki.actorVoz")}</span>
                  <span className="personaje-va-nombre">{personaje.actorVoz}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Miembro del equipo. Si tiene imagen alternativa, aparece al pasar el cursor (o al enfocar con el teclado).
 * Si también es socio de la Alianza, lleva la etiqueta y al hacer clic se abre su ficha; si no, se amplía su foto.
 */
function TarjetaMiembro({ miembro, director, socio, alAmpliar, alAbrirSocio }: {
  miembro: MiembroEquipo; director: boolean; socio: Socio | null; alAmpliar: (url: string) => void; alAbrirSocio: (s: Socio) => void;
}) {
  const t = useTextos();
  const clicable = socio !== null || miembro.imagen !== null;
  const alHacerClic = () => { if (socio) alAbrirSocio(socio); else if (miembro.imagen) alAmpliar(miembro.imagen); };

  return (
    <div className={`wiki-staff-avatar ${director ? "wiki-staff-avatar--director" : ""} ${clicable ? "wiki-clickable" : ""} ${socio ? "wiki-staff-avatar--socio" : ""}`}
      onClick={alHacerClic} role={clicable ? "button" : undefined} tabIndex={clicable ? 0 : undefined}
      onKeyDown={(e) => { if (clicable && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); alHacerClic(); } }}>
      <div className={`wiki-avatar-img ${miembro.imagenAlternativa ? "wiki-avatar-img--doble" : ""}`}>
        {miembro.imagen ? <img src={miembro.imagen} alt={miembro.nombre} /> : <span>{miembro.nombre.charAt(0)}</span>}
        {miembro.imagenAlternativa && <img className="wiki-avatar-alternativa" src={miembro.imagenAlternativa} alt="" aria-hidden="true" />}
      </div>
      <p className="wiki-avatar-name">{miembro.nombre}</p>
      <p className="wiki-avatar-rol">{miembro.rol}</p>
      {socio && <p className="wiki-avatar-socio" title={socio.nombre}>{t("wiki.socio")}</p>}
    </div>
  );
}

/** Video del proyecto: archivo propio, YouTube, TikTok o un enlace directo a un video. */
function Video({ wiki, modoOscuro }: { wiki: Wiki; modoOscuro: boolean }) {
  const t = useTextos();
  const url = wiki.urlVideo ?? "";
  const titulo = `Trailer de ${wiki.nombre}`;

  if (wiki.videoPropio) return <video src={wiki.videoPropio} title={titulo} controls style={{ width: "100%", height: "100%" }} />;
  if (url.includes("youtube.com") || url.includes("youtu.be")) return <iframe src={url} title={titulo} allowFullScreen frameBorder="0" />;
  if (url.includes("tiktok.com") && url.includes("/video/")) {
    return (
      <div className="wiki-tiktok-embed">
        <iframe src={`https://www.tiktok.com/embed/${url.split("/video/")[1]}?theme=${modoOscuro ? "dark" : "light"}`}
          title="Video de TikTok" frameBorder="0" allowFullScreen allow="autoplay; encrypted-media" />
      </div>
    );
  }
  if (url) return <video src={url} title={titulo} controls style={{ width: "100%", height: "100%" }} />;
  return <div className="wiki-video-placeholder"><span><Icono nombre="reproducir" tamano={18} /> {t("wiki.trailer")}</span></div>;
}

export default function PlantillaWiki({ wiki }: { wiki: Wiki }) {
  const t = useTextos();
  const [indiceCarrusel, setIndiceCarrusel] = useState(0);
  const [direccionCarrusel, setDireccionCarrusel] = useState<"left" | "right">("right");
  const [animando, setAnimando] = useState(false);
  const [carruselVertical, setCarruselVertical] = useState(false);
  const [equipoAbierto, setEquipoAbierto] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [imagenAmpliada, setImagenAmpliada] = useState<string | null>(null);
  const [personajeAbierto, setPersonajeAbierto] = useState<Personaje | null>(null);
  const [socioAbierto, setSocioAbierto] = useState<Socio | null>(null);
  const socios = useContext(SitioContexto)?.socios ?? [];
  const [modoOscuro, setModoOscuro] = useState(() => document.body.classList.contains("dark-theme"));
  const refCabecera = useRef<HTMLImageElement>(null);
  const totalCarrusel = wiki.carrusel.length;
  const redes = Object.entries(wiki.redes).filter(([, url]) => url);
  const apoyo = Object.entries(wiki.apoyo).filter(([, url]) => url);
  const redesCreador = Object.entries(wiki.creador.redes).filter(([, url]) => url);
  const urlVideo = wiki.urlVideo ?? "";
  const enlacesMenu = [
    { texto: t("wiki.sinopsis"), destino: "#sinopsis" },
    { texto: t("wiki.galeria"), destino: "#galeria-visual" },
    { texto: t("wiki.creador"), destino: "#creador" },
    { texto: t("wiki.equipo"), destino: "#staff" },
    { texto: t("wiki.arte"), destino: "#arte" },
  ];

  // 1. Seguir el tema claro/oscuro (lo usa el video de TikTok).
  useEffect(() => {
    const observador = new MutationObserver(() => setModoOscuro(document.body.classList.contains("dark-theme")));
    observador.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => observador.disconnect();
  }, []);

  // 2. Si la mayoría de las imágenes del carrusel son verticales (9:16), usar el diseño vertical.
  useEffect(() => {
    let cargadas = 0;
    let verticales = 0;
    if (totalCarrusel === 0) return;

    wiki.carrusel.forEach((url) => {
      const imagen = new Image();
      imagen.onload = () => {
        if (imagen.width / imagen.height < 0.7) verticales++;
        cargadas++;
        if (cargadas === totalCarrusel) setCarruselVertical(verticales / totalCarrusel > 0.5);
      };
      imagen.src = url;
    });
  }, [wiki.carrusel, totalCarrusel]);

  // 3. Mover el carrusel (con animación) y avanzarlo solo cada 6 segundos.
  function mover(direccion: "left" | "right") {
    if (animando) return;
    setDireccionCarrusel(direccion);
    setAnimando(true);
    setTimeout(() => {
      setIndiceCarrusel((i) => (direccion === "right" ? (i + 1) % totalCarrusel : (i - 1 + totalCarrusel) % totalCarrusel));
      setAnimando(false);
    }, 380);
  }
  const anterior = () => mover("left");
  const siguiente = () => mover("right");

  useEffect(() => {
    if (totalCarrusel <= 1) return;
    const espera = setTimeout(() => siguiente(), 6000);
    return () => clearTimeout(espera);
  }, [indiceCarrusel, animando]); // eslint-disable-line react-hooks/exhaustive-deps

  // 4. Efecto de profundidad en la imagen de cabecera al desplazarse.
  useEffect(() => {
    const alDesplazar = () => {
      if (refCabecera.current) refCabecera.current.style.transform = `translateY(${window.scrollY * 0.35}px)`;
    };
    window.addEventListener("scroll", alDesplazar, { passive: true });
    return () => window.removeEventListener("scroll", alDesplazar);
  }, []);

  return (
    <div className="wiki-page">

      {imagenAmpliada && (
        <div className="wiki-lightbox" onClick={() => setImagenAmpliada(null)}>
          <button className="wiki-lightbox-close" onClick={() => setImagenAmpliada(null)} aria-label="Cerrar"><Icono nombre="cerrar" tamano={22} /></button>
          <img src={imagenAmpliada} alt="Vista completa" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
      {personajeAbierto && <VentanaPersonaje personaje={personajeAbierto} alCerrar={() => setPersonajeAbierto(null)} />}
      {socioAbierto && <VentanaSocio socio={socioAbierto} alCerrar={() => setSocioAbierto(null)} />}

      {/* MENÚ */}
      <header className="wiki-header">
        <div className="wiki-header-inner">
          <nav className="wiki-header-nav wiki-header-nav--left">
            <a href="#sinopsis">{t("wiki.sinopsis")}</a>
            <a href="#galeria-visual">{t("wiki.galeria")}</a>
          </nav>
          <a href="/" className="wiki-home-logo" aria-label="Volver al inicio">
            <img src={logoAlianza} alt="Alianza" />
          </a>
          <nav className="wiki-header-nav wiki-header-nav--right">
            <a href="#creador">{t("wiki.creador")}</a>
            <a href="#staff">{t("wiki.equipo")}</a>
            <a href="#arte">{t("wiki.arte")}</a>
          </nav>
          <button className={`hamburger wiki-hamburger ${menuAbierto ? "open" : ""}`} onClick={() => setMenuAbierto(!menuAbierto)}
            aria-expanded={menuAbierto} aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}>
            <span /><span /><span />
          </button>
        </div>
        <div className={`nav-dropdown wiki-nav-dropdown ${menuAbierto ? "open" : ""}`}>
          <ul>
            {enlacesMenu.map((enlace, i) => (
              <li key={enlace.destino} style={{ "--i": i } as React.CSSProperties}>
                <a href={enlace.destino} onClick={() => setMenuAbierto(false)}>{enlace.texto}<span className="nav-arrow"><Icono nombre="flecha-derecha" tamano={16} /></span></a>
              </li>
            ))}
          </ul>
        </div>
      </header>

      {/* CABECERA */}
      <section className="wiki-banner">
        {wiki.cabecera && <img ref={refCabecera} src={wiki.cabecera} alt={`Cabecera de ${wiki.nombre}`} className="wiki-banner-img wiki-banner-parallax" />}
        <div className="wiki-banner-overlay">
          <div className="wiki-banner-content">
            {wiki.logo && <img src={wiki.logo} alt={wiki.nombre} className="wiki-banner-logo" />}
            <span className={`wiki-estado ${CLASES_ESTADO[wiki.estado.codigo] ?? ""}`} style={{ background: wiki.estado.color }}>{wiki.estado.nombre}</span>
          </div>
        </div>
      </section>

      {/* REDES Y APOYO */}
      <div className="wiki-bars-wrapper">
        {redes.length > 0 && (
          <div className="wiki-socials-bar">
            <span className="wiki-socials-label">{t("wiki.apoyaProyecto")}</span>
            <div className="wiki-socials-icons"><BotonesRedes redes={redes} /></div>
          </div>
        )}
        {apoyo.length > 0 && (
          <div className="wiki-apoyanos-bar">
            <span className="wiki-socials-label">{t("wiki.apoyanos")}</span>
            <div className="wiki-socials-icons"><BotonesRedes redes={apoyo} conColor clase="wiki-apoyanos-btn" /></div>
          </div>
        )}
      </div>

      {/* SINOPSIS Y VIDEO */}
      <section className="wiki-sinopsis-section" id="sinopsis">
        <div className={`wiki-video-box ${urlVideo.includes("/shorts/") ? "wiki-video-box--short" : ""} ${urlVideo.includes("tiktok.com") ? "wiki-video-box--tiktok" : ""}`}>
          <Video wiki={wiki} modoOscuro={modoOscuro} />
        </div>
        <div className="wiki-sinopsis-text">
          <h2 className="wiki-section-title">{t("wiki.sinopsis")}</h2>
          <p>{wiki.sinopsis}</p>
        </div>
      </section>

      {/* CREADOR */}
      <section className="wiki-creador-section" id="creador">
        <h2 className="wiki-section-title">{t("wiki.creador")}</h2>
        <div className="wiki-creador-inner">
          <div className={`wiki-creador-img-box ${wiki.creador.imagen ? "wiki-clickable" : ""}`}
            onClick={() => wiki.creador.imagen && setImagenAmpliada(wiki.creador.imagen)}>
            {wiki.creador.imagen
              ? <img src={wiki.creador.imagen} alt={wiki.creador.nombre} />
              : <div className="wiki-creador-placeholder">{wiki.creador.nombre.charAt(0)}</div>}
          </div>
          <div className="wiki-creador-bio">
            <h3>{wiki.creador.nombre}</h3>
            {redesCreador.length > 0 && (
              <div className="wiki-creador-redes"><BotonesRedes redes={redesCreador} tamano={16} clase="wiki-creador-red" /></div>
            )}
            <p>{wiki.creador.descripcion}</p>
            {wiki.creador.obras.length > 0 && (
              <div className="wiki-creador-obras">
                <span className="wiki-creador-obras-label">{t("wiki.otrasObras")}</span>
                <div className="wiki-creador-obras-lista">
                  {wiki.creador.obras.map((obra, i) => obra.url
                    ? <a key={i} href={obra.url} target="_blank" rel="noopener noreferrer" className="wiki-obra-tag">{obra.titulo}</a>
                    : <span key={i} className="wiki-obra-tag">{obra.titulo}</span>)}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CARRUSEL */}
      <section className={`wiki-carrusel-section ${carruselVertical ? "wiki-carrusel--vertical" : ""}`} id="galeria-visual">
        {totalCarrusel > 0 ? (
          <>
            <div className="wiki-carrusel-track">
              <div className="wiki-carrusel-slide wiki-carrusel-slide--side" onClick={anterior}>
                <img src={wiki.carrusel[(indiceCarrusel - 1 + totalCarrusel) % totalCarrusel]} alt="Anterior" />
                <div className="wiki-carrusel-side-hint"><Icono nombre="anterior" tamano={28} /></div>
              </div>
              <div className={`wiki-carrusel-slide wiki-carrusel-slide--center ${animando ? `wiki-carrusel-exit-${direccionCarrusel}` : "wiki-carrusel-enter"}`}>
                <img src={wiki.carrusel[indiceCarrusel]} alt={`Imagen ${indiceCarrusel + 1}`} />
                <div className="wiki-carrusel-center-overlay">
                  <span className="wiki-carrusel-counter">{indiceCarrusel + 1} / {totalCarrusel}</span>
                </div>
              </div>
              <div className="wiki-carrusel-slide wiki-carrusel-slide--side" onClick={siguiente}>
                <img src={wiki.carrusel[(indiceCarrusel + 1) % totalCarrusel]} alt="Siguiente" />
                <div className="wiki-carrusel-side-hint"><Icono nombre="siguiente" tamano={28} /></div>
              </div>
            </div>
            <div className="wiki-carrusel-dots">
              {wiki.carrusel.map((_, i) => (
                <button key={i} className={`wiki-dot ${i === indiceCarrusel ? "activo" : ""}`}
                  onClick={() => { if (!animando) setIndiceCarrusel(i); }} aria-label={`Ir a imagen ${i + 1}`} />
              ))}
            </div>
          </>
        ) : (
          <div className="wiki-carrusel-track">
            <div className="wiki-carrusel-slide wiki-carrusel-slide--side"><div className="wiki-video-placeholder" /></div>
            <div className="wiki-carrusel-slide wiki-carrusel-slide--center"><div className="wiki-video-placeholder"><span>Carrusel interactivo</span></div></div>
            <div className="wiki-carrusel-slide wiki-carrusel-slide--side"><div className="wiki-video-placeholder" /></div>
          </div>
        )}
      </section>

      {/* PERSONAJES */}
      {wiki.personajes.length > 0 && (
        <section className="wiki-personajes-section" id="personajes">
          <div className="wiki-personajes-inner">
            <h2 className="wiki-section-title">{t("wiki.personajes")}</h2>
            <div className="wiki-personajes-grid">
              {wiki.personajes.map((personaje, i) => (
                <button key={i} className="wiki-personaje-card" onClick={() => setPersonajeAbierto(personaje)}>
                  <div className="wiki-personaje-img">
                    {personaje.imagen ? <img src={personaje.imagen} alt={personaje.nombre} /> : <span>{personaje.nombre.charAt(0)}</span>}
                  </div>
                  <div className="wiki-personaje-info">
                    <span className="wiki-personaje-rol">{personaje.rol}</span>
                    <h3 className="wiki-personaje-nombre">{personaje.nombre}</h3>
                    {personaje.actorVoz && <span className="wiki-personaje-va">VA: {personaje.actorVoz}</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* EQUIPO */}
      <section className="wiki-staff-section" id="staff">
        <button className={`wiki-staff-toggle ${equipoAbierto ? "abierto" : ""}`} onClick={() => setEquipoAbierto(!equipoAbierto)}>
          <span>{t("wiki.equipo").toUpperCase()}</span>
          <Icono nombre="desplegar" tamano={22} clase="wiki-staff-arrow" />
        </button>
        <div className={`wiki-staff-content ${equipoAbierto ? "visible" : ""}`}>
          {wiki.equipo.map((grupo, indiceGrupo) => (
            <div key={grupo.categoria} className="wiki-staff-grupo">
              <h3 className="wiki-staff-categoria">{grupo.categoria}</h3>
              {/* El primer grupo (dirección) se muestra más grande. */}
              <div className={`wiki-staff-grid ${indiceGrupo === 0 ? "wiki-staff-grid--directores" : ""}`}>
                {grupo.miembros.map((miembro, i) => (
                  <TarjetaMiembro key={`${grupo.categoria}-${i}`} miembro={miembro} director={indiceGrupo === 0}
                    socio={socios.find((s) => s.identificador === miembro.socio) ?? null}
                    alAmpliar={setImagenAmpliada} alAbrirSocio={setSocioAbierto} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* GALERÍA */}
      <section className="wiki-arte-section" id="arte">
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "4rem 2rem" }}>
          <h2 className="wiki-section-title">{t("wiki.arteTitulo")}</h2>
          {wiki.galeria.length > 0 ? (
            <div className="wiki-arte-mosaic">
              {wiki.galeria.map((imagen, i) => (
                <div key={i} className="wiki-arte-item wiki-clickable" onClick={() => setImagenAmpliada(imagen.url)}>
                  <img src={imagen.url} alt={imagen.textoAlternativo} />
                  <div className="wiki-arte-hover">
                    <Icono nombre="ampliar" tamano={32} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="wiki-arte-mosaic wiki-arte-placeholder">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="wiki-arte-item wiki-arte-empty" />)}
            </div>
          )}
        </div>
      </section>

      <Pie idiomas={wiki.idiomas} idioma={wiki.idioma} />
    </div>
  );
}
