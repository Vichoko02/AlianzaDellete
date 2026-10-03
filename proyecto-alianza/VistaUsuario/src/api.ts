// Cliente de la API del backend (alianza-backend). El sitio no tiene login: todo lo de aquí es público.
import type { ProjectWikiData } from "./components/ProjectWikiTemplate";
import type { Socio } from "./components/SocioModal";

/** URL base de la API. En desarrollo Vite redirige /api al backend (ver vite.config.ts). */
const BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

async function obtener<T>(ruta: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${BASE}${ruta}`, init);
  if (!r.ok) {
    const datos = await r.json().catch(() => null) as { title?: string; errors?: Record<string, string[]> } | null;
    const detalle = datos?.errors ? Object.values(datos.errors).flat().join(" ") : datos?.title;
    throw new ErrorApi(detalle || `Error ${r.status}`, r.status);
  }
  return r.status === 204 ? (null as T) : (r.json() as Promise<T>);
}

export class ErrorApi extends Error {
  readonly estado: number;
  constructor(mensaje: string, estado: number) { super(mensaje); this.estado = estado; }
}

/** Las imágenes vienen como /api/medios/{id}; si la API está en otro dominio se les antepone la base. */
export const urlMedio = (url: string | null | undefined): string | undefined =>
  url ? (url.startsWith("/") ? `${BASE}${url}` : url) : undefined;

export interface EstadoSerie { codigo: string; nombre: string; color: string }
export interface TarjetaSerie { id: string; nombre: string; imagen: string | null; enlace: string; estado: EstadoSerie }
export interface EnlaceSitio { plataforma: string; url: string; etiqueta: string | null; descripcion: string | null }
export interface Sitio {
  textos: Record<string, string>;
  listas: Record<string, string[]>;
  enlaces: Record<string, EnlaceSitio[]>;
}
export type TipoPregunta = "Nombre" | "Email" | "Texto" | "TextoLargo" | "Opcion" | "VariasOpciones";
export interface PreguntaQuiz { id: number; texto: string; ayuda: string; tipo: TipoPregunta; opciones: string[]; requerida: boolean }

export type WikiApi = ProjectWikiData & { socios: { nombre: string; imagen: string | null; enlace: string }[] };

export const apiSitio = () => obtener<Sitio>("/api/sitio");
export const apiSeries = () => obtener<TarjetaSerie[]>("/api/series");
export const apiSocios = () => obtener<(Socio & { id: string })[]>("/api/socios");
export const apiWiki = (slug: string) => obtener<WikiApi>(`/api/series/${encodeURIComponent(slug)}`);
export const apiQuiz = () => obtener<PreguntaQuiz[]>("/api/quiz");
export const apiEnviarSolicitud = (respuestas: { preguntaId: number; valores: string[] }[], sitio: string) =>
  obtener<{ ok: boolean }>("/api/quiz/solicitudes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ respuestas, sitio }),
  });
