import { useEffect, useState, type ReactNode } from "react";
import { ErrorApi, pedirSitio, type Sitio } from "./api";
import { IdiomaContexto, SitioContexto } from "./textos";
import PaginaPrivada from "./paginas/PaginaPrivada";

/** Idioma que el visitante eligió a mano en este navegador (null si nunca eligió: se usa el del navegador). */
function idiomaElegido(): string | null {
  try { return localStorage.getItem("idioma"); } catch { return null; }
}

/**
 * Pide el contenido del sitio y lo comparte con todas las páginas.
 * El idioma lo detecta el servidor a partir del navegador; el español es el principal y el de respaldo.
 */
export function ProveedorSitio({ children }: { children: ReactNode }) {
  const [sitio, setSitio] = useState<Sitio | null>(null);
  const [elegido, setElegido] = useState(idiomaElegido);
  const [privado, setPrivado] = useState(false);
  const idioma = elegido ?? sitio?.idioma ?? "es";

  // 1. Pedir el contenido (de nuevo si el visitante elige otro idioma).
  useEffect(() => {
    let vigente = true;
    pedirSitio(elegido)
      .then((s) => { if (vigente) setSitio(s); })
      .catch((e: unknown) => { if (vigente && e instanceof ErrorApi && e.privado) setPrivado(true); /* si no, textos por defecto */ });
    return () => { vigente = false; };
  }, [elegido]);

  // 2. Avisar al navegador (lectores de pantalla, traductor del navegador) en qué idioma está la página.
  useEffect(() => { document.documentElement.lang = idioma; }, [idioma]);

  function cambiar(nuevo: string) {
    try { localStorage.setItem("idioma", nuevo); } catch { /* modo privado del navegador */ }
    setElegido(nuevo);
  }

  if (privado) return <PaginaPrivada />;
  return (
    <IdiomaContexto.Provider value={{ idioma, elegido, cambiar }}>
      <SitioContexto.Provider value={sitio}>{children}</SitioContexto.Provider>
    </IdiomaContexto.Provider>
  );
}
