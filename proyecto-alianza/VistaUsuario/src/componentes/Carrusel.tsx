import { useListaImagenes } from "../textos";

/** Banners de la portada, en bucle. Se administran en el panel (Textos del sitio → Portada). */
export default function Carrusel() {
  const imagenes = useListaImagenes("inicio.carrusel");
  const imagenesDobles = [...imagenes, ...imagenes]; // la segunda vuelta hace que el bucle no se corte

  return (
    <div className="header-carousel-container">
      <div className="carousel-track">
        {imagenesDobles.map((url, indice) => (
          <img key={indice} src={url} alt="" aria-hidden={indice >= imagenes.length} />
        ))}
      </div>
    </div>
  );
}
