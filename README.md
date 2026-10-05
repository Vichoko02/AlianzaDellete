# Sitio de La Alianza

Sitio público en React + TypeScript + Vite. Los visitantes **no inician sesión**: solo leen.

Todo el contenido (textos, banners, socios, proyectos, wikis, estados y el formulario de postulación) viene del servidor (rama `programa/servidor`) y se edita en su panel. Lo único fijo en el sitio es el logo, los colores, las tipografías y los íconos.

## Cómo está organizado

```
src/
  main.tsx              Arranque
  Aplicacion.tsx        Tema claro/oscuro y rutas: /, /wiki/:identificador, /news
  api.ts                1) formatos que entrega el servidor  2) peticiones  3) direcciones de imágenes
  ProveedorSitio.tsx    Pide una vez los textos del sitio y los comparte con todas las páginas
  textos.ts             useTextos(), useListaImagenes(), useEnlaces() y los textos por defecto
  iconos.ts             Íconos de redes y plataformas de apoyo
  ventana.ts            Comportamiento común de las ventanas (Escape cierra, el fondo no se desplaza)
  paginas/              PaginaInicio, PaginaWiki y noticias/
  componentes/          Cabecera, BarraNavegacion, Carrusel, Eslogan, SobreNosotros, SeccionTarjetas, Unete,
                        Pie, BotonTema, VentanaSocio, VentanaApoyanos, VentanaPostulacion, PlantillaWiki
```

Los ganchos de React empiezan con `use` (`useTextos`, `useVentanaAbierta`) porque React lo exige para reconocerlos.

## Desarrollo

```bash
npm ci
npm run dev        # http://localhost:5173 — /api se redirige al servidor en http://localhost:5126
npm run build      # revisa tipos y genera dist/
npm run lint
```

En producción define `VITE_API_URL` con la dirección pública del servidor (por ejemplo `https://api.alianza.cl`).
