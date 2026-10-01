// Panel de administración de La Alianza.
// Sin dependencias ni build: se sirve tal cual desde /admin. Todo el DOM se construye con h(),
// nunca con innerHTML, para que ningún texto que venga de la BD pueda inyectar HTML.
"use strict";

// ─── Utilidades de DOM ────────────────────────────────────────────────────────

function h(tag, props, ...hijos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "value") el.value = v;
    else if (k === "checked" || k === "disabled" || k === "selected" || k === "multiple") el[k] = !!v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  agregar(el, hijos);
  return el;
}
function agregar(el, hijos) {
  for (const c of hijos.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}
function vaciar(el, ...hijos) { el.replaceChildren(); agregar(el, hijos); return el; }
const $ = (sel) => document.querySelector(sel);

function aviso(texto, tipo = "") {
  const a = h("div", { class: `aviso ${tipo}`, role: "status" }, texto);
  $("#avisos").append(a);
  setTimeout(() => a.remove(), tipo === "error" ? 7000 : 3500);
}

function formatoBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}
const fecha = (iso) => (iso ? new Date(iso).toLocaleString("es-CL") : "—");
const urlMedio = (id) => (id ? `/api/medios/${id}` : null);
const clonar = (o) => JSON.parse(JSON.stringify(o));

function slugDe(texto) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function etiquetaEstado(estado) {
  const e = h("span", { class: "etiqueta" }, estado.nombre);
  e.style.background = estado.color;
  return e;
}

// ─── Sesión y API ─────────────────────────────────────────────────────────────

const almacen = {
  leer() { try { return JSON.parse(sessionStorage.getItem("alianza-sesion")); } catch { return null; } },
  guardar(s) { try { sessionStorage.setItem("alianza-sesion", JSON.stringify(s)); } catch { /* modo privado */ } },
  borrar() { try { sessionStorage.removeItem("alianza-sesion"); } catch { /* nada */ } },
};
let sesion = almacen.leer();

class ErrorApi extends Error {
  constructor(mensaje, estado) { super(mensaje); this.estado = estado; }
}

async function api(metodo, ruta, cuerpo, { formulario = false } = {}) {
  const opciones = { method: metodo, headers: {} };
  if (sesion?.token) opciones.headers.Authorization = `Bearer ${sesion.token}`;
  if (cuerpo !== undefined) {
    if (formulario) opciones.body = cuerpo;
    else { opciones.headers["Content-Type"] = "application/json"; opciones.body = JSON.stringify(cuerpo); }
  }
  const r = await fetch(ruta, opciones);
  if (r.status === 401 && ruta !== "/api/auth/login") {
    cerrarSesion();
    throw new ErrorApi("Tu sesión expiró. Vuelve a iniciar sesión.", 401);
  }
  if (r.headers.get("X-Advertencia")) aviso(r.headers.get("X-Advertencia"), "error");
  if (r.status === 204) return null;
  const texto = await r.text();
  const datos = texto ? JSON.parse(texto) : null;
  if (!r.ok) {
    let msg = datos?.title || `Error ${r.status}`;
    if (r.status === 403) msg = "No tienes permiso para esta acción.";
    if (r.status === 429) msg = "Demasiados intentos. Espera un minuto.";
    if (datos?.errors) msg = Object.values(datos.errors).flat().join(" ");
    throw new ErrorApi(msg, r.status);
  }
  return datos;
}

/** Ejecuta una acción mostrando el error (si lo hay) como aviso. */
async function intentar(fn, mensajeOk) {
  try {
    const r = await fn();
    if (mensajeOk) aviso(mensajeOk, "ok");
    return r;
  } catch (e) {
    aviso(e.message || "Error inesperado", "error");
    return undefined;
  }
}

function cerrarSesion() {
  sesion = null;
  almacen.borrar();
  location.hash = "#/";
  render();
}

const perfil = () => sesion?.usuario;
const esSA = () => !!perfil()?.esSuperAdmin;
const puede = (ambito) => esSA() || perfil()?.permisos.some((p) => p.ambito === ambito && p.serieId == null);
const puedeCrearWikis = () => esSA() || !!perfil()?.puedeCrearWikis;

const NOMBRES_AMBITO = {
  Wikis: "Editar wikis",
  Socios: "Socios / asociados",
  Estados: "Estados de serie",
  Medios: "Biblioteca de medios (eliminar)",
};
const PLATAFORMAS = ["instagram", "twitter", "youtube", "tiktok", "discord", "facebook", "twitch", "kick",
  "patreon", "kofi", "buymeacoffee", "vaquite", "doblaje", "web"];
const PLATAFORMAS_APOYO = ["patreon", "kofi", "buymeacoffee", "vaquite"];

// ─── Login ────────────────────────────────────────────────────────────────────

function vistaLogin() {
  const usuario = h("input", { type: "text", id: "u", autocomplete: "username", required: true, autofocus: true });
  const clave = h("input", { type: "password", id: "p", autocomplete: "current-password", required: true });
  const boton = h("button", { class: "primario", type: "submit" }, "Entrar");
  const form = h("form", {
    onsubmit: async (ev) => {
      ev.preventDefault();
      boton.disabled = true;
      const s = await intentar(() => api("POST", "/api/auth/login", { username: usuario.value.trim(), password: clave.value }));
      boton.disabled = false;
      if (s) { sesion = s; almacen.guardar(s); render(); }
    },
  },
    h("h1", {}, "La Alianza"),
    h("p", {}, "Panel de administración"),
    h("div", { class: "campo" }, h("label", { for: "u" }, "Usuario"), usuario),
    h("div", { class: "campo" }, h("label", { for: "p" }, "Contraseña"), clave),
    boton,
  );
  return h("div", { class: "login" }, form);
}

// ─── Estructura y enrutado ────────────────────────────────────────────────────

const RUTAS = [
  { patron: /^\/$/, vista: vistaResumen, menu: "resumen" },
  { patron: /^\/wikis$/, vista: vistaWikis, menu: "wikis" },
  { patron: /^\/wikis\/nueva$/, vista: () => vistaEditorWiki(null), menu: "wikis" },
  { patron: /^\/wikis\/(\d+)$/, vista: (m) => vistaEditorWiki(+m[1]), menu: "wikis" },
  { patron: /^\/socios$/, vista: vistaSocios, menu: "socios", permiso: () => puede("Socios") },
  { patron: /^\/socios\/nuevo$/, vista: () => vistaEditorSocio(null), menu: "socios", permiso: () => puede("Socios") },
  { patron: /^\/socios\/(\d+)$/, vista: (m) => vistaEditorSocio(+m[1]), menu: "socios", permiso: () => puede("Socios") },
  { patron: /^\/estados$/, vista: vistaEstados, menu: "estados" },
  { patron: /^\/medios$/, vista: vistaMedios, menu: "medios" },
  { patron: /^\/usuarios$/, vista: vistaUsuarios, menu: "usuarios", permiso: esSA },
  { patron: /^\/auditoria$/, vista: vistaAuditoria, menu: "auditoria", permiso: esSA },
  { patron: /^\/cuenta$/, vista: vistaCuenta, menu: "cuenta" },
];

let hayCambiosSinGuardar = false;
window.addEventListener("beforeunload", (e) => { if (hayCambiosSinGuardar) e.preventDefault(); });
window.addEventListener("hashchange", () => render());

function render() {
  const app = $("#app");
  app.className = "";
  if (!sesion) { vaciar(app, vistaLogin()); return; }

  const ruta = location.hash.replace(/^#/, "") || "/";
  let elegida = null, m = null;
  for (const r of RUTAS) { m = ruta.match(r.patron); if (m) { elegida = r; break; } }
  if (!elegida || (elegida.permiso && !elegida.permiso())) { location.hash = "#/"; return; }

  hayCambiosSinGuardar = false;
  const contenido = h("main", { class: "contenido" }, h("div", { class: "cargando" }, "Cargando…"));
  const lateral = menuLateral(elegida.menu);
  vaciar(app, h("div", { class: "shell" }, lateral, contenido));

  Promise.resolve(elegida.vista(m)).then((nodo) => {
    vaciar(contenido, h("button", { class: "menu-movil mini", onclick: () => lateral.classList.toggle("abierto") }, "☰ Menú"), nodo);
  }).catch((e) => vaciar(contenido, h("div", { class: "tarjeta" }, e.message || "Error al cargar.")));
}

function menuLateral(activo) {
  const enlace = (clave, href, texto) => h("a", { href, class: clave === activo ? "activo" : null }, texto);
  const u = perfil();
  return h("nav", { class: "lateral" },
    h("div", { class: "marca" }, "La Alianza · Panel"),
    enlace("resumen", "#/", "Resumen"),
    enlace("wikis", "#/wikis", "Wikis"),
    puede("Socios") && enlace("socios", "#/socios", "Socios"),
    enlace("estados", "#/estados", "Estados"),
    enlace("medios", "#/medios", "Medios"),
    esSA() && enlace("usuarios", "#/usuarios", "Usuarios y permisos"),
    esSA() && enlace("auditoria", "#/auditoria", "Auditoría"),
    h("div", { class: "sep" }),
    enlace("cuenta", "#/cuenta", "Mi cuenta"),
    h("div", { class: "quien" }, h("strong", {}, u.nombreVisible), u.username, esSA() ? " · superadmin" : ""),
    h("a", { href: "#/", onclick: (e) => { e.preventDefault(); cerrarSesion(); } }, "Cerrar sesión"),
  );
}

function cabecera(titulo, ...acciones) {
  return h("div", { class: "cabecera" }, h("h1", {}, titulo), h("div", { class: "acciones" }, acciones));
}

// ─── Modal genérico ───────────────────────────────────────────────────────────

function modal(titulo, cuerpo, botones = [], { estrecho = false } = {}) {
  const dlg = h("dialog", { class: estrecho ? "estrecho" : null },
    h("div", { class: "modal-cab" }, h("h2", {}, titulo), h("button", { class: "mini", onclick: () => dlg.close(), "aria-label": "Cerrar" }, "✕")),
    h("div", { class: "modal-cuerpo" }, cuerpo),
    botones.length ? h("div", { class: "modal-pie" }, botones) : null,
  );
  dlg.addEventListener("close", () => dlg.remove());
  document.body.append(dlg);
  dlg.showModal();
  return dlg;
}

function confirmar(texto, { peligro = true, boton = "Confirmar" } = {}) {
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

async function vistaResumen() {
  const r = await api("GET", "/api/admin/resumen");
  const est = (n, t) => h("div", { class: "estadistica" }, h("b", {}, n), h("span", {}, t));
  const u = perfil();
  const capacidades = [
    esSA() && "Superadministrador: control total, incluida la gestión de usuarios y permisos.",
    !esSA() && puedeCrearWikis() && "Puedes crear wikis nuevas.",
    !esSA() && u.permisos.map((p) => p.ambito === "Wikis"
      ? (p.serieId ? `Editar la wiki «${p.serieNombre}».` : "Editar todas las wikis.")
      : `${NOMBRES_AMBITO[p.ambito]}.`),
  ].flat().filter(Boolean);

  return h("div", {},
    cabecera(`Hola, ${u.nombreVisible}`),
    h("div", { class: "estadisticas" },
      est(r.series, "Series / wikis"),
      est(r.seriesPublicadas, "Publicadas"),
      est(r.socios, "Socios"),
      est(r.medios, `Archivos (${formatoBytes(r.bytesMedios)})`),
      esSA() && est(r.usuarios, "Usuarios activos"),
    ),
    h("div", { class: "tarjeta" }, h("h2", {}, "Series por estado"),
      Object.keys(r.seriesPorEstado).length
        ? h("table", {}, h("tbody", {}, Object.entries(r.seriesPorEstado).map(([k, v]) => h("tr", {}, h("td", {}, k), h("td", {}, v)))))
        : h("p", { class: "vacio" }, "Aún no hay series.")),
    h("div", { class: "tarjeta" }, h("h2", {}, "Lo que puedes hacer"),
      capacidades.length ? h("ul", {}, capacidades.map((c) => h("li", {}, c)))
        : h("p", { class: "vacio" }, "Todavía no tienes permisos asignados. Pídeselos a YishAdmin.")),
  );
}

// ─── Biblioteca de medios (modal de selección) ────────────────────────────────

/** Abre la biblioteca y devuelve los medios elegidos (array) o null si se cancela. */
function elegirMedios({ multiple = false } = {}) {
  return new Promise((resolver) => {
    const elegidos = new Map();
    let resultado = null;
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

/** Rejilla de medios con subida (arrastrar o elegir) y búsqueda. */
function panelBiblioteca({ alElegir, alSubir, conBorrado = false }) {
  const rejilla = h("div", { class: "medios" });
  const info = h("p", { class: "ayuda" });
  const buscar = h("input", { type: "search", placeholder: "Buscar por nombre…" });
  let pagina = 1;
  const paginador = h("div", { class: "paginador" });

  async function cargar() {
    const q = new URLSearchParams({ pagina, tamano: 60 });
    if (buscar.value.trim()) q.set("buscar", buscar.value.trim());
    const r = await intentar(() => api("GET", `/api/admin/medios?${q}`));
    if (!r) return;
    vaciar(rejilla, r.items.length ? r.items.map(tarjetaMedio) : h("p", { class: "vacio" }, "No hay archivos."));
    const paginas = Math.max(1, Math.ceil(r.total / r.tamanoPagina));
    info.textContent = `${r.total} archivo(s)`;
    vaciar(paginador,
      h("button", { class: "mini", disabled: pagina <= 1, onclick: () => { pagina--; cargar(); } }, "‹ Anterior"),
      `Página ${pagina} de ${paginas}`,
      h("button", { class: "mini", disabled: pagina >= paginas, onclick: () => { pagina++; cargar(); } }, "Siguiente ›"));
  }

  function tarjetaMedio(m) {
    const esVideo = m.tipoContenido.startsWith("video/");
    const nodo = h("button", { type: "button", class: "medio", title: `${m.nombreArchivo} · ${formatoBytes(m.tamano)}` },
      esVideo ? h("video", { src: m.url, muted: true, preload: "metadata" }) : h("img", { src: m.url, alt: m.alt || m.nombreArchivo, loading: "lazy" }),
      h("div", { class: "nombre" }, m.nombreArchivo));
    if (alElegir) nodo.addEventListener("click", () => alElegir(m, nodo));
    if (conBorrado) {
      nodo.addEventListener("click", async () => {
        if (!(await confirmar(`¿Eliminar «${m.nombreArchivo}»? Solo se puede si no está en uso.`, { boton: "Eliminar" }))) return;
        if ((await intentar(() => api("DELETE", `/api/admin/medios/${m.id}`), "Archivo eliminado")) !== undefined) cargar();
      });
    }
    return nodo;
  }

  const entrada = h("input", { type: "file", multiple: true, accept: "image/*,video/mp4,video/webm", class: "oculto" });
  async function subir(archivos) {
    if (!archivos.length) return;
    const fd = new FormData();
    for (const f of archivos) fd.append("archivos", f);
    aviso(`Subiendo ${archivos.length} archivo(s)…`);
    const r = await intentar(() => api("POST", "/api/admin/medios", fd, { formulario: true }), "Archivos subidos");
    if (r) { pagina = 1; buscar.value = ""; await cargar(); alSubir?.(r); }
  }
  entrada.addEventListener("change", () => subir([...entrada.files]));
  const zona = h("div", { class: "zona-subida" }, "Arrastra imágenes o videos aquí, o ",
    h("button", { type: "button", class: "mini", onclick: () => entrada.click() }, "elige archivos"), entrada,
    h("div", { class: "ayuda" }, "webp, png, jpg, gif, svg, mp4 o webm · máximo 60 MB. Los archivos se guardan en la base de datos."));
  zona.addEventListener("dragover", (e) => { e.preventDefault(); zona.classList.add("encima"); });
  zona.addEventListener("dragleave", () => zona.classList.remove("encima"));
  zona.addEventListener("drop", (e) => { e.preventDefault(); zona.classList.remove("encima"); subir([...e.dataTransfer.files]); });

  let temporizador;
  buscar.addEventListener("input", () => { clearTimeout(temporizador); temporizador = setTimeout(() => { pagina = 1; cargar(); }, 300); });
  cargar();
  return h("div", {}, zona, h("div", { class: "campo" }, buscar), info, rejilla, paginador);
}

// ─── Controles de formulario enlazados a un objeto ────────────────────────────

function marcarCambio() { hayCambiosSinGuardar = true; }

function campo(etiqueta, obj, clave, { tipo = "text", multilinea = false, ayuda, requerido = false, alCambiar } = {}) {
  const id = `c${Math.random().toString(36).slice(2)}`;
  const props = {
    id, value: obj[clave] ?? "", required: requerido,
    oninput: (e) => { obj[clave] = tipo === "number" ? Number(e.target.value) : e.target.value; marcarCambio(); alCambiar?.(e.target.value); },
  };
  const control = multilinea ? h("textarea", props) : h("input", { ...props, type: tipo });
  return h("div", { class: "campo" }, h("label", { for: id }, etiqueta, requerido ? " *" : ""), control, ayuda && h("p", { class: "ayuda" }, ayuda));
}

function casilla(etiqueta, obj, clave, alCambiar) {
  return h("label", { class: "check" },
    h("input", { type: "checkbox", checked: !!obj[clave], onchange: (e) => { obj[clave] = e.target.checked; marcarCambio(); alCambiar?.(e.target.checked); } }),
    etiqueta);
}

function selectorImagen(etiqueta, obj, clave, { video = false } = {}) {
  const vista = h("div", { class: "vista" });
  const quitar = h("button", { type: "button", class: "mini peligro", onclick: () => { obj[clave] = null; marcarCambio(); pintar(); } }, "Quitar");
  function pintar() {
    const url = urlMedio(obj[clave]);
    vaciar(vista, url ? (video ? h("video", { src: url, muted: true, preload: "metadata" }) : h("img", { src: url, alt: "" })) : "Sin archivo");
    quitar.classList.toggle("oculto", !url);
  }
  pintar();
  return h("div", { class: "campo" }, h("label", {}, etiqueta),
    h("div", { class: "selector-imagen" }, vista, h("div", { class: "acciones" },
      h("button", {
        type: "button", class: "mini",
        onclick: async () => { const m = await elegirMedios(); if (m?.length) { obj[clave] = m[0].id; marcarCambio(); pintar(); } },
      }, "Elegir…"), quitar)));
}

/** Editor de una lista ordenable de elementos. */
function editorLista({ lista, nuevo, titulo, renderItem, textoAgregar = "Agregar" }) {
  const cont = h("div");
  function pintar() {
    vaciar(cont,
      lista.length ? null : h("p", { class: "vacio" }, "Vacío."),
      lista.map((item, i) => h("div", { class: "lista-item" },
        h("div", { class: "lista-item-cab" },
          h("strong", {}, titulo(item, i)),
          h("div", { class: "acciones" },
            h("button", { type: "button", class: "mini", disabled: i === 0, title: "Subir", onclick: () => mover(i, -1) }, "↑"),
            h("button", { type: "button", class: "mini", disabled: i === lista.length - 1, title: "Bajar", onclick: () => mover(i, 1) }, "↓"),
            h("button", { type: "button", class: "mini peligro", onclick: () => { lista.splice(i, 1); marcarCambio(); pintar(); } }, "Eliminar"))),
        renderItem(item, i, pintar))),
      h("button", { type: "button", onclick: () => { lista.push(nuevo()); marcarCambio(); pintar(); } }, `+ ${textoAgregar}`));
  }
  function mover(i, d) { [lista[i], lista[i + d]] = [lista[i + d], lista[i]]; marcarCambio(); pintar(); }
  pintar();
  return cont;
}

function editorEnlaces(lista, plataformas = PLATAFORMAS) {
  const cont = h("div");
  function pintar() {
    vaciar(cont,
      lista.map((e, i) => h("div", { class: "fila-enlace" },
        h("select", { "aria-label": "Plataforma", onchange: (ev) => { e.plataforma = ev.target.value; marcarCambio(); } },
          plataformas.map((p) => h("option", { value: p, selected: p === e.plataforma }, p))),
        h("input", { type: "url", placeholder: "https://…", value: e.url, "aria-label": "URL", oninput: (ev) => { e.url = ev.target.value; marcarCambio(); } }),
        h("button", { type: "button", class: "mini peligro", onclick: () => { lista.splice(i, 1); marcarCambio(); pintar(); } }, "✕"))),
      h("button", { type: "button", class: "mini", onclick: () => { lista.push({ plataforma: plataformas[0], url: "" }); marcarCambio(); pintar(); } }, "+ Agregar enlace"));
  }
  pintar();
  return cont;
}

function editorGaleria(lista) {
  const cont = h("div");
  function pintar() {
    vaciar(cont,
      h("div", { class: "galeria-editor" }, lista.map((img, i) => h("div", { class: "pieza" },
        h("img", { src: urlMedio(img.medioId), alt: img.alt || "", loading: "lazy" }),
        h("div", { class: "pie" },
          h("input", { type: "text", placeholder: "Texto alternativo", value: img.alt || "", oninput: (e) => { img.alt = e.target.value; marcarCambio(); } }),
          h("div", { class: "acciones" },
            h("button", { type: "button", class: "mini", disabled: i === 0, onclick: () => mover(i, -1) }, "←"),
            h("button", { type: "button", class: "mini", disabled: i === lista.length - 1, onclick: () => mover(i, 1) }, "→"),
            h("button", { type: "button", class: "mini peligro", onclick: () => { lista.splice(i, 1); marcarCambio(); pintar(); } }, "✕")))))),
      lista.length ? null : h("p", { class: "vacio" }, "Sin imágenes."),
      h("p", {}, h("button", {
        type: "button",
        onclick: async () => {
          const ms = await elegirMedios({ multiple: true });
          if (ms?.length) { lista.push(...ms.map((m) => ({ medioId: m.id, alt: m.alt || "" }))); marcarCambio(); pintar(); }
        },
      }, "+ Agregar imágenes")));
  }
  function mover(i, d) { [lista[i], lista[i + d]] = [lista[i + d], lista[i]]; marcarCambio(); pintar(); }
  pintar();
  return cont;
}

function pestanas(secciones) {
  const barra = h("div", { class: "pestanas", role: "tablist" });
  const paneles = secciones.map(([, contenido]) => h("div", { role: "tabpanel" }, contenido));
  const botones = secciones.map(([nombre], i) => h("button", { type: "button", role: "tab", onclick: () => activar(i) }, nombre));
  function activar(i) {
    botones.forEach((b, j) => b.classList.toggle("activa", i === j));
    paneles.forEach((p, j) => p.classList.toggle("oculto", i !== j));
  }
  agregar(barra, botones);
  activar(0);
  return h("div", {}, barra, paneles);
}

// ─── Wikis ────────────────────────────────────────────────────────────────────

async function vistaWikis() {
  const [series, estados] = await Promise.all([api("GET", "/api/admin/series"), api("GET", "/api/admin/estados")]);
  const filas = series.map((s) => {
    const selEstado = h("select", {
      "aria-label": `Estado de ${s.nombre}`,
      onchange: async (e) => {
        const ok = await intentar(() => api("PATCH", `/api/admin/series/${s.id}/estado`, { estadoId: +e.target.value }), "Estado actualizado");
        if (ok === undefined) e.target.value = s.estado.id;
        else s.estado = estados.find((x) => x.id === +e.target.value);
      },
    }, estados.map((x) => h("option", { value: x.id, selected: x.id === s.estado.id }, x.nombre)));
    return h("tr", {},
      h("td", { class: "miniatura" }, s.portada ? h("img", { src: s.portada, alt: "" }) : null),
      h("td", {}, h("a", { href: `#/wikis/${s.id}` }, s.nombre), h("div", { class: "ayuda" }, `/wiki/${s.slug}`)),
      h("td", {}, selEstado),
      h("td", {}, s.publicada ? "Sí" : "Borrador"),
      h("td", {}, fecha(s.actualizadoEn)),
      h("td", {}, h("div", { class: "acciones" },
        h("a", { class: "boton mini", href: `#/wikis/${s.id}` }, "Editar"),
        esSA() && h("button", {
          class: "mini peligro",
          onclick: async () => {
            if (!(await confirmar(`¿Eliminar la wiki «${s.nombre}» con todos sus personajes, equipo y galerías? No se puede deshacer.`, { boton: "Eliminar wiki" }))) return;
            if ((await intentar(() => api("DELETE", `/api/admin/series/${s.id}`), "Wiki eliminada")) !== undefined) render();
          },
        }, "Eliminar"))));
  });

  return h("div", {},
    cabecera("Wikis", puedeCrearWikis() && h("a", { class: "boton primario", href: "#/wikis/nueva" }, "+ Nueva wiki")),
    h("div", { class: "tarjeta" },
      series.length
        ? h("div", { class: "tabla-envoltura" }, h("table", {},
          h("thead", {}, h("tr", {}, h("th", {}, ""), h("th", {}, "Serie"), h("th", {}, "Estado"), h("th", {}, "Publicada"), h("th", {}, "Actualizada"), h("th", {}, ""))),
          h("tbody", {}, filas)))
        : h("p", { class: "vacio" }, esSA() ? "No hay wikis todavía." : "No tienes wikis asignadas. Pídele permisos a YishAdmin.")));
}

const wikiVacia = (estadoId) => ({
  id: null, slug: "", nombre: "", sinopsis: "", estadoId, portadaId: null, bannerId: null, logoId: null,
  videoUrl: "", videoLocalId: null,
  creador: { nombre: "", descripcion: "", imagenId: null, redes: [], obras: [] },
  redes: [], apoyo: [], carrusel: [], galeria: [], personajes: [], equipo: [], orden: 100, publicada: false,
});

async function vistaEditorWiki(id) {
  const estados = await api("GET", "/api/admin/estados");
  if (id == null && !puedeCrearWikis()) throw new Error("No tienes permiso para crear wikis. Pídeselo a YishAdmin.");
  const d = id == null ? wikiVacia(estados[0]?.id) : await api("GET", `/api/admin/series/${id}`);
  for (const k of ["redes", "apoyo", "carrusel", "galeria", "personajes", "equipo"]) d[k] ??= [];
  d.creador ??= { nombre: "", descripcion: "", imagenId: null, redes: [], obras: [] };
  d.creador.redes ??= []; d.creador.obras ??= [];
  let slugTocado = id != null;

  const campoSlug = campo("Identificador (URL)", d, "slug", {
    requerido: true, ayuda: "Aparece en /wiki/<identificador>. Solo minúsculas, números y guiones.",
    alCambiar: () => { slugTocado = true; },
  });
  const general = h("div", { class: "tarjeta" },
    h("div", { class: "rejilla" },
      campo("Nombre", d, "nombre", { requerido: true, alCambiar: (v) => { if (!slugTocado) { d.slug = slugDe(v); campoSlug.querySelector("input").value = d.slug; } } }),
      campoSlug),
    h("div", { class: "rejilla" },
      h("div", { class: "campo" }, h("label", {}, "Estado"),
        h("select", { onchange: (e) => { d.estadoId = +e.target.value; marcarCambio(); } },
          estados.map((x) => h("option", { value: x.id, selected: x.id === d.estadoId }, x.nombre))),
        h("p", { class: "ayuda" }, "Los estados se administran en la sección Estados.")),
      campo("Orden en la portada", d, "orden", { tipo: "number", ayuda: "Menor = aparece antes." })),
    campo("Sinopsis", d, "sinopsis", { multilinea: true }),
    campo("Video de YouTube (URL de inserción)", d, "videoUrl", { tipo: "url", ayuda: "Ej: https://www.youtube.com/embed/ID" }),
    casilla("Publicada (visible en el sitio)", d, "publicada"));

  const imagenes = h("div", { class: "tarjeta" }, h("div", { class: "rejilla" },
    selectorImagen("Tarjeta de portada", d, "portadaId"),
    selectorImagen("Banner", d, "bannerId"),
    selectorImagen("Logo", d, "logoId"),
    selectorImagen("Video propio (opcional)", d, "videoLocalId", { video: true })));

  const creador = h("div", { class: "tarjeta" },
    h("div", { class: "rejilla" }, campo("Nombre", d.creador, "nombre"), selectorImagen("Foto", d.creador, "imagenId")),
    campo("Descripción", d.creador, "descripcion", { multilinea: true }),
    h("h2", {}, "Redes del creador"), editorEnlaces(d.creador.redes),
    h("h2", {}, "Otras obras"),
    editorLista({
      lista: d.creador.obras, textoAgregar: "Agregar obra", nuevo: () => ({ titulo: "", url: "" }),
      titulo: (o) => o.titulo || "Obra sin título",
      renderItem: (o) => h("div", { class: "rejilla" }, campo("Título", o, "titulo", { requerido: true }), campo("URL", o, "url", { tipo: "url" })),
    }));

  const redes = h("div", {},
    h("div", { class: "tarjeta" }, h("h2", {}, "Redes oficiales de la serie"), editorEnlaces(d.redes)),
    h("div", { class: "tarjeta" }, h("h2", {}, "Apóyanos"), h("p", { class: "ayuda" }, "Enlaces de apoyo económico al proyecto."), editorEnlaces(d.apoyo, PLATAFORMAS_APOYO)));

  const personajes = h("div", { class: "tarjeta" }, editorLista({
    lista: d.personajes, textoAgregar: "Agregar personaje",
    nuevo: () => ({ nombre: "", rol: "", descripcion: "", imagenId: null, actorVoz: "", imagenActorVozId: null }),
    titulo: (p) => p.nombre || "Nuevo personaje",
    renderItem: (p) => h("div", {},
      h("div", { class: "rejilla" }, campo("Nombre", p, "nombre", { requerido: true }), campo("Rol", p, "rol"), campo("Actor/actriz de voz", p, "actorVoz")),
      campo("Descripción", p, "descripcion", { multilinea: true }),
      h("div", { class: "rejilla" }, selectorImagen("Imagen", p, "imagenId"), selectorImagen("Foto del actor de voz", p, "imagenActorVozId"))),
  }));

  const equipo = h("div", { class: "tarjeta" }, editorLista({
    lista: d.equipo, textoAgregar: "Agregar categoría",
    nuevo: () => ({ categoria: "", miembros: [] }),
    titulo: (g) => g.categoria || "Nueva categoría",
    renderItem: (g) => {
      g.miembros ??= [];
      return h("div", {},
        campo("Categoría", g, "categoria", { requerido: true, ayuda: "Ej: Animatics, Actores de Voz, Guion." }),
        editorLista({
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
      const r = await intentar(() => id == null ? api("POST", "/api/admin/series", cuerpo) : api("PUT", `/api/admin/series/${id}`, cuerpo),
        id == null ? "Wiki creada" : "Cambios guardados");
      guardar.disabled = false;
      if (r) {
        hayCambiosSinGuardar = false;
        if (id == null) {
          // Al crear, el usuario recibe permiso sobre la wiki: se refresca el perfil.
          sesion.usuario = await api("GET", "/api/auth/yo"); almacen.guardar(sesion);
          location.hash = `#/wikis/${r.id}`;
        } else { d.actualizadoEn = r.actualizadoEn; }
      }
    },
  },
    pestanas([["General", general], ["Imágenes", imagenes], ["Creador", creador], ["Redes", redes],
      ["Personajes", personajes], ["Equipo", equipo], ["Carrusel", carrusel], ["Galería", galeria]]),
    h("div", { class: "barra-guardar" },
      d.slug && id != null ? h("span", { class: "ayuda" }, `Vista pública: /api/series/${d.slug}`) : null,
      h("a", { class: "boton", href: "#/wikis" }, "Volver"), guardar));

  return h("div", {}, cabecera(id == null ? "Nueva wiki" : `Editar: ${d.nombre}`), form);
}

// ─── Socios ───────────────────────────────────────────────────────────────────

async function vistaSocios() {
  const socios = await api("GET", "/api/admin/socios");
  return h("div", {},
    cabecera("Socios / asociados", h("a", { class: "boton primario", href: "#/socios/nuevo" }, "+ Nuevo asociado")),
    h("div", { class: "tarjeta" }, socios.length ? h("div", { class: "tabla-envoltura" }, h("table", {},
      h("thead", {}, h("tr", {}, h("th", {}, ""), h("th", {}, "Nombre"), h("th", {}, "Publicado"), h("th", {}, "Orden"), h("th", {}, ""))),
      h("tbody", {}, socios.map((s) => h("tr", {},
        h("td", { class: "miniatura" }, s.imagen ? h("img", { src: s.imagen, alt: "" }) : null),
        h("td", {}, h("a", { href: `#/socios/${s.id}` }, s.nombre)),
        h("td", {}, s.publicado ? "Sí" : "No"),
        h("td", {}, s.orden),
        h("td", {}, h("div", { class: "acciones" },
          h("a", { class: "boton mini", href: `#/socios/${s.id}` }, "Editar"),
          h("button", {
            class: "mini peligro",
            onclick: async () => {
              if (!(await confirmar(`¿Eliminar a «${s.nombre}»?`, { boton: "Eliminar" }))) return;
              if ((await intentar(() => api("DELETE", `/api/admin/socios/${s.id}`), "Socio eliminado")) !== undefined) render();
            },
          }, "Eliminar")))))))) : h("p", { class: "vacio" }, "No hay socios.")));
}

async function vistaEditorSocio(id) {
  const [series, d] = await Promise.all([
    api("GET", "/api/admin/series"),
    id == null ? Promise.resolve({ id: null, slug: "", nombre: "", descripcion: "", imagenId: null, orden: 100, publicado: true, redes: [], serieIds: [] })
      : api("GET", `/api/admin/socios/${id}`),
  ]);
  d.redes ??= []; d.serieIds ??= [];
  let slugTocado = id != null;
  const campoSlug = campo("Identificador", d, "slug", { requerido: true, alCambiar: () => { slugTocado = true; } });

  const guardar = h("button", { class: "primario", type: "submit" }, id == null ? "Crear asociado" : "Guardar cambios");
  return h("div", {},
    cabecera(id == null ? "Nuevo asociado" : `Editar: ${d.nombre}`),
    h("form", {
      onsubmit: async (e) => {
        e.preventDefault();
        guardar.disabled = true;
        const r = await intentar(() => id == null ? api("POST", "/api/admin/socios", d) : api("PUT", `/api/admin/socios/${id}`, d),
          id == null ? "Asociado creado" : "Cambios guardados");
        guardar.disabled = false;
        if (r) { hayCambiosSinGuardar = false; if (id == null) location.hash = `#/socios/${r.id}`; }
      },
    },
      h("div", { class: "tarjeta" },
        h("div", { class: "rejilla" },
          campo("Nombre", d, "nombre", { requerido: true, alCambiar: (v) => { if (!slugTocado) { d.slug = slugDe(v); campoSlug.querySelector("input").value = d.slug; } } }),
          campoSlug,
          campo("Orden", d, "orden", { tipo: "number" })),
        campo("Descripción", d, "descripcion", { multilinea: true }),
        selectorImagen("Imagen", d, "imagenId"),
        casilla("Publicado (visible en el sitio)", d, "publicado")),
      h("div", { class: "tarjeta" }, h("h2", {}, "Redes"), editorEnlaces(d.redes)),
      h("div", { class: "tarjeta" }, h("h2", {}, "Proyectos en los que participa"),
        series.map((s) => h("label", { class: "check" },
          h("input", {
            type: "checkbox", checked: d.serieIds.includes(s.id),
            onchange: (e) => { d.serieIds = e.target.checked ? [...d.serieIds, s.id] : d.serieIds.filter((x) => x !== s.id); marcarCambio(); },
          }), s.nombre))),
      h("div", { class: "barra-guardar" }, h("a", { class: "boton", href: "#/socios" }, "Volver"), guardar)));
}

// ─── Estados ──────────────────────────────────────────────────────────────────

async function vistaEstados() {
  const estados = await api("GET", "/api/admin/estados");
  const editable = puede("Estados");

  function formulario(e, alGuardar) {
    const d = e ? { codigo: e.codigo, nombre: e.nombre, color: e.color, orden: e.orden } : { codigo: "", nombre: "", color: "#888888", orden: estados.length + 1 };
    const color = h("input", { type: "color", value: d.color, oninput: (ev) => { d.color = ev.target.value; } });
    const cod = campo("Código", d, "codigo", { requerido: true, ayuda: "Identificador estable para el frontend (ej: en-emision)." });
    const dlg = modal(e ? `Editar estado «${e.nombre}»` : "Nuevo estado", h("div", {},
      campo("Nombre visible", d, "nombre", { requerido: true, alCambiar: (v) => { if (!e) { d.codigo = slugDe(v); cod.querySelector("input").value = d.codigo; } } }),
      cod,
      h("div", { class: "rejilla" }, h("div", { class: "campo" }, h("label", {}, "Color"), color), campo("Orden", d, "orden", { tipo: "number" }))),
      [h("button", { onclick: () => dlg.close() }, "Cancelar"),
        h("button", {
          class: "primario",
          onclick: async () => {
            const r = await intentar(() => e ? api("PUT", `/api/admin/estados/${e.id}`, d) : api("POST", "/api/admin/estados", d), "Estado guardado");
            if (r) { dlg.close(); alGuardar(); }
          },
        }, "Guardar")], { estrecho: true });
  }

  return h("div", {},
    cabecera("Estados de serie", editable && h("button", { class: "primario", onclick: () => formulario(null, render) }, "+ Nuevo estado")),
    h("div", { class: "tarjeta" },
      h("p", { class: "ayuda" }, "Catálogo que usa cada wiki («En Emisión», «Cancelado»…). El sitio público lo obtiene de /api/estados."),
      h("table", {},
        h("thead", {}, h("tr", {}, h("th", {}, "Estado"), h("th", {}, "Código"), h("th", {}, "Orden"), h("th", {}, ""))),
        h("tbody", {}, estados.map((e) => h("tr", {},
          h("td", {}, etiquetaEstado(e)), h("td", {}, h("code", {}, e.codigo)), h("td", {}, e.orden),
          h("td", {}, editable && h("div", { class: "acciones" },
            h("button", { class: "mini", onclick: () => formulario(e, render) }, "Editar"),
            h("button", {
              class: "mini peligro",
              onclick: async () => {
                if (!(await confirmar(`¿Eliminar el estado «${e.nombre}»?`, { boton: "Eliminar" }))) return;
                if ((await intentar(() => api("DELETE", `/api/admin/estados/${e.id}`), "Estado eliminado")) !== undefined) render();
              },
            }, "Eliminar")))))))));
}

// ─── Medios ───────────────────────────────────────────────────────────────────

function vistaMedios() {
  const borrar = puede("Medios");
  return h("div", {},
    cabecera("Biblioteca de medios"),
    h("div", { class: "tarjeta" },
      borrar && h("p", { class: "ayuda" }, "Haz clic en un archivo para eliminarlo (solo si no está en uso)."),
      panelBiblioteca({ conBorrado: borrar })));
}

// ─── Usuarios y permisos (solo superadmin) ────────────────────────────────────

function chipsPermisos(u) {
  if (u.esSuperAdmin) return h("span", { class: "chip sa" }, "Todo (superadmin)");
  const chips = [];
  if (u.puedeCrearWikis) chips.push(h("span", { class: "chip" }, "Crear wikis"));
  for (const p of u.permisos) {
    chips.push(h("span", { class: "chip" }, p.ambito === "Wikis" ? (p.serieId ? `Wiki: ${p.serieNombre}` : "Todas las wikis") : NOMBRES_AMBITO[p.ambito]));
  }
  return chips.length ? chips : h("span", { class: "vacio" }, "Sin permisos");
}

/** Controles de permisos; modifica estado.permisos en sitio. */
function editorPermisos(estado, series) {
  const tiene = (ambito, serieId = null) => estado.permisos.some((p) => p.ambito === ambito && (p.serieId ?? null) === serieId);
  const poner = (ambito, serieId, si) => {
    estado.permisos = estado.permisos.filter((p) => !(p.ambito === ambito && (p.serieId ?? null) === serieId));
    if (si) estado.permisos.push({ ambito, serieId });
  };
  const listaWikis = h("div", { class: "permisos-wikis" }, series.map((s) => h("label", { class: "check" },
    h("input", { type: "checkbox", checked: tiene("Wikis", s.id), onchange: (e) => poner("Wikis", s.id, e.target.checked) }), s.nombre)));
  const todas = h("input", {
    type: "checkbox", checked: tiene("Wikis"),
    onchange: (e) => { poner("Wikis", null, e.target.checked); listaWikis.classList.toggle("oculto", e.target.checked); },
  });
  listaWikis.classList.toggle("oculto", tiene("Wikis"));

  return h("div", {},
    h("label", { class: "check" }, h("input", { type: "checkbox", checked: estado.puedeCrearWikis, onchange: (e) => { estado.puedeCrearWikis = e.target.checked; } }),
      "Puede crear wikis nuevas"),
    h("p", { class: "ayuda" }, "Al crear una wiki, el usuario recibe automáticamente permiso para editarla."),
    h("h2", {}, "Edición de wikis"),
    h("label", { class: "check" }, todas, "Todas las wikis"),
    listaWikis,
    h("h2", {}, "Otras áreas"),
    ["Socios", "Estados", "Medios"].map((a) => h("label", { class: "check" },
      h("input", { type: "checkbox", checked: tiene(a), onchange: (e) => poner(a, null, e.target.checked) }), NOMBRES_AMBITO[a])));
}

async function vistaUsuarios() {
  const [usuarios, series] = await Promise.all([api("GET", "/api/admin/usuarios"), api("GET", "/api/admin/series")]);

  function nuevo() {
    const d = { username: "", nombreVisible: "", email: "", password: "", origen: "Local", puedeCrearWikis: false, permisos: [] };
    const dlg = modal("Nuevo usuario administrativo", h("div", {},
      h("div", { class: "rejilla" },
        campo("Usuario", d, "username", { requerido: true, ayuda: "3-64 caracteres: letras, números, punto o guion." }),
        campo("Nombre visible", d, "nombreVisible", { requerido: true }),
        campo("Correo", d, "email", { tipo: "email" }),
        campo("Contraseña inicial", d, "password", { tipo: "password", requerido: true, ayuda: "Mínimo 10 caracteres, con letras y números." })),
      h("div", { class: "campo" }, h("label", {}, "Origen de la cuenta"),
        h("select", { onchange: (e) => { d.origen = e.target.value; } },
          h("option", { value: "Local" }, "Local (contraseña en la base de datos)"),
          h("option", { value: "Ldap" }, "LDAP (contraseña en el directorio)"))),
      h("div", { class: "tarjeta" }, editorPermisos(d, series))),
      [h("button", { onclick: () => dlg.close() }, "Cancelar"),
        h("button", {
          class: "primario",
          onclick: async () => {
            const r = await intentar(() => api("POST", "/api/admin/usuarios", { ...d, email: d.email || null }), "Usuario creado");
            if (r) { dlg.close(); render(); }
          },
        }, "Crear usuario")]);
  }

  function editar(u) {
    const d = { nombreVisible: u.nombreVisible, email: u.email || "", activo: u.activo, puedeCrearWikis: u.puedeCrearWikis, permisos: clonar(u.permisos) };
    const pass = { password: "" };
    const dlg = modal(`Usuario ${u.username}`, h("div", {},
      h("div", { class: "tarjeta" }, h("h2", {}, "Datos"),
        h("div", { class: "rejilla" }, campo("Nombre visible", d, "nombreVisible", { requerido: true }), campo("Correo", d, "email", { tipo: "email" })),
        !u.esSuperAdmin && casilla("Cuenta activa (desactivar cierra sus sesiones)", d, "activo"),
        h("p", { class: "ayuda" }, `Origen: ${u.origen} · Creado: ${fecha(u.creadoEn)} · Último acceso: ${fecha(u.ultimoAcceso)}`)),
      !u.esSuperAdmin && h("div", { class: "tarjeta" }, h("h2", {}, "Permisos"), editorPermisos(d, series)),
      h("div", { class: "tarjeta" }, h("h2", {}, "Restablecer contraseña"),
        campo("Nueva contraseña", pass, "password", { tipo: "password" }),
        h("div", { class: "acciones" },
          h("button", {
            onclick: async () => {
              if ((await intentar(() => api("POST", `/api/admin/usuarios/${u.id}/password`, pass), "Contraseña restablecida")) !== undefined) pass.password = "";
            },
          }, "Restablecer"),
          u.origen === "Ldap" && h("button", { onclick: () => intentar(() => api("POST", `/api/admin/usuarios/${u.id}/sincronizar-ldap`), "Grupos LDAP sincronizados") }, "Resincronizar LDAP"))),
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
            if (ok) { dlg.close(); render(); }
          },
        }, "Guardar")]);
  }

  return h("div", {},
    cabecera("Usuarios y permisos", h("button", { class: "primario", onclick: nuevo }, "+ Nuevo usuario")),
    h("div", { class: "tarjeta" },
      h("p", { class: "ayuda" }, "Solo las cuentas administrativas inician sesión; los visitantes del sitio no necesitan cuenta. Solo tú (superadmin) puedes crear usuarios y asignar permisos."),
      h("div", { class: "tabla-envoltura" }, h("table", {},
        h("thead", {}, h("tr", {}, h("th", {}, "Usuario"), h("th", {}, "Origen"), h("th", {}, "Estado"), h("th", {}, "Permisos"), h("th", {}, ""))),
        h("tbody", {}, usuarios.map((u) => h("tr", {},
          h("td", {}, h("strong", {}, u.username), h("div", { class: "ayuda" }, u.nombreVisible)),
          h("td", {}, u.origen),
          h("td", {}, u.activo ? "Activo" : "Desactivado"),
          h("td", {}, chipsPermisos(u)),
          h("td", {}, h("button", { class: "mini", onclick: () => editar(u) }, "Editar")))))))));
}

// ─── Auditoría ────────────────────────────────────────────────────────────────

async function vistaAuditoria() {
  const tabla = h("tbody");
  const paginador = h("div", { class: "paginador" });
  let pagina = 1;
  async function cargar() {
    const r = await intentar(() => api("GET", `/api/admin/auditoria?pagina=${pagina}&tamano=50`));
    if (!r) return;
    vaciar(tabla, r.items.map((a) => h("tr", {},
      h("td", {}, fecha(a.fecha)), h("td", {}, a.username), h("td", {}, a.accion), h("td", {}, a.entidad), h("td", {}, a.detalle || a.entidadId || ""))));
    const paginas = Math.max(1, Math.ceil(r.total / r.tamanoPagina));
    vaciar(paginador,
      h("button", { class: "mini", disabled: pagina <= 1, onclick: () => { pagina--; cargar(); } }, "‹ Anterior"),
      `Página ${pagina} de ${paginas}`,
      h("button", { class: "mini", disabled: pagina >= paginas, onclick: () => { pagina++; cargar(); } }, "Siguiente ›"));
  }
  await cargar();
  return h("div", {}, cabecera("Auditoría"), h("div", { class: "tarjeta" },
    h("div", { class: "tabla-envoltura" }, h("table", {},
      h("thead", {}, h("tr", {}, h("th", {}, "Fecha"), h("th", {}, "Usuario"), h("th", {}, "Acción"), h("th", {}, "Entidad"), h("th", {}, "Detalle"))), tabla)),
    paginador));
}

// ─── Mi cuenta ────────────────────────────────────────────────────────────────

function vistaCuenta() {
  const d = { passwordActual: "", passwordNueva: "", repetir: "" };
  const u = perfil();
  return h("div", {},
    cabecera("Mi cuenta"),
    h("div", { class: "tarjeta" }, h("p", {}, h("strong", {}, u.nombreVisible), ` (${u.username}) · origen ${u.origen}`)),
    h("form", {
      class: "tarjeta",
      onsubmit: async (e) => {
        e.preventDefault();
        if (d.passwordNueva !== d.repetir) { aviso("Las contraseñas nuevas no coinciden.", "error"); return; }
        const s = await intentar(() => api("POST", "/api/auth/cambiar-password", { passwordActual: d.passwordActual, passwordNueva: d.passwordNueva }),
          "Contraseña cambiada. Se cerraron tus otras sesiones.");
        if (s) { sesion = s; almacen.guardar(s); e.target.reset(); }
      },
    },
      h("h2", {}, "Cambiar contraseña"),
      campo("Contraseña actual", d, "passwordActual", { tipo: "password", requerido: true }),
      campo("Nueva contraseña", d, "passwordNueva", { tipo: "password", requerido: true, ayuda: "Mínimo 10 caracteres, con letras y números." }),
      campo("Repetir nueva contraseña", d, "repetir", { tipo: "password", requerido: true }),
      h("button", { class: "primario", type: "submit" }, "Cambiar contraseña")));
}

// ─── Arranque ─────────────────────────────────────────────────────────────────

(async () => {
  if (sesion) {
    // Refresca permisos (pudieron cambiar desde el último inicio de sesión).
    try { sesion.usuario = await api("GET", "/api/auth/yo"); almacen.guardar(sesion); } catch { /* api() ya cierra la sesión si expiró */ }
  }
  render();
})();
