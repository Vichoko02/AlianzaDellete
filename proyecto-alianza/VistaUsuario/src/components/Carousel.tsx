import { useListaImagenes } from "../textos";

/** Banners de la portada: se administran en el panel (Textos del sitio → Portada). */
export default function Carousel() {
  const imagenes = useListaImagenes("inicio.carrusel");
  const imagenesDobles = [...imagenes, ...imagenes];

  return (
    <div className="header-carousel-container">
      <div className="carousel-track">
        {imagenesDobles.map((src, index) => (
          <img
            key={index}
            src={src}
            alt=""
            aria-hidden={index >= imagenes.length}
          />
        ))}
      </div>
    </div>
  );
}
