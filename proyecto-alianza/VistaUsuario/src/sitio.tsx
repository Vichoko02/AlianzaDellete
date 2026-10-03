import { useEffect, useState, type ReactNode } from "react";
import { apiSitio, type Sitio } from "./api";
import { SitioContexto } from "./textos";

/** Carga una vez el contenido del sitio desde la API y lo comparte con toda la app. */
export function SitioProvider({ children }: { children: ReactNode }) {
  const [sitio, setSitio] = useState<Sitio | null>(null);
  useEffect(() => {
    let vivo = true;
    apiSitio().then((s) => { if (vivo) setSitio(s); }).catch(() => { /* se usan los textos por defecto */ });
    return () => { vivo = false; };
  }, []);
  return <SitioContexto.Provider value={sitio}>{children}</SitioContexto.Provider>;
}

