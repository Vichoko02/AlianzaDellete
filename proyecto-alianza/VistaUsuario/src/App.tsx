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
import HomePageV2 from "./components/HomePageV2";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import SolicitarAccesoPage from "./pages/auth/SolicitarAccesoPage";
import NewsPage from "./pages/NewsPage";
import NewsEditorPage from "./pages/NewsEditorPage";
import NewsAdminPage from "./pages/NewsAdminPage";
import ArmadosWiki from "./components/wikis/ArmadosWiki";
import GarabatoWiki from "./components/wikis/GarabatoWiki";
import MetrecaliaWiki from "./components/wikis/MetrecaliaWiki";
import CgdWiki from "./components/wikis/CgdWiki";
import CrunchWiki from "./components/wikis/CrunchWiki";
import CrunchFizzWiki from "./components/wikis/CrunchFizzWiki";
import TecnosisWiki from "./components/wikis/TecnosisWiki";
import EmesisWiki from "./components/wikis/EmesisWiki";
import TripleBocaWiki from "./components/wikis/TripleBocaWiki";
import TBTFWiki from "./components/wikis/TBTFWiki";

// Socios
import imgJulio from "./assets/asociados/Julio-di-esto.webp";
import imgRikku from "./assets/asociados/Soy-Rikku.webp";
import imgDexuz from "./assets/asociados/Dexuz.webp";

// Proyectos
import imgArmados    from "./assets/Armados/Armados.webp";
import imgGarabato   from "./assets/Garabato/Garabato-studio.webp";
import imgMetrecalia from "./assets/Metrecalia/Metrecalia.webp";
import imgCgd        from "./assets/asociados/Cgd-studio.webp";
import imgCrunch     from "./assets/Crunch/Crunch.webp";
import imgCrunchFizz from "./assets/CrunchFizz/CrunchFizz.webp";
import imgTecnosis   from "./assets/Tecnosis/Tecnosis.webp";
import imgEmesis     from "./assets/Emesis/emesisblue.webp";
import TripleBoca from "./assets/TripleBoca/TripleBoca.webp";
import TBTF from "./assets/TheBraveAndTheFuriousAndTheJackass/TBTF.webp";

import "./index.css";
import "./dark.css";
import "./wiki.css";

// ─── DATOS DE SOCIOS ─────────────────────────────────────────────────────────
const listaSocios: Socio[] = [
  {
    nombre: "Soy Rikku",
    imagen: imgRikku,
    descripcion: "Actriz de voz, ilustradora, coverista, Co-fundadora de la Alianza. Como Vtuber una osita amante de los videojuegos y la charla ",
    redes: {
      instagram: "https://www.instagram.com/soyrikku/",
      twitter: "https://x.com/SoyRikku",
      youtube: "https://www.youtube.com/@SoyRikku",
      tiktok: "",
      twitch: "https://www.twitch.tv/soyrikku",

    },
    proyectos: [
    { nombre: "MAF Studios",     imagen: imgArmados,    enlace: "/wiki/armados" },
    { nombre: "Garabato Studio", imagen: imgGarabato,   enlace: "/wiki/garabato" },
    { nombre: "Metrecalia",      imagen: imgMetrecalia, enlace: "/wiki/metrecalia" },
    { nombre: "Crunch",          imagen: imgCrunch,     enlace: "/wiki/crunch" },    
    ],
  },
  {
    nombre: "Dexuz Music",
    imagen: imgDexuz,
    descripcion: " Músico, freestyler y battlecat independiente, compositor dede musica freek. Puro talento peruano",
    redes: {
      instagram: "https://www.instagram.com/dexuz_official/",
      twitter: "",
      youtube: "https://www.youtube.com/channel/UCBahS4k28VHzvV69MFKCkuw?fbclid=PAZXh0bgNhZW0CMTEAc3J0YwZhcHBfaWQMMjU2MjgxMDQwNTU4AAGn1ZcUbZgD7S-NIaSKMfpGhwl010NbyFNiX2ftOzi6LA0nob04D06XcTQaTbc_aem_-rvX_Ts8dWCqYec1gqT7wQ",
      tiktok: "",
      twitch: "",
      kick: "",
    },
    proyectos: [

      { nombre: "Crunch",          imagen: imgCrunch,     enlace: "/wiki/crunch" },

      
    ],
  },
  {
    nombre: "Julio di esto",
    imagen: imgJulio,
    descripcion: "Julio di esto es un creador de contenido mexicano, actor de voz y streamer que se ha hecho conocido principalmente en YouTube y TikTok por sus videos de humor shitposter y con muchas referencias a la cultura pop. Además, trabaja profesionalmente en doblaje desde 2024",
    redes: {
      instagram: "https://www.instagram.com/julio_di_esto/",
      twitter: "https://x.com/Julio_di_esto",
      youtube: "https://www.youtube.com/@juliodiesto",
      tiktok: "https://www.tiktok.com/@julio_di_esto?lang=es",
      facebook: "https://web.facebook.com/julio.posting?_rdc=1&_rdr#",
      twitch: "",
      kick: "",
    },
    proyectos: [

      { nombre: "Crunch",          imagen: imgCrunch,     enlace: "/wiki/crunch" },
      { nombre: "Metrecalia",      imagen: imgMetrecalia, enlace: "/wiki/metrecalia" },


    ],
  },

    {
    nombre: "CGD Studio",
    imagen: imgCgd,
    descripcion: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Actor de voz, animador y creador de contenido con amplia experiencia en proyectos independientes.",
    redes: {
      instagram: "",
      twitter: "",
      youtube: "",
      tiktok: "",
      twitch: "",
      kick: "",
    },
    proyectos: [],
  },

];

function HomePage() {
  const [socioActivo, setSocioActivo] = useState<Socio | null>(null);

  const listaAsociadosGrid = listaSocios.map((s) => ({
    nombre: s.nombre,
    imagen: s.imagen,
    enlace: "#",
    onCardClick: () => setSocioActivo(s),
  }));

  const listaProyectos = [
    { nombre: "MAF Studios",     imagen: imgArmados,    enlace: "/wiki/armados" },
    { nombre: "Garabato Studio", imagen: imgGarabato,   enlace: "/wiki/garabato" },
    { nombre: "Crunch Fizz",     imagen: imgCrunchFizz, enlace: "/wiki/crunchfizz" },
    { nombre: "Emesis Blue",     imagen: imgEmesis,     enlace: "/wiki/emesis" },
    { nombre: "TBFAJ",            imagen: TBTF,         enlace: "/wiki/tbtf" },    
    { nombre: "Metrecalia",      imagen: imgMetrecalia, enlace: "/wiki/metrecalia" },
    { nombre: "Crunch",          imagen: imgCrunch,     enlace: "/wiki/crunch" },
    { nombre: "Tecnosis",        imagen: imgTecnosis,   enlace: "/wiki/tecnosis" },
    { nombre: "Triple Boca",     imagen: TripleBoca,   enlace: "/wiki/tripleboca" },
  ];

  return (
    <>
      <Header onToggleTheme={function (): void {
        throw new Error("Function not implemented.");
      } } />
      <main>
        <Hero />
        <About />
        <GridSection titulo="ASOCIADOS" idSeccion="asociados" items={listaAsociadosGrid} />
        <GridSection titulo="PROYECTOS" idSeccion="proyectos" items={listaProyectos} />
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
    <BrowserRouter>
      <ScrollToTop />
      <ThemeToggle isDarkMode={isDarkMode} onToggle={toggleTheme} />
      <Routes>
        <Route path="/"                element={<HomePage />} />
        <Route path="/v2"             element={<HomePageV2 />} />
        <Route path="/login"          element={<LoginPage />} />
        <Route path="/register"        element={<RegisterPage />} />
        <Route path="/solicitar-acceso" element={<SolicitarAccesoPage />} />
        <Route path="/news"             element={<NewsPage />} />
        <Route path="/news/admin"       element={<NewsAdminPage />} />
        <Route path="/news/admin/new"   element={<NewsEditorPage />} />
        <Route path="/news/edit/:id"    element={<NewsEditorPage />} />
        <Route path="/wiki/armados"    element={<ArmadosWiki />} />
        <Route path="/wiki/garabato"   element={<GarabatoWiki />} />
        <Route path="/wiki/metrecalia" element={<MetrecaliaWiki />} />
        <Route path="/wiki/cgd"        element={<CgdWiki />} />
        <Route path="/wiki/crunchfizz" element={<CrunchFizzWiki />} />
        <Route path="/wiki/crunch"     element={<CrunchWiki />} />
        <Route path="/wiki/tecnosis"   element={<TecnosisWiki />} />
        <Route path="/wiki/emesis"     element={<EmesisWiki />} />
        <Route path="/wiki/tripleboca" element={<TripleBocaWiki />} />
        <Route path="/wiki/tbtf"       element={<TBTFWiki />} />
      </Routes>
    </BrowserRouter>
  );
}