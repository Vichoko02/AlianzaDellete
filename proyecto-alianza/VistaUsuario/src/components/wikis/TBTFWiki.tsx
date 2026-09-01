import ProjectWikiTemplate from "../ProjectWikiTemplate";
import type { ProjectWikiData } from "../ProjectWikiTemplate";

import banner from "../../assets/Banner/TBTFBanner.webp";
import logo from "../../assets/TheBraveAndTheFuriousAndTheJackass/TBTF.webp";

const tbtfData: ProjectWikiData = {
  id: "tbtf",
  nombre: "TBTF — The Brave and the Furious and the Jackass",
  banner: banner,
  logo: logo,
  estado: "En Producción",
  videoUrl: "",
  sinopsis:
    "Una historia llena de Honor, tradición, combate y sobre todo mucho carisma, TBFAJ nos cuenta la historia de Shinta, un peleador novato, pero con mucho talento que tras cruzarse con el dojo () es tomado como discípulo por Hachi, el abuelo de () su discípulo más prominente, y el más iracundo también. Ambos serán entrenados en el arte del: aprendiendo a llevarse bien en el proceso y desarrollando un vínculo de hermandad que los ayudará a superar cualquier dificultad.",
  creador: {
    nombre: "Garabato Studio",
    imagen: "",
    descripcion:
      "Garabato Studio es un estudio de animación independiente enfocado en crear contenido original con humor y acción.",
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
  carrusel: [logo],
  personajes: [],
  staff: [],
  galeria: [
    { src: logo, alt: "TBTF" },
  ],
};

export default function TBTFWiki() {
  return <ProjectWikiTemplate data={tbtfData} />;
}
