import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Header from "./components/Header";
import Hero from "./components/Hero";
import About from "./components/About";
import Join from "./components/Join";
import Footer from "./components/Footer";
import ThemeToggle from "./components/ThemeToggle";
import SocioModal from "./components/SocioModal";
import type { Socio } from "./components/SocioModal";
import GridSection from "./components/GridSection";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import SolicitarAccesoPage from "./pages/auth/SolicitarAccesoPage";
import NewsPage from "./pages/NewsPage";
import NewsEditorPage from "./pages/NewsEditorPage";
import NewsAdminPage from "./pages/NewsAdminPage";
import WikiPage from "./pages/WikiPage";
import { apiSeries, apiSocios, urlMedio, type TarjetaSerie } from "./api";
import { SitioProvider } from "./sitio";
import { useTextos } from "./textos";

import "./index.css";
import "./dark.css";
import "./wiki.css";

// ─── PORTADA ──────────────────────────────────────────────────────────────────
// Socios y proyectos se administran desde el panel (alianza-backend → /admin).

function HomePage({ onToggleTheme }: { onToggleTheme: () => void }) {
  const t = useTextos();
  const [socios, setSocios] = useState<Socio[]>([]);
  const [series, setSeries] = useState<TarjetaSerie[]>([]);
  const [socioActivo, setSocioActivo] = useState<Socio | null>(null);

  useEffect(() => {
    apiSocios()
      .then((lista) => setSocios(lista.map((s) => ({
        ...s,
        imagen: urlMedio(s.imagen),
        proyectos: s.proyectos?.map((p) => ({ ...p, imagen: urlMedio(p.imagen) })),
      }))))
      .catch(() => setSocios([]));
    apiSeries().then(setSeries).catch(() => setSeries([]));
  }, []);

  const listaAsociadosGrid = socios.map((s) => ({
    nombre: s.nombre,
    imagen: s.imagen,
    enlace: "#",
    onCardClick: () => setSocioActivo(s),
  }));

  const listaProyectos = series.map((s) => ({ nombre: s.nombre, imagen: urlMedio(s.imagen), enlace: s.enlace }));

  return (
    <>
      <Header onToggleTheme={onToggleTheme} />
      <main>
        <Hero />
        <About />
        <GridSection titulo={t("inicio.asociados.titulo")} idSeccion="asociados" items={listaAsociadosGrid} />
        <GridSection titulo={t("inicio.proyectos.titulo")} idSeccion="proyectos" items={listaProyectos} />
        <Join />
      </main>
      <Footer />

      {socioActivo && (
        <SocioModal socio={socioActivo} onClose={() => setSocioActivo(null)} />
      )}
    </>
  );
}

// Componente para hacer scroll al top en cada cambio de ruta
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    if (saved !== null) return saved === "true";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.body.classList.toggle("dark-theme", isDarkMode);
    localStorage.setItem("darkMode", String(isDarkMode));
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  return (
    <SitioProvider>
      <BrowserRouter>
        <ScrollToTop />
        <ThemeToggle isDarkMode={isDarkMode} onToggle={toggleTheme} />
        <Routes>
          <Route path="/"                 element={<HomePage onToggleTheme={toggleTheme} />} />
          <Route path="/login"            element={<LoginPage />} />
          <Route path="/register"         element={<RegisterPage />} />
          <Route path="/solicitar-acceso" element={<SolicitarAccesoPage />} />
          <Route path="/news"             element={<NewsPage />} />
          <Route path="/news/admin"       element={<NewsAdminPage />} />
          <Route path="/news/admin/new"   element={<NewsEditorPage />} />
          <Route path="/news/edit/:id"    element={<NewsEditorPage />} />
          <Route path="/wiki/:slug"       element={<WikiPage />} />
        </Routes>
      </BrowserRouter>
    </SitioProvider>
  );
}
