import ProjectWikiTemplate from "../ProjectWikiTemplate";
import type { ProjectWikiData } from "../ProjectWikiTemplate";

import bannerTBTF from "../../assets/Banner/pclubBanner.webp";
import logoGarabato from "../../assets/Garabato/Garabato-studioLogo.webp";
import GtbStudios1 from "../../assets/Garabato/GtbStudios1.webp";
import GtbStudios2 from "../../assets/Garabato/GtbStudios2.webp";
import GtbStudios3 from "../../assets/Garabato/GtbStudios3.webp";
import GtbStudios4 from "../../assets/Garabato/GtbStudios4.webp";
import GtbStudios5 from "../../assets/Garabato/GtbStudios5.webp";
import GtbStudios6 from "../../assets/Garabato/GtbStudios6.webp";
import CarruceGbt1 from "../../assets/Garabato/CarruceGbt1.webp";
import CarruceGbt2 from "../../assets/Garabato/CarruceGbt2.webp";
import CarruceGbt3 from "../../assets/Garabato/CarruceGbt3.webp";
import CarruceGbt4 from "../../assets/Garabato/CarruceGbt4.webp";
import CarruceGbt5 from "../../assets/Garabato/CarruceGbt5.webp";
import CarruceGbt6 from "../../assets/Garabato/CarruceGbt6.webp";
import Garabato from "../../assets/Garabato/Garabato.webp";
import GtbStudios7 from "../../assets/Garabato/Gbt_StudiosGaleria.webp";


const garabatoData: ProjectWikiData = {
  id: "garabato",
  nombre: "Garabato Studio — P-CLUB",
  banner: bannerTBTF,
  logo: logoGarabato,
  estado: "En Emisión",
  videoUrl: "https://www.youtube.com/embed/-XdAa5o0TEI?si=A5GfM0XmPKX-vLQo",
  sinopsis:
    "El P-Club es una Web serie creada por Garabato Studios en la que seguimos las desventuras de Mónica, Natacha, Yasuri y Saori, un grupo de chicas que tras formar su propio club en el instituto se ven envueltas en toda clase de situaciones bizarras y surrealistas, haciendo de cada momento un deleite de referencias a memes de internet, sketches entretenidos, pero, sobre todo, de 'ROTOSCOPIA'.",
  creador: {
    nombre: "Garabato",
    imagen: Garabato,
    descripcion:
      "Garabato Studios es un animador independiente enfocado en crear contenido original con muchas referencias, chistes peruanos y la maravilla de la rotoscopia, nada le gana",
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
    instagram: "https://www.instagram.com/gbt_studios",
    twitter: "https://twitter.com/Gbt_Studios",
    youtube: "https://www.youtube.com/@Gbt_studios",
    tiktok: "https://www.tiktok.com/@garabato_studios",
    discord: ""
  },
  carrusel: [
    CarruceGbt1,
    CarruceGbt2,
    CarruceGbt3,
    CarruceGbt4,
    CarruceGbt5,
    CarruceGbt6,
  ],
//
  personajes: [
    {
      nombre: "Monika",
      rol: "Líder / Protagonista",
      descripcion: "La cabecilla del club. Es carismática, manipuladora y tiene la habilidad de romper la cuarta pared. Siempre intenta mantener el control de las situaciones bizarras que rodean al grupo.",
      actorVoz: "Nerekoow",
    },
    {
      nombre: "Sayori",
      rol: "Protagonista",
      descripcion: "Alegre, despistada y el alma emocional del club. Su naturaleza optimista suele chocar con el caos surrealista del instituto, aunque casi siempre termina siendo parte del mismo.",
      actorVoz: "Diana Speed",
    },
    {
      nombre: "Yasuri",
      rol: "Protagonista",
      descripcion: "La integrante refinada y madura, aunque con tendencias intensas y oscuras que afloran en los momentos menos oportunos. Basada en una versión parodiada de Yuri.",
      actorVoz: "Geeky Miki",
    },
    {
      nombre: "Natacha",
      rol: "Protagonista",
      descripcion: "Ruda, de carácter fuerte y defensivo. No duda en usar la fuerza o insultos para marcar su territorio, especialmente cuando se siente subestimada por su tamaño.",
      actorVoz: "Kunsei Mai",
    },
    {
      nombre: "Vanny",
      rol: "Personaje Recurrente",
      descripcion: "Personaje original de Garabato Studios que funge como la víctima eterna de la serie. Siempre está en el lugar equivocado en el momento equivocado, sufriendo accidentes catastróficos.",
      actorVoz: "Jade Vlz",
    },
    {
      nombre: "Pi-O (PENA)",
      rol: "Antagonista / Caótico",
      descripcion: "Una entidad bizarra basada en ENA. Existe en múltiples variantes (Andina, Pituca) y suele interrumpir la realidad con diálogos abstractos y humor puramente peruano.",
      actorVoz: "Sugarser0 / Jade Vlz",
    },
    {
      nombre: "Misi",
      rol: "Personaje Secundario",
      descripcion: "La fiel compañera de Vanny. Aunque es más cuerda que el resto, su lealtad la lleva a verse involucrada en las mismas situaciones peligrosas y absurdas.",
      actorVoz: "Kunsei Mai",
    },
  ],
 staff: [
    {
      categoria: "Producción y Dirección",
      miembros: [
        {
          nombre: "Garabato Studios",
          imagen: Garabato,
          rol: "Dirección General, Guion y Storyboard",
        },
        {
          nombre: "Kunsei Mai",
          rol: "Co-Guionista y Producción",
        },
      ],
    },
    {
      categoria: "Animación y Arte",
      miembros: [
        {
          nombre: "Garabato",
          rol: "Animación Principal y Layout",
          imagen: Garabato,
        },
        {
          nombre: "Andrestre",
          rol: "Animación de Apoyo",
        },
        {
          nombre: "Neyland",
          rol: "Fondos y Color",
        },
        {
          nombre: "The_Aji",
          rol: "Efectos Visuales (VFX)",
        },
      ],
    },
    {
      categoria: "Actores de Voz",
      miembros: [
        {
          nombre: "Nerekoow",
          rol: "Monika",
        },
        {
          nombre: "Diana Speed",
          rol: "Sayori",
        },
        {
          nombre: "Kunsei Mai",
          rol: "Natacha, Misi",
        },
        {
          nombre: "Geeky Miki",
          rol: "Yasuri",
        },
        {
          nombre: "Jade Vlz",
          rol: "Vanny, PENA (Pituca)",
        },
        {
          nombre: "Sugarser0",
          rol: "PENA (Andina)",
        },
        {
          nombre: "Milis Anakuma",
          rol: "Presidenta Club M",
        }
      ],
    },
  ],
  galeria: [
    { src: GtbStudios1, alt: "Garabato Studio - Imagen 1" },
    { src: GtbStudios2, alt: "Garabato Studio - Imagen 2" },
    { src: GtbStudios3, alt: "Garabato Studio - Imagen 3" },
    { src: GtbStudios4, alt: "Garabato Studio - Imagen 4" },
    { src: GtbStudios5, alt: "Garabato Studio - Imagen 5" },
    { src: GtbStudios6, alt: "Garabato Studio - Imagen 6" },
    { src: GtbStudios7, alt: "Garabato Studio - Imagen 7" },
  ],
};



export default function GarabatoWiki() {
  return <ProjectWikiTemplate data={garabatoData} />;
}
