import ProjectWikiTemplate from "../ProjectWikiTemplate";
import type { ProjectWikiData } from "../ProjectWikiTemplate";

import bannerMetrecalia from "../../assets/Metrecalia/MetrecaliaBanner4.webp";
import logoMetrecalia from "../../assets/Metrecalia/MetrecaliaLogo2.webp";
import AutorCamiro from "../../assets/Metrecalia/Camiro1.webp";
import LorinerImg from "../../assets/Metrecalia/Loriner.webp";
import JessieImg from "../../assets/Metrecalia/Jessie.webp";
import JesterImg from "../../assets/Metrecalia/Jester.webp";
import RodImg from "../../assets/Metrecalia/Rod.webp";
import ReyDescesImg from "../../assets/Metrecalia/ReyDesces.webp";
import CounselImg from "../../assets/Metrecalia/Counsel.webp";
import CkiryuuImg from "../../assets/Metrecalia/Ckiryuu.webp";
import CamiloOspinaImg from "../../assets/Metrecalia/Camilo Ospina.webp";
import JulioLopezImg from "../../assets/Metrecalia/Julio_Lopez.webp";
import ValentinoGassmannImg from "../../assets/Metrecalia/ValGassmanAD.webp";
import OkamiSanchokomilkImg from "../../assets/Metrecalia/Okami_Sanchokomilk.webp";
import OctavioRojasImg from "../../assets/Metrecalia/Octavio_Rojas.webp";
import DerrickAlvarezImg from "../../assets/Metrecalia/DerrickAlvarez.jpg";
import Arte1 from "../../assets/Metrecalia/ArteMetrecalia1.webp";
import Arte2 from "../../assets/Metrecalia/ArteMetrecalia2.webp";
import Arte3 from "../../assets/Metrecalia/ArteMetrecalia3.webp";
import Arte4 from "../../assets/Metrecalia/ArteMetrecalia4.webp";
import Arte5 from "../../assets/Metrecalia/ArteMetrecalia5.webp";
import Arte6 from "../../assets/Metrecalia/ArteMetrecalia6.webp";
import Arte7 from "../../assets/Metrecalia/ArteMetrecalia7.webp";
import Arte8 from "../../assets/Metrecalia/ArteMetrecalia8.webp";
import Arte9 from "../../assets/Metrecalia/ArteMetrecalia9.webp";
import Arte11 from "../../assets/Metrecalia/ArteMetrecalia11.webp";
import Arte12 from "../../assets/Metrecalia/ArteMetrecalia12.webp";
import Arte13 from "../../assets/Metrecalia/ArteMetrecalia13.webp";
import Arte16 from "../../assets/Metrecalia/ArteMetrecalia16.webp";
import ArteP2_1 from "../../assets/Metrecalia/ArteMetrecaliaParte21.webp";
import ArteP2_2 from "../../assets/Metrecalia/ArteMetrecaliaParte22.webp";
import ArteP2_3 from "../../assets/Metrecalia/ArteMetrecaliaParte23.webp";
import ArteP2_4 from "../../assets/Metrecalia/ArteMetrecaliaParte24.webp";
import ArteP2_5 from "../../assets/Metrecalia/ArteMetrecaliaParte25.webp";
import ArteP2_6 from "../../assets/Metrecalia/ArteMetrecaliaParte26.webp";
import ArteP2_7 from "../../assets/Metrecalia/ArteMetrecaliaParte27.webp";
import ArteP2_8 from "../../assets/Metrecalia/ArteMetrecaliaParte28.webp";
import ArteP2_9 from "../../assets/Metrecalia/ArteMetrecaliaParte29.webp";
import ArteP2_10 from "../../assets/Metrecalia/ArteMetrecaliaParte210.webp";
import ArteP2_14 from "../../assets/Metrecalia/ArteMetrecaliaParte214.webp";
import ArteP2_15 from "../../assets/Metrecalia/ArteMetrecaliaParte215.webp";
import ArteP2_17 from "../../assets/Metrecalia/ArteMetrecaliaParte217.webp";
import ArteP2_18 from "../../assets/Metrecalia/ArteMetrecaliaParte218.webp";


const metrecaliaData: ProjectWikiData = {
  id: "metrecalia",
  nombre: "Metrecalia",
  banner: bannerMetrecalia,
  logo: logoMetrecalia,
  estado: "En Emisión",
  videoUrl: "https://www.youtube.com/embed/i0xG74ERaGE",
  sinopsis:
    "Loriner y Jessie buscan aventuras en las crueles y locas tierras de Metrecalia, un universo de fantasía medieval lleno de secretos, y una Web Serie en español e inglés.",
  creador: {
    nombre: "Camiro Starenn",
    imagen: AutorCamiro,
    descripcion: "Humano profesional. Escritor, director y diseñador autodidacta. Creador de Metrecalia, Charlotte Gaspel y Brandom Universe, bajo la marca STARENN ENTERTAINMENT. Amante de la ficción y el pollo frito.",
    redes: {
      instagram: "https://www.instagram.com/cramiro_starenn/",
      twitter: "https://twitter.com/Cramiro_Starenn",
      youtube: "https://www.youtube.com/@Cramiro_Starenn",
      tiktok: "https://tr.ee/ErBpGIwHCS",
      patreon: "https://tr.ee/nT7Aq4LCY_",
    },
    obras: [

      { titulo: "Universo Brandom", url: "https://www.youtube.com/@UniversoBrandom" },
      { titulo: "Cramiro Starenn", url: "https://www.youtube.com/@Cramiro_Starenn/videos" },
      { titulo: "Charlotte Gaspel", url: "https://www.youtube.com/watch?v=P38fErKHO30" },
    ],
  },
  redes: {
    instagram: "",
    twitter: "https://twitter.com/Cramiro_Starenn",
    youtube: "https://www.youtube.com/@metrecalia",
    tiktok: "https://www.tiktok.com/@metrecalia",
    discord: "https://discord.gg/AKx4WCqzhS",
    patreon: "https://www.patreon.com/cw/CramiroStarenn",
  },
  carrusel: [
    ArteP2_10,
    ArteP2_14,
    ArteP2_15,
    ArteP2_17,
    ArteP2_18,

  ],
  personajes: [
    {
      nombre: "Loriner Gatherson",
      imagen: LorinerImg,
      rol: "Protagonista",
      descripcion: "Conocido como \"El Héroe de los Mensos\", es un protagonista novato, despistado y perezoso con más suerte que talento. Actúa como un bardo inexperto que sobrevive improvisando canciones y evitando el trabajo a toda costa.",
      actorVoz: "Julio López (Julio Di Esto)",
    },
    {
      nombre: "Jessie Murchet",
      imagen: JessieImg,
      rol: "Protagonista",
      descripcion: "Apodada \"La Heroína de Medio Cerebro\", es una fuerza bruta impulsiva y caótica que se guía por puro instinto animal. Compensa su total falta de inteligencia con ataques físicos salvajes, aunque siempre manteniendo un corazón puro.",
      actorVoz: "Okami Sanchokomilk",
    },
    {
      nombre: "Jester Jesterson",
      imagen: JesterImg,
      rol: "Personaje Principal",
      descripcion: "\"El Bufón Sin Gracia\" es un artista atormentado, sarcástico y muy estresado que lidia con problemas psicológicos. Usa el humor negro, las distracciones y la ironía como mecanismos de defensa contra sus propios traumas.",
      actorVoz: "Valentino Gassmann",
    },
    {
      nombre: "Rod Gatherson",
      imagen: RodImg,
      rol: "Personaje Principal",
      descripcion: "Temido como \"El Guerrero Imparable\", es el guerrero brutal, serio y letal del grupo que arrasa con todo a su paso. A pesar de su imponente fuerza destructiva y actitud fría, oculta una profunda vulnerabilidad hacia los sentimientos.",
      actorVoz: "Leon Reyes (Luci)",
    },
    {
      nombre: "Rey Desces",
      imagen: ReyDescesImg,
      rol: "Personaje Principal",
      descripcion: "\"El Monstruo Bélico\" es el villano principal: un monarca sádico, cruel, manipulador y con una inteligencia altísima. Gobierna mediante el miedo y la traición, aunque irónicamente su única y verdadera debilidad es la Reina.",
      actorVoz: "Octavio Rojas",
    },
    {
      nombre: "Counsel",
      imagen: CounselImg,
      rol: "Personaje Principal",
      descripcion: "\"El Payaso Lamebotas\" es un burócrata arrogante, cobarde y el secuaz más leal (y clasista) del Rey Desces. Evita el combate físico, prefiriendo destruir la moral de sus oponentes usando insultos y correcciones gramaticales.",
      actorVoz: "Derrick Álvarez",
    },
  ],
  staff: [
    {
      categoria: "Animatics",
      miembros: [
        {
          nombre: "Camiro Starenn",
          imagen: AutorCamiro,
          rol: "Animatics",
        },
        {
          nombre: "Ckiryuu",
          imagen: CkiryuuImg,
          rol: "Animatics",
        },
        {
          nombre: "Camilo Ospina",
          imagen: CamiloOspinaImg,
          rol: "Animatics",
        },
      ],
    },
    {
      categoria: "Actores de Voz",
      miembros: [
        {
          nombre: "Camiro Starenn",
          imagen: AutorCamiro,
          rol: "Varios Personajes",
        },
        {
          nombre: "Julio López (Julio Di Esto)",
          imagen: JulioLopezImg,
          rol: "Loriner Gatherson",
        },
        {
          nombre: "Okami Sanchokomilk",
          imagen: OkamiSanchokomilkImg,
          rol: "Jessie Murchet",
        },
        {
          nombre: "Valentino Gassmann",
          imagen: ValentinoGassmannImg,
          rol: "Jester Jesterson",
        },
        {
          nombre: "Leon Reyes (Luci)",
          rol: "Rod Gatherson",
        },
        {
          nombre: "Octavio Rojas",
          imagen: OctavioRojasImg,
          rol: "Rey Desces",
        },
        {
          nombre: "Derrick Álvarez",
          imagen: DerrickAlvarezImg,
          rol: "Counsel",
        },
      ],
    },
  ],
  galeria: [
    { src: Arte1, alt: "Arte Metrecalia 1" },
    { src: Arte2, alt: "Arte Metrecalia 2" },
    { src: Arte3, alt: "Arte Metrecalia 3" },
    { src: Arte4, alt: "Arte Metrecalia 4" },
    { src: Arte5, alt: "Arte Metrecalia 5" },
    { src: Arte6, alt: "Arte Metrecalia 6" },
    { src: Arte7, alt: "Arte Metrecalia 7" },
    { src: Arte8, alt: "Arte Metrecalia 8" },
    { src: Arte9, alt: "Arte Metrecalia 9" },
    { src: Arte11, alt: "Arte Metrecalia 11" },
    { src: Arte12, alt: "Arte Metrecalia 12" },
    { src: Arte13, alt: "Arte Metrecalia 13" },
    { src: Arte16, alt: "Arte Metrecalia 16" },
    { src: ArteP2_1, alt: "Arte Metrecalia Parte 2 - 1" },
    { src: ArteP2_2, alt: "Arte Metrecalia Parte 2 - 2" },
    { src: ArteP2_3, alt: "Arte Metrecalia Parte 2 - 3" },
    { src: ArteP2_4, alt: "Arte Metrecalia Parte 2 - 4" },
    { src: ArteP2_5, alt: "Arte Metrecalia Parte 2 - 5" },
    { src: ArteP2_6, alt: "Arte Metrecalia Parte 2 - 6" },
    { src: ArteP2_7, alt: "Arte Metrecalia Parte 2 - 7" },
    { src: ArteP2_8, alt: "Arte Metrecalia Parte 2 - 8" },
    { src: ArteP2_9, alt: "Arte Metrecalia Parte 2 - 9" },
    { src: ArteP2_10, alt: "Arte Metrecalia Parte 2 - 10" },
    { src: ArteP2_14, alt: "Arte Metrecalia Parte 2 - 14" },
    { src: ArteP2_15, alt: "Arte Metrecalia Parte 2 - 15" },
    { src: ArteP2_17, alt: "Arte Metrecalia Parte 2 - 17" },
    { src: ArteP2_18, alt: "Arte Metrecalia Parte 2 - 18" },  
  ],
};

export default function MetrecaliaWiki() {
  return <ProjectWikiTemplate data={metrecaliaData} />;
}