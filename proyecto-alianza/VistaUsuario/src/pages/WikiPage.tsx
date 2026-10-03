import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ProjectWikiTemplate, { type ProjectWikiData } from "../components/ProjectWikiTemplate";
import { apiWiki, ErrorApi, urlMedio, type WikiApi } from "../api";
import { useTextos } from "../textos";

/** Convierte las rutas /api/medios/... de la wiki en URLs completas cuando la API está en otro dominio. */
function conUrls(w: WikiApi): ProjectWikiData {
  const u = (x: string | null | undefined) => urlMedio(x);
  return {
    ...w,
    banner: u(w.banner),
    logo: u(w.logo),
    videoLocal: u(w.videoLocal),
    creador: { ...w.creador, imagen: u(w.creador.imagen) },
    carrusel: w.carrusel.map((c) => u(c)!).filter(Boolean),
    personajes: w.personajes?.map((p) => ({ ...p, imagen: u(p.imagen), imagenActorVoz: u(p.imagenActorVoz) })),
    staff: w.staff.map((g) => ({ ...g, miembros: g.miembros.map((m) => ({ ...m, imagen: u(m.imagen) })) })),
    galeria: w.galeria.map((g) => ({ ...g, src: u(g.src)! })),
  };
}

/** Ruta /wiki/:slug. La key reinicia la página (y su estado) al cambiar de proyecto. */
export default function WikiRuta() {
  const { slug = "" } = useParams();
  return <WikiPage key={slug} slug={slug} />;
}

/** Wiki de cualquier proyecto. El contenido viene completo de la base de datos. */
function WikiPage({ slug }: { slug: string }) {
  const t = useTextos();
  const [wiki, setWiki] = useState<ProjectWikiData | null>(null);
  const [error, setError] = useState<"no-existe" | "red" | null>(null);

  useEffect(() => {
    let vivo = true;
    apiWiki(slug)
      .then((w) => { if (vivo) { setWiki(conUrls(w)); document.title = `${w.nombre} · Alianza`; } })
      .catch((e: unknown) => { if (vivo) setError(e instanceof ErrorApi && e.estado === 404 ? "no-existe" : "red"); });
    return () => { vivo = false; };
  }, [slug]);

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
  return <ProjectWikiTemplate data={wiki} />;
}
