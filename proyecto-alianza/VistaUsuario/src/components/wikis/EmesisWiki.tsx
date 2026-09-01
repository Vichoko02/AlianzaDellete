import ProjectWikiTemplate from "../ProjectWikiTemplate";
import type { ProjectWikiData } from "../ProjectWikiTemplate";

import logoEmesis from "../../assets/Emesis/emesisblue.webp";
import FortressFilms from "../../assets/Emesis/FortressFilms.webp";

const emesisData: ProjectWikiData = {
  id: "emesis",
  nombre: "Emesis Blue",
  banner: "",
  logo: logoEmesis,
  estado: "En Emisión",
  videoUrl: "https://www.youtube.com/embed/YK2psBYCy94?si=hSHyw071wfV5MNHL",
  sinopsis:
    "Creado en Source Filmmaker, Emesis Blue es una de las Web series Machinima más importantes de toda la comunidad de Team Fortress 2, donde se narra la historia de un detective privado y un veterano de guerra fracasado que, tras ser asignados para investigar el secuestro de Jules Archivald, terminan envueltos en una turbia red criminal que esconde un secreto perturbador. Este proyecto de doblaje fue creado como parte del programa de Voice Acting de la Alianza en colaboración con CGD Studios.",
  creador: {
    nombre: "Fortress Films",
    imagen: FortressFilms,
    descripcion:
      "Fortress Films es un Proyecto de Animacion Independiente dedicado a realizar cortos hechos en Source Film Maker o 'Machinimas'  aprovechando los recursos del Juego Team Fortress 2 para contar sus propías historias, usando algunos elementos del Lore original pero añadiendo una trama mucho mas densa y oscura.",
    redes: {
      instagram: "",
      twitter: "",
      youtube: "",
      tiktok: "",
      discord: "",
      patreon: "",
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

  
  carrusel: [],
  personajes: [],
  staff: [],
  galeria: [],
};

export default function EmesisWiki() {
  return <ProjectWikiTemplate data={emesisData} />;
}
