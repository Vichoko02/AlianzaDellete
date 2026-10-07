import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PlantillaWiki from "../componentes/PlantillaWiki";
import { ErrorApi, pedirWiki, urlMedio, type Wiki } from "../api";
import { useIdioma, useTextos } from "../textos";

/** Cambia las direcciones /api/medios/... por direcciones completas cuando el servidor está en otro dominio. */
function conDirecciones(wiki: Wiki): Wiki {
  const url = (direccion: string | null) => urlMedio(direccion) ?? null;
  return {
    ...wiki,
    cabecera: url(wiki.cabecera),
    logo: url(wiki.logo),
    videoPropio: url(wiki.videoPropio),
    creador: { ...wiki.creador, imagen: url(wiki.creador.imagen) },
    carrusel: wiki.carrusel.map((c) => urlMedio(c)!).filter(Boolean),
    personajes: wiki.personajes.map((p) => ({ ...p, imagen: url(p.imagen), imagenActorVoz: url(p.imagenActorVoz) })),
    equipo: wiki.equipo.map((g) => ({ ...g, miembros: g.miembros.map((m) => ({ ...m, imagen: url(m.imagen) })) })),
    galeria: wiki.galeria.map((g) => ({ ...g, url: urlMedio(g.url)! })),
  };
}

/** Ruta /wiki/:identificador. La key reinicia la página (y su estado) al pasar de un proyecto a otro. */
export default function RutaWiki() {
  const { identificador = "" } = useParams();
  const { idioma } = useIdioma();
  return <PaginaWiki key={`${identificador}:${idioma}`} identificador={identificador} idioma={idioma} />;
}

/** Wiki de cualquier proyecto. Todo su contenido viene de la base de datos. */
function PaginaWiki({ identificador, idioma }: { identificador: string; idioma: string }) {
  const t = useTextos();
  const [wiki, setWiki] = useState<Wiki | null>(null);
  const [error, setError] = useState<"no-existe" | "sin-conexion" | null>(null);

  useEffect(() => {
    let vigente = true;
    pedirWiki(identificador, idioma)
      .then((w) => {
        if (!vigente) return;
        setWiki(conDirecciones(w));
        document.title = `${w.nombre} · Alianza`;
      })
      .catch((e: unknown) => { if (vigente) setError(e instanceof ErrorApi && e.estado === 404 ? "no-existe" : "sin-conexion"); });
    return () => { vigente = false; };
  }, [identificador, idioma]);

  if (error) {
    return (
      <div className="estado-carga">
        <div>
          <p>{error === "no-existe" ? t("wiki.noEncontrada") : "No pudimos cargar este proyecto. Intenta de nuevo."}</p>
          <p><Link to="/#proyectos">← Volver a los proyectos</Link></p>
        </div>
      </div>
    );
  }
  if (!wiki) return <div className="estado-carga">Cargando…</div>;
  return <PlantillaWiki wiki={wiki} />;
}
