import { useContext } from "react";
import iconoInstagram from "../assets/instagram-color.svg";
import iconoTwitter from "../assets/twitter.svg";
import iconoYoutube from "../assets/youtube-color2.svg";
import iconoFacebook from "../assets/facebook-color.svg";
import type { IdiomaPublico } from "../api";
import { SitioContexto, useEnlaces, useTextos } from "../textos";
import SelectorIdioma from "./SelectorIdioma";

// Los íconos del pie son fijos; qué redes aparecen y a dónde llevan se edita en el panel.
const ICONOS_PIE: Record<string, string> = {
  instagram: iconoInstagram,
  twitter: iconoTwitter,
  youtube: iconoYoutube,
  facebook: iconoFacebook,
};

/**
 * Pie de página: redes, texto y el selector de idioma. El idioma se detecta solo (del navegador); el selector
 * está aquí, discreto, para quien quiera cambiarlo. En una wiki recibe sus idiomas (pueden ser más que los del sitio).
 */
export default function Pie({ idiomas, idioma }: { idiomas?: IdiomaPublico[]; idioma?: string }) {
  const t = useTextos();
  const delSitio = useContext(SitioContexto)?.idiomas ?? [];
  const redes = useEnlaces("pie").filter((red) => ICONOS_PIE[red.plataforma]);

  return (
    <footer>
      <div className="socials">
        {redes.map((red) => (
          <a key={`${red.plataforma}-${red.url}`} href={red.url} target="_blank" rel="noopener noreferrer">
            <img src={ICONOS_PIE[red.plataforma]} alt={red.etiqueta || red.plataforma} />
          </a>
        ))}
      </div>
      <p>{t("pie.texto")}</p>
      <SelectorIdioma idiomas={idiomas ?? delSitio} actual={idioma} />
    </footer>
  );
}
