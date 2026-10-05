# Servidor de La Alianza

Servidor del sitio en **C# (.NET 8) + PostgreSQL**. También entrega el **panel de administración** en `/panel`.

Todo lo que el sitio muestra sale de la base de datos:
- el **estado** de cada serie (En Emisión, Cancelado…);
- las **imágenes y videos**, guardados en PostgreSQL;
- textos, personajes, equipo, galerías, redes y **socios**.

Solo el logo, los colores, las tipografías y los íconos quedan fijos en el sitio.

## Quién puede hacer qué

Los **visitantes no inician sesión**: solo leen. Las únicas cuentas son **administrativas**.

| Acción | Quién |
|---|---|
| Ver el sitio | Cualquiera, sin cuenta |
| Crear cuentas, dar permisos, activar «puede crear wikis» | **Solo YishAdmin** |
| Crear wikis | YishAdmin y las cuentas con «puede crear wikis» activado. Quien crea una wiki puede editarla |
| Editar una wiki | Permiso «Wikis» sobre **esa** wiki o sobre **todas** |
| Eliminar wikis | Solo YishAdmin |
| Socios / asociados | Permiso «Socios» |
| Catálogo de estados | Permiso «Estados» |
| Subir archivos | Cualquier cuenta. Eliminarlos requiere permiso «Medios» |
| Textos, imágenes y enlaces generales del sitio | Permiso «Sitio» |
| Ver postulaciones y editar el formulario | Solo YishAdmin |
| Ver la auditoría | Solo YishAdmin |

Solo existe un superadministrador: un índice único de PostgreSQL impide otro, y su cuenta no se puede desactivar ni eliminar.

## Puesta en marcha con Docker

```bash
cp .env.example .env
# Completa CONTRASENA_POSTGRES, CLAVE_SESIONES (openssl rand -hex 32) y SUPERADMIN_CONTRASENA
docker compose up -d --build
```

- Panel: http://127.0.0.1:8080/panel. Entra con `YishAdmin` y la contraseña de `SUPERADMIN_CONTRASENA`.
- `SUPERADMIN_CONTRASENA` **solo se usa la primera vez**, para crear la cuenta. Después se cambia desde **Mi cuenta**. Nunca la escribas en el repositorio.
- Salud: http://127.0.0.1:8080/salud

### Importar el contenido que tenía el sitio

`carga-inicial/contenido.json` trae las 10 wikis, los 4 socios y los banners de la portada. Para cargarlos con sus imágenes en una base vacía, define en `.env`:

```bash
IMPORTAR_CONTENIDO=true
CARPETA_IMAGENES_SITIO=/ruta/al/sitio/src/assets
```

La importación es de todo o nada y solo ocurre si la base no tiene series. Las imágenes repetidas se guardan una vez.

### Con LDAP

Levanta antes el LDAP (rama `programa/ldap`) y luego:

```bash
docker compose -f docker-compose.yml -f docker-compose.ldap.yml up -d --build
```

Cada cuenta nueva tiene un **origen**:
- **Local**: contraseña con hash BCrypt en PostgreSQL;
- **LDAP**: la cuenta vive en el directorio y su contraseña se valida allí.

Los permisos se reflejan como grupos LDAP (`alianza-wikis`, `alianza-wiki-<identificador>`, `alianza-socios`…). YishAdmin es siempre local, para poder entrar aunque el LDAP no responda.

## Cómo está organizado

```
servidor/
  Inicio.cs        Arranque, en orden: configuración → servicios → sesiones → API → base de datos → recorrido de cada petición
  Datos/           Entidades, BaseDeDatos (EF Core), CargaInicial y migraciones
  Seguridad/       Configuración, contraseñas y sesiones, usuario actual con sus permisos, directorio LDAP
  Modulos/         Un archivo por tema. Cada uno trae, en orden: 1) formatos  2) lógica  3) rutas públicas  4) rutas del panel
                   Series, Socios, Estados, Medios, Sitio, Postulaciones, Usuarios, Sesion, Panel, Comunes
  publico/panel/   HTML, CSS, fuentes y logos del panel (el JS se compila desde panel/)
panel/             Código del panel en TypeScript estricto, sin dependencias
carga-inicial/     Contenido que tenía el sitio escrito a mano
pruebas/           Pruebas de integración (xUnit + PostgreSQL real)
```

Cada método declara sus variables al inicio y marca sus pasos con comentarios numerados (`// 1.`, `// 2.`), en el orden en que ocurren.

## Desarrollo local

```bash
npm ci                                   # TypeScript para el panel
export Sesiones__Clave=$(openssl rand -hex 32) Superadmin__Contrasena='TuClaveSegura123'
# opcional: export CargaInicial__ImportarContenido=true CargaInicial__CarpetaImagenes=/ruta/al/sitio/src/assets
cd servidor && dotnet run                # → http://localhost:5126/panel
```

`appsettings.Development.json` usa un PostgreSQL local con `postgres/postgres`. `dotnet build` compila también el panel (necesita Node 20+).

| Comando | Qué hace |
|---|---|
| `dotnet test` | Pruebas contra una base desechable. Usa `PRUEBAS_POSTGRES` o `Host=localhost;Username=postgres;Password=postgres` |
| `npm run build` | Compila `panel/*.ts` → `servidor/publico/panel/*.js` |
| `npm run watch` | Recompila el panel al guardar |
| `dotnet ef migrations add NombreDelCambio -p servidor -o Datos/Migraciones` | Nueva migración (se aplican solas al arrancar) |

## API

### Pública (sin sesión)

| Ruta | Devuelve |
|---|---|
| `GET /api/sitio` | Textos, imágenes y enlaces generales: `{ textos, listas, enlaces }` |
| `GET /api/estados` | Estados `{codigo, nombre, color}` |
| `GET /api/series[?estado=en-emision]` | Tarjetas de la portada `{identificador, nombre, imagen, enlace, estado}` |
| `GET /api/series/{identificador}` | Wiki completa |
| `GET /api/socios`, `GET /api/socios/{identificador}` | Socios con sus proyectos |
| `GET /api/medios/{id}` | Imagen o video, con caché y ETag |
| `GET /api/formulario` | Pasos del formulario «Postula tu proyecto» (3 a 5) |
| `POST /api/formulario/postulaciones` | Envía una postulación. Máximo 5 cada 10 minutos por IP, con campo trampa contra bots |

### Panel (con sesión)

- `POST /api/sesion/iniciar` devuelve la sesión. También existen `GET /api/sesion/perfil` y `POST /api/sesion/cambiar-contrasena`.
- El resto vive bajo `/api/panel/`: `series`, `socios`, `estados`, `medios`, `sitio`, `resumen`, `configuracion`, y para YishAdmin `usuarios`, `formulario`, `postulaciones` y `auditoria`.

Cada postulación aparece en **Panel → Postulaciones**. El panel revisa cada 30 segundos y avisa con un número en el menú y en la pestaña. Abrir una postulación la marca como leída.

## Seguridad

- **Contraseñas**: BCrypt, mínimo 10 caracteres con letras y números. Iniciar sesión no revela si una cuenta existe. Máximo 10 intentos por minuto por IP.
- **Sesiones de 8 horas que se cierran al instante** si la cuenta se desactiva o cambia su contraseña.
- **Permisos leídos en cada petición**: quitar un permiso vale de inmediato.
- **Validaciones**:
  - los enlaces solo aceptan `http(s)`;
  - los archivos se validan por su contenido, no solo por la extensión;
  - si dos personas editan la misma wiki, la segunda recibe un aviso en vez de pisar los cambios.
- **Panel sin dependencias externas** y con CSP estricta. Todo texto se inserta como texto, nunca como HTML.
- **Auditoría** de cada creación, edición, eliminación y cambio de permisos.
