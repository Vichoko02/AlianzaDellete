import { useState } from "react";
import { Link } from "react-router-dom";
import StoreHeader from "../components/store/StoreHeader";
import Footer from "../components/Footer";
import imgArmados    from "../assets/Armados/Armados.webp";
import imgGarabato   from "../assets/Garabato/Garabato-studio.webp";
import imgMetrecalia from "../assets/Metrecalia/Metrecalia.webp";
import imgCrunch     from "../assets/Crunch/Crunch.webp";
import imgCrunchFizz from "../assets/CrunchFizz/CrunchFizz.webp";
import imgTecnosis   from "../assets/Tecnosis/Tecnosis.webp";
import imgEmesis     from "../assets/Emesis/emesisblue.webp";
import TripleBoca from "../assets/TripleBoca/TripleBoca.webp";
import TBTF from "../assets/TheBraveAndTheFuriousAndTheJackass/TBTF.webp";
import bannerCrunch from "../assets/Banner/CrunchBanner.webp";
import bannerMetrecalia from "../assets/Banner/MetrecaliaBanner.webp";
import bannerArmados from "../assets/Banner/ArmadosBanner.webp";
import bannerTBTF from "../assets/Banner/TBTFBanner.webp";

interface Producto {
  id: string;
  nombre: string;
  proyecto: string;
  proyectoSlug: string;
  proyectoImagen: string;
  precio: number;
  tipo: "Ropa" | "Accesorios" | "Digital" | "Impresos";
  imagen: string;
  disponible: boolean;
}

const proyectos = [
  { nombre: "MAF Studios",    imagen: imgArmados,    slug: "maf-studios" },
  { nombre: "Garabato Studio", imagen: imgGarabato,   slug: "garabato" },
  { nombre: "Metrecalia",     imagen: imgMetrecalia, slug: "metrocalia" },
  { nombre: "Crunch",         imagen: imgCrunch,     slug: "crunch" },
  { nombre: "Crunch Fizz",    imagen: imgCrunchFizz, slug: "crunch-fizz" },
  { nombre: "Tecnosis",       imagen: imgTecnosis,   slug: "tecnosis" },
  { nombre: "Emesis Blue",    imagen: imgEmesis,     slug: "emesis" },
  { nombre: "Triple Boca",    imagen: TripleBoca,    slug: "triple-boca" },
  { nombre: "TBFAJ",         imagen: TBTF,         slug: "tbfaj" },
];

const productosEjemplo: Producto[] = [
  { id: "1", nombre: "Camiseta Crunch", proyecto: "Crunch", proyectoSlug: "crunch", proyectoImagen: imgCrunch, precio: 2500, tipo: "Ropa", imagen: imgCrunch, disponible: true },
  { id: "2", nombre: "Poster Metrecalia", proyecto: "Metrecalia", proyectoSlug: "metrocalia", proyectoImagen: imgMetrecalia, precio: 1500, tipo: "Impresos", imagen: imgMetrecalia, disponible: true },
  { id: "3", nombre: "Sticker Pack Triple Boca", proyecto: "Triple Boca", proyectoSlug: "triple-boca", proyectoImagen: TripleBoca, precio: 800, tipo: "Accesorios", imagen: TripleBoca, disponible: true },
  { id: "4", nombre: "Sudadera Garabato", proyecto: "Garabato Studio", proyectoSlug: "garabato", proyectoImagen: imgGarabato, precio: 4500, tipo: "Ropa", imagen: imgGarabato, disponible: true },
  { id: "5", nombre: "Pin Collection Tecnosis", proyecto: "Tecnosis", proyectoSlug: "tecnosis", proyectoImagen: imgTecnosis, precio: 600, tipo: "Accesorios", imagen: imgTecnosis, disponible: false },
  { id: "6", nombre: "Art Print Emesis Blue", proyecto: "Emesis Blue", proyectoSlug: "emesis", proyectoImagen: imgEmesis, precio: 2000, tipo: "Impresos", imagen: imgEmesis, disponible: true },
  { id: "7", nombre: "Taza TBFAJ", proyecto: "TBFAJ", proyectoSlug: "tbfaj", proyectoImagen: TBTF, precio: 1200, tipo: "Accesorios", imagen: TBTF, disponible: true },
  { id: "8", nombre: "Hoodie Crunch Fizz", proyecto: "Crunch Fizz", proyectoSlug: "crunch-fizz", proyectoImagen: imgCrunchFizz, precio: 5500, tipo: "Ropa", imagen: imgCrunchFizz, disponible: true },
];

const tiposProducto = ["Todos", "Ropa", "Accesorios", "Digital", "Impresos"];

export default function StorePage() {
  const [filtroProyecto, setFiltroProyecto] = useState<string>("Todos");
  const [filtroTipo, setFiltroTipo] = useState<string>("Todos");
  const [ordenarPor, setOrdenarPor] = useState<string>("nombre");
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [carrito, setCarrito] = useState<Producto[]>([]);

  const filteredProductos = productosEjemplo
    .filter(p => filtroProyecto === "Todos" || p.proyectoSlug === filtroProyecto)
    .filter(p => filtroTipo === "Todos" || p.tipo === filtroTipo)
    .sort((a, b) => {
      if (ordenarPor === "precio-asc") return a.precio - b.precio;
      if (ordenarPor === "precio-desc") return b.precio - a.precio;
      return a.nombre.localeCompare(b.nombre);
    });

  const agregarAlCarrito = (producto: Producto) => {
    if (!carrito.find(p => p.id === producto.id)) {
      setCarrito([...carrito, producto]);
    }
  };

  const eliminarDelCarrito = (id: string) => {
    setCarrito(carrito.filter(p => p.id !== id));
  };

  const totalCarrito = carrito.reduce((sum, p) => sum + p.precio, 0);

  const heroImages = [bannerTBTF, bannerMetrecalia, bannerCrunch, bannerArmados];
  const heroImagesDoble = [...heroImages, ...heroImages];

  return (
    <>
      <StoreHeader />
      <div className="store-page">
        <div className="store-hero">
          <div className="header-carousel-container">
            <div className="carousel-track">
              {heroImagesDoble.map((src, index) => (
                <img key={index} src={src} alt={`Banner tienda ${index}`} />
              ))}
            </div>
          </div>
          <div className="store-hero-overlay"></div>
          <div className="store-hero-content">
            <h1>Merch Oficial</h1>
            <p>Productos de todos nuestros proyectos</p>
          </div>
        </div>

        <div className="store-filters">
          <div className="store-filter-group">
            <span className="store-filter-label">Proyecto</span>
            <div className="store-filter-pills">
              <button 
                className={`store-filter-pill ${filtroProyecto === "Todos" ? "active" : ""}`}
                onClick={() => setFiltroProyecto("Todos")}
              >
                Todos
              </button>
              {proyectos.map(p => (
                <button 
                  key={p.slug}
                  className={`store-filter-pill ${filtroProyecto === p.slug ? "active" : ""}`}
                  onClick={() => setFiltroProyecto(p.slug)}
                >
                  {p.nombre}
                </button>
              ))}
            </div>
          </div>

          <div className="store-filter-row">
            <div className="store-filter-group store-filter-group--compact">
              <span className="store-filter-label">Tipo</span>
              <select 
                value={filtroTipo} 
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="store-select"
              >
                {tiposProducto.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="store-filter-group store-filter-group--compact">
              <span className="store-filter-label">Ordenar</span>
              <select 
                value={ordenarPor} 
                onChange={(e) => setOrdenarPor(e.target.value)}
                className="store-select"
              >
                <option value="nombre">Nombre A-Z</option>
                <option value="precio-asc">Precio: menor a mayor</option>
                <option value="precio-desc">Precio: mayor a menor</option>
              </select>
            </div>

            <button 
              className="store-cart-btn"
              onClick={() => setCarritoAbierto(true)}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
              </svg>
              <span>Carrito</span>
              {carrito.length > 0 && <span className="store-cart-count">{carrito.length}</span>}
            </button>
          </div>
        </div>

        <div className="store-products-section">
          <div className="store-products-grid">
            {filteredProductos.map((producto) => (
              <div key={producto.id} className="store-product-card">
                <div className="store-product-image">
                  <img src={producto.imagen} alt={producto.nombre} />
                  {!producto.disponible && (
                    <div className="store-product-badge store-product-badge--agotado">
                      Agotado
                    </div>
                  )}
                  <div className="store-product-overlay">
                    <Link 
                      to={`/store/project/${producto.proyectoSlug}`}
                      className="store-product-link"
                    >
                      <img src={producto.proyectoImagen} alt={producto.proyecto} />
                      <span>{producto.proyecto}</span>
                    </Link>
                  </div>
                </div>
                <div className="store-product-info">
                  <span className="store-product-tipo">{producto.tipo}</span>
                  <h3 className="store-product-nombre">{producto.nombre}</h3>
                  <div className="store-product-footer">
                    <span className="store-product-precio">
                      ${(producto.precio / 100).toFixed(2)}
                    </span>
                    <button 
                      className={`store-product-btn ${!producto.disponible ? "disabled" : ""}`}
                      disabled={!producto.disponible}
                      onClick={() => agregarAlCarrito(producto)}
                    >
                      {producto.disponible ? "Añadir" : "Agotado"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredProductos.length === 0 && (
            <div className="store-empty">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
                <path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-4.86 8.86l-3 3.87L9 13.14 6 17h12l-3.86-5.14z"/>
              </svg>
              <p>No hay productos que coincidan con los filtros</p>
            </div>
          )}
        </div>
      </div>

      {carritoAbierto && (
        <div className="store-cart-overlay" onClick={() => setCarritoAbierto(false)}>
          <div className="store-cart-panel" onClick={e => e.stopPropagation()}>
            <div className="store-cart-header">
              <h2>Tu Carrito</h2>
              <button className="store-cart-close" onClick={() => setCarritoAbierto(false)}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>

            <div className="store-cart-items">
              {carrito.length === 0 ? (
                <p className="store-cart-empty">Tu carrito está vacío</p>
              ) : (
                carrito.map(item => (
                  <div key={item.id} className="store-cart-item">
                    <img src={item.imagen} alt={item.nombre} />
                    <div className="store-cart-item-info">
                      <h4>{item.nombre}</h4>
                      <span>{item.proyecto}</span>
                    </div>
                    <span className="store-cart-item-precio">
                      ${(item.precio / 100).toFixed(2)}
                    </span>
                    <button 
                      className="store-cart-item-remove"
                      onClick={() => eliminarDelCarrito(item.id)}
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>

            {carrito.length > 0 && (
              <div className="store-cart-footer">
                <div className="store-cart-total">
                  <span>Total</span>
                  <span>${(totalCarrito / 100).toFixed(2)}</span>
                </div>
                <button className="store-checkout-btn">
                  Proceder al Pago
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      <Footer />
    </>
  );
}
