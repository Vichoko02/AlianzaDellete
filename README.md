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
- **Solo escucha en `127.0.0.1`**: el servidor de La Alianza corre en la misma máquina.
- **slapd corre como `openldap`**, no como root, con límites de systemd (64 MB de memoria como máximo; en uso ocupa unos 25 MB).

## Puesta en marcha (sin contenedores)

En Ubuntu o Debian, desde esta rama:

```bash
sudo ./instalar.sh        # la primera vez crea /etc/alianza/ldap.env: completa las tres contraseñas
sudo ./instalar.sh        # la segunda vez activa el servicio alianza-ldap
systemctl status alianza-ldap
```

`instalar.sh` instala `slapd` del propio sistema y desactiva el servicio `slapd` que trae el paquete. Copia los archivos a `/opt/alianza-ldap` y guarda los datos en `/var/lib/alianza-ldap`.

La primera vez el servicio genera la configuración y carga `arranque/`. Después solo arranca con los datos guardados: cambiar `ldap.env` no altera un directorio ya creado.

Luego, en `/etc/alianza/servidor.env` del servidor, activa LDAP y usa el mismo valor de `LDAP_CONTRASENA_SERVIDOR`.

## Operación

| Tarea | Comando |
|---|---|
| Respaldo (queda en `/var/backups/alianza-ldap`) | `sudo /opt/alianza-ldap/comandos/respaldar.sh` |
| Restaurar | Ver los pasos al inicio de `comandos/restaurar.sh` |
| Cuenta de lectura para otra app | `sudo /opt/alianza-ldap/comandos/cuenta-servicio.sh nextcloud` |
| Buscar como el servidor | `ldapsearch -x -H ldap://127.0.0.1 -D cn=alianza-backend,ou=services,dc=alianza,dc=local -W -b dc=alianza,dc=local` |

Las **cuentas de personas no se crean a mano**: créalas desde el panel del servidor (Usuarios y permisos → Nuevo usuario → origen LDAP). Así quedan registradas en PostgreSQL con sus permisos.

Para filtrar administradores en otra aplicación, usa:
`(memberOf=cn=alianza-administradores,ou=groups,dc=alianza,dc=local)`.

## Pruebas

`pruebas/prueba.sh` arranca slapd en una carpeta temporal (sin tocar el sistema) y verifica de punta a punta:
- autenticación y rechazo de acceso anónimo;
- hash de contraseñas, memberOf y ACLs de usuario normal;
- bloqueo por intentos fallidos y desbloqueo;
- cuentas de servicio y respaldo.

Necesita `slapd`, `ldap-utils` y `gettext-base`, y se ejecuta con `sudo`. Se ejecuta en CI en cada push.

```bash
sudo pruebas/prueba.sh
```

## Archivos

| Ruta | Contenido |
|---|---|
| `configuracion/slapd.ldif.tmpl` | Configuración `cn=config`: base mdb, ACLs, overlays memberof, refint y ppolicy |
| `arranque/*.ldif.tmpl` | Árbol inicial, política de contraseñas, cuentas y grupos |
| `comandos/inicio.sh` | Inicialización la primera vez y arranque de slapd |
| `comandos/respaldar.sh`, `restaurar.sh`, `cuenta-servicio.sh` | Operación |
| `pruebas/prueba.sh` | Prueba de punta a punta |
