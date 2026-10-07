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
  iconos.ts             Nombre y color de cada red y plataforma de apoyo
  assets/iconos/        TODOS los íconos del sitio, un SVG por ícono (redes, cerrar, flechas, sol/luna...).
                        Para cambiar uno, reemplaza su archivo; se usan con <Icono nombre="cerrar" />
  ventana.ts            Comportamiento común de las ventanas (Escape cierra, el fondo no se desplaza)
  paginas/              PaginaInicio, PaginaWiki y noticias/
  componentes/          Cabecera, BarraNavegacion, Carrusel, Eslogan, SobreNosotros, SeccionTarjetas, Unete,
                        Pie, BotonTema, VentanaSocio, VentanaApoyanos, VentanaPostulacion, PlantillaWiki
```

Los ganchos de React empiezan con `use` (`useTextos`, `useVentanaAbierta`) porque React lo exige para reconocerlos.

## Idiomas

El sitio está escrito en **español**, su idioma principal y el de su público. Además se ofrece en inglés, portugués (Brasil), francés y alemán; desde el panel se pueden agregar o quitar idiomas.

**El idioma se detecta solo, del navegador.** El servidor lo lee de la cabecera `Accept-Language` que todo navegador envía, así que la página llega directo en ese idioma, sin pasar antes por el español:
- un navegador en español ve español;
- uno en `pt-PT` ve portugués de Brasil;
- uno en japonés que también acepta inglés ve inglés;
- uno en un idioma que el sitio no ofrece ve español.

No hay selector en la barra de navegación. Hay uno discreto en el pie de página para quien quiera cambiar el idioma; esa elección se recuerda y manda sobre la del navegador.

## Desarrollo

```bash
npm ci
npm run dev        # http://localhost:5173 — /api se redirige al servidor en http://localhost:5126
npm run build      # revisa tipos y genera dist/
npm run lint
```

En producción define `VITE_API_URL` con la dirección pública del servidor (por ejemplo `https://api.alianza.cl`).
