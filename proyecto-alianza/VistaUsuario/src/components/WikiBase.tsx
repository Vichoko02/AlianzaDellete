import ProjectWikiTemplate from "./ProjectWikiTemplate";
import type { ProjectWikiData } from "./ProjectWikiTemplate";

/*
────────────────────────────────────────────────────────────
IMPORTA AQUÍ TUS ASSETS (borra lo que no uses)
────────────────────────────────────────────────────────────
*/

// Banner / Logo
import banner from "../assets/ImagenesDelProyecto/banner.webp";
import logo   from "../assets/ImagenesDelProyecto/logo.webp";

// Creador
import creadorImg from "../assets/ImagenesDelProyecto/creador.webp";

// Personajes (opcional)
import personaje1Img from "../assets/ImagenesDelProyecto/personaje1.webp";
import personaje2Img from "../assets/ImagenesDelProyecto/personaje2.webp";

// Actores de voz (opcional)
import actor1Img from "../assets/ImagenesDelProyecto/actor1.webp";

// Staff (opcional)
import staff1Img from "../assets/ImagenesDelProyecto/staff1.webp";

// Carrusel
import carrusel1 from "../assets/ImagenesDelProyecto/carrusel1.webp";
import carrusel2 from "../assets/ImagenesDelProyecto/carrusel2.webp";

// Galería
import galeria1 from "../assets/ImagenesDelProyecto/galeria1.webp";


//DATA PRINCIPAL


const proyectoData: ProjectWikiData = {
  id: "id-del-proyecto",
  nombre: "Nombre del Proyecto",

  banner: banner,
  logo: logo, 

  estado: "En Producción", //En Producción, En Emisión, Finalizado.(se escribe tal cual)

  // video
  videoUrl: "https://www.youtube.com/embed/VIDEO_ID",

  sinopsis:
    "Descripción corta del proyecto. Qué pasa, quién es el protagonista, y cuál es el conflicto principal.",

  
// CREADOR
  
  creador: {
    nombre: "Nombre del creador",
    imagen: creadorImg, // opcional

    descripcion:
      "Breve descripción del creador. Qué hace, estilo, trayectoria, etc.",

    redes: {//redes del creador
      instagram: "",
      twitter: "",
      youtube: "",
      tiktok: "",
      discord: "",
    },

    obras: [
      { titulo: "Otra obra 1", url: "" },
      { titulo: "Otra obra 2" }, // sin link también funciona
    ],
  },

  //REDES DEL PROYECTO
  
  redes: {
    instagram: "",
    twitter: "",
    youtube: "",
    tiktok: "",
    discord: "",
    patreon: "",
    kofi: "",
    buymeacoffee: "",
    vaquite: "",
  },


//carrucel de imágenes de la serie 16:9

carrusel: [
    carrusel1,
    carrusel2,
  ],

//personajes

personajes: [
    {
      nombre: "Personaje 1",
      imagen: personaje1Img,
      rol: "Protagonista",

      descripcion:
        "Descripción del personaje, personalidad, rol en la historia, etc.",

      actorVoz: "Nombre del actor",
      imagenActorVoz: actor1Img,
    },
    {
      nombre: "Personaje 2",
      imagen: personaje2Img,
      rol: "Secundario",
      descripcion: "Descripción breve.",
    },
  ],

  //staff
  
  staff: [
    {
      categoria: "Dirección",
      miembros: [
        {
          nombre: "Nombre",
          rol: "Director",
          imagen: staff1Img,
        },
      ],
    },
  ],

  //Extra (opcional, es igual a la sección de creador)
  
  seccionesExtra: [
    {
      id: "curiosidades",
      titulo: "Curiosidades",
      descripcion: "Datos interesantes del proyecto.",

      miembros: [
        {
          nombre: "Dato 1",
          descripcion: "Explicación del dato curioso.",
        },
      ],
    },
  ],

  
  //galeria
  
  galeria: [
    { src: galeria1, alt: "texto si no sale la imagen" },
  ],
};

//final

export default function ProyectoWiki() {
  return <ProjectWikiTemplate data={proyectoData} />;
}