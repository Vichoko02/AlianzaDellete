// Lo que el sitio pide al servidor. El sitio no tiene inicio de sesión: todo lo de aquí es público.

/** Dirección del servidor. En desarrollo, Vite redirige /api al servidor local (ver vite.config.ts). */
const BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

// ─── 1. Formatos que entrega el servidor ──────────────────────────────────────

export interface EstadoSerie { codigo: string; nombre: string; color: string }
export interface TarjetaSerie { identificador: string; nombre: string; imagen: string | null; enlace: string; estado: EstadoSerie }
export interface Proyecto { nombre: string; imagen: string | null; enlace: string }
export type Redes = Record<string, string>;

export interface Socio {
  identificador: string;
  nombre: string;
  imagen: string | null;
  descripcion: string;
  redes: Redes;
  proyectos: Proyecto[];
}

export interface Personaje {
  nombre: string;
  imagen: string | null;
  rol: string;
  descripcion: string;
  actorVoz: string | null;
  imagenActorVoz: string | null;
}
export interface MiembroEquipo { nombre: string; rol: string; imagen: string | null }
export interface GrupoEquipo { categoria: string; miembros: MiembroEquipo[] }
export interface ImagenGaleria { url: string; textoAlternativo: string }
export interface Creador {
  nombre: string;
  imagen: string | null;
  descripcion: string;
  redes: Redes;
  obras: { titulo: string; url: string | null }[];
}

export interface Wiki {
  identificador: string;
  nombre: string;
  cabecera: string | null;
  logo: string | null;
  estado: EstadoSerie;
  urlVideo: string | null;
  videoPropio: string | null;
  sinopsis: string;
  creador: Creador;
  redes: Redes;
  apoyo: Redes;
  carrusel: string[];
  personajes: Personaje[];
  equipo: GrupoEquipo[];
  galeria: ImagenGaleria[];
  socios: Proyecto[];
}

export interface EnlaceSitio { plataforma: string; url: string; etiqueta: string | null; descripcion: string | null }
export interface Sitio {
  textos: Record<string, string>;
  listas: Record<string, string[]>;
  enlaces: Record<string, EnlaceSitio[]>;
}

export type TipoPregunta = "Nombre" | "Correo" | "Texto" | "TextoLargo" | "Opcion" | "VariasOpciones";
export interface Pregunta { id: number; texto: string; ayuda: string; tipo: TipoPregunta; opciones: string[]; obligatoria: boolean }
export interface Respuesta { preguntaId: number; valores: string[] }

// ─── 2. Peticiones ────────────────────────────────────────────────────────────

export class ErrorApi extends Error {
  readonly estado: number;
  constructor(mensaje: string, estado: number) { super(mensaje); this.estado = estado; }
}

async function pedir<T>(ruta: string, opciones?: RequestInit): Promise<T> {
  // 1. Hacer la petición.
  const respuesta = await fetch(`${BASE}${ruta}`, opciones);
  if (respuesta.ok) return respuesta.status === 204 ? (null as T) : (respuesta.json() as Promise<T>);

  // 2. Si falló, armar un mensaje legible con lo que explica el servidor.
  const datos: { title?: string; errors?: Record<string, string[]> } | null = await respuesta.json().catch(() => null);
  const detalle = datos?.errors ? Object.values(datos.errors).flat().join(" ") : datos?.title;
  throw new ErrorApi(detalle || `Error ${respuesta.status}`, respuesta.status);
}

export const pedirSitio = () => pedir<Sitio>("/api/sitio");
export const pedirSeries = () => pedir<TarjetaSerie[]>("/api/series");
export const pedirSocios = () => pedir<Socio[]>("/api/socios");
export const pedirWiki = (identificador: string) => pedir<Wiki>(`/api/series/${encodeURIComponent(identificador)}`);
export const pedirFormulario = () => pedir<Pregunta[]>("/api/formulario");
export const enviarPostulacion = (respuestas: Respuesta[], trampa: string) =>
  pedir<{ recibida: boolean }>("/api/formulario/postulaciones", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ respuestas, sitio: trampa }),
  });

// ─── 3. Direcciones de imágenes ───────────────────────────────────────────────

/** Las imágenes llegan como /api/medios/{id}; si el servidor está en otro dominio se les antepone su dirección. */
export const urlMedio = (url: string | null | undefined): string | undefined =>
  url ? (url.startsWith("/") ? `${BASE}${url}` : url) : undefined;
