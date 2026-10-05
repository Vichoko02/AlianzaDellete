import { lazy, Suspense, useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import BotonTema from "./componentes/BotonTema";
import PaginaInicio from "./paginas/PaginaInicio";
import RutaWiki from "./paginas/PaginaWiki";
import { ProveedorSitio } from "./ProveedorSitio";

import "./estilos.css";
import "./tema-oscuro.css";
import "./wiki.css";

// Las noticias (y sus imágenes) se descargan solo al visitarlas: no pesan en la portada ni en las wikis.
const PaginaNoticias = lazy(() => import("./paginas/noticias/PaginaNoticias"));
const PaginaAdminNoticias = lazy(() => import("./paginas/noticias/PaginaAdminNoticias"));
const PaginaEditorNoticias = lazy(() => import("./paginas/noticias/PaginaEditorNoticias"));

/** Vuelve al principio de la página en cada cambio de ruta. */
function SubirAlCambiarDeRuta() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

/** Tema guardado en este navegador o, si no hay, el del sistema. */
function temaInicial(): boolean {
  const guardado = localStorage.getItem("darkMode");
  if (guardado !== null) return guardado === "true";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export default function Aplicacion() {
  const [modoOscuro, setModoOscuro] = useState(temaInicial);
  const cambiarTema = () => setModoOscuro((anterior) => !anterior);

  useEffect(() => {
    document.body.classList.toggle("dark-theme", modoOscuro);
    localStorage.setItem("darkMode", String(modoOscuro));
  }, [modoOscuro]);

  return (
    <ProveedorSitio>
      <BrowserRouter>
        <SubirAlCambiarDeRuta />
        <BotonTema modoOscuro={modoOscuro} alCambiar={cambiarTema} />
        <Suspense fallback={<div className="estado-carga">Cargando…</div>}>
        <Routes>
          <Route path="/" element={<PaginaInicio alCambiarTema={cambiarTema} />} />
          <Route path="/wiki/:identificador" element={<RutaWiki />} />
          <Route path="/news" element={<PaginaNoticias />} />
          <Route path="/news/admin" element={<PaginaAdminNoticias />} />
          <Route path="/news/admin/new" element={<PaginaEditorNoticias />} />
          <Route path="/news/edit/:id" element={<PaginaEditorNoticias />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </ProveedorSitio>
  );
}
