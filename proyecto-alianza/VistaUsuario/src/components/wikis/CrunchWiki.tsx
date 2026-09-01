import ProjectWikiTemplate from "../ProjectWikiTemplate";
import type { ProjectWikiData } from "../ProjectWikiTemplate";

import bannerCrunch from "../../assets/Banner/CrunchBanner.webp";
import logoCrunch from "../../assets/Crunch/Crunch.webp";
import tripleBocaBienvenida from "../../assets/Crunch/Crunch.webp";

const crunchData: ProjectWikiData = {
  id: "crunch",
  nombre: "Crunch",
  banner: bannerCrunch,
  logo: logoCrunch,
  estado: "En Producción",
  videoUrl: "https://www.youtube.com/embed/CXjmgvtRvMw?si=VDp4oFf7GPbXIEIx",
  sinopsis:
    "Conocido como 'El Primer Anime Latino', Crunch es una Web serie que sigue la historia de Dany, un joven desempleado que debido a su desesperación decide unirse a una Organización del bajo mundo encargada de auspiciar peleas clandestinas para poder subsistir, un ecosistema en donde solo los más fuertes sobreviven y que retrata de forma bastante ruda y un poco cómica como es un día normal en Latinoamérica.",
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
    instagram: "",
    twitter: "",
    youtube: "",
    tiktok: "",
    discord: "",
  },
  carrusel: [tripleBocaBienvenida],
  personajes: [],
  staff: [],
  galeria: [
    { src: tripleBocaBienvenida, alt: "Crunch - Bienvenida" },
  ],
};

export default function CrunchWiki() {
  return <ProjectWikiTemplate data={crunchData} />;
}
