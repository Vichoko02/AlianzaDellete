import { useEffect, useState, type ReactNode } from "react";
import { pedirSitio, type Sitio } from "./api";
import { SitioContexto } from "./textos";

/** Pide una vez el contenido del sitio al servidor y lo comparte con todas las páginas. */
export function ProveedorSitio({ children }: { children: ReactNode }) {
  const [sitio, setSitio] = useState<Sitio | null>(null);

  useEffect(() => {
    let vigente = true;
    pedirSitio()
      .then((s) => { if (vigente) setSitio(s); })
      .catch(() => { /* mientras tanto se usan los textos por defecto */ });
    return () => { vigente = false; };
  }, []);

  return <SitioContexto.Provider value={sitio}>{children}</SitioContexto.Provider>;
}
