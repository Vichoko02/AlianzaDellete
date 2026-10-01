// Panel de administración de La Alianza (TypeScript, sin dependencias en tiempo de ejecución).
// Se compila con `npm run build` a src/Alianza.Api/wwwroot/admin/app.js y se sirve desde /admin.
// Todo el DOM se construye con h(), nunca con innerHTML, para que ningún texto que venga de la BD pueda inyectar HTML.
"use strict";

// ─── Tipos de la API ──────────────────────────────────────────────────────────

type Ambito = "Wikis" | "Socios" | "Estados" | "Medios";
type Origen = "Local" | "Ldap";

interface Permiso { ambito: Ambito; serieId?: number | null; serieNombre?: string | null }
interface Perfil {
  id: number; username: string; nombreVisible: string; email: string | null; origen: Origen;
  esSuperAdmin: boolean; puedeCrearWikis: boolean; permisos: Permiso[];
}
interface Sesion { token: string; expira: string; usuario: Perfil }
interface Estado { id: number; codigo: string; nombre: string; color: string; orden: number }
interface Medio { id: string; url: string; nombreArchivo: string; tipoContenido: string; tamano: number; alt: string; creadoEn: string }
interface Pagina<T> { items: T[]; total: number; pagina: number; tamanoPagina: number }
interface Enlace { plataforma: string; url: string }
interface Obra { titulo: string; url: string | null }
interface Imagen { medioId: string; alt: string | null }
interface Personaje { nombre: string; rol: string | null; descripcion: string | null; imagenId: string | null; actorVoz: string | null; imagenActorVozId: string | null }
interface Miembro { nombre: string; rol: string | null; imagenId: string | null }
interface GrupoEquipo { categoria: string; miembros: Miembro[] }
interface Creador { nombre: string | null; descripcion: string | null; imagenId: string | null; redes: Enlace[]; obras: Obra[] }
interface SerieEdicion {
  id: number | null; slug: string; nombre: string; sinopsis: string | null; estadoId: number;
  portadaId: string | null; bannerId: string | null; logoId: string | null; videoUrl: string | null; videoLocalId: string | null;
  creador: Creador; redes: Enlace[]; apoyo: Enlace[]; carrusel: Imagen[]; galeria: Imagen[];
  personajes: Personaje[]; equipo: GrupoEquipo[]; orden: number; publicada: boolean; actualizadoEn?: string | null;
}
interface SerieLista { id: number; slug: string; nombre: string; estado: Estado; portada: string | null; publicada: boolean; orden: number; actualizadoEn: string }
interface SocioEdicion {
  id: number | null; slug: string; nombre: string; descripcion: string | null; imagenId: string | null;
  orden: number; publicado: boolean; redes: Enlace[]; serieIds: number[];
}
interface SocioLista { id: number; slug: string; nombre: string; imagen: string | null; publicado: boolean; orden: number }
interface UsuarioLista {
  id: number; username: string; nombreVisible: string; email: string | null; origen: Origen; esSuperAdmin: boolean;
  puedeCrearWikis: boolean; activo: boolean; creadoEn: string; ultimoAcceso: string | null; permisos: Permiso[];
}
interface Resumen { series: number; seriesPublicadas: number; socios: number; medios: number; bytesMedios: number; usuarios: number; seriesPorEstado: Record<string, number> }
interface RegistroAuditoria { id: number; fecha: string; username: string; accion: string; entidad: string; entidadId: string | null; detalle: string | null }
interface ConfigPanel { urlSitio: string }

// ─── Utilidades de DOM ────────────────────────────────────────────────────────

/** Evento con un target de formulario (input/select/textarea comparten value, checked y files). */
type EventoCampo = Event & { target: HTMLInputElement };
type Manejador = (e: EventoCampo) => unknown;
type Hijo = Node | string | number | null | undefined | false | Hijo[];
interface Props {
  class?: string | null;
  onclick?: (e: MouseEvent) => unknown;
  onkeydown?: (e: KeyboardEvent) => unknown;
  oninput?: Manejador;
  onchange?: Manejador;
  onsubmit?: (e: SubmitEvent) => unknown;
  [atributo: string]: string | number | boolean | null | undefined | ((e: never) => unknown);
}

function h<K extends keyof HTMLElementTagNameMap>(tag: K, props?: Props | null, ...hijos: Hijo[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props ?? {})) {
    if (v == null || v === false) continue;
    if (typeof v === "function") el.addEventListener(k.slice(2), v as EventListener);
    else if (k === "class") el.className = String(v);
    else if (k === "value") (el as HTMLInputElement).value = String(v);
    else if (k === "checked" || k === "disabled" || k === "selected" || k === "multiple" || k === "allowfullscreen")
      (el as unknown as Record<string, boolean>)[k === "allowfullscreen" ? "allowFullscreen" : k] = !!v;
    else el.setAttribute(k, v === true ? "" : String(v));
  }
  agregar(el, hijos);
  return el;
}
function agregar(el: Element, hijos: Hijo[]): void {
  for (const c of (hijos as unknown[]).flat(Infinity) as Hijo[]) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}
function vaciar<T extends Element>(el: T, ...hijos: Hijo[]): T { el.replaceChildren(); agregar(el, hijos); return el; }
function $(sel: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(sel);
  if (!el) throw new Error(`No existe ${sel}`);
  return el;
}

function aviso(texto: string, tipo: "" | "ok" | "error" = ""): void {
  const a = h("div", { class: `aviso ${tipo}`, role: "status" }, texto);
  $("#avisos").append(a);
  setTimeout(() => a.remove(), tipo === "error" ? 7000 : 3500);
}

function formatoBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}
const fecha = (iso: string | null | undefined): string => (iso ? new Date(iso).toLocaleString("es-CL") : "—");
const urlMedio = (id: string | null | undefined): string | null => (id ? `/api/medios/${id}` : null);
const clonar = <T>(o: T): T => JSON.parse(JSON.stringify(o)) as T;
const normalizar = (t: string | null | undefined): string => (t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const slugDe = (texto: string): string => normalizar(texto).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

function etiquetaEstado(estado: Pick<Estado, "nombre" | "color">): HTMLSpanElement {
  const e = h("span", { class: "etiqueta" }, estado.nombre);
  e.style.background = estado.color;
  return e;
}

// ─── Sesión y API ─────────────────────────────────────────────────────────────

const almacen = {
  leer(): Sesion | null { try { return JSON.parse(sessionStorage.getItem("alianza-sesion") ?? "null") as Sesion | null; } catch { return null; } },
  guardar(s: Sesion): void { try { sessionStorage.setItem("alianza-sesion", JSON.stringify(s)); } catch { /* modo privado */ } },
  borrar(): void { try { sessionStorage.removeItem("alianza-sesion"); } catch { /* nada */ } },
};
let sesion: Sesion | null = almacen.leer();

class ErrorApi extends Error {
  constructor(mensaje: string, readonly estado: number) { super(mensaje); }
}

async function api<T = unknown>(metodo: string, ruta: string, cuerpo?: unknown, { formulario = false } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const opciones: RequestInit = { method: metodo, headers };
  if (sesion?.token) headers.Authorization = `Bearer ${sesion.token}`;
  if (cuerpo !== undefined) {
    if (formulario) opciones.body = cuerpo as FormData;
    else { headers["Content-Type"] = "application/json"; opciones.body = JSON.stringify(cuerpo); }
  }
  const r = await fetch(ruta, opciones);
  if (r.status === 401 && ruta !== "/api/auth/login") {
    cerrarSesion();
    throw new ErrorApi("Tu sesión expiró. Vuelve a iniciar sesión.", 401);
  }
  const advertencia = r.headers.get("X-Advertencia");
  if (advertencia) aviso(advertencia, "error");
  if (r.status === 204) return null as T;
  const texto = await r.text();
  const datos = texto ? JSON.parse(texto) : null;
  if (!r.ok) {
    let msg: string = datos?.title || `Error ${r.status}`;
    if (r.status === 403) msg = "No tienes permiso para esta acción.";
    if (r.status === 429) msg = "Demasiados intentos. Espera un minuto.";
    if (datos?.errors) msg = (Object.values(datos.errors) as string[][]).flat().join(" ");
    throw new ErrorApi(msg, r.status);
  }
  return datos as T;
}

/** Ejecuta una acción mostrando el error (si lo hay) como aviso. Devuelve undefined si falló. */
async function intentar<T>(fn: () => Promise<T>, mensajeOk?: string): Promise<T | undefined> {
  try {
    const r = await fn();
    if (mensajeOk) aviso(mensajeOk, "ok");
    return r;
  } catch (e) {
    aviso(e instanceof Error ? e.message : "Error inesperado", "error");
    return undefined;
  }
}

function cerrarSesion(): void {
  sesion = null;
  almacen.borrar();
  hayCambiosSinGuardar = false;
  location.hash = "#/";
  render();
}

function perfil(): Perfil {
  if (!sesion) throw new Error("Sin sesión");
  return sesion.usuario;
}
const esSA = (): boolean => !!sesion?.usuario.esSuperAdmin;
const puede = (ambito: Ambito): boolean => esSA() || !!sesion?.usuario.permisos.some((p) => p.ambito === ambito && p.serieId == null);
const puedeCrearWikis = (): boolean => esSA() || !!sesion?.usuario.puedeCrearWikis;

const NOMBRES_AMBITO: Record<Ambito, string> = {
  Wikis: "Editar wikis",
  Socios: "Socios / asociados",
  Estados: "Estados de serie",
  Medios: "Biblioteca de medios (eliminar)",
};
const PLATAFORMAS = ["instagram", "twitter", "youtube", "tiktok", "discord", "facebook", "twitch", "kick",
  "patreon", "kofi", "buymeacoffee", "vaquite", "doblaje", "web"];
const PLATAFORMAS_APOYO = ["patreon", "kofi", "buymeacoffee", "vaquite"];

// ─── Login ────────────────────────────────────────────────────────────────────

function vistaLogin(): HTMLElement {
  const usuario = h("input", { type: "text", id: "u", autocomplete: "username", required: true, autofocus: true });
  const clave = h("input", { type: "password", id: "p", autocomplete: "current-password", required: true });
  const boton = h("button", { class: "primario", type: "submit" }, "Entrar");
  const form = h("form", {
    onsubmit: async (ev) => {
      ev.preventDefault();
      boton.disabled = true;
      const s = await intentar(() => api<Sesion>("POST", "/api/auth/login", { username: usuario.value.trim(), password: clave.value }));
      boton.disabled = false;
      if (s) { sesion = s; almacen.guardar(s); await cargarConfig(); render(); }
      else { clave.value = ""; clave.focus(); }
    },
  },
    h("div", { class: "logo" }, h("img", { src: "img/logo-blanco.svg", alt: "" })),
    h("h1", {}, "La Alianza"),
    h("p", { class: "sub" }, "Panel de administración"),
    h("div", { class: "campo" }, h("label", { for: "u" }, "Usuario"), usuario),
    h("div", { class: "campo" }, h("label", { for: "p" }, "Contraseña"), clave),
    boton,
    h("p", { class: "pie" }, "Acceso solo para cuentas administrativas."),
  );
  return h("div", { class: "login" }, form);
}

// ─── Tema claro / oscuro ─────────────────────────────────────────────────────

function temaActual(): "claro" | "oscuro" {
  const t = document.documentElement.getAttribute("data-tema");
  if (t === "claro" || t === "oscuro") return t;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "oscuro" : "claro";
}
function alternarTema(): void {
  const nuevo = temaActual() === "oscuro" ? "claro" : "oscuro";
  document.documentElement.setAttribute("data-tema", nuevo);
  try { localStorage.setItem("alianza-tema", nuevo); } catch { /* sin almacenamiento */ }
  const boton = document.querySelector<HTMLButtonElement>(".boton-tema");
  if (boton) boton.textContent = nuevo === "oscuro" ? "☀ Claro" : "☾ Oscuro";
}

// ─── Configuración del panel ─────────────────────────────────────────────────

let config: ConfigPanel = { urlSitio: "" };
async function cargarConfig(): Promise<void> {
  try { config = await api<ConfigPanel>("GET", "/api/admin/config"); } catch { /* sigue con valores por defecto */ }
}
/** Enlace a la ficha pública de una wiki, si se configuró la URL del sitio. */
const urlWikiPublica = (slug: string): string | null => (config.urlSitio && slug ? `${config.urlSitio}/wiki/${slug}` : null);

// ─── Estructura y enrutado ────────────────────────────────────────────────────

type Vista = (m: RegExpMatchArray) => Node | Promise<Node>;
interface Ruta { patron: RegExp; vista: Vista; menu: string; permiso?: () => boolean }

const RUTAS: Ruta[] = [
  { patron: /^\/$/, vista: () => vistaResumen(), menu: "resumen" },
  { patron: /^\/wikis$/, vista: () => vistaWikis(), menu: "wikis" },
  { patron: /^\/wikis\/nueva$/, vista: () => vistaEditorWiki(null), menu: "wikis" },
  { patron: /^\/wikis\/(\d+)$/, vista: (m) => vistaEditorWiki(Number(m[1])), menu: "wikis" },
  { patron: /^\/socios$/, vista: () => vistaSocios(), menu: "socios", permiso: () => puede("Socios") },
  { patron: /^\/socios\/nuevo$/, vista: () => vistaEditorSocio(null), menu: "socios", permiso: () => puede("Socios") },
  { patron: /^\/socios\/(\d+)$/, vista: (m) => vistaEditorSocio(Number(m[1])), menu: "socios", permiso: () => puede("Socios") },
  { patron: /^\/estados$/, vista: () => vistaEstados(), menu: "estados" },
  { patron: /^\/medios$/, vista: () => vistaMedios(), menu: "medios" },
  { patron: /^\/usuarios$/, vista: () => vistaUsuarios(), menu: "usuarios", permiso: esSA },
  { patron: /^\/auditoria$/, vista: () => vistaAuditoria(), menu: "auditoria", permiso: esSA },
  { patron: /^\/cuenta$/, vista: () => vistaCuenta(), menu: "cuenta" },
];

let hayCambiosSinGuardar = false;
let hashAnterior = location.hash;
window.addEventListener("beforeunload", (e) => { if (hayCambiosSinGuardar) e.preventDefault(); });
window.addEventListener("hashchange", () => {
  // Evita perder un formulario a medio editar al navegar dentro del panel.
  if (hayCambiosSinGuardar && !window.confirm("Tienes cambios sin guardar. ¿Salir de todas formas?")) {
    history.replaceState(null, "", hashAnterior || "#/");
    return;
  }
  hashAnterior = location.hash;
  render();
});
// Ctrl/Cmd + S guarda el formulario o el diálogo abierto.
window.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
    const boton = document.querySelector<HTMLButtonElement>("dialog[open] .modal-pie button.primario")
      ?? document.querySelector<HTMLButtonElement>(".barra-guardar button[type=submit]");
    if (boton) { e.preventDefault(); boton.click(); }
  }
});

function render(): void {
  const app = $("#app");
  app.className = "";
  if (!sesion) { vaciar(app, vistaLogin()); return; }

  const ruta = location.hash.replace(/^#/, "") || "/";
  let elegida: Ruta | null = null;
  let m: RegExpMatchArray | null = null;
  for (const r of RUTAS) { m = ruta.match(r.patron); if (m) { elegida = r; break; } }
  if (!elegida || !m || (elegida.permiso && !elegida.permiso())) { location.hash = "#/"; return; }

  hayCambiosSinGuardar = false;
  hashAnterior = location.hash;
  const contenido = h("main", { class: "contenido", id: "contenido" }, h("div", { class: "cargando" }, "Cargando…"));
  const lateral = menuLateral(elegida.menu);
  const velo = h("div", { class: "velo oculto", onclick: () => alternarMenu(false) });
  function alternarMenu(abrir: boolean): void { lateral.classList.toggle("abierto", abrir); velo.classList.toggle("oculto", !abrir); }
  const barraMovil = h("div", { class: "barra-movil" },
    h("img", { src: "img/logo-blanco.svg", alt: "La Alianza" }),
    h("button", { class: "mini", onclick: () => alternarMenu(true), "aria-label": "Abrir menú" }, "☰ Menú"));
  lateral.addEventListener("click", (e) => { if (e.target instanceof Element && e.target.closest("a")) alternarMenu(false); });
  vaciar(app, barraMovil, h("div", { class: "shell" }, lateral, contenido), velo);

  Promise.resolve(elegida.vista(m)).then((nodo) => {
    vaciar(contenido, nodo);
    window.scrollTo(0, 0);
  }).catch((e: unknown) => vaciar(contenido, h("div", { class: "tarjeta" }, h("h2", {}, "No se pudo cargar"),
    h("p", {}, e instanceof Error ? e.message : "Error al cargar."))));
}

function menuLateral(activo: string): HTMLElement {
  const enlace = (clave: string, href: string, texto: string) =>
    h("a", { href, class: `nav${clave === activo ? " activo" : ""}`, "aria-current": clave === activo ? "page" : null }, texto);
  const u = perfil();
  return h("nav", { class: "lateral", "aria-label": "Menú principal" },
    h("a", { class: "marca", href: "#/" }, h("img", { src: "img/logo-blanco.svg", alt: "" }),
      h("span", {}, "La Alianza", h("small", {}, "Panel"))),
    enlace("resumen", "#/", "Resumen"),
    h("div", { class: "grupo" }, "Contenido"),
    enlace("wikis", "#/wikis", "Wikis"),
    puede("Socios") && enlace("socios", "#/socios", "Socios"),
    enlace("estados", "#/estados", "Estados"),
    enlace("medios", "#/medios", "Medios"),
    esSA() && h("div", { class: "grupo" }, "Administración"),
    esSA() && enlace("usuarios", "#/usuarios", "Usuarios y permisos"),
    esSA() && enlace("auditoria", "#/auditoria", "Auditoría"),
    h("div", { class: "sep" }),
    enlace("cuenta", "#/cuenta", "Mi cuenta"),
    h("div", { class: "quien" }, h("strong", {}, u.nombreVisible), u.username, esSA() ? " · superadmin" : ""),
    h("div", { class: "pie-lateral" },
      h("button", { class: "boton-tema", onclick: alternarTema, title: "Cambiar tema" }, temaActual() === "oscuro" ? "☀ Claro" : "☾ Oscuro"),
      h("button", { onclick: () => cerrarSesion() }, "Salir")),
  );
}

type Miga = [texto: string, href?: string];

/** Cabecera de página con migas de pan opcionales y acciones a la derecha. */
function cabecera(titulo: string, acciones: Hijo[] = [], migas: Miga[] = []): HTMLElement {
  return h("div", { class: "cabecera" },
    h("div", {},
      migas.length > 0 && h("span", { class: "migas" }, migas.map(([t, href], i) => [i ? " / " : "", href ? h("a", { href }, t) : t])),
      h("h1", {}, titulo)),
    h("div", { class: "acciones" }, acciones));
}

// ─── Modal genérico ───────────────────────────────────────────────────────────

function modal(titulo: string, cuerpo: Hijo, botones: Hijo[] = [], { estrecho = false } = {}): HTMLDialogElement {
  const dlg = h("dialog", { class: estrecho ? "estrecho" : null });
  agregar(dlg, [
    h("div", { class: "modal-cab" }, h("h2", {}, titulo), h("button", { class: "mini fantasma", onclick: () => dlg.close(), "aria-label": "Cerrar" }, "✕")),
    h("div", { class: "modal-cuerpo" }, cuerpo),
    botones.length ? h("div", { class: "modal-pie" }, botones) : null,
  ]);
  dlg.addEventListener("close", () => dlg.remove());
  document.body.append(dlg);
  dlg.showModal();
  return dlg;
}

function confirmar(texto: string, { peligro = true, boton = "Confirmar" } = {}): Promise<boolean> {
  return new Promise((resolver) => {
    let ok = false;
    const dlg = modal("Confirmar", h("p", {}, texto), [
      h("button", { onclick: () => dlg.close() }, "Cancelar"),
      h("button", { class: peligro ? "peligro" : "primario", onclick: () => { ok = true; dlg.close(); } }, boton),
    ], { estrecho: true });
    dlg.addEventListener("close", () => resolver(ok));
  });
}

// ─── Resumen ──────────────────────────────────────────────────────────────────

async function vistaResumen(): Promise<HTMLElement> {
  const [r, estados, actividad] = await Promise.all([
    api<Resumen>("GET", "/api/admin/resumen"),
    api<Estado[]>("GET", "/api/admin/estados"),
    esSA() ? api<Pagina<RegistroAuditoria>>("GET", "/api/admin/auditoria?pagina=1&tamano=8") : Promise.resolve(null),
  ]);
  const est = (n: number, t: string, href?: string) =>
    href ? h("a", { class: "estadistica", href }, h("b", {}, n), h("span", {}, t)) : h("div", { class: "estadistica" }, h("b", {}, n), h("span", {}, t));
  const u = perfil();
  const capacidades: string[] = esSA()
    ? ["Superadministrador: control total, incluida la gestión de usuarios y permisos."]
    : [
      ...(puedeCrearWikis() ? ["Puedes crear wikis nuevas."] : []),
      ...u.permisos.map((p) => p.ambito === "Wikis"
        ? (p.serieId ? `Editar la wiki «${p.serieNombre}».` : "Editar todas las wikis.")
        : `${NOMBRES_AMBITO[p.ambito]}.`),
    ];

  const maximo = Math.max(1, ...Object.values(r.seriesPorEstado));
  const barras = estados.filter((e) => r.seriesPorEstado[e.nombre]).map((e) => {
    const n = r.seriesPorEstado[e.nombre] ?? 0;
    const relleno = h("i");
    relleno.style.width = `${(n / maximo) * 100}%`;
    relleno.style.background = e.color;
    return h("div", { class: "barra" }, etiquetaEstado(e), h("div", { class: "pista" }, relleno), h("b", {}, n));
  });

  return h("div", {},
    cabecera(`Hola, ${u.nombreVisible}`),
    h("div", { class: "accesos" },
      puedeCrearWikis() && h("a", { class: "boton primario", href: "#/wikis/nueva" }, "+ Nueva wiki"),
      puede("Socios") && h("a", { class: "boton", href: "#/socios/nuevo" }, "+ Nuevo asociado"),
      h("a", { class: "boton", href: "#/medios" }, "Subir archivos"),
      esSA() && h("a", { class: "boton", href: "#/usuarios" }, "Gestionar usuarios")),
    h("div", { class: "estadisticas" },
      est(r.series, "Wikis", "#/wikis"),
      est(r.seriesPublicadas, "Publicadas", "#/wikis"),
      est(r.socios, "Socios", puede("Socios") ? "#/socios" : undefined),
      est(r.medios, `Archivos · ${formatoBytes(r.bytesMedios)}`, "#/medios"),
      esSA() && est(r.usuarios, "Usuarios activos", "#/usuarios")),
    h("div", { class: "rejilla" },
      h("div", { class: "tarjeta" }, h("h2", {}, "Wikis por estado"),
        barras.length ? h("div", { class: "barras" }, barras) : h("p", { class: "vacio" }, "Aún no hay wikis.")),
      h("div", { class: "tarjeta" }, h("h2", {}, "Tus permisos"),
        capacidades.length ? h("ul", {}, capacidades.map((c) => h("li", {}, c)))
          : h("p", { class: "vacio" }, "Todavía no tienes permisos asignados. Pídeselos a YishAdmin."))),
    actividad && h("div", { class: "tarjeta" },
      h("h2", {}, "Actividad reciente", h("a", { class: "boton mini", href: "#/auditoria" }, "Ver todo")),
      actividad.items.length
        ? h("ul", { class: "actividad" }, actividad.items.map((a) => h("li", {},
          h("time", {}, fecha(a.fecha)),
          h("span", {}, h("b", {}, a.username), ` · ${a.accion} ${a.entidad}`, a.detalle ? ` · ${a.detalle}` : ""))))
        : h("p", { class: "vacio" }, "Sin actividad todavía.")),
  );
}

// ─── Biblioteca de medios ─────────────────────────────────────────────────────

/** Abre la biblioteca y devuelve los medios elegidos, o null si se cancela. */
function elegirMedios({ multiple = false } = {}): Promise<Medio[] | null> {
  return new Promise((resolver) => {
    const elegidos = new Map<string, Medio>();
    let resultado: Medio[] | null = null;
    const usar = h("button", { class: "primario", disabled: true, onclick: () => { resultado = [...elegidos.values()]; dlg.close(); } }, "Usar selección");
    const biblioteca = panelBiblioteca({
      alElegir: (m, nodo) => {
        if (!multiple) { elegidos.clear(); biblioteca.querySelectorAll(".medio.elegido").forEach((n) => n.classList.remove("elegido")); }
        if (elegidos.has(m.id)) { elegidos.delete(m.id); nodo.classList.remove("elegido"); }
        else { elegidos.set(m.id, m); nodo.classList.add("elegido"); }
        usar.disabled = elegidos.size === 0;
        usar.textContent = multiple && elegidos.size ? `Usar ${elegidos.size} archivo(s)` : "Usar selección";
      },
      alSubir: (subidos) => {
        if (!multiple) { resultado = subidos.slice(0, 1); dlg.close(); }
      },
    });
    const dlg = modal(multiple ? "Elegir archivos" : "Elegir archivo", biblioteca, [h("button", { onclick: () => dlg.close() }, "Cancelar"), usar]);
    dlg.addEventListener("close", () => resolver(resultado));
  });
}

interface OpcionesBiblioteca {
  alElegir?: (m: Medio, nodo: HTMLElement) => void;
  alSubir?: (subidos: Medio[]) => void;
  conDetalle?: boolean;
}

/** Rejilla de medios con subida (arrastrar o elegir), búsqueda y paginación. */
function panelBiblioteca({ alElegir, alSubir, conDetalle = false }: OpcionesBiblioteca): HTMLElement {
  const rejilla = h("div", { class: "medios" });
  const info = h("p", { class: "ayuda" });
  const buscar = h("input", { type: "search", placeholder: "Buscar por nombre o texto alternativo…", "aria-label": "Buscar archivos" });
  let pagina = 1;
  const paginador = h("div", { class: "paginador" });

  async function cargar(): Promise<void> {
    const q = new URLSearchParams({ pagina: String(pagina), tamano: "60" });
    if (buscar.value.trim()) q.set("buscar", buscar.value.trim());
    const r = await intentar(() => api<Pagina<Medio>>("GET", `/api/admin/medios?${q}`));
    if (!r) return;
    vaciar(rejilla, r.items.length ? r.items.map(tarjetaMedio) : h("p", { class: "vacio" }, "No hay archivos."));
    const paginas = Math.max(1, Math.ceil(r.total / r.tamanoPagina));
    info.textContent = `${r.total} archivo(s)`;
    vaciar(paginador,
      h("button", { class: "mini", disabled: pagina <= 1, onclick: () => { pagina--; void cargar(); } }, "‹ Anterior"),
      `Página ${pagina} de ${paginas}`,
      h("button", { class: "mini", disabled: pagina >= paginas, onclick: () => { pagina++; void cargar(); } }, "Siguiente ›"));
  }

  function tarjetaMedio(m: Medio): HTMLElement {
    const esVideo = m.tipoContenido.startsWith("video/");
    const nodo = h("button", { type: "button", class: "medio", title: `${m.nombreArchivo} · ${formatoBytes(m.tamano)}` },
      esVideo ? h("video", { src: m.url, muted: true, preload: "metadata" }) : h("img", { src: m.url, alt: m.alt || m.nombreArchivo, loading: "lazy" }),
      h("div", { class: "nombre" }, m.nombreArchivo));
    if (alElegir) nodo.addEventListener("click", () => alElegir(m, nodo));
    if (conDetalle) nodo.addEventListener("click", () => void detalleMedio(m, cargar));
    return nodo;
  }

  const entrada = h("input", { type: "file", multiple: true, accept: "image/*,video/mp4,video/webm", class: "oculto" });
  async function subir(archivos: File[]): Promise<void> {
    if (!archivos.length) return;
    const fd = new FormData();
    for (const f of archivos) fd.append("archivos", f);
    aviso(`Subiendo ${archivos.length} archivo(s)…`);
    const r = await intentar(() => api<Medio[]>("POST", "/api/admin/medios", fd, { formulario: true }), "Archivos subidos");
    if (r) { pagina = 1; buscar.value = ""; await cargar(); alSubir?.(r); }
  }
  entrada.addEventListener("change", () => void subir([...(entrada.files ?? [])]));
  const zona = h("div", { class: "zona-subida" },
    h("strong", {}, "Subir archivos"),
    "Arrastra imágenes o videos aquí, o ",
    h("button", { type: "button", class: "mini primario", onclick: () => entrada.click() }, "elige archivos"), entrada,
    h("div", { class: "ayuda" }, "webp, png, jpg, gif, svg, mp4 o webm · máximo 60 MB. Se guardan en la base de datos."));
  zona.addEventListener("dragover", (e) => { e.preventDefault(); zona.classList.add("encima"); });
  zona.addEventListener("dragleave", () => zona.classList.remove("encima"));
  zona.addEventListener("drop", (e) => { e.preventDefault(); zona.classList.remove("encima"); void subir([...(e.dataTransfer?.files ?? [])]); });

  let temporizador: number | undefined;
  buscar.addEventListener("input", () => { clearTimeout(temporizador); temporizador = window.setTimeout(() => { pagina = 1; void cargar(); }, 300); });
  void cargar();
  return h("div", {}, zona, h("div", { class: "campo" }, buscar), info, rejilla, paginador);
}

/** Ficha de un archivo: vista previa, datos, texto alternativo, dónde se usa y eliminación. */
async function detalleMedio(m: Medio, alCambiar?: () => unknown): Promise<void> {
  const esVideo = m.tipoContenido.startsWith("video/");
  const d = { alt: m.alt || "" };
  const usos = h("div", {}, h("p", { class: "ayuda" }, "Buscando dónde se usa…"));
  const urlCompleta = new URL(m.url, location.origin).href;
  const dlg = modal("Archivo", h("div", { class: "detalle-medio" },
    h("div", { class: "previa" }, esVideo ? h("video", { src: m.url, controls: true }) : h("img", { src: m.url, alt: m.alt || m.nombreArchivo })),
    h("div", {},
      h("dl", {},
        h("dt", {}, "Nombre"), h("dd", {}, m.nombreArchivo),
        h("dt", {}, "Tipo"), h("dd", {}, m.tipoContenido),
        h("dt", {}, "Tamaño"), h("dd", {}, formatoBytes(m.tamano)),
        h("dt", {}, "Subido"), h("dd", {}, fecha(m.creadoEn))),
      h("div", { class: "campo" }, h("label", {}, "Dirección"),
        h("div", { class: "acciones" }, h("code", {}, m.url),
          h("button", {
            type: "button", class: "mini",
            onclick: async () => {
              try { await navigator.clipboard.writeText(urlCompleta); aviso("Dirección copiada", "ok"); } catch { aviso("No se pudo copiar", "error"); }
            },
          }, "Copiar"))),
      campo("Texto alternativo", d, "alt", { ayuda: "Describe la imagen para lectores de pantalla." }),
      h("h3", {}, "Dónde se usa"), usos)),
    [
      puede("Medios") && h("button", {
        class: "peligro",
        onclick: async () => {
          if (!(await confirmar(`¿Eliminar «${m.nombreArchivo}»? Solo se puede si no está en uso.`, { boton: "Eliminar" }))) return;
          if ((await intentar(() => api("DELETE", `/api/admin/medios/${m.id}`), "Archivo eliminado")) !== undefined) { dlg.close(); alCambiar?.(); }
        },
      }, "Eliminar"),
      h("button", { onclick: () => dlg.close() }, "Cerrar"),
      h("button", {
        class: "primario",
        onclick: async () => {
          const r = await intentar(() => api<Medio>("PATCH", `/api/admin/medios/${m.id}`, d), "Archivo actualizado");
          if (r) { dlg.close(); alCambiar?.(); }
        },
      }, "Guardar"),
    ]);
  // El modal edita un solo campo propio: no debe bloquear la navegación del editor que está detrás.
  dlg.addEventListener("close", () => { hayCambiosSinGuardar = false; });
  const lista = await intentar(() => api<string[]>("GET", `/api/admin/medios/${m.id}/usos`));
  if (lista) vaciar(usos, lista.length ? h("ul", {}, lista.map((u) => h("li", {}, u))) : h("p", { class: "vacio" }, "No se usa en ninguna parte."));
}

// ─── Controles de formulario enlazados a un objeto ────────────────────────────

function marcarCambio(): void { hayCambiosSinGuardar = true; }

/** Claves de T cuyo valor es de tipo V (para enlazar controles solo a propiedades compatibles). */
type ClavesDe<T, V> = { [K in keyof T]-?: T[K] extends V ? K : never }[keyof T] & string;

interface OpcionesCampo {
  tipo?: "text" | "number" | "url" | "email" | "password";
  multilinea?: boolean;
  ayuda?: string;
  requerido?: boolean;
  alCambiar?: (valor: string) => void;
}

function campo<T extends object>(etiqueta: string, obj: T, clave: ClavesDe<T, string | number | null | undefined>,
  { tipo = "text", multilinea = false, ayuda, requerido = false, alCambiar }: OpcionesCampo = {}): HTMLElement {
  const id = `c${Math.random().toString(36).slice(2)}`;
  const destino = obj as Record<string, unknown>;
  const props: Props = {
    id, value: (destino[clave] as string | number | null | undefined) ?? "", required: requerido,
    oninput: (e) => { destino[clave] = tipo === "number" ? Number(e.target.value) : e.target.value; marcarCambio(); alCambiar?.(e.target.value); },
  };
  const control = multilinea ? h("textarea", props) : h("input", { ...props, type: tipo });
  return h("div", { class: "campo" }, h("label", { for: id }, etiqueta, requerido ? " *" : ""), control, ayuda && h("p", { class: "ayuda" }, ayuda));
}

/** Entrada del control creado por campo() (para actualizarlo desde fuera, p. ej. el slug automático). */
const entradaDe = (contenedor: HTMLElement): HTMLInputElement => contenedor.querySelector("input, textarea") as HTMLInputElement;

/** Interruptor accesible (checkbox con apariencia de switch). */
function interruptor(texto: string, marcado: boolean, alCambiar: (valor: boolean, entrada: HTMLInputElement) => unknown): HTMLLabelElement {
  const rotulo = h("span", {}, texto);
  const entrada = h("input", { type: "checkbox", checked: marcado, onchange: (e) => alCambiar(e.target.checked, e.target) });
  const el = h("label", { class: "interruptor" }, entrada, h("span", { class: "pista", "aria-hidden": "true" }), rotulo);
  return Object.assign(el, { rotulo });
}

function selectorImagen<T extends object>(etiqueta: string, obj: T, clave: ClavesDe<T, string | null>, { video = false } = {}): HTMLElement {
  const destino = obj as Record<string, unknown>;
  async function elegir(): Promise<void> {
    const m = await elegirMedios();
    const primero = m?.[0];
    if (primero) { destino[clave] = primero.id; marcarCambio(); pintar(); }
  }
  const vista = h("div", {
    class: "vista", role: "button", tabindex: "0", title: "Elegir archivo", "aria-label": `Elegir ${etiqueta}`,
    onclick: () => void elegir(),
    onkeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); void elegir(); } },
  });
  const quitar = h("button", { type: "button", class: "mini peligro", onclick: () => { destino[clave] = null; marcarCambio(); pintar(); } }, "Quitar");
  function pintar(): void {
    const url = urlMedio(destino[clave] as string | null);
    vaciar(vista, url ? (video ? h("video", { src: url, muted: true, preload: "metadata" }) : h("img", { src: url, alt: "" })) : "+ Elegir");
    vista.classList.toggle("con-imagen", !!url);
    quitar.classList.toggle("oculto", !url);
  }
  pintar();
  return h("div", { class: "campo" }, h("label", {}, etiqueta),
    h("div", { class: "selector-imagen" }, vista, h("div", { class: "acciones" },
      h("button", { type: "button", class: "mini", onclick: () => void elegir() }, "Cambiar…"), quitar)));
}

interface OpcionesLista<T> {
  lista: T[];
  nuevo: () => T;
  titulo: (item: T, i: number) => string;
  renderItem: (item: T, i: number) => Hijo;
  textoAgregar?: string;
}

/** Editor de una lista ordenable de elementos. */
function editorLista<T>({ lista, nuevo, titulo, renderItem, textoAgregar = "Agregar" }: OpcionesLista<T>): HTMLElement {
  const cont = h("div");
  function pintar(): void {
    vaciar(cont,
      lista.length ? null : h("p", { class: "vacio" }, "Vacío."),
      lista.map((item, i) => h("div", { class: "lista-item" },
        h("div", { class: "lista-item-cab" },
          h("strong", {}, titulo(item, i)),
          h("div", { class: "acciones" },
            h("button", { type: "button", class: "mini", disabled: i === 0, title: "Subir", "aria-label": "Subir", onclick: () => mover(i, -1) }, "↑"),
            h("button", { type: "button", class: "mini", disabled: i === lista.length - 1, title: "Bajar", "aria-label": "Bajar", onclick: () => mover(i, 1) }, "↓"),
            h("button", { type: "button", class: "mini peligro", onclick: () => { lista.splice(i, 1); marcarCambio(); pintar(); } }, "Eliminar"))),
        renderItem(item, i))),
      h("button", { type: "button", onclick: () => { lista.push(nuevo()); marcarCambio(); pintar(); } }, `+ ${textoAgregar}`));
  }
  function mover(i: number, d: number): void {
    const a = lista[i], b = lista[i + d];
    if (a === undefined || b === undefined) return;
    lista[i] = b; lista[i + d] = a; marcarCambio(); pintar();
  }
  pintar();
  return cont;
}

function editorEnlaces(lista: Enlace[], plataformas: string[] = PLATAFORMAS): HTMLElement {
  const cont = h("div");
  function pintar(): void {
    vaciar(cont,
      lista.map((e, i) => h("div", { class: "fila-enlace" },
        h("select", { "aria-label": "Plataforma", onchange: (ev) => { e.plataforma = ev.target.value; marcarCambio(); } },
          plataformas.map((p) => h("option", { value: p, selected: p === e.plataforma }, p))),
        h("input", { type: "url", placeholder: "https://…", value: e.url, "aria-label": "URL", oninput: (ev) => { e.url = ev.target.value; marcarCambio(); } }),
        h("button", { type: "button", class: "mini peligro", "aria-label": "Quitar enlace", onclick: () => { lista.splice(i, 1); marcarCambio(); pintar(); } }, "✕"))),
      lista.length ? null : h("p", { class: "vacio" }, "Sin enlaces."),
      h("button", { type: "button", class: "mini", onclick: () => { lista.push({ plataforma: plataformas[0] ?? "web", url: "" }); marcarCambio(); pintar(); } }, "+ Agregar enlace"));
  }
  pintar();
  return cont;
}

function editorGaleria(lista: Imagen[]): HTMLElement {
  const cont = h("div");
  function pintar(): void {
    vaciar(cont,
      h("div", { class: "galeria-editor" }, lista.map((img, i) => h("div", { class: "pieza" },
        h("img", { src: urlMedio(img.medioId), alt: img.alt || "", loading: "lazy" }),
        h("div", { class: "pie" },
          h("input", { type: "text", placeholder: "Texto alternativo", value: img.alt || "", oninput: (e) => { img.alt = e.target.value; marcarCambio(); } }),
          h("div", { class: "acciones" },
            h("button", { type: "button", class: "mini", disabled: i === 0, "aria-label": "Mover antes", onclick: () => mover(i, -1) }, "←"),
            h("button", { type: "button", class: "mini", disabled: i === lista.length - 1, "aria-label": "Mover después", onclick: () => mover(i, 1) }, "→"),
            h("button", { type: "button", class: "mini peligro", "aria-label": "Quitar imagen", onclick: () => { lista.splice(i, 1); marcarCambio(); pintar(); } }, "✕")))))),
      lista.length ? null : h("p", { class: "vacio" }, "Sin imágenes."),
      h("p", {}, h("button", {
        type: "button",
        onclick: async () => {
          const ms = await elegirMedios({ multiple: true });
          if (ms?.length) { lista.push(...ms.map((m) => ({ medioId: m.id, alt: m.alt || "" }))); marcarCambio(); pintar(); }
        },
      }, "+ Agregar imágenes")));
  }
  function mover(i: number, d: number): void {
    const a = lista[i], b = lista[i + d];
    if (!a || !b) return;
    lista[i] = b; lista[i + d] = a; marcarCambio(); pintar();
  }
  pintar();
  return cont;
}

/** Convierte enlaces de YouTube (watch, youtu.be, shorts, embed) al formato de inserción. */
function urlYoutubeEmbed(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    let idVideo: string | null = null;
    if (host === "youtu.be") idVideo = u.pathname.slice(1);
    else if (host === "youtube.com" || host === "youtube-nocookie.com") {
      if (u.pathname === "/watch") idVideo = u.searchParams.get("v");
      else idVideo = u.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/)?.[1] ?? null;
    }
    return idVideo && /^[\w-]{6,20}$/.test(idVideo) ? `https://www.youtube.com/embed/${idVideo}` : null;
  } catch { return null; }
}

/** Texto "Sin cambios / Cambios sin guardar" que se actualiza solo mientras está en pantalla. */
function indicadorGuardado(): HTMLElement {
  const el = h("span", { class: "estado-guardado", "aria-live": "polite" }, "Sin cambios");
  const t = window.setInterval(() => {
    if (!el.isConnected) { clearInterval(t); return; }
    el.textContent = hayCambiosSinGuardar ? "● Cambios sin guardar · Ctrl+S" : "Sin cambios";
    el.classList.toggle("sucio", hayCambiosSinGuardar);
  }, 400);
  return el;
}

type Seccion = [nombre: string, contenido: Hijo, contar?: () => number];

/** Pestañas; las secciones con contador muestran cuántos elementos tienen. */
function pestanas(secciones: Seccion[]): HTMLElement {
  const barra = h("div", { class: "pestanas", role: "tablist" });
  const paneles = secciones.map(([, contenido]) => h("div", { role: "tabpanel" }, contenido));
  const contadores = secciones.map(([, , contar]) => (contar ? h("span", { class: "num" }) : null));
  const botones = secciones.map(([nombre], i) => h("button", { type: "button", role: "tab", onclick: () => activar(i) }, nombre, contadores[i]));
  const refrescar = (): void => secciones.forEach(([, , contar], i) => { const c = contadores[i]; if (contar && c) c.textContent = String(contar()); });
  function activar(i: number): void {
    refrescar();
    botones.forEach((b, j) => { b.classList.toggle("activa", i === j); b.setAttribute("aria-selected", String(i === j)); });
    paneles.forEach((p, j) => p.classList.toggle("oculto", i !== j));
  }
  agregar(barra, botones);
  activar(0);
  const raiz = h("div", {}, barra, paneles);
  // Los contadores se recalculan cuando se agrega o quita algo dentro de las pestañas.
  raiz.addEventListener("click", () => queueMicrotask(refrescar));
  return raiz;
}

/** Cuando el usuario no ha tocado el slug, se genera a partir del nombre. */
function slugAutomatico(obj: { slug: string }, campoSlug: HTMLElement, editando: boolean): (nombre: string) => void {
  let tocado = editando;
  entradaDe(campoSlug).addEventListener("input", () => { tocado = true; });
  return (nombre) => { if (!tocado) { obj.slug = slugDe(nombre); entradaDe(campoSlug).value = obj.slug; } };
}

// ─── Wikis ────────────────────────────────────────────────────────────────────

function buscador(placeholder: string, alCambiar: (texto: string) => void): HTMLInputElement {
  return h("input", { type: "search", placeholder, "aria-label": placeholder, oninput: (e) => alCambiar(normalizar(e.target.value)) });
}

async function vistaWikis(): Promise<HTMLElement> {
  const [series, estados] = await Promise.all([api<SerieLista[]>("GET", "/api/admin/series"), api<Estado[]>("GET", "/api/admin/estados")]);
  const filtro = { texto: "", estado: "" };
  const cuerpo = h("tbody");
  const contador = h("p", { class: "ayuda" });

  function fila(s: SerieLista): HTMLElement {
    const selEstado = h("select", {
      "aria-label": `Estado de ${s.nombre}`,
      onchange: async (e) => {
        const nuevo = Number(e.target.value);
        const ok = await intentar(() => api("PATCH", `/api/admin/series/${s.id}/estado`, { estadoId: nuevo }), "Estado actualizado");
        if (ok === undefined) e.target.value = String(s.estado.id);
        else s.estado = estados.find((x) => x.id === nuevo) ?? s.estado;
      },
    }, estados.map((x) => h("option", { value: x.id, selected: x.id === s.estado.id }, x.nombre)));
    const publica = urlWikiPublica(s.slug);
    const visibilidad = interruptor(s.publicada ? "Publicada" : "Oculta", s.publicada, async (v, entrada) => {
      const ok = await intentar(() => api("PATCH", `/api/admin/series/${s.id}/publicada`, { publicada: v }), v ? "Wiki publicada" : "Wiki oculta");
      if (ok === undefined) { entrada.checked = !v; return; }
      s.publicada = v;
      (visibilidad as HTMLLabelElement & { rotulo: HTMLElement }).rotulo.textContent = v ? "Publicada" : "Oculta";
    });
    return h("tr", {},
      h("td", { class: "miniatura" }, s.portada ? h("img", { src: s.portada, alt: "", loading: "lazy" }) : null),
      h("td", {}, h("a", { class: "titulo-fila", href: `#/wikis/${s.id}` }, s.nombre), h("div", { class: "ayuda" }, `/wiki/${s.slug}`)),
      h("td", {}, selEstado),
      h("td", {}, visibilidad),
      h("td", { class: "ayuda" }, fecha(s.actualizadoEn)),
      h("td", {}, h("div", { class: "acciones" },
        h("a", { class: "boton mini primario", href: `#/wikis/${s.id}` }, "Editar"),
        publica && h("a", { class: "boton mini", href: publica, target: "_blank", rel: "noopener" }, "Ver ↗"),
        esSA() && h("button", {
          class: "mini peligro",
          onclick: async () => {
            if (!(await confirmar(`¿Eliminar la wiki «${s.nombre}» con todos sus personajes, equipo y galerías? No se puede deshacer.`, { boton: "Eliminar wiki" }))) return;
            if ((await intentar(() => api("DELETE", `/api/admin/series/${s.id}`), "Wiki eliminada")) !== undefined) render();
          },
        }, "Eliminar"))));
  }

  function pintar(): void {
    const visibles = series.filter((s) =>
      (!filtro.texto || normalizar(`${s.nombre} ${s.slug}`).includes(filtro.texto)) &&
      (!filtro.estado || String(s.estado.id) === filtro.estado));
    vaciar(cuerpo, visibles.length ? visibles.map(fila) : h("tr", {}, h("td", { colspan: 6, class: "vacio" }, "Ninguna wiki coincide con el filtro.")));
    contador.textContent = `Mostrando ${visibles.length} de ${series.length}`;
  }
  pintar();

  return h("div", {},
    cabecera("Wikis", [puedeCrearWikis() && h("a", { class: "boton primario", href: "#/wikis/nueva" }, "+ Nueva wiki")]),
    h("div", { class: "tarjeta" },
      series.length ? [
        h("div", { class: "filtros" },
          buscador("Buscar wiki…", (t) => { filtro.texto = t; pintar(); }),
          h("select", { "aria-label": "Filtrar por estado", onchange: (e) => { filtro.estado = e.target.value; pintar(); } },
            h("option", { value: "" }, "Todos los estados"), estados.map((e) => h("option", { value: e.id }, e.nombre)))),
        contador,
        h("div", { class: "tabla-envoltura" }, h("table", {},
          h("thead", {}, h("tr", {}, h("th", {}, ""), h("th", {}, "Serie"), h("th", {}, "Estado"), h("th", {}, "Visibilidad"), h("th", {}, "Actualizada"), h("th", {}, ""))),
          cuerpo)),
      ] : h("p", { class: "vacio" }, puedeCrearWikis() ? "No hay wikis todavía. Crea la primera." : "No tienes wikis asignadas. Pídele permisos a YishAdmin.")));
}

const wikiVacia = (estadoId: number): SerieEdicion => ({
  id: null, slug: "", nombre: "", sinopsis: "", estadoId, portadaId: null, bannerId: null, logoId: null,
  videoUrl: "", videoLocalId: null,
  creador: { nombre: "", descripcion: "", imagenId: null, redes: [], obras: [] },
  redes: [], apoyo: [], carrusel: [], galeria: [], personajes: [], equipo: [], orden: 100, publicada: false,
});

async function vistaEditorWiki(id: number | null): Promise<HTMLElement> {
  const estados = await api<Estado[]>("GET", "/api/admin/estados");
  if (id == null && !puedeCrearWikis()) throw new Error("No tienes permiso para crear wikis. Pídeselo a YishAdmin.");
  const d = id == null ? wikiVacia(estados[0]?.id ?? 0) : await api<SerieEdicion>("GET", `/api/admin/series/${id}`);
  d.redes ??= []; d.apoyo ??= []; d.carrusel ??= []; d.galeria ??= []; d.personajes ??= []; d.equipo ??= [];
  d.creador ??= { nombre: "", descripcion: "", imagenId: null, redes: [], obras: [] };
  d.creador.redes ??= []; d.creador.obras ??= [];

  // General
  const campoSlug = campo("Identificador (URL)", d, "slug", { requerido: true, ayuda: "Aparece en /wiki/<identificador>. Solo minúsculas, números y guiones." });
  const alCambiarNombre = slugAutomatico(d, campoSlug, id != null);
  const etiquetaVivo = h("span");
  const pintarEstado = (): void => { const e = estados.find((x) => x.id === d.estadoId); vaciar(etiquetaVivo, e ? etiquetaEstado(e) : ""); };
  pintarEstado();
  const previaVideo = h("div");
  const pintarVideo = (): void => {
    const url = (d.videoUrl ?? "").trim();
    const embed = urlYoutubeEmbed(url);
    vaciar(previaVideo, embed
      ? h("div", { class: "video-previa" }, h("iframe", { src: embed, title: "Vista previa del video", allowfullscreen: true, loading: "lazy" }))
      : url ? h("p", { class: "ayuda" }, "No se reconoce como video de YouTube; se guardará tal cual.") : null);
  };
  pintarVideo();

  const general = h("div", { class: "tarjeta" },
    h("div", { class: "rejilla" }, campo("Nombre", d, "nombre", { requerido: true, alCambiar: alCambiarNombre }), campoSlug),
    h("div", { class: "rejilla" },
      h("div", { class: "campo" }, h("label", {}, "Estado"),
        h("select", { onchange: (e) => { d.estadoId = Number(e.target.value); marcarCambio(); pintarEstado(); } },
          estados.map((x) => h("option", { value: x.id, selected: x.id === d.estadoId }, x.nombre))),
        h("p", { class: "ayuda" }, "Así se verá: ", etiquetaVivo)),
      campo("Orden en la portada", d, "orden", { tipo: "number", ayuda: "Menor = aparece antes." })),
    campo("Sinopsis", d, "sinopsis", { multilinea: true }),
    campo("Video de YouTube", d, "videoUrl", {
      tipo: "url", ayuda: "Pega el enlace del video (watch, youtu.be o embed); se convierte al formato de inserción.",
      alCambiar: (v) => { const e = urlYoutubeEmbed(v); if (e) d.videoUrl = e; pintarVideo(); },
    }),
    previaVideo,
    h("div", { class: "campo" }, interruptor("Publicada (visible en el sitio)", d.publicada, (v) => { d.publicada = v; marcarCambio(); })));

  const imagenes = h("div", { class: "tarjeta" },
    h("p", { class: "ayuda" }, "Haz clic en un recuadro para elegir o subir la imagen."),
    h("div", { class: "rejilla" },
      selectorImagen("Tarjeta de portada", d, "portadaId"),
      selectorImagen("Banner", d, "bannerId"),
      selectorImagen("Logo", d, "logoId"),
      selectorImagen("Video propio (opcional)", d, "videoLocalId", { video: true })));

  const creador = h("div", { class: "tarjeta" },
    h("div", { class: "rejilla" }, campo("Nombre", d.creador, "nombre"), selectorImagen("Foto", d.creador, "imagenId")),
    campo("Descripción", d.creador, "descripcion", { multilinea: true }),
    h("h2", {}, "Redes del creador"), editorEnlaces(d.creador.redes),
    h("h2", {}, "Otras obras"),
    editorLista<Obra>({
      lista: d.creador.obras, textoAgregar: "Agregar obra", nuevo: () => ({ titulo: "", url: "" }),
      titulo: (o) => o.titulo || "Obra sin título",
      renderItem: (o) => h("div", { class: "rejilla" }, campo("Título", o, "titulo", { requerido: true }), campo("URL", o, "url", { tipo: "url" })),
    }));

  const redes = h("div", {},
    h("div", { class: "tarjeta" }, h("h2", {}, "Redes oficiales de la serie"), editorEnlaces(d.redes)),
    h("div", { class: "tarjeta" }, h("h2", {}, "Apóyanos"), h("p", { class: "ayuda" }, "Enlaces de apoyo económico al proyecto."), editorEnlaces(d.apoyo, PLATAFORMAS_APOYO)));

  const personajes = h("div", { class: "tarjeta" }, editorLista<Personaje>({
    lista: d.personajes, textoAgregar: "Agregar personaje",
    nuevo: () => ({ nombre: "", rol: "", descripcion: "", imagenId: null, actorVoz: "", imagenActorVozId: null }),
    titulo: (p) => p.nombre || "Nuevo personaje",
    renderItem: (p) => h("div", {},
      h("div", { class: "rejilla" }, campo("Nombre", p, "nombre", { requerido: true }), campo("Rol", p, "rol"), campo("Actor/actriz de voz", p, "actorVoz")),
      campo("Descripción", p, "descripcion", { multilinea: true }),
      h("div", { class: "rejilla" }, selectorImagen("Imagen", p, "imagenId"), selectorImagen("Foto del actor de voz", p, "imagenActorVozId"))),
  }));

  const equipo = h("div", { class: "tarjeta" }, editorLista<GrupoEquipo>({
    lista: d.equipo, textoAgregar: "Agregar categoría",
    nuevo: () => ({ categoria: "", miembros: [] }),
    titulo: (g) => g.categoria || "Nueva categoría",
    renderItem: (g) => {
      g.miembros ??= [];
      return h("div", {},
        campo("Categoría", g, "categoria", { requerido: true, ayuda: "Ej: Animatics, Actores de Voz, Guion." }),
        editorLista<Miembro>({
          lista: g.miembros, textoAgregar: "Agregar miembro",
          nuevo: () => ({ nombre: "", rol: "", imagenId: null }),
          titulo: (m) => m.nombre || "Nuevo miembro",
          renderItem: (m) => h("div", { class: "rejilla" }, campo("Nombre", m, "nombre", { requerido: true }), campo("Rol", m, "rol"), selectorImagen("Foto", m, "imagenId")),
        }));
    },
  }));

  const carrusel = h("div", { class: "tarjeta" }, h("p", { class: "ayuda" }, "Imágenes que rotan en la cabecera de la wiki."), editorGaleria(d.carrusel));
  const galeria = h("div", { class: "tarjeta" }, editorGaleria(d.galeria));

  const guardar = h("button", { class: "primario", type: "submit" }, id == null ? "Crear wiki" : "Guardar cambios");
  const form = h("form", {
    onsubmit: async (e) => {
      e.preventDefault();
      guardar.disabled = true;
      const cuerpo = clonar(d);
      const r = await intentar(() => id == null ? api<SerieEdicion>("POST", "/api/admin/series", cuerpo) : api<SerieEdicion>("PUT", `/api/admin/series/${id}`, cuerpo),
        id == null ? "Wiki creada" : "Cambios guardados");
      guardar.disabled = false;
      if (!r) return;
      hayCambiosSinGuardar = false;
      if (id == null) {
        // Al crear, el usuario recibe permiso sobre la wiki: se refresca el perfil.
        if (sesion) { sesion.usuario = await api<Perfil>("GET", "/api/auth/yo"); almacen.guardar(sesion); }
        location.hash = `#/wikis/${r.id}`;
      } else {
        d.actualizadoEn = r.actualizadoEn ?? null;
      }
    },
  },
    pestanas([["General", general], ["Imágenes", imagenes], ["Creador", creador], ["Redes", redes],
      ["Personajes", personajes, () => d.personajes.length],
      ["Equipo", equipo, () => d.equipo.reduce((n, g) => n + g.miembros.length, 0)],
      ["Carrusel", carrusel, () => d.carrusel.length], ["Galería", galeria, () => d.galeria.length]]),
    h("div", { class: "barra-guardar" }, indicadorGuardado(), h("a", { class: "boton", href: "#/wikis" }, "Volver"), guardar));

  const publica = id != null ? urlWikiPublica(d.slug) : null;
  return h("div", {},
    cabecera(id == null ? "Nueva wiki" : d.nombre,
      [publica && h("a", { class: "boton", href: publica, target: "_blank", rel: "noopener" }, "Ver en el sitio ↗")],
      [["Wikis", "#/wikis"], [id == null ? "Nueva" : "Editar"]]),
    form);
}

// ─── Socios ───────────────────────────────────────────────────────────────────

async function vistaSocios(): Promise<HTMLElement> {
  const socios = await api<SocioLista[]>("GET", "/api/admin/socios");
  const cuerpo = h("tbody");
  let texto = "";

  const fila = (s: SocioLista): HTMLElement => h("tr", {},
    h("td", { class: "miniatura" }, s.imagen ? h("img", { src: s.imagen, alt: "", loading: "lazy" }) : null),
    h("td", {}, h("a", { class: "titulo-fila", href: `#/socios/${s.id}` }, s.nombre), h("div", { class: "ayuda" }, s.slug)),
    h("td", {}, h("span", { class: `chip ${s.publicado ? "ok" : "off"}` }, s.publicado ? "Publicado" : "Oculto")),
    h("td", {}, s.orden),
    h("td", {}, h("div", { class: "acciones" },
      h("a", { class: "boton mini primario", href: `#/socios/${s.id}` }, "Editar"),
      h("button", {
        class: "mini peligro",
        onclick: async () => {
          if (!(await confirmar(`¿Eliminar a «${s.nombre}»?`, { boton: "Eliminar" }))) return;
          if ((await intentar(() => api("DELETE", `/api/admin/socios/${s.id}`), "Socio eliminado")) !== undefined) render();
        },
      }, "Eliminar"))));

  function pintar(): void {
    const visibles = socios.filter((s) => !texto || normalizar(`${s.nombre} ${s.slug}`).includes(texto));
    vaciar(cuerpo, visibles.length ? visibles.map(fila) : h("tr", {}, h("td", { colspan: 5, class: "vacio" }, "Ningún socio coincide.")));
  }
  pintar();

  return h("div", {},
    cabecera("Socios / asociados", [h("a", { class: "boton primario", href: "#/socios/nuevo" }, "+ Nuevo asociado")]),
    h("div", { class: "tarjeta" }, socios.length ? [
      h("div", { class: "campo" }, buscador("Buscar asociado…", (t) => { texto = t; pintar(); })),
      h("div", { class: "tabla-envoltura" }, h("table", {},
        h("thead", {}, h("tr", {}, h("th", {}, ""), h("th", {}, "Nombre"), h("th", {}, "Visibilidad"), h("th", {}, "Orden"), h("th", {}, ""))),
        cuerpo)),
    ] : h("p", { class: "vacio" }, "No hay socios todavía. Crea el primero.")));
}

async function vistaEditorSocio(id: number | null): Promise<HTMLElement> {
  const [series, d] = await Promise.all([
    api<SerieLista[]>("GET", "/api/admin/series"),
    id == null
      ? Promise.resolve<SocioEdicion>({ id: null, slug: "", nombre: "", descripcion: "", imagenId: null, orden: 100, publicado: true, redes: [], serieIds: [] })
      : api<SocioEdicion>("GET", `/api/admin/socios/${id}`),
  ]);
  d.redes ??= []; d.serieIds ??= [];
  const campoSlug = campo("Identificador", d, "slug", { requerido: true });
  const alCambiarNombre = slugAutomatico(d, campoSlug, id != null);

  const guardar = h("button", { class: "primario", type: "submit" }, id == null ? "Crear asociado" : "Guardar cambios");
  return h("div", {},
    cabecera(id == null ? "Nuevo asociado" : d.nombre, [], [["Socios", "#/socios"], [id == null ? "Nuevo" : "Editar"]]),
    h("form", {
      onsubmit: async (e) => {
        e.preventDefault();
        guardar.disabled = true;
        const r = await intentar(() => id == null ? api<SocioEdicion>("POST", "/api/admin/socios", d) : api<SocioEdicion>("PUT", `/api/admin/socios/${id}`, d),
          id == null ? "Asociado creado" : "Cambios guardados");
        guardar.disabled = false;
        if (r) { hayCambiosSinGuardar = false; if (id == null) location.hash = `#/socios/${r.id}`; }
      },
    },
      h("div", { class: "tarjeta" },
        h("div", { class: "rejilla" },
          campo("Nombre", d, "nombre", { requerido: true, alCambiar: alCambiarNombre }),
          campoSlug,
          campo("Orden", d, "orden", { tipo: "number", ayuda: "Menor = aparece antes." })),
        campo("Descripción", d, "descripcion", { multilinea: true }),
        selectorImagen("Imagen", d, "imagenId"),
        h("div", { class: "campo" }, interruptor("Publicado (visible en el sitio)", d.publicado, (v) => { d.publicado = v; marcarCambio(); }))),
      h("div", { class: "tarjeta" }, h("h2", {}, "Redes"), editorEnlaces(d.redes)),
      h("div", { class: "tarjeta" }, h("h2", {}, "Proyectos en los que participa"),
        series.length ? series.map((s) => h("label", { class: "check" },
          h("input", {
            type: "checkbox", checked: d.serieIds.includes(s.id),
            onchange: (e) => { d.serieIds = e.target.checked ? [...d.serieIds, s.id] : d.serieIds.filter((x) => x !== s.id); marcarCambio(); },
          }), s.nombre)) : h("p", { class: "vacio" }, "No hay wikis para vincular.")),
      h("div", { class: "barra-guardar" }, indicadorGuardado(), h("a", { class: "boton", href: "#/socios" }, "Volver"), guardar)));
}

// ─── Estados ──────────────────────────────────────────────────────────────────

async function vistaEstados(): Promise<HTMLElement> {
  const estados = await api<Estado[]>("GET", "/api/admin/estados");
  const editable = puede("Estados");

  function formulario(e: Estado | null): void {
    const d = e ? { codigo: e.codigo, nombre: e.nombre, color: e.color, orden: e.orden } : { codigo: "", nombre: "", color: "#888888", orden: estados.length + 1 };
    const muestra = etiquetaEstado(d);
    const color = h("input", { type: "color", value: d.color, "aria-label": "Color", oninput: (ev) => { d.color = ev.target.value; muestra.style.background = d.color; } });
    const cod = campo("Código", d, "codigo", { requerido: true, ayuda: "Identificador estable para el frontend (ej: en-emision)." });
    const alCambiarNombre = slugAutomatico({ get slug() { return d.codigo; }, set slug(v: string) { d.codigo = v; } }, cod, e != null);
    const dlg = modal(e ? `Editar estado «${e.nombre}»` : "Nuevo estado", h("div", {},
      campo("Nombre visible", d, "nombre", { requerido: true, alCambiar: (v) => { alCambiarNombre(v); muestra.textContent = v || "Vista previa"; } }),
      cod,
      h("div", { class: "rejilla" },
        h("div", { class: "campo" }, h("label", {}, "Color"), h("div", { class: "acciones" }, color, muestra)),
        campo("Orden", d, "orden", { tipo: "number" }))),
      [h("button", { onclick: () => dlg.close() }, "Cancelar"),
        h("button", {
          class: "primario",
          onclick: async () => {
            const r = await intentar(() => e ? api<Estado>("PUT", `/api/admin/estados/${e.id}`, d) : api<Estado>("POST", "/api/admin/estados", d), "Estado guardado");
            if (r) { hayCambiosSinGuardar = false; dlg.close(); render(); }
          },
        }, "Guardar")], { estrecho: true });
    dlg.addEventListener("close", () => { hayCambiosSinGuardar = false; });
  }

  return h("div", {},
    cabecera("Estados de serie", [editable && h("button", { class: "primario", onclick: () => formulario(null) }, "+ Nuevo estado")]),
    h("div", { class: "tarjeta" },
      h("p", { class: "ayuda" }, "Catálogo que usa cada wiki («En Emisión», «Cancelado»…). El sitio público lo obtiene de /api/estados."),
      h("div", { class: "tabla-envoltura" }, h("table", {},
        h("thead", {}, h("tr", {}, h("th", {}, "Estado"), h("th", {}, "Código"), h("th", {}, "Orden"), h("th", {}, ""))),
        h("tbody", {}, estados.map((e) => h("tr", {},
          h("td", {}, etiquetaEstado(e)), h("td", {}, h("code", {}, e.codigo)), h("td", {}, e.orden),
          h("td", {}, editable && h("div", { class: "acciones" },
            h("button", { class: "mini", onclick: () => formulario(e) }, "Editar"),
            h("button", {
              class: "mini peligro",
              onclick: async () => {
                if (!(await confirmar(`¿Eliminar el estado «${e.nombre}»?`, { boton: "Eliminar" }))) return;
                if ((await intentar(() => api("DELETE", `/api/admin/estados/${e.id}`), "Estado eliminado")) !== undefined) render();
              },
            }, "Eliminar"))))))))));
}

// ─── Medios ───────────────────────────────────────────────────────────────────

function vistaMedios(): HTMLElement {
  return h("div", {},
    cabecera("Biblioteca de medios"),
    h("div", { class: "tarjeta" },
      h("p", { class: "ayuda" }, "Haz clic en un archivo para ver sus datos, editar su texto alternativo, ver dónde se usa",
        puede("Medios") ? " o eliminarlo." : "."),
      panelBiblioteca({ conDetalle: true })));
}

// ─── Usuarios y permisos (solo superadmin) ────────────────────────────────────

function chipsPermisos(u: UsuarioLista): Hijo {
  if (u.esSuperAdmin) return h("span", { class: "chip sa" }, "Todo (superadmin)");
  const chips: HTMLElement[] = [];
  if (u.puedeCrearWikis) chips.push(h("span", { class: "chip" }, "Crear wikis"));
  for (const p of u.permisos) {
    chips.push(h("span", { class: "chip" }, p.ambito === "Wikis" ? (p.serieId ? `Wiki: ${p.serieNombre}` : "Todas las wikis") : NOMBRES_AMBITO[p.ambito]));
  }
  return chips.length ? chips : h("span", { class: "vacio" }, "Sin permisos");
}

interface EstadoPermisos { puedeCrearWikis: boolean; permisos: Permiso[] }

/** Controles de permisos; modifica estado.permisos en sitio. */
function editorPermisos(estado: EstadoPermisos, series: SerieLista[]): HTMLElement {
  const tiene = (ambito: Ambito, serieId: number | null = null): boolean =>
    estado.permisos.some((p) => p.ambito === ambito && (p.serieId ?? null) === serieId);
  const poner = (ambito: Ambito, serieId: number | null, si: boolean): void => {
    estado.permisos = estado.permisos.filter((p) => !(p.ambito === ambito && (p.serieId ?? null) === serieId));
    if (si) estado.permisos.push({ ambito, serieId });
  };
  const listaWikis = h("div", { class: "permisos-wikis" }, series.length
    ? series.map((s) => h("label", { class: "check" },
      h("input", { type: "checkbox", checked: tiene("Wikis", s.id), onchange: (e) => poner("Wikis", s.id, e.target.checked) }), s.nombre))
    : h("p", { class: "vacio" }, "No hay wikis todavía."));
  const todas = h("input", {
    type: "checkbox", checked: tiene("Wikis"),
    onchange: (e) => { poner("Wikis", null, e.target.checked); listaWikis.classList.toggle("oculto", e.target.checked); },
  });
  listaWikis.classList.toggle("oculto", tiene("Wikis"));
  const otras: Ambito[] = ["Socios", "Estados", "Medios"];

  return h("div", {},
    h("h3", {}, "Crear wikis"),
    h("div", { class: "campo" }, interruptor("Puede crear wikis nuevas", estado.puedeCrearWikis, (v) => { estado.puedeCrearWikis = v; })),
    h("p", { class: "ayuda" }, "Al crear una wiki, el usuario recibe automáticamente permiso para editarla."),
    h("h3", {}, "Edición de wikis"),
    h("label", { class: "check" }, todas, "Todas las wikis"),
    listaWikis,
    h("h3", {}, "Otras áreas"),
    otras.map((a) => h("label", { class: "check" },
      h("input", { type: "checkbox", checked: tiene(a), onchange: (e) => poner(a, null, e.target.checked) }), NOMBRES_AMBITO[a])));
}

async function vistaUsuarios(): Promise<HTMLElement> {
  const [usuarios, series] = await Promise.all([api<UsuarioLista[]>("GET", "/api/admin/usuarios"), api<SerieLista[]>("GET", "/api/admin/series")]);

  function nuevo(): void {
    const d = { username: "", nombreVisible: "", email: "", password: "", origen: "Local" as Origen, puedeCrearWikis: false, permisos: [] as Permiso[] };
    const dlg = modal("Nuevo usuario administrativo", h("div", {},
      h("div", { class: "rejilla" },
        campo("Usuario", d, "username", { requerido: true, ayuda: "3-64 caracteres: letras, números, punto o guion." }),
        campo("Nombre visible", d, "nombreVisible", { requerido: true }),
        campo("Correo", d, "email", { tipo: "email" }),
        campo("Contraseña inicial", d, "password", { tipo: "password", requerido: true, ayuda: "Mínimo 10 caracteres, con letras y números." })),
      h("div", { class: "campo" }, h("label", {}, "Origen de la cuenta"),
        h("select", { onchange: (e) => { d.origen = e.target.value as Origen; } },
          h("option", { value: "Local" }, "Local (contraseña en la base de datos)"),
          h("option", { value: "Ldap" }, "LDAP (contraseña en el directorio)"))),
      h("div", { class: "tarjeta" }, h("h2", {}, "Permisos"), editorPermisos(d, series))),
      [h("button", { onclick: () => dlg.close() }, "Cancelar"),
        h("button", {
          class: "primario",
          onclick: async () => {
            const r = await intentar(() => api("POST", "/api/admin/usuarios", { ...d, email: d.email || null }), "Usuario creado");
            if (r) { hayCambiosSinGuardar = false; dlg.close(); render(); }
          },
        }, "Crear usuario")]);
    dlg.addEventListener("close", () => { hayCambiosSinGuardar = false; });
  }

  function editar(u: UsuarioLista): void {
    const d = { nombreVisible: u.nombreVisible, email: u.email ?? "", activo: u.activo, puedeCrearWikis: u.puedeCrearWikis, permisos: clonar(u.permisos) };
    const pass = { password: "" };
    const dlg = modal(`Usuario ${u.username}`, h("div", {},
      h("div", { class: "tarjeta" }, h("h2", {}, "Datos"),
        h("div", { class: "rejilla" }, campo("Nombre visible", d, "nombreVisible", { requerido: true }), campo("Correo", d, "email", { tipo: "email" })),
        !u.esSuperAdmin && h("div", { class: "campo" }, interruptor("Cuenta activa", d.activo, (v) => { d.activo = v; })),
        !u.esSuperAdmin && h("p", { class: "ayuda" }, "Desactivar la cuenta cierra sus sesiones abiertas" + (u.origen === "Ldap" ? " y la bloquea en el directorio." : ".")),
        h("p", { class: "ayuda" }, `Origen: ${u.origen} · Creado: ${fecha(u.creadoEn)} · Último acceso: ${fecha(u.ultimoAcceso)}`)),
      !u.esSuperAdmin && h("div", { class: "tarjeta" }, h("h2", {}, "Permisos"), editorPermisos(d, series)),
      h("div", { class: "tarjeta" }, h("h2", {}, "Restablecer contraseña"),
        campo("Nueva contraseña", pass, "password", { tipo: "password", ayuda: "Cierra las sesiones abiertas del usuario." }),
        h("div", { class: "acciones" },
          h("button", {
            onclick: async () => {
              if ((await intentar(() => api("POST", `/api/admin/usuarios/${u.id}/password`, pass), "Contraseña restablecida")) !== undefined) pass.password = "";
            },
          }, "Restablecer"),
          u.origen === "Ldap" && h("button", { onclick: () => void intentar(() => api("POST", `/api/admin/usuarios/${u.id}/sincronizar-ldap`), "Grupos LDAP sincronizados") }, "Resincronizar LDAP"))),
      !u.esSuperAdmin && h("button", {
        class: "peligro",
        onclick: async () => {
          if (!(await confirmar(`¿Eliminar la cuenta ${u.username}? Si solo quieres bloquearla, desactívala.`, { boton: "Eliminar cuenta" }))) return;
          if ((await intentar(() => api("DELETE", `/api/admin/usuarios/${u.id}`), "Usuario eliminado")) !== undefined) { dlg.close(); render(); }
        },
      }, "Eliminar cuenta")),
      [h("button", { onclick: () => dlg.close() }, "Cerrar"),
        h("button", {
          class: "primario",
          onclick: async () => {
            const ok = await intentar(async () => {
              await api("PUT", `/api/admin/usuarios/${u.id}`, { nombreVisible: d.nombreVisible, email: d.email || null, activo: d.activo, puedeCrearWikis: d.puedeCrearWikis });
              if (!u.esSuperAdmin) await api("PUT", `/api/admin/usuarios/${u.id}/permisos`, d.permisos);
              return true;
            }, "Usuario actualizado");
            if (ok) { hayCambiosSinGuardar = false; dlg.close(); render(); }
          },
        }, "Guardar")]);
    dlg.addEventListener("close", () => { hayCambiosSinGuardar = false; });
  }

  return h("div", {},
    cabecera("Usuarios y permisos", [h("button", { class: "primario", onclick: nuevo }, "+ Nuevo usuario")]),
    h("div", { class: "tarjeta" },
      h("p", { class: "ayuda" }, "Solo las cuentas administrativas inician sesión; los visitantes del sitio no necesitan cuenta. Solo tú (superadmin) puedes crear usuarios y asignar permisos."),
      h("div", { class: "tabla-envoltura" }, h("table", {},
        h("thead", {}, h("tr", {}, h("th", {}, "Usuario"), h("th", {}, "Origen"), h("th", {}, "Estado"), h("th", {}, "Permisos"), h("th", {}, ""))),
        h("tbody", {}, usuarios.map((u) => h("tr", {},
          h("td", {}, h("span", { class: "titulo-fila" }, u.username), h("div", { class: "ayuda" }, u.nombreVisible)),
          h("td", {}, u.origen),
          h("td", {}, h("span", { class: `chip ${u.activo ? "ok" : "off"}` }, u.activo ? "Activo" : "Desactivado")),
          h("td", {}, chipsPermisos(u)),
          h("td", {}, h("button", { class: "mini primario", onclick: () => editar(u) }, "Editar")))))))));
}

// ─── Auditoría ────────────────────────────────────────────────────────────────

async function vistaAuditoria(): Promise<HTMLElement> {
  const tabla = h("tbody");
  const paginador = h("div", { class: "paginador" });
  let pagina = 1;
  async function cargar(): Promise<void> {
    const r = await intentar(() => api<Pagina<RegistroAuditoria>>("GET", `/api/admin/auditoria?pagina=${pagina}&tamano=50`));
    if (!r) return;
    vaciar(tabla, r.items.length ? r.items.map((a) => h("tr", {},
      h("td", { class: "ayuda" }, fecha(a.fecha)), h("td", {}, a.username), h("td", {}, a.accion), h("td", {}, a.entidad), h("td", {}, a.detalle || a.entidadId || "")))
      : h("tr", {}, h("td", { colspan: 5, class: "vacio" }, "Sin registros.")));
    const paginas = Math.max(1, Math.ceil(r.total / r.tamanoPagina));
    vaciar(paginador,
      h("button", { class: "mini", disabled: pagina <= 1, onclick: () => { pagina--; void cargar(); } }, "‹ Anterior"),
      `Página ${pagina} de ${paginas}`,
      h("button", { class: "mini", disabled: pagina >= paginas, onclick: () => { pagina++; void cargar(); } }, "Siguiente ›"));
  }
  await cargar();
  return h("div", {}, cabecera("Auditoría"), h("div", { class: "tarjeta" },
    h("div", { class: "tabla-envoltura" }, h("table", {},
      h("thead", {}, h("tr", {}, h("th", {}, "Fecha"), h("th", {}, "Usuario"), h("th", {}, "Acción"), h("th", {}, "Entidad"), h("th", {}, "Detalle"))), tabla)),
    paginador));
}

// ─── Mi cuenta ────────────────────────────────────────────────────────────────

function vistaCuenta(): HTMLElement {
  const d = { passwordActual: "", passwordNueva: "", repetir: "" };
  const u = perfil();
  return h("div", {},
    cabecera("Mi cuenta"),
    h("div", { class: "tarjeta" }, h("h2", {}, "Datos"),
      h("p", {}, h("strong", {}, u.nombreVisible), ` · ${u.username} · origen ${u.origen}`),
      h("p", { class: "ayuda" }, u.esSuperAdmin ? "Eres el superadministrador." : "Tus permisos los gestiona YishAdmin.")),
    h("form", {
      class: "tarjeta",
      onsubmit: async (e) => {
        e.preventDefault();
        if (d.passwordNueva !== d.repetir) { aviso("Las contraseñas nuevas no coinciden.", "error"); return; }
        const s = await intentar(() => api<Sesion>("POST", "/api/auth/cambiar-password", { passwordActual: d.passwordActual, passwordNueva: d.passwordNueva }),
          "Contraseña cambiada. Se cerraron tus otras sesiones.");
        if (s) { sesion = s; almacen.guardar(s); hayCambiosSinGuardar = false; (e.target as HTMLFormElement).reset(); }
      },
    },
      h("h2", {}, "Cambiar contraseña"),
      campo("Contraseña actual", d, "passwordActual", { tipo: "password", requerido: true }),
      campo("Nueva contraseña", d, "passwordNueva", { tipo: "password", requerido: true, ayuda: "Mínimo 10 caracteres, con letras y números." }),
      campo("Repetir nueva contraseña", d, "repetir", { tipo: "password", requerido: true }),
      h("button", { class: "primario", type: "submit" }, "Cambiar contraseña")));
}

// ─── Arranque ─────────────────────────────────────────────────────────────────

void (async () => {
  if (sesion) {
    // Refresca permisos (pudieron cambiar desde el último inicio de sesión).
    try { sesion.usuario = await api<Perfil>("GET", "/api/auth/yo"); almacen.guardar(sesion); await cargarConfig(); } catch { /* api() ya cierra la sesión si expiró */ }
  }
  render();
})();
