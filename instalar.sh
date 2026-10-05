#!/bin/bash
# Instala el directorio LDAP de La Alianza directamente en el sistema (Ubuntu/Debian), sin contenedores.
# Uso: sudo ./instalar.sh
# 1) instala slapd  2) copia los archivos a /opt/alianza-ldap  3) prepara /etc/alianza/ldap.env  4) activa el servicio.
set -euo pipefail
cd "$(dirname "$0")"
ENV=/etc/alianza/ldap.env

[ "$(id -u)" = 0 ] || { echo "Ejecuta con sudo." >&2; exit 1; }

# 1. slapd y utilidades. El slapd del sistema se desactiva: se usa el servicio propio alianza-ldap.
if ! command -v slapd >/dev/null || ! command -v envsubst >/dev/null; then
  DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends slapd ldap-utils gettext-base
fi
systemctl disable --now slapd 2>/dev/null || true

# 2. Archivos.
install -d /opt/alianza-ldap
cp -r arranque configuracion comandos /opt/alianza-ldap/
chmod +x /opt/alianza-ldap/comandos/*.sh
install -d -o openldap -g openldap -m 700 /var/lib/alianza-ldap

# 3. Contraseñas: la primera vez se crea el archivo y se pide completarlo.
if [ ! -f "$ENV" ]; then
  install -d -m 755 /etc/alianza
  install -m 600 .env.example "$ENV"
  echo "Completa las contraseñas en $ENV y vuelve a ejecutar este comando."
  exit 0
fi

# 4. Servicio.
cp sistema/alianza-ldap.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now alianza-ldap
echo "Listo. Estado: systemctl status alianza-ldap"
