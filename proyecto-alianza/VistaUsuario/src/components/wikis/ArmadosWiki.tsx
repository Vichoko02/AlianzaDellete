import ProjectWikiTemplate from "../ProjectWikiTemplate";
import type { ProjectWikiData } from "../ProjectWikiTemplate";

import bannerArmados from "../../assets/Banner/ArmadosBanner.webp";
import logoArmados   from "../../assets/Armados/LOGO_ARMADOS.webp";
import saikoImg      from "../../assets/Armados/Saiko.webp";
// Staff
import imgKaykkoi    from "../../assets/Armados/ArmadosStaffKaykkoi.webp";
import imgNiell      from "../../assets/Armados/ArmadosStaffNiell.webp";
import imgChico      from "../../assets/Armados/ArmadosStaffChico.webp";
import imgFonxbomz   from "../../assets/Armados/ArmadosStaffFonxbomz.webp";
import imgOnefix     from "../../assets/Armados/ArmadosStaffOneFixMissed.webp";
import imgEdr        from "../../assets/Armados/ArmadosStaffEdr.webp";
import imgElPrayo    from "../../assets/Armados/ArmadosStaffElPrayo.webp";
import imgJoisdog    from "../../assets/Armados/ArmadosStaffjoisdog.webp";
import imgKenart     from "../../assets/Armados/ArmadosStaffKenart.webp";
import imgMaximilian from "../../assets/Armados/ArmadosStaffMaximilianoCerda.webp";
import imgMrJota     from "../../assets/Armados/ArmadosStaffMrJjota.webp";
import imgZ15        from "../../assets/Armados/ArmadosStaffZ15.webp";
import imgDarianny   from "../../assets/Armados/ArmadosStaffDariannyCalderón.webp";
import imgMegan      from "../../assets/Armados/meganaaaa.webp";
import imgEstic      from "../../assets/Armados/estic_aaaaa.webp";

// Carrusel
import imgPoster     from "../../assets/Armados/POSTER_1.webp";
import CarouselTemp  from "../../assets/Armados/CarrucelTemp.webp";
import CarouselTemp1 from "../../assets/Armados/CarrucelTemp1.webp";
import CarouselTemp2 from "../../assets/Armados/CarrucelTemp2.webp";
import CarouselTemp3 from "../../assets/Armados/CarrucelTemp3.webp";

//Arte
import Arte1 from "../../assets/Armados/ArteArmados1.webp";
import Arte2 from "../../assets/Armados/ArteArmados2.webp";
import Arte3 from "../../assets/Armados/ArteArmados3.webp";
import Arte4 from "../../assets/Armados/ArteArmados4.webp";
import Arte5 from "../../assets/Armados/ArteArmados5.webp";
import Arte6 from "../../assets/Armados/ArteArmados6.webp";
import Arte7 from "../../assets/Armados/ArteArmados7.webp";
import Arte8 from "../../assets/Armados/ArteArmados8.webp";
import Arte9 from "../../assets/Armados/ArteArmados9.webp";

// Personajes
import Estic from "../../assets/Armados/ArteArmados3.webp";
import Megan from "../../assets/Armados/ArteArmados1.webp";



const armadosData: ProjectWikiData = {
  id: "armados",
  nombre: "MAF Studios — Armados",
  banner: bannerArmados,
  logo: logoArmados,

  estado: "En Producción",

  videoUrl: "https://www.youtube.com/embed/iBUSVhjTLbI",

  sinopsis:
    "Sigue a Estic, un joven que sueña con vivir aventuras como las de sus héroes de manga. Todo cambia cuando descubre los poderes ocultos de su yoyo, otorgándole habilidades extraordinarias.",

  creador: {
    nombre: "Saikomic",
    imagen: saikoImg,
    descripcion:
      "Saikomic es un creador independiente que publica sus mangas en MANGA Plus Creators by Shueisha. Su estilo mezcla acción con ideas experimentales, y ha desarrollado obras como Armados, Antagonista y Replika.",
    redes: {
      instagram: "https://www.instagram.com/saikomic/",
      twitter:   "https://x.com/saikomic",
    },
    obras: [
      { titulo: "Armados", url: "https://mangaplus-creators.jp/titles/qs2208160000288690004683825"},
      { titulo: "Antagonista", url: "https://mangaplus-creators.jp/titles/u42303080658013710004683825"},
      { titulo: "Replika", url: "https://mangaplus-creators.jp/titles/gv2502041122154520004683825"},
      { titulo: "Personaje", url: "https://mangaplus-creators.jp/episodes/ev2311100818294080004683825"},
    ],
  },

  redes: {
    instagram: "https://www.instagram.com/mafstudios/",
    twitter:   "https://x.com/mafstudios_",
    youtube:   "https://www.youtube.com/@mafstudioss",
    tiktok:    "https://www.tiktok.com/@mafstudioss",
    patreon: "https://www.patreon.com/cw/SomoslaAlianza",

  },

  carrusel: [
    CarouselTemp,
    CarouselTemp1,
    CarouselTemp2,
    CarouselTemp3,
  ],

  // NUEVO: personajes (esto antes no lo tenías)
  personajes: [
    {
      nombre: "Estic",
      imagen: Estic,
      rol: "Protagonista",
      descripcion:
        "Tras su batalla contra Ego, cuenta con una pequeña pero notable cicatriz en su mejilla derecha. Su frase iconica es '¿Por qué los hombres tienen pezones?' ",
      actorVoz: "Maximiliano Cerda",
      imagenActorVoz: imgMaximilian,
    },
    {
      nombre: "Megan",
      imagen: Megan,
      rol: "Personaje principal",
      descripcion:
        " Es una chica joven, y su arma es un bate y pelotas de baseball. Aliada clave dentro de la historia, con un rol importante en el desarrollo del protagonista.",
      actorVoz: "Darianny Calderón",
      imagenActorVoz: imgDarianny,
    },
  ],

  staff: [
    {
      categoria: "Dirección",
      miembros: [
        { nombre: "KAYKKOI", rol: "Dirección General · Animación", imagen: imgKaykkoi },
        { nombre: "Niell Munn", rol: "Dirección General", imagen: imgNiell },
        { nombre: "Chico", rol: "Dirección de Arte", imagen: imgChico },
      ],
    },
    {
      categoria: "Arte y Animación",
      miembros: [
        { nombre: "Edr", rol: "Animación", imagen: imgEdr },
        { nombre: "El Prayo", rol: "Animación", imagen: imgElPrayo },
        { nombre: "JoisD0G", rol: "Animación", imagen: imgJoisdog },
        { nombre: "Kenart", rol: "Animación", imagen: imgKenart },
        { nombre: "Mr. Jota", rol: "Animación", imagen: imgMrJota },
        { nombre: "Z15", rol: "Animación", imagen: imgZ15 },
      ],
    },
    {
      categoria: "Guión",
      miembros: [
        { nombre: "KAYKKOI", rol: "Guión · Guión Gráfico", imagen: imgKaykkoi },
        { nombre: "Niell Munn", rol: "Guión · Guión Gráfico", imagen: imgNiell },
        { nombre: "Saikomic", rol: "Guión · Autor Original", imagen: saikoImg },
      ],
    },
    {
      categoria: "Música",
      miembros: [
        { nombre: "FonxBomz", rol: "Compositor", imagen: imgFonxbomz },
        { nombre: "OneFixMissed", rol: "Compositor", imagen: imgOnefix },
      ],
    },
    {
      categoria: "Actuación de Voz",
      miembros: [
        { nombre: "Maximiliano Cerda", rol: "Estic", imagen: imgMaximilian },
        { nombre: "Darianny Calderón", rol: "Megan", imagen: imgDarianny },
      ],
    },
  ],



  galeria: [
    { src: imgPoster, alt: "Poster oficial Armados" },
    { src: Arte2, alt: "Arte Armados 2" },
    { src: imgMegan, alt: "Megan" },
    { src: imgEstic, alt: "Estic" },
    { src: Arte3, alt: "Arte Armados 3" },
    { src: Arte4, alt: "Arte Armados 4" },
    { src: Arte5, alt: "Arte Armados 5" },
    { src: Arte6, alt: "Arte Armados 6" },
    { src: Arte7, alt: "Arte Armados 7" },
    { src: Arte8, alt: "Arte Armados 8" },
    { src: Arte9, alt: "Arte Armados 9" },
    { src: Arte1, alt: "Arte Armados 1" },


  ],
};

export default function ArmadosWiki() {
  return <ProjectWikiTemplate data={armadosData} />;
}