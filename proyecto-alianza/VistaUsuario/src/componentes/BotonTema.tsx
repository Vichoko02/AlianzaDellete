import Icono from "./Icono";

/** Botón flotante para cambiar entre modo claro y oscuro. */
export default function BotonTema({ modoOscuro, alCambiar }: { modoOscuro: boolean; alCambiar: () => void }) {
  return (
    <button
      className={`theme-toggle-fab ${modoOscuro ? "dark" : "light"}`}
      onClick={alCambiar}
      aria-label={modoOscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={modoOscuro ? "Modo claro" : "Modo oscuro"}
    >
      <Icono nombre={modoOscuro ? "sol" : "luna"} />
    </button>
  );
}
