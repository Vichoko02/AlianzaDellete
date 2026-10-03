// Textos, imágenes y enlaces del sitio, editables desde el panel (sección «Textos del sitio»).
// Los valores de TEXTOS_POR_DEFECTO solo se usan mientras carga la API o si no responde.
import { createContext, useContext } from "react";
import { urlMedio, type EnlaceSitio, type Sitio } from "./api";
export const TEXTOS_POR_DEFECTO: Record<string, string> = {
  "inicio.hero.antetitulo": "— Proyecto Alianza —",
  "inicio.hero.eslogan": "Apoyando talentos con inspiración por medio de la colaboración.",
  "inicio.sobre.titulo": "Sobre Nosotros",
  "inicio.sobre.texto": "Somos una alianza de creadores independientes unidos por la pasión de contar historias y llevar sus proyectos al siguiente nivel a través de la colaboración.",
  "inicio.sobre.destacado": "Conoce a nuestros talentos/asociados.",
  "inicio.asociados.titulo": "Asociados",
  "inicio.proyectos.titulo": "Proyectos",
  "nav.sobre": "Sobre Nosotros",
  "nav.miembros": "Miembros",
  "nav.unete": "Únete",
  "nav.apoyanos": "Apóyanos",
  "unete.antetitulo": "Programa de Patrocinios",
  "unete.titulo": "¿Cómo unirte?",
  "unete.intro1": "",
  "unete.intro2": "",
  "unete.paso1.titulo": "Revisa nuestros proyectos",
  "unete.paso1.texto": "",
  "unete.paso2.titulo": "Prepara tu propuesta",
  "unete.paso2.texto": "",
  "unete.paso3.titulo": "Postula tu proyecto",
  "unete.paso3.texto": "",
  "unete.boton": "Postular mi proyecto",
  "quiz.titulo": "Postula tu proyecto",
  "quiz.intro": "",
  "quiz.exito.titulo": "¡Recibimos tu postulación!",
  "quiz.exito.texto": "Revisaremos tu propuesta y te escribiremos al correo que nos dejaste.",
  "apoyanos.titulo": "Apóyanos",
  "apoyanos.subtitulo": "Tu apoyo hace posible que sigamos creando",
  "footer.texto": "Alianza",
  "wiki.sinopsis": "Sinopsis",
  "wiki.galeria": "Galería",
  "wiki.creador": "Creador",
  "wiki.staff": "Staff",
  "wiki.arte": "Arte",
  "wiki.arteTitulo": "Arte del Proyecto",
  "wiki.personajes": "Personajes",
  "wiki.actorVoz": "Actor de Voz",
  "wiki.otrasObras": "Otras obras",
  "wiki.apoyaProyecto": "apoya este proyecto",
  "wiki.apoyanos": "Apóyanos",
  "wiki.trailer": "Trailer / Avance",
  "wiki.noEncontrada": "No encontramos este proyecto.",
  "socio.proyectos": "Proyectos",
};

export const SitioContexto = createContext<Sitio | null>(null);

/** Devuelve una función t(clave) con el texto configurado en el panel. */
export function useTextos(): (clave: string) => string {
  const sitio = useContext(SitioContexto);
  return (clave) => sitio?.textos[clave] ?? TEXTOS_POR_DEFECTO[clave] ?? "";
}

/** Lista de imágenes (URLs listas para usar en <img>). */
export function useListaImagenes(clave: string): string[] {
  const sitio = useContext(SitioContexto);
  return (sitio?.listas[clave] ?? []).map((u) => urlMedio(u)!).filter(Boolean);
}

export function useEnlaces(grupo: string): EnlaceSitio[] {
  return useContext(SitioContexto)?.enlaces[grupo] ?? [];
}

/** true cuando ya llegó el contenido de la API. */
export function useSitioCargado(): boolean {
  return useContext(SitioContexto) !== null;
}
