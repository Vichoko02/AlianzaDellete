import ProjectWikiTemplate from "../ProjectWikiTemplate";
import type { ProjectWikiData } from "../ProjectWikiTemplate";
import bannerPclub from "../../assets/Banner/pclubBanner.webp";
import logoCgd from "../../assets/asociados/Cgd-studio.webp";

const cgdData: ProjectWikiData = {
  id: "cgd",
  nombre: "CGD Studio",
  banner: bannerPclub,
  logo: logoCgd,
  estado: "En Producción",
  videoUrl: "",
  sinopsis:
    "CGD Studios es un estudio especializado en producción de doblaje y Voice Acting, colaborador directo del programa de Voice Acting de la Alianza. Entre sus trabajos más destacados figura el doblaje al español latino de Emesis Blue, una de las Web series Machinima más importantes de la comunidad de Team Fortress 2.",
  creador: {
    nombre: "CGD Studios",
    imagen: "",
    descripcion:
      "CGD Studios es un estudio independiente enfocado en la producción de doblaje y actuación de voz para proyectos de animación e internet, trabajando en estrecha colaboración con la Alianza para llevar sus proyectos al español latino.",
  },
  redes: {
    instagram: "",
    twitter: "",
    youtube: "",
    tiktok: "",
    discord: "",
  },
  carrusel: [],
  staff: [
    {
      categoria: "Animadores",
      miembros: [
        { nombre: "Lorem Ipsum", rol: "Animador Principal" },
        { nombre: "Lorem Ipsum", rol: "Animador" },
        { nombre: "Lorem Ipsum", rol: "Animador" },
        { nombre: "Lorem Ipsum", rol: "Animador" },
      ],
    },
    {
      categoria: "Actores de Voz / Doblaje",
      miembros: [
        { nombre: "Lorem Ipsum", rol: "Personaje A" },
        { nombre: "Lorem Ipsum", rol: "Personaje B" },
        { nombre: "Lorem Ipsum", rol: "Personaje C" },
        { nombre: "Lorem Ipsum", rol: "Personaje D" },
      ],
    },
  ],
  galeria: [],
};

export default function CgdWiki() {
  return <ProjectWikiTemplate data={cgdData} />;
}
