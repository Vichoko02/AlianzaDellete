import ProjectWikiTemplate from "../ProjectWikiTemplate";
import type { ProjectWikiData } from "../ProjectWikiTemplate";

import logoTecnosis from "../../assets/Tecnosis/Tecnosis.webp";

const tecnosisData: ProjectWikiData = {
  id: "tecnosis",
  nombre: "Tecnosis",
  banner: "",
  logo: logoTecnosis,
  estado: "En Producción",
  videoUrl: "",
  sinopsis:
    "Descripción del proyecto Tecnosis próximamente.",
  creador: {
    nombre: "La Alianza",
    imagen: "",
    descripcion:
      "La Alianza es una organización independiente sin fines de lucro centrada en apoyar proyectos con gran potencial.",
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
  carrusel: [],
  personajes: [],
  staff: [],
  galeria: [],
};

export default function TecnosisWiki() {
  return <ProjectWikiTemplate data={tecnosisData} />;
}
