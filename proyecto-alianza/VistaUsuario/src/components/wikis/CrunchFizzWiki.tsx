import ProjectWikiTemplate from "../ProjectWikiTemplate";
import type { ProjectWikiData } from "../ProjectWikiTemplate";

import bannerCrunchFizz from "../../assets/Banner/CrunchBanner.webp";
import logoCrunchFizz from "../../assets/CrunchFizz/CrunchFizz.webp";
import arte1 from "../../assets/CrunchFizz/CrunchFizzArte1.webp";
import arte2 from "../../assets/CrunchFizz/CrunchFizzArte2.webp";
import arte3 from "../../assets/CrunchFizz/CrunchFizzArte3.webp";
import arte4 from "../../assets/CrunchFizz/CrunchFizzArte4.webp";
import arte5 from "../../assets/CrunchFizz/CrunchFizzArte5.webp";
import arte6 from "../../assets/CrunchFizz/CrunchFizzArte6.webp";
import arte7 from "../../assets/CrunchFizz/CrunchFizzArte7.webp";
import arte8 from "../../assets/CrunchFizz/CrunchFizzArte8.webp";
import arte9 from "../../assets/CrunchFizz/CrunchFizzArte9.webp";
import arte10 from "../../assets/CrunchFizz/CrunchFizzArte10.webp";
import arte11 from "../../assets/CrunchFizz/CrunchFizzArte11.webp";
import arte12 from "../../assets/CrunchFizz/CrunchFizzArte12.webp";
import arte13 from "../../assets/CrunchFizz/CrunchFizzArte13.webp";

const crunchFizzData: ProjectWikiData = {
  id: "crunchfizz",
  nombre: "Crunch Fizz",
  banner: bannerCrunchFizz,
  logo: logoCrunchFizz,
  estado: "En Emisión",
  videoUrl: "https://www.tiktok.com/@crunch_crujido/video/7576013235594218773",
  sinopsis:
    "Crunch Fizz es un spin-off animado creado por Liners que sigue la historia de Lazy y Hoody, dos chicas desafortunadas que, tras un giro inesperado del destino, se ven obligadas a formar una alianza. Juntas deciden enfrentarse a una peligrosa organización criminal que domina su ciudad, dejando a su paso un rastro de destrucción mientras pelean utilizando poderes provenientes de un ser cosimico que escapa del entendimiento.",
  creador: {
    nombre: "Liners",
    imagen: "",
    descripcion:
      "Liners es un autor sencillo. Su construcción de mundos es sencilla pero sólida, desenvolviendo situaciones de la vida cotidiana con elementos de fantasía que recuerdan al realismo mágico. Le gusta mostrar la crudeza del bajo mundo sin rayar en lo obsceno, logrando fácilmente una cercanía con sus personajes al atravesar tantas desgracias. Él mismo incluso ha revelado que su propio sufrimiento lo ha usado como combustible para potenciar tanto su historia como su arte, pudiendo verlo claramente en el arco de Ricky de su cómic y anime Crunch, donde tanto el tono como los paneles de su manga se vuelven mucho más producidos.",
    redes: {
      instagram: "",
      twitter: "",
      youtube: "",
      tiktok: "",
      discord: "",
    },
    obras: [],
  },
  redes: {
    instagram: "https://www.instagram.com/draw_liners/?hl=es-es",
    twitter: "https://x.com/CRUNCH_LINERS",
    youtube: "https://www.youtube.com/@LINERS_CRUNCH",
    tiktok: "https://www.tiktok.com/@crunch_crujido",
    discord: "https://discord.gg/w9kefZXfw2",
    facebook: "https://www.facebook.com/kevin.soria.140",
  },
  carrusel: [arte2, arte3, arte4, arte5, arte6],
  personajes: [],
  staff: [],
  galeria: [
    { src: arte1, alt: "Crunch Fizz - Arte 1" },
    { src: arte2, alt: "Crunch Fizz - Arte 2" },
    { src: arte3, alt: "Crunch Fizz - Arte 3" },
    { src: arte4, alt: "Crunch Fizz - Arte 4" },
    { src: arte5, alt: "Crunch Fizz - Arte 5" },
    { src: arte6, alt: "Crunch Fizz - Arte 6" },
    { src: arte7, alt: "Crunch Fizz - Arte 7" },
    { src: arte8, alt: "Crunch Fizz - Arte 8" },
    { src: arte9, alt: "Crunch Fizz - Arte 9" },
    { src: arte10, alt: "Crunch Fizz - Arte 10" },
    { src: arte11, alt: "Crunch Fizz - Arte 11" },
    { src: arte12, alt: "Crunch Fizz - Arte 12" },
    { src: arte13, alt: "Crunch Fizz - Arte 13" },
  ],
};

export default function CrunchFizzWiki() {
  return <ProjectWikiTemplate data={crunchFizzData} />;
}
