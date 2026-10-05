# alianza-ldap

Directorio LDAP (OpenLDAP 2.6) de La Alianza. Guarda las **cuentas administrativas** del panel y sus **permisos como grupos**, para que el servidor y cualquier otra aplicación interna (wiki privada, Nextcloud, Grafana…) compartan los mismos usuarios.

> Los visitantes del sitio público **no tienen cuenta**: solo existen cuentas administrativas, y solo **YishAdmin** puede crearlas, desde el panel del servidor (rama `programa/servidor`).

## Cómo encaja con el servidor

```
 Panel /panel ──► servidor (C#)      ──► PostgreSQL   (fuente de verdad: usuarios, permisos, contenido)
                        │
                        └── cuenta cn=alianza-backend ──► LDAP  (identidad + grupos reflejados)
                                                           ▲
                         otras apps (solo lectura) ────────┘
```

- PostgreSQL es la **fuente de verdad** de los permisos. Cada vez que YishAdmin cambia algo en el panel, el servidor lo **refleja** en LDAP.
- Los usuarios creados con origen **LDAP** validan su contraseña contra este directorio. Los de origen **Local** la validan contra PostgreSQL.
- **YishAdmin** es siempre una cuenta **local** del servidor. Así, si el LDAP cae, igual puede entrar al panel. En el directorio también existe `uid=yishadmin` para las otras apps.

## Árbol

```
dc=alianza,dc=local
├── ou=people      uid=yishadmin, uid=<usuario>…           (inetOrgPerson)
├── ou=groups      cn=alianza-*                            (groupOfNames + memberOf)
├── ou=services    cn=alianza-backend, cn=<otras apps>     (cuentas de servicio)
└── ou=policies    cn=default                              (política de contraseñas)
```

### Grupos (los gestiona el servidor)

| Grupo | Significado |
|---|---|
| `alianza-superadmin` | Superadministrador (solo YishAdmin) |
| `alianza-administradores` | Todas las cuentas administrativas **activas** |
| `alianza-creadores-wikis` | Tienen activado el bool «puede crear wikis» |
| `alianza-wikis` | Editan **todas** las wikis |
| `alianza-wiki-<slug>` | Editan **una** wiki concreta (ej. `alianza-wiki-metrecalia`; se crea al asignarlo) |
| `alianza-socios` | Administran socios / asociados |
| `alianza-estados` | Administran el catálogo de estados de serie |
| `alianza-medios` | Administran la biblioteca de medios |
| `alianza-sitio` | Editan los textos, imágenes y enlaces generales del sitio |
| `alianza-lectores` | Cuentas de servicio con lectura del directorio |

`groupOfNames` exige al menos un miembro. Por eso YishAdmin pertenece a todos los grupos, lo que además refleja que tiene todos los permisos.

### Seguridad incluida

- **Sin acceso anónimo**: el bind anónimo está deshabilitado y leer exige autenticarse.
- **Contraseñas siempre en hash** `{SSHA}`: el overlay ppolicy convierte en hash cualquier contraseña que llegue en texto plano.
- **Bloqueo** de 15 minutos tras 5 intentos fallidos, mínimo 10 caracteres e historial de 3 contraseñas.
- **ACLs**:
  - Solo la cuenta del servidor crea y modifica usuarios y grupos.
  - Cada usuario puede cambiar su propia contraseña, pero no ve las ajenas.
  - Las cuentas de `alianza-lectores` solo leen.
- **Al desactivar** un usuario en el panel, el servidor lo quita de todos los grupos y **bloquea** su cuenta (`pwdAccountLockedTime`). Así tampoco entra a otras apps.
- **Puerto publicado solo en `127.0.0.1`**: el servidor usa la red interna de Docker.
- **El contenedor corre como `openldap`**, no como root.

## Puesta en marcha

```bash
docker network create alianza-red     # una sola vez (la comparte el servidor)
cp .env.example .env                  # y define las tres contraseñas
docker compose up -d --build
docker compose logs -f ldap           # la primera vez verás "Directorio inicializado."
```

La primera vez el contenedor genera la configuración y carga `arranque/`. Después solo arranca con lo que hay en los volúmenes; cambiar `.env` no altera un directorio ya creado.

Luego, en el `.env` del servidor define `LDAP_CONTRASENA_SERVIDOR` con el mismo valor y levántalo con `docker-compose.ldap.yml`.

Interfaz web opcional (phpLDAPadmin en http://127.0.0.1:8090):

```bash
docker compose --profile ui up -d
```

## Operación

| Tarea | Comando |
|---|---|
| Respaldo (queda en `./respaldos`) | `docker compose exec ldap /opt/alianza-ldap/comandos/respaldar.sh` |
| Restaurar (volúmenes vacíos) | `docker compose down -v && docker compose run --rm --entrypoint /opt/alianza-ldap/comandos/restaurar.sh ldap /respaldos/config-X.ldif /respaldos/datos-X.ldif` |
| Cuenta de lectura para otra app | `docker compose exec ldap /opt/alianza-ldap/comandos/cuenta-servicio.sh nextcloud` |
| Buscar como el servidor | `ldapsearch -x -H ldap://127.0.0.1 -D cn=alianza-backend,ou=services,dc=alianza,dc=local -W -b dc=alianza,dc=local` |

Las **cuentas de personas no se crean a mano**: créalas desde el panel del servidor (Usuarios y permisos → Nuevo usuario → origen LDAP). Así quedan registradas en PostgreSQL con sus permisos.

Para filtrar administradores en otra aplicación, usa:
`(memberOf=cn=alianza-administradores,ou=groups,dc=alianza,dc=local)`.

## Pruebas

`pruebas/prueba.sh` construye la imagen, la arranca y verifica de punta a punta:
- autenticación y rechazo de acceso anónimo;
- hash de contraseñas, memberOf y ACLs de usuario normal;
- bloqueo por intentos fallidos y desbloqueo;
- cuentas de servicio y respaldo.

Necesita Docker y `ldap-utils`. Se ejecuta en CI en cada push.

```bash
pruebas/prueba.sh
```

## Archivos

| Ruta | Contenido |
|---|---|
| `configuracion/slapd.ldif.tmpl` | Configuración `cn=config`: base mdb, ACLs, overlays memberof, refint y ppolicy |
| `arranque/*.ldif.tmpl` | Árbol inicial, política de contraseñas, cuentas y grupos |
| `comandos/inicio.sh` | Inicialización la primera vez y arranque de slapd |
| `comandos/respaldar.sh`, `restaurar.sh`, `cuenta-servicio.sh` | Operación |
| `pruebas/prueba.sh` | Prueba de punta a punta |
