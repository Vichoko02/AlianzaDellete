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

## Puesta en marcha (sin contenedores)

Pensado para un servidor pequeño (Ubuntu o Debian, ~1 GB de RAM). Todo corre directo en el sistema:

| Pieza | Qué es | Memoria aprox. |
|---|---|---|
| `alianza-servidor` (systemd) | Este servidor, autocontenido: trae su propio .NET | 150–250 MB (más al subir archivos grandes) |
| PostgreSQL | Del sistema, configurado para poca memoria (`sistema/postgresql-pequeno.conf`) | 40–80 MB |
| nginx | Entrega el sitio (archivos ya comprimidos) y pasa `/api` y `/panel` al servidor | ~5 MB |
| `alianza-ldap` (opcional) | Rama `programa/ldap` | ~25 MB |

### 1. Armar el paquete (en tu computador, no en el servidor)

Necesita .NET 8 SDK y Node 20+. Descarga todo una sola vez y deja **un archivo con todo incluido**: el servidor no descarga nada al instalarse, salvo PostgreSQL y nginx de los repositorios del sistema.

```bash
./empaquetar.sh /ruta/a/la/rama/programa/sitio        # ARQUITECTURA=linux-arm64 para servidores ARM
# → paquete/alianza-AAAAMMDD-HHMM-linux-x64.tar.gz (~55 MB)
```

### 2. Instalar o actualizar en el servidor

```bash
scp paquete/alianza-*.tar.gz servidor:
ssh servidor
tar xzf alianza-*.tar.gz && cd alianza-*/
sudo ./instalar.sh     # la primera vez pide definir Superadmin__Contrasena en /etc/alianza/servidor.env
sudo ./instalar.sh     # la segunda vez deja todo funcionando
```

- Panel: `http://<servidor>/panel`. Entra con `YishAdmin` y la contraseña de `Superadmin__Contrasena`.
- Esa contraseña **solo se usa la primera vez**: después bórrala de `/etc/alianza/servidor.env` y cámbiala desde **Mi cuenta**.
- HTTPS: `sudo apt install certbot python3-certbot-nginx && sudo certbot --nginx -d tu-dominio`.
- Para actualizar, se arma un paquete nuevo y se vuelve a ejecutar `instalar.sh`: los datos y la configuración se conservan.

`instalar.sh` crea el usuario de sistema `alianza` y la base `alianza`. Se conecta por socket local, sin contraseña de base de datos. La clave de sesiones se genera al azar.

### Importar el contenido que tenía el sitio

`carga-inicial/contenido.json` trae las 10 wikis, los 4 socios y los banners de la portada. Para cargarlos con sus imágenes en una base vacía, copia la carpeta `src/assets` del sitio al servidor y define en `/etc/alianza/servidor.env`:

```bash
CargaInicial__ImportarContenido=true
CargaInicial__CarpetaImagenes=/ruta/a/assets
```

La importación es de todo o nada y solo ocurre si la base no tiene series. Las imágenes repetidas se guardan una vez.

### Con LDAP

Instala antes el LDAP (rama `programa/ldap`, `sudo ./instalar.sh`). Luego activa `Ldap__Habilitado=true` en `/etc/alianza/servidor.env`, con la misma contraseña de la cuenta de servicio, y reinicia con `sudo systemctl restart alianza-servidor`.

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
servidor/publico/panel/iconos.svg   Íconos del panel (los mismos dibujos que el sitio)
sistema/           Servicio systemd, nginx, PostgreSQL para poca memoria y ejemplo de configuración
empaquetar.sh      Arma el paquete con todo incluido
instalar.sh        Instala o actualiza en el servidor
```

### Para gastar pocos recursos

- **Caché pública en memoria**: el sitio, las wikis, los socios y el formulario se calculan una vez. Cualquier cambio hecho desde el panel la vacía, así que los visitantes casi no consultan la base de datos.
- **Una sola petición para la portada**: `/api/sitio` trae textos, enlaces, series y socios juntos.
- **Recolector de basura de estación de trabajo**, sin datos de culturas (ICU) y con un tope de memoria en el servicio.
- **Servidor precompilado (ReadyToRun)**: arranca rápido y usa menos CPU al inicio.
- **Sitio servido por nginx con archivos ya comprimidos**: no se comprime en cada visita. Lo que tiene nombre por versión se guarda un año en el navegador. Las imágenes de `/api/medios` también.
- **Sin dependencias externas en tiempo de ejecución**: tipografías alojadas en el sitio y en el panel, sin CDNs. Las versiones de los paquetes quedan fijas en `packages.lock.json` y `package-lock.json`.

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
| `GET /api/sitio` | Todo lo de la portada: `{ textos, listas, enlaces, series, socios }` |
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

## Idiomas

El sitio está en **español**, su idioma principal y original. Al instalarlo se ofrecen además, con traducción automática, los idiomas más hablados de los países que pueden visitarlo: **inglés, portugués (Brasil), francés y alemán**. Se siembran una sola vez: si Yish quita alguno, no vuelve. Cada idioma puede ser de **traducción automática o manual**:

| Dónde | Quién | Qué decide |
|---|---|---|
| **Panel → Textos del sitio → Idiomas del sitio** | Permiso «Sitio» (Yish) | Idiomas de todo el sitio: portada, menú, socios, estados y formulario |
| **Pestaña «Idiomas» de cada wiki** | Quien puede editar esa wiki | Idiomas extra solo para su wiki. También puede cambiar si un idioma del sitio es automático o manual en su wiki |

- **Automática**: DeepL traduce en segundo plano, en lotes, lo que falte. Mientras tanto se muestra el español.
- **Manual**: lo que no se haya traducido se muestra en español.
- **Memoria común**: cada texto se traduce **una vez por idioma** y se reutiliza en todo el sitio, así que el plan gratuito de DeepL rinde mucho. Lo traducido queda guardado: si DeepL se cae, el sitio sigue mostrando lo que ya tenía.
- **Correcciones**: cualquier traducción se corrige en el panel. La corregida queda como «Manual» y la automática ya no la reemplaza; si se deja vacía, vuelve la automática o el español.
- **Qué se traduce**: textos, descripciones, roles, categorías y textos alternativos de imágenes. No se traducen nombres propios ni enlaces.
- **Formulario**: muestra las opciones traducidas pero envía las originales, así que las postulaciones llegan en español.
- **Lo que ve el visitante**: el selector aparece en la barra del sitio y en la de cada wiki. La primera vez se elige el idioma del navegador si el sitio lo ofrece, y la elección se recuerda.
- **Configuración**: `Traduccion__ClaveDeepL` en `/etc/alianza/servidor.env`. Sin clave, solo hay traducción manual.

API pública: `?idioma=en` en `/api/sitio`, `/api/series/{identificador}` y `/api/formulario`. Un idioma no ofrecido devuelve español.

## Modo privado

**Panel → Seguridad → Modo privado** (solo Yish): con el modo activo, solo las IPs o redes de la lista (por ejemplo `190.5.1.1` o `190.5.0.0/16`) ven e interactúan con el sitio. Los demás ven «Sitio en preparación».
- El panel y el inicio de sesión siguen accesibles desde cualquier lugar, para poder apagarlo.
- No se puede activar con la lista vacía, ni quitar la última IP mientras está activo.
- La revisión es en memoria: no consulta la base de datos en cada visita.
- Las imágenes que nginx ya tenía copiadas se siguen entregando a quien tenga su dirección. Esas direcciones son identificadores al azar que solo se conocen a través de la API, que sí queda cerrada.

## Seguridad

Dos barreras. Ninguna depende de servicios externos: la base de países viene del paquete `geoip-database` del sistema y se actualiza con `apt upgrade`.

### 1. nginx (antes de llegar al servidor; es lo más barato)

Configuración en `sistema/nginx-alianza-http.conf` y `sistema/nginx-alianza.conf`.

| Protección | Cómo |
|---|---|
| **Bloqueo por país** | Solo entran América (todo el continente y el Caribe), la Unión Europea y Australia, por IPv4 e IPv6. El resto se corta sin responder. Para permitir otro país, agrega su código en el `map` del archivo |
| **Inundación de peticiones (DDoS)** | 30 peticiones/s por IP al sitio y 10/s a la API (con ráfagas), 30 conexiones simultáneas por IP |
| **Fuerza bruta** | 10 inicios de sesión por minuto por IP |
| **Conexiones lentas (slowloris)** | Tiempos máximos para enviar cabeceras y cuerpo, y cuerpo máximo de 1 MB (60 MB solo en la subida de archivos) |
| **Sondeos de bots** | `.php`, `.env`, `.git`, `wp-admin`, `phpmyadmin`… se cortan sin responder |
| **Suplantar la IP** | nginx reemplaza `X-Forwarded-For`, y el servidor solo le cree a nginx (127.0.0.1) |
| **Cabeceras** | CSP, `X-Frame-Options` (clickjacking), `nosniff`, `Referrer-Policy`, `Permissions-Policy`, sin versión de nginx. Activar HSTS al tener HTTPS |

Lo que nginx bloquea queda en `/var/log/alianza/nginx-bloqueos.log` (rotado cada semana). El panel lo resume.

### 2. Servidor (módulo `Modulos/Proteccion.cs`)

- **Inyección SQL**: no es posible. Todas las consultas pasan por EF Core con parámetros; no hay SQL armado con texto. Además, quien lo intenta queda registrado y bloqueado.
- **Detector de ataques** en la URL y el agente: inyección SQL, XSS, recorrido de carpetas, inyección de comandos, Log4Shell, sondeos y herramientas como sqlmap o nikto. La petición se rechaza y suma puntos a la IP.
- **Bloqueo automático por puntaje**: cada evento sospechoso suma puntos a la IP. Con 50 puntos en 10 minutos queda bloqueada 30 minutos; cada reincidencia multiplica el tiempo por 4 (máximo 7 días). Por ejemplo, 2 intentos de ataque, o 10 inicios fallidos, o un bot en el formulario.
- **Bloqueo de cuentas**: 5 intentos fallidos en 15 minutos bloquean la cuenta 15 minutos, aunque vengan de IPs distintas. Se aplica a cualquier nombre, para no revelar qué cuentas existen.
- **Límite por IP de la API** (600/minuto) y límites de Kestrel (cabeceras, conexiones, cuerpo), por si alguien llega sin pasar por nginx.
- **Sesiones**: solo se aceptan tokens firmados con HS256; se cierran al desactivar la cuenta o cambiar la contraseña.
- **Contraseñas**: BCrypt, mínimo 10 caracteres con letras y números. Iniciar sesión no revela si una cuenta existe.
- **Validaciones**:
  - enlaces solo `http(s)`;
  - archivos validados por su contenido;
  - SVG servidos aislados;
  - comodines escapados en las búsquedas;
  - si dos personas editan a la vez, la segunda recibe un aviso en vez de pisar los cambios.
- **XSS y CSRF**: el sitio (React) y el panel insertan todo como texto, nunca como HTML. La sesión va en una cabecera, no en cookies, así que otro sitio no puede usarla.

### Registro y actividad inusual (panel → Seguridad, solo YishAdmin)

Cada evento se guarda en `eventos_seguridad` (90 días), en lotes en segundo plano, sin una escritura por petición. Los de gravedad **Alta** aparecen como alertas, con número en el menú y aviso en pantalla, hasta marcarlas como revisadas.

| Detecta | Gravedad |
|---|---|
| Intentos de ataque, IP bloqueada, cuenta bloqueada | Alta |
| **Tráfico inusual**: más de 5 veces lo normal de la última hora (y más de 600/min) | Alta |
| **Ataque de contraseñas repartido**: 30 o más inicios fallidos en 10 minutos, de cualquier IP | Alta |
| **Inicio de sesión desde una IP nueva** para la cuenta (posible robo de contraseña) | Media |
| Acceso sin permiso, límite superado, archivo rechazado, bot en el formulario, 20+ errores del servidor por minuto | Media |
| Inicio fallido, sesión inválida, rutas de la API inexistentes (sondeos) | Baja |

API (solo YishAdmin), bajo `/api/panel/seguridad/`:
- `resumen`: eventos de 24 h por tipo, alertas, IPs bloqueadas, IPs más activas, tráfico por minuto y lo bloqueado por nginx por país;
- `pendientes`;
- `eventos?tipo=&gravedad=&ip=&sinRevisar=`;
- `eventos/revisar`;
- `bloqueos`: `GET` lista, `POST {ip, horas, motivo}` bloquea a mano, `DELETE bloqueos/{ip}` desbloquea.

### Otras recomendaciones para el servidor

- **Firewall**: solo abrir 22, 80 y 443 (`ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw enable`). PostgreSQL, el servidor y LDAP ya escuchan solo en la propia máquina.
- **SSH** solo con llave (`PasswordAuthentication no`).
- **Actualizaciones automáticas** de seguridad: `apt install unattended-upgrades`. También mantienen al día la base de países.
- **HTTPS** con certbot, y luego activar HSTS en `nginx-alianza.conf`.
- **Respaldos** de PostgreSQL: `pg_dump alianza` diario a otra máquina.
- Un DDoS grande (de varios Gb/s) satura la red antes de llegar a nginx. Contra eso solo sirve un servicio externo (Cloudflare, el proveedor del servidor). Estas defensas cubren los ataques comunes de aplicación.
