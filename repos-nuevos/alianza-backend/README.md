# alianza-backend

API REST de La Alianza en **C# (.NET 8) + PostgreSQL**. Incluye un **panel de administración** en `/admin`.

Todo el contenido que hoy está escrito a mano en el frontend sale de la base de datos:
- el **estado** de cada serie (En Emisión, Cancelado…);
- **imágenes y videos**, guardados en PostgreSQL;
- descripciones, personajes, equipo, galerías, redes y **socios**.

## Quién puede hacer qué

Los **visitantes del sitio no inician sesión**: la API pública es de solo lectura y no pide cuenta. Solo existen cuentas **administrativas**.

| Acción | Quién |
|---|---|
| Ver el sitio (API pública) | Cualquiera, sin cuenta |
| Crear usuarios, asignar permisos, activar «puede crear wikis» | **Solo YishAdmin** (superadmin) |
| Crear wikis nuevas | YishAdmin y usuarios con el bool **«puede crear wikis»** que YishAdmin activa. Quien crea una wiki recibe permiso para editarla |
| Editar una wiki | Permiso «Wikis» sobre **esa** wiki o sobre **todas** |
| Eliminar wikis | Solo YishAdmin |
| Crear, editar y eliminar socios / asociados | Permiso «Socios» (YishAdmin siempre) |
| Administrar el catálogo de estados | Permiso «Estados» |
| Subir archivos | Cualquier cuenta administrativa |
| Eliminar archivos | Permiso «Medios» |
| Ver la auditoría | Solo YishAdmin |

Garantías:
- **Un solo superadmin**: la API nunca permite otorgar ese rol, y un índice único de PostgreSQL impide que exista otro.
- La cuenta de YishAdmin **no se puede desactivar ni eliminar**.

## Puesta en marcha con Docker

```bash
cp .env.example .env
# Completa POSTGRES_PASSWORD, JWT_CLAVE (openssl rand -hex 32) y ADMIN_PASSWORD
docker compose up -d --build
```

- Panel: http://127.0.0.1:8080/admin. Inicia sesión con `YishAdmin` y la contraseña de `ADMIN_PASSWORD`.
- API pública: http://127.0.0.1:8080/api/series
- Salud: http://127.0.0.1:8080/salud

`ADMIN_PASSWORD` **solo se usa la primera vez**, para crear la cuenta. Después puedes quitarla del `.env` y cambiarla desde **Mi cuenta**. Nunca la escribas en el repositorio.

### Importar el contenido actual del sitio

`seed/seed-data.json` trae los datos de las 10 wikis, los 4 socios y la portada, extraídos del frontend (`VistaUsuario`). Para cargarlos junto con sus 142 imágenes en una base vacía:

```bash
# en .env
IMPORTAR_CONTENIDO=true
RUTA_ASSETS_FRONTEND=/ruta/a/AlianzaDellete/proyecto-alianza/VistaUsuario/src/assets
```

La importación ocurre una sola vez: si ya hay series, no hace nada. Es transaccional, así que si algo falla no deja datos a medias. Las imágenes repetidas se guardan una sola vez (deduplicación por SHA-256).

### Con LDAP

Levanta antes el repositorio `alianza-ldap` y luego:

```bash
docker compose -f docker-compose.yml -f docker-compose.ldap.yml up -d --build
```

Con LDAP habilitado, al crear un usuario YishAdmin elige su **origen**:
- **Local**: la contraseña se guarda como hash BCrypt en PostgreSQL.
- **LDAP**: el usuario se crea en el directorio y su contraseña se valida allí.

Los permisos se **reflejan como grupos** LDAP (`alianza-wikis`, `alianza-wiki-<slug>`, `alianza-socios`…). Al desactivar un usuario se le quitan los grupos y se bloquea su cuenta en el directorio.

YishAdmin es siempre **local**: si el LDAP cae, igual puede entrar.

## Desarrollo local (sin Docker)

```bash
# PostgreSQL local con usuario postgres/postgres (ver appsettings.Development.json)
export Jwt__Clave=$(openssl rand -hex 32) Admin__Password='TuClaveSegura123'
# opcional: export Seed__ImportarContenido=true Seed__CarpetaAssets=/ruta/a/VistaUsuario/src/assets
cd src/Alianza.Api && dotnet run
# → http://localhost:5126/admin  ·  Swagger en http://localhost:5126/swagger
```

Pruebas de integración, contra un PostgreSQL real con una base desechable por ejecución:

```bash
dotnet test        # usa ALIANZA_TEST_PG o Host=localhost;Username=postgres;Password=postgres
```

Migraciones (EF Core). Se aplican solas al arrancar (`Seed__Migrar=true`):

```bash
dotnet tool install -g dotnet-ef --version 8.0.11
dotnet ef migrations add NombreDelCambio -p src/Alianza.Api -o Data/Migraciones
```

## API pública (sin sesión)

| Método y ruta | Devuelve |
|---|---|
| `GET /api/estados` | Catálogo de estados `{codigo, nombre, color}` |
| `GET /api/series[?estado=en-emision]` | Tarjetas de la portada `{id, nombre, imagen, enlace, estado}` |
| `GET /api/series/{slug}` | Wiki completa, con **la misma forma que `ProjectWikiData`** del frontend, más `estadoInfo` y `socios` |
| `GET /api/socios`, `GET /api/socios/{slug}` | Socios, con **la misma forma que `Socio`** de `SocioModal.tsx` |
| `GET /api/medios/{id}` | Imagen o video desde PostgreSQL. Usa caché inmutable y ETag |

### Conectar el frontend

Los componentes ya esperan estas formas, así que el cambio es reemplazar los objetos escritos a mano por un `fetch`:

```tsx
// MetrecaliaWiki.tsx → una sola ruta genérica /wiki/:slug
const { slug } = useParams();
const [data, setData] = useState<ProjectWikiData | null>(null);
useEffect(() => {
  fetch(`${import.meta.env.VITE_API_URL}/api/series/${slug}`).then(r => r.json()).then(setData);
}, [slug]);
return data ? <ProjectWikiTemplate data={data} /> : null;
```

Para la etiqueta de estado conviene usar `data.estadoInfo.color` y `data.estadoInfo.codigo` en vez de comparar textos. Así, un estado nuevo creado en el panel se ve bien sin tocar el CSS.

Define `URL_PUBLICA_API` y `CORS_ORIGEN_SITIO` en `.env` para que las imágenes tengan URL absoluta y el sitio tenga permiso para llamar a la API.

## API del panel (requiere sesión)

`POST /api/auth/login` devuelve un JWT. Las demás rutas van bajo `/api/admin/*`:
`series`, `socios`, `estados`, `medios`, `usuarios` (solo superadmin), `auditoria` (solo superadmin) y `resumen`.

La documentación interactiva está en `/swagger` (en desarrollo, o con `SWAGGER=true`).

## Seguridad

- **Contraseñas**: BCrypt (coste 12), mínimo 10 caracteres con letras y números. El login no revela si un usuario existe, ni por el mensaje ni por el tiempo de respuesta, y tiene límite de 10 intentos por minuto por IP.
- **Sesiones JWT de 8 horas** que se **revocan al instante**: el token deja de valer al desactivar al usuario o al cambiar o restablecer su contraseña (sello de seguridad comprobado en cada petición).
- **Permisos leídos de la BD en cada petición**: quitar un permiso vale de inmediato.
- **Validaciones**: los enlaces solo aceptan `http(s)`, lo que bloquea `javascript:`. Los archivos subidos se validan por **firma binaria**, no solo por extensión. Los SVG se sirven en sandbox con CSP.
- **Concurrencia**: si dos personas editan la misma wiki, la segunda recibe un aviso en vez de pisar los cambios.
- **Panel sin dependencias externas** y con CSP estricta. Todo el texto se inserta como texto, nunca como HTML.
- **Auditoría**: queda registro de cada creación, edición, eliminación y cambio de permisos.

## Estructura

```
src/Alianza.Api/
  Domain/        Entidades (Serie, EstadoSerie, Personaje, GrupoEquipo, Socio, Medio, Usuario, PermisoUsuario…)
  Data/          DbContext, migraciones e inicializador (estados, superadmin, importación)
  Auth/          JWT, BCrypt, usuario actual con permisos, integración LDAP
  Services/      Lógica de series, socios, medios, usuarios y auditoría
  Controllers/   API pública y Admin/*
  wwwroot/admin/ Panel de administración (HTML + CSS + JS sin build)
seed/            Datos extraídos del frontend
tests/           Pruebas de integración (xUnit + PostgreSQL)
```
