import ProjectWikiTemplate from "../ProjectWikiTemplate";
import type { ProjectWikiData } from "../ProjectWikiTemplate";

import banner from "../../assets/Banner/TripleBocaBanner.gif";
import logo from "../../assets/TripleBoca/TripleBocaLogo.webp";
import MicuImg from "../../assets/TripleBoca/MICU.webp";
import IszImg from "../../assets/TripleBoca/Isz.webp";
import NewuImg from "../../assets/TripleBoca/NEWU.webp";
import TechoImg from "../../assets/TripleBoca/TECHO.webp";
import Arte1 from "../../assets/TripleBoca/ArteTripleBoca.webp";
import Arte2 from "../../assets/TripleBoca/ArteTripleBoca1.webp";
import Arte3 from "../../assets/TripleBoca/ArteTripleBoca2.webp";
import Arte4 from "../../assets/TripleBoca/ArteTripleBoca3.webp";
import Arte5 from "../../assets/TripleBoca/ArteTripleBoca4.webp";
import Arte6 from "../../assets/TripleBoca/ArteTripleBoca5.webp";
import Arte7 from "../../assets/TripleBoca/ArteTripleBoca6.webp";
import Arte8 from "../../assets/TripleBoca/ArteTripleBoca7.webp";
import Ep0 from "../../assets/TripleBoca/TripleBocaEp0.webp";
import Ep1 from "../../assets/TripleBoca/TripleBocaEp1.webp";
import MicuFiesta from "../../assets/TripleBoca/TripleBocaMicuFiesta.webp";
import BocasMeme from "../../assets/TripleBoca/BocasFrierenMeme.webp";
import ajolote from "../../assets/TripleBoca/ajolote.gif";
import Basil from "../../assets/TripleBoca/bachil.webp";
import Redlik from "../../assets/TripleBoca/Redlik.webp";
import Oto from "../../assets/TripleBoca/Oto.webp";

const tripleBocaData: ProjectWikiData = {
  id: "tripleboca",
  nombre: "Triple Boca",
  banner: banner,
  logo: logo,
  estado: "En Emisión",
  videoUrl: "https://www.youtube.com/embed/AbQxHp3ttbU?si=toA-PjT1FIDZGOP7",
  sinopsis:
    "Las nuevas aventuras de Micu y sus amigas Vocaloid Techo y Newu quienes, tras ser despedidas de su antigua agencia de idols en Japón, terminan viajando a Latinoamérica para conseguir una nueva oportunidad de brillar. Sin embargo, terminan estancadas debido a la austera y precaria situación de la región. Aun así, lejos de resignarse, resuelven que continuarán dandolo todo para poder levantar sus carreras desde abajo y sobrevivir al día a día en las zonas más precarias de toda Latam.",
  creador: {
    nombre: "IszArtist",
    imagen: IszImg,
    descripcion:
      "Autor mexicano independiente, con más de 10 años de trayectoria, que combina animación, humor mexicano, shitpost y ¡rotoscopia, amigo! Antes de la creación de Triple Boca, Isz comenzó a animar en el lejano 2015 en su canal Iszartist, donde creó animaciones variadas, mostrando la evolución de su estilo a lo largo de los años.",
    redes: {
      instagram: "",
      twitter: "https://x.com/Isz_Studios",
      youtube: "https://www.youtube.com/@Iszartist/videos",
      tiktok: "",
      discord: "",
      kofi: "https://ko-fi.com/isz_studios"
    },
    obras: [],
  },
  redes: {
    instagram: "",
    twitter: "https://x.com/Isz_Studios",
    youtube: "https://www.youtube.com/@Isz_studios",
    tiktok: "",
    discord: "",
    kofi: "https://ko-fi.com/isz_studios"

  },
  carrusel: [
    Arte1,
    ajolote,
    Arte2,
    Arte3,
    Arte4,
  ],
  personajes: [
    {
      nombre: "MICU",
      imagen: MicuImg,
      rol: "Protagonista",
      descripcion: "Una Vocaloid optimista y llena de energía que busca nuevas oportunidades en Latinoamérica.",
      actorVoz: "Xi lii",
    },
    {
      nombre: "NEWU",
      imagen: NewuImg,
      rol: "Protagonista",
      descripcion: "Una Vocaloid con un carisma especial que aporta dinamismo al grupo.",
      actorVoz: "Valy sr",
    },
    {
      nombre: "TECHO",
      imagen: TechoImg,
      rol: "Protagonista",
      descripcion: "Una Vocaloid única con un estilo propio que la distingue del resto.",
      actorVoz: "Basil",
    },
  ],
  staff: [
    {
      categoria: "Dirección",
      miembros: [
        {
          nombre: "Isz Studios",
          rol: "Arte, Animación y Guion",
          imagen: IszImg,
        },
        {
          nombre: "Oto",
          rol: "Arte y Animación",
          imagen: Oto,
        },

      ],
    },
    {
      categoria: "Música y Actuación de Voz",
      miembros: [
        {
          nombre: "Redlik",
          rol: "Música",
          imagen: Redlik,
        },
        {
          nombre: "Xi lii",
          rol: "Actuación de Voz",
        },
        {
          nombre: "Basil",
          rol: "Actuación de Voz",
          imagen: Basil,
        },
        {
          nombre: "Valy sr",
          rol: "Actuación de Voz",
        },
      ],
    },
  ],
  galeria: [
    { src: MicuImg, alt: "MICU" },
    { src: NewuImg, alt: "NEWU" },
    { src: TechoImg, alt: "TECHO" },
    { src: Arte1, alt: "Arte Triple Boca 1" },
    { src: Arte2, alt: "Arte Triple Boca 2" },
    { src: Arte3, alt: "Arte Triple Boca 3" },
    { src: Arte4, alt: "Arte Triple Boca 4" },
    { src: Arte5, alt: "Arte Triple Boca 5" },
    { src: Arte6, alt: "Arte Triple Boca 6" },
    { src: Arte7, alt: "Arte Triple Boca 7" },
    { src: Arte8, alt: "Arte Triple Boca 8" },
    { src: Ep0, alt: "Triple Boca Episode 0" },
    { src: Ep1, alt: "Triple Boca Episode 1" },
    { src: MicuFiesta, alt: "MICU en fiesta" },
    { src: BocasMeme, alt: "Bocas Frieren Meme" },
    { src: ajolote, alt: "Ajolote" },
    { src: IszImg, alt: "Isz" },
    
  ],
};

export default function TripleBocaWiki() {
  return <ProjectWikiTemplate data={tripleBocaData} />;
}
