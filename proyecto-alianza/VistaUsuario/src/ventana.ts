import { useEffect } from "react";

/** Mientras una ventana está abierta: Escape la cierra y la página de fondo no se desplaza. */
export function useVentanaAbierta(alCerrar: () => void): void {
  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => { if (e.key === "Escape") alCerrar(); };
    document.addEventListener("keydown", alPresionar);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", alPresionar);
      document.body.style.overflow = "";
    };
  }, [alCerrar]);
}
