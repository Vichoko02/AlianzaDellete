import { useState } from "react";
import { Link } from "react-router-dom";
import imgJulio from "../assets/asociados/Julio-di-esto.webp";
import imgRikku from "../assets/asociados/Soy-Rikku.webp";
import imgDexuz from "../assets/asociados/Dexuz.webp";
import imgArmados    from "../assets/Armados/Armados.webp";
import imgGarabato   from "../assets/Garabato/Garabato-studio.webp";
import imgMetrecalia from "../assets/Metrecalia/Metrecalia.webp";
import imgCgd        from "../assets/asociados/Cgd-studio.webp";
import imgCrunch     from "../assets/Crunch/Crunch.webp";
import imgCrunchFizz from "../assets/CrunchFizz/CrunchFizz.webp";
import imgTecnosis   from "../assets/Tecnosis/Tecnosis.webp";
import imgEmesis     from "../assets/Emesis/emesisblue.webp";
import TripleBoca from "../assets/TripleBoca/TripleBoca.webp";
import TBTF from "../assets/TheBraveAndTheFuriousAndTheJackass/TBTF.webp";
import type { Socio } from "./SocioModal";
import SocioModal from "./SocioModal";
import GridSection from "./GridSection";

export default function HomePageV2() {
  const [socioActivo, setSocioActivo] = useState<Socio | null>(null);

  const listaSocios: Socio[] = [
    {
      nombre: "Soy Rikku",
      imagen: imgRikku,
      descripcion: "Actriz de voz, ilustradora, coverista, Co-fundadora de la Alianza.",
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
      descripcion: "Músico, freestyler y battlecat independiente.",
      redes: {
        instagram: "https://www.instagram.com/dexuz_official/",
        twitter: "",
        youtube: "https://www.youtube.com/channel/UCBahS4k28VHzvV69MFKCkuw",
        tiktok: "",
        twitch: "",
        kick: "",
      },
      proyectos: [
        { nombre: "Crunch", imagen: imgCrunch, enlace: "/wiki/crunch" },
      ],
    },
    {
      nombre: "Julio di esto",
      imagen: imgJulio,
      descripcion: "Creador de contenido mexicano, actor de voz y streamer.",
      redes: {
        instagram: "https://www.instagram.com/julio_di_esto/",
        twitter: "https://x.com/Julio_di_esto",
        youtube: "https://www.youtube.com/@juliodiesto",
        tiktok: "https://www.tiktok.com/@julio_di_esto",
        facebook: "https://web.facebook.com/julio.posting",
        twitch: "",
        kick: "",
      },
      proyectos: [
        { nombre: "Crunch",     imagen: imgCrunch,     enlace: "/wiki/crunch" },
        { nombre: "Metrecalia", imagen: imgMetrecalia, enlace: "/wiki/metrecalia" },
      ],
    },
    {
      nombre: "CGD Studio",
      imagen: imgCgd,
      descripcion: "Actor de voz, animador y creador de contenido.",
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

  const listaAsociadosGrid = listaSocios.map((s) => ({
    nombre: s.nombre,
    imagen: s.imagen,
    enlace: "#",
    onCardClick: () => setSocioActivo(s),
  }));

  const listaProyectos = [
    { nombre: "MAF Studios",     imagen: imgArmados,    enlace: "/wiki/armados" },
    { nombre: "Garabato", imagen: imgGarabato,   enlace: "/wiki/garabato" },
    { nombre: "Metrecalia",      imagen: imgMetrecalia, enlace: "/wiki/metrecalia" },
    { nombre: "Crunch",          imagen: imgCrunch,     enlace: "/wiki/crunch" },
    { nombre: "Crunch Fizz",     imagen: imgCrunchFizz, enlace: "/wiki/crunchfizz" },
    { nombre: "Tecnosis",        imagen: imgTecnosis,   enlace: "/wiki/tecnosis" },
    { nombre: "Emesis Blue",     imagen: imgEmesis,     enlace: "/wiki/emesis" },
    { nombre: "Triple Boca",     imagen: TripleBoca,    enlace: "/wiki/tripleboca" },
    { nombre: "TBFAJ",            imagen: TBTF,         enlace: "/wiki/tbtf" },
  ];

  return (
    <>
      <main>
        <section className="hero-v2">
          <div className="hero-v2-content">
            <h1>Bienvenido a la Alianza</h1>
            <p>Un colectivo de creadores independientes unidos por la pasión</p>
            <div className="hero-v2-buttons">
              <Link to="/store" className="btn-primary">Ver Tienda</Link>
              <Link to="/#proyectos" className="btn-secondary">Explorar Proyectos</Link>
            </div>
          </div>
        </section>
        
        <GridSection titulo="ASOCIADOS" idSeccion="asociados" items={listaAsociadosGrid} />
        <GridSection titulo="PROYECTOS" idSeccion="proyectos" items={listaProyectos} />
      </main>

      {socioActivo && (
        <SocioModal socio={socioActivo} onClose={() => setSocioActivo(null)} />
      )}
    </>
  );
}
