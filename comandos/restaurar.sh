#!/bin/bash
# Restaura un respaldo creado con respaldar.sh sobre volúmenes VACÍOS.
# Uso (con el servicio detenido):
#   docker compose run --rm --entrypoint /opt/alianza-ldap/comandos/restaurar.sh ldap /respaldos/config-X.ldif /respaldos/datos-X.ldif
set -euo pipefail
CONFIG="${1:?Indica el LDIF de configuración}"
DATOS="${2:?Indica el LDIF de datos}"
CONF_DIR="${LDAP_CONF_DIR:-/etc/ldap/slapd.d}"
DATA_DIR="${LDAP_DATA_DIR:-/var/lib/ldap}"

if [ -n "$(ls -A "$CONF_DIR" 2>/dev/null)" ] || [ -n "$(ls -A "$DATA_DIR" 2>/dev/null)" ]; then
  echo "Los volúmenes no están vacíos. Bórralos primero (docker compose down -v) para restaurar." >&2
  exit 1
fi
slapadd -n 0 -F "$CONF_DIR" -l "$CONFIG"
slapadd -n 1 -F "$CONF_DIR" -l "$DATOS"
chown -R openldap:openldap "$CONF_DIR" "$DATA_DIR"
echo "Restauración completada. Arranca el servicio con: docker compose up -d"
