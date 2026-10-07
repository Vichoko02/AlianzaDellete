import type { IdiomaPublico } from "../api";
import { useIdioma } from "../textos";

/** Selector de idioma. Solo aparece si hay algún idioma además del español. */
export default function SelectorIdioma({ idiomas, clase = "" }: { idiomas: IdiomaPublico[]; clase?: string }) {
  const { idioma, cambiar } = useIdioma();
  if (idiomas.length === 0) return null;

  return (
    <select className={`selector-idioma ${clase}`} value={idiomas.some((i) => i.codigo === idioma) ? idioma : "es"}
      onChange={(e) => cambiar(e.target.value)} aria-label="Idioma / Language">
      <option value="es">Español</option>
      {idiomas.map((i) => <option key={i.codigo} value={i.codigo}>{i.nombre}</option>)}
    </select>
  );
}
