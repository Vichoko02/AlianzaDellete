// Aplica el tema guardado antes de pintar la página (evita el parpadeo claro/oscuro).
"use strict";
(function () {
  try {
    var t = localStorage.getItem("alianza-tema");
    if (t === "claro" || t === "oscuro") document.documentElement.setAttribute("data-tema", t);
  } catch (e) { /* almacenamiento bloqueado: se usa el tema del sistema */ }
})();
