import { useEffect, useState, type ReactNode } from "react";
import { ErrorApi, pedirSitio, type IdiomaPublico, type Sitio } from "./api";
import { IdiomaContexto, SitioContexto } from "./textos";
import PaginaPrivada from "./paginas/PaginaPrivada";

/** Idioma que el visitante eligió antes en este navegador (null si nunca eligió). */
function idiomaElegido(): string | null {
  try { return localStorage.getItem("idioma"); } catch { return null; }
}

/** Idioma del navegador ("en-US", "pt-BR"...) → el más parecido que ofrece el sitio, o español. */
function idiomaDelNavegador(ofrecidos: IdiomaPublico[]): string {
  const deseados = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const deseado of deseados) {
    if (deseado.toLowerCase().startsWith("es")) return "es";
    const exacto = ofrecidos.find((i) => i.codigo.toLowerCase() === deseado.toLowerCase());
    const parecido = ofrecidos.find((i) => i.codigo.split("-")[0] === deseado.split("-")[0].toLowerCase());
    if (exacto ?? parecido) return (exacto ?? parecido)!.codigo;
  }
  return "es";
}

/** Pide el contenido del sitio en el idioma elegido y lo comparte con todas las páginas. */
export function ProveedorSitio({ children }: { children: ReactNode }) {
  const [sitio, setSitio] = useState<Sitio | null>(null);
  const [idioma, setIdioma] = useState(() => idiomaElegido() ?? "es");
  const [privado, setPrivado] = useState(false);

  // 1. Pedir el contenido cada vez que cambia el idioma. La primera vez, si el visitante nunca eligió,
  //    se pasa al idioma de su navegador cuando el sitio lo ofrece.
  useEffect(() => {
    let vigente = true;
    pedirSitio(idioma)
      .then((s) => {
        if (!vigente) return;
        setSitio(s);
        if (idiomaElegido() === null && idioma === "es") {
          const delNavegador = idiomaDelNavegador(s.idiomas);
          if (delNavegador !== "es") setIdioma(delNavegador);
        }
      })
      .catch((e: unknown) => { if (vigente && e instanceof ErrorApi && e.privado) setPrivado(true); /* si no, textos por defecto */ });
    return () => { vigente = false; };
  }, [idioma]);

  // 2. Avisar al navegador (lectores de pantalla, traductor del navegador) en qué idioma está la página.
  useEffect(() => { document.documentElement.lang = idioma; }, [idioma]);

  function cambiar(nuevo: string) {
    try { localStorage.setItem("idioma", nuevo); } catch { /* modo privado del navegador */ }
    setIdioma(nuevo);
  }

  if (privado) return <PaginaPrivada />;
  return (
    <IdiomaContexto.Provider value={{ idioma, cambiar }}>
      <SitioContexto.Provider value={sitio}>{children}</SitioContexto.Provider>
    </IdiomaContexto.Provider>
  );
}
