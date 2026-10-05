#!/bin/bash
# Restaura un respaldo de respaldar.sh sobre carpetas VACÍAS. Uso:
#   sudo systemctl stop alianza-ldap
#   sudo rm -rf /var/lib/alianza-ldap/*
#   sudo /opt/alianza-ldap/comandos/restaurar.sh config-X.ldif datos-X.ldif
#   sudo systemctl start alianza-ldap
set -euo pipefail
. "$(dirname "$0")/comun.sh"
CONFIG="${1:?Indica el LDIF de configuración}"
DATOS="${2:?Indica el LDIF de datos}"

if [ -n "$(ls -A "$LDAP_CONF_DIR" 2>/dev/null)" ] || [ -n "$(ls -A "$LDAP_DATA_DIR" 2>/dev/null)" ]; then
  echo "Las carpetas $LDAP_CONF_DIR y $LDAP_DATA_DIR no están vacías. Bórralas primero." >&2
  exit 1
fi
mkdir -p "$LDAP_CONF_DIR" "$LDAP_DATA_DIR"
slapadd -n 0 -F "$LDAP_CONF_DIR" -l "$CONFIG"
slapadd -n 1 -F "$LDAP_CONF_DIR" -l "$DATOS"
chown -R "$LDAP_USUARIO:$LDAP_USUARIO" "$LDAP_CONF_DIR" "$LDAP_DATA_DIR"
echo "Restauración completada. Arranca el servicio con: sudo systemctl start alianza-ldap"
