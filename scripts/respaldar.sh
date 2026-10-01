#!/bin/bash
# Exporta configuración (cn=config) y datos a LDIF. Uso dentro del contenedor:
#   docker compose exec ldap /opt/alianza-ldap/scripts/respaldar.sh
# Deja los archivos en /respaldos (montado desde ./respaldos).
set -euo pipefail
DESTINO="${1:-/respaldos}"
FECHA="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$DESTINO"
slapcat -n 0 -F "${LDAP_CONF_DIR:-/etc/ldap/slapd.d}" -l "$DESTINO/config-$FECHA.ldif"
slapcat -n 1 -F "${LDAP_CONF_DIR:-/etc/ldap/slapd.d}" -l "$DESTINO/datos-$FECHA.ldif"
chmod 600 "$DESTINO"/*-"$FECHA".ldif
echo "Respaldo creado: $DESTINO/{config,datos}-$FECHA.ldif"
