#!/bin/bash
# Crea una cuenta de servicio de solo lectura para otra aplicación (wiki interna, Nextcloud, Grafana…).
# Las cuentas de personas NO se crean aquí: las crea YishAdmin desde el panel del servidor.
# Uso:
#   docker compose exec ldap /opt/alianza-ldap/comandos/cuenta-servicio.sh nombre-app
# La contraseña se pide por teclado (o en la variable CLAVE_SERVICIO).
set -euo pipefail
NOMBRE="${1:?Indica el nombre de la cuenta (ej: nextcloud)}"
[[ "$NOMBRE" =~ ^[a-z0-9-]{3,40}$ ]] || { echo "Nombre inválido: solo minúsculas, números y guiones." >&2; exit 1; }

DOMINIO="${LDAP_DOMINIO:-alianza.local}"
BASE="dc=${DOMINIO//./,dc=}"
LDAPI="ldapi://%2Frun%2Fslapd%2Fldapi"

if [ -z "${CLAVE_SERVICIO:-}" ]; then
  read -rsp "Contraseña para cn=$NOMBRE: " CLAVE_SERVICIO; echo
fi
[ "${#CLAVE_SERVICIO}" -ge 16 ] || { echo "Usa al menos 16 caracteres." >&2; exit 1; }
HASH="$(slappasswd -h '{SSHA}' -s "$CLAVE_SERVICIO")"

ldapadd -Q -Y EXTERNAL -H "$LDAPI" <<EOF
dn: cn=$NOMBRE,ou=services,$BASE
objectClass: top
objectClass: applicationProcess
objectClass: simpleSecurityObject
cn: $NOMBRE
description: Cuenta de servicio de solo lectura
userPassword: $HASH
EOF

# Se le da lectura del directorio agregándola al grupo alianza-lectores.
ldapmodify -Q -Y EXTERNAL -H "$LDAPI" <<EOF
dn: cn=alianza-lectores,ou=groups,$BASE
changetype: modify
add: member
member: cn=$NOMBRE,ou=services,$BASE
EOF

echo "Cuenta creada: cn=$NOMBRE,ou=services,$BASE"
echo "Para filtrar administradores en la otra aplicación usa: (memberOf=cn=alianza-administradores,ou=groups,$BASE)"
