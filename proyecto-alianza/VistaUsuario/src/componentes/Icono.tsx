// Todos los íconos del sitio son archivos locales en src/assets/iconos (uno por ícono, 24×24, color = el del texto).
// Para cambiar un ícono basta con reemplazar su archivo; para agregar uno, se suma un archivo nuevo con su nombre.
const archivos = import.meta.glob("../assets/iconos/*.svg", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const ICONOS_SVG: Record<string, string> = Object.fromEntries(
  Object.entries(archivos).map(([ruta, svg]) => [ruta.slice(ruta.lastIndexOf("/") + 1, -".svg".length), svg]));

/** Ícono por nombre de archivo ("cerrar", "instagram"...). Si no existe, se usa "enlace". */
export default function Icono({ nombre, tamano = 20, clase = "" }: { nombre: string; tamano?: number; clase?: string }) {
  // Los SVG vienen de archivos del propio proyecto (no del servidor ni de visitantes): es seguro insertarlos tal cual.
  return (
    <span className={`icono ${clase}`} style={{ width: tamano, height: tamano }} aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: ICONOS_SVG[nombre] ?? ICONOS_SVG.enlace }} />
  );
}
