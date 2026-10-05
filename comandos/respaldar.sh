#!/bin/bash
# Exporta configuración (cn=config) y datos a LDIF. Uso: sudo /opt/alianza-ldap/comandos/respaldar.sh [carpeta]
set -euo pipefail
. "$(dirname "$0")/comun.sh"
DESTINO="${1:-/var/backups/alianza-ldap}"
FECHA="$(date -u +%Y%m%dT%H%M%SZ)"

mkdir -p "$DESTINO"
slapcat -n 0 -F "$LDAP_CONF_DIR" -l "$DESTINO/config-$FECHA.ldif"
slapcat -n 1 -F "$LDAP_CONF_DIR" -l "$DESTINO/datos-$FECHA.ldif"
chmod 600 "$DESTINO"/*-"$FECHA".ldif
echo "Respaldo creado: $DESTINO/{config,datos}-$FECHA.ldif"
