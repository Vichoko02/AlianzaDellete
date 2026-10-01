#!/bin/bash
# Prueba de punta a punta del directorio: construye la imagen, la arranca y verifica
# ACLs, hash de contraseñas, bloqueo por intentos fallidos, cuentas de servicio y respaldo.
# Requiere Docker y ldap-utils (ldapsearch, ldapwhoami...) en la máquina que lo ejecuta.
set -uo pipefail
cd "$(dirname "$0")/.."

PUERTO="${PUERTO:-3899}"
NOMBRE="alianza-ldap-prueba-$$"
IMAGEN="alianza-ldap:prueba"
URL="ldap://127.0.0.1:$PUERTO"
BASE="dc=alianza,dc=local"
BACKEND="cn=alianza-backend,ou=services,$BASE"
CLAVE_BACKEND="BackendClavePrueba123"
fallos=0

ok()   { echo "  ✔ $*"; }
mal()  { echo "  ✘ $*"; fallos=$((fallos + 1)); }
probar() { local desc="$1"; shift; if "$@" >/dev/null 2>&1; then ok "$desc"; else mal "$desc"; fi; }
negar()  { local desc="$1"; shift; if "$@" >/dev/null 2>&1; then mal "$desc"; else ok "$desc"; fi; }
limpiar() { docker rm -f "$NOMBRE" >/dev/null 2>&1; }
trap limpiar EXIT

echo "→ Construyendo imagen"
docker build -q ${DOCKER_BUILD_ARGS:-} -t "$IMAGEN" . >/dev/null || { echo "No se pudo construir la imagen"; exit 1; }

echo "→ Arrancando contenedor en el puerto $PUERTO"
docker run -d --name "$NOMBRE" -p "127.0.0.1:$PUERTO:389" \
  -e LDAP_ADMIN_PASSWORD=AdminClavePrueba123 \
  -e LDAP_BACKEND_PASSWORD="$CLAVE_BACKEND" \
  -e LDAP_YISHADMIN_PASSWORD=YishClavePrueba123 \
  "$IMAGEN" >/dev/null
for _ in $(seq 40); do ldapwhoami -x -H "$URL" -D "$BACKEND" -w "$CLAVE_BACKEND" >/dev/null 2>&1 && break; sleep 0.5; done

B=(-x -H "$URL" -D "$BACKEND" -w "$CLAVE_BACKEND")

echo "→ Autenticación"
probar "yishadmin entra con su contraseña" ldapwhoami -x -H "$URL" -D "uid=yishadmin,ou=people,$BASE" -w YishClavePrueba123
negar  "yishadmin con contraseña incorrecta es rechazado" ldapwhoami -x -H "$URL" -D "uid=yishadmin,ou=people,$BASE" -w incorrecta
negar  "búsqueda anónima rechazada" ldapsearch -x -H "$URL" -b "$BASE" "(uid=*)"

echo "→ La cuenta del backend administra usuarios"
probar "crea un usuario con contraseña en texto plano" ldapadd "${B[@]}" -f /dev/stdin <<EOF
dn: uid=prueba,ou=people,$BASE
objectClass: inetOrgPerson
uid: prueba
cn: Prueba
sn: Prueba
userPassword: UsuarioClave12345
EOF
hash="$(ldapsearch "${B[@]}" -LLL -b "uid=prueba,ou=people,$BASE" userPassword | awk '/^userPassword::/{print $2}' | base64 -d 2>/dev/null)"
[[ "$hash" == "{SSHA}"* ]] && ok "la contraseña quedó guardada como hash {SSHA}" || mal "la contraseña no se guardó como hash ($hash)"
probar "el usuario nuevo puede autenticarse" ldapwhoami -x -H "$URL" -D "uid=prueba,ou=people,$BASE" -w UsuarioClave12345
probar "agrega el usuario a un grupo" ldapmodify "${B[@]}" -f /dev/stdin <<EOF
dn: cn=alianza-socios,ou=groups,$BASE
changetype: modify
add: member
member: uid=prueba,ou=people,$BASE
EOF
memberof="$(ldapsearch "${B[@]}" -LLL -b "uid=prueba,ou=people,$BASE" memberOf)"
[[ "$memberof" == *"cn=alianza-socios"* ]] && ok "memberOf refleja el grupo" || mal "memberOf no refleja el grupo"

echo "→ Lo que un usuario normal NO puede hacer"
U=(-x -H "$URL" -D "uid=prueba,ou=people,$BASE" -w UsuarioClave12345)
otras="$(ldapsearch "${U[@]}" -LLL -b "uid=yishadmin,ou=people,$BASE" userPassword 2>/dev/null)"
[[ "$otras" != *userPassword* ]] && ok "no ve contraseñas ajenas" || mal "puede ver contraseñas ajenas"
negar "no puede modificar grupos" ldapmodify "${U[@]}" -f /dev/stdin <<EOF
dn: cn=alianza-wikis,ou=groups,$BASE
changetype: modify
add: member
member: uid=prueba,ou=people,$BASE
EOF
negar "no puede crear usuarios" ldapadd "${U[@]}" -f /dev/stdin <<EOF
dn: uid=intruso,ou=people,$BASE
objectClass: inetOrgPerson
uid: intruso
cn: x
sn: x
EOF
probar "puede cambiar su propia contraseña" ldappasswd "${U[@]}" -s UsuarioClaveNueva123
U=(-x -H "$URL" -D "uid=prueba,ou=people,$BASE" -w UsuarioClaveNueva123)
probar "entra con la contraseña nueva" ldapwhoami "${U[@]}"

echo "→ Bloqueo por intentos fallidos (ppolicy)"
for _ in $(seq 5); do ldapwhoami -x -H "$URL" -D "uid=prueba,ou=people,$BASE" -w malamala >/dev/null 2>&1; done
negar "tras 5 fallos la cuenta queda bloqueada aunque la contraseña sea correcta" ldapwhoami "${U[@]}"
probar "el backend puede desbloquearla" ldapmodify "${B[@]}" -f /dev/stdin <<EOF
dn: uid=prueba,ou=people,$BASE
changetype: modify
delete: pwdAccountLockedTime
EOF
probar "desbloqueada vuelve a entrar" ldapwhoami "${U[@]}"

echo "→ Scripts administrativos"
probar "cuenta-servicio.sh crea una cuenta de lectura" docker exec -e CLAVE_SERVICIO=ServicioClavePrueba123 "$NOMBRE" /opt/alianza-ldap/scripts/cuenta-servicio.sh nextcloud
lectura="$(ldapsearch -x -H "$URL" -D "cn=nextcloud,ou=services,$BASE" -w ServicioClavePrueba123 -LLL -b "ou=people,$BASE" "(memberOf=cn=alianza-administradores,ou=groups,$BASE)" uid)"
[[ "$lectura" == *"uid: yishadmin"* ]] && ok "la cuenta de servicio filtra administradores por memberOf" || mal "la cuenta de servicio no puede leer el directorio"
probar "respaldar.sh genera los LDIF" docker exec "$NOMBRE" /opt/alianza-ldap/scripts/respaldar.sh /tmp/respaldos

echo
if [ "$fallos" -eq 0 ]; then echo "Todas las pruebas pasaron."; else echo "$fallos prueba(s) fallaron."; fi
exit "$fallos"
