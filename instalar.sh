#!/bin/bash
# Instala o actualiza La Alianza en un servidor Ubuntu/Debian, sin contenedores. Se ejecuta DENTRO del paquete
# que arma empaquetar.sh:  tar xzf alianza-*.tar.gz && cd alianza-*/ && sudo ./instalar.sh
# 1) paquetes del sistema  2) usuario y carpetas  3) PostgreSQL  4) configuración  5) archivos  6) servicios.
set -euo pipefail
cd "$(dirname "$0")"
ENV=/etc/alianza/servidor.env

[ "$(id -u)" = 0 ] || { echo "Ejecuta con sudo." >&2; exit 1; }

# 1. Solo paquetes de los repositorios del sistema (el servidor trae su propio .NET): PostgreSQL, nginx, y la base de
#    países con su módulo para nginx (bloqueo por país sin consultar servicios externos; se actualiza con apt upgrade).
if ! command -v psql >/dev/null || ! command -v nginx >/dev/null || [ ! -f /usr/share/GeoIP/GeoIPv6.dat ] \
   || [ ! -e /usr/lib/nginx/modules/ngx_http_geoip_module.so ]; then
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends postgresql nginx geoip-database libnginx-mod-http-geoip
fi

# 2. Usuario sin acceso a consola y carpetas (el registro de bloqueos de nginx lo lee el panel, en Seguridad).
id alianza >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin alianza
install -d /opt/alianza
install -d -m 750 -o root -g alianza /var/log/alianza
install -d -m 700 -o www-data -g www-data /var/cache/nginx/alianza   # copia en disco de imágenes y videos

# 3. PostgreSQL: configuración para poca memoria, y rol + base "alianza" (entra por socket, sin contraseña).
CONF_PG="$(ls -d /etc/postgresql/*/main | tail -1)/conf.d"
install -d "$CONF_PG"
if ! cmp -s sistema/postgresql-pequeno.conf "$CONF_PG/alianza.conf"; then
  cp sistema/postgresql-pequeno.conf "$CONF_PG/alianza.conf"
  systemctl restart postgresql
fi
sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='alianza'" | grep -q 1 || sudo -u postgres createuser alianza
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='alianza'" | grep -q 1 || sudo -u postgres createdb -O alianza alianza

# 4. Configuración: la primera vez se crea con una clave de sesiones al azar y se pide la contraseña de YishAdmin.
if [ ! -f "$ENV" ]; then
  install -d -m 755 /etc/alianza
  install -m 640 -g alianza sistema/servidor.env.example "$ENV"
  sed -i "s|^Sesiones__Clave=.*|Sesiones__Clave=$(head -c 48 /dev/urandom | base64 | tr -d '/+=' | head -c 64)|" "$ENV"
fi
if grep -q '^Superadmin__Contrasena=$' "$ENV" && ! sudo -u postgres psql -d alianza -tAc "SELECT 1 FROM usuarios WHERE es_superadmin" 2>/dev/null | grep -q 1; then
  echo "Define Superadmin__Contrasena en $ENV (mínimo 10 caracteres, letras y números) y vuelve a ejecutar."
  exit 0
fi

# 5. Archivos: el servidor se reemplaza completo; el sitio solo si viene en el paquete.
systemctl stop alianza-servidor 2>/dev/null || true
rm -rf /opt/alianza/servidor && cp -r servidor /opt/alianza/servidor
if [ -d sitio ]; then rm -rf /opt/alianza/sitio && cp -r sitio /opt/alianza/sitio; fi
chown -R root:root /opt/alianza

# 6. Servicios.
cp sistema/alianza-servidor.service /etc/systemd/system/
cp sistema/nginx-alianza-http.conf /etc/nginx/conf.d/alianza.conf
install -d /etc/nginx/snippets && cp sistema/nginx-alianza-proxy.conf /etc/nginx/snippets/alianza-proxy.conf
cp sistema/logrotate-alianza /etc/logrotate.d/alianza
cp sistema/nginx-alianza.conf /etc/nginx/sites-available/alianza
# Servidores sin IPv6 (frecuente en VPS pequeños): nginx no arranca si escucha en [::].
[ -s /proc/net/if_inet6 ] || sed -i '/listen \[::\]/d' /etc/nginx/sites-available/alianza
ln -sf /etc/nginx/sites-available/alianza /etc/nginx/sites-enabled/alianza
rm -f /etc/nginx/sites-enabled/default
systemctl daemon-reload
systemctl enable --now alianza-servidor
if ! nginx -t; then
  echo "La configuración de nginx tiene errores (arriba). El servidor quedó funcionando, pero el sitio no se publicó." >&2
  exit 1
fi
systemctl reload nginx 2>/dev/null || systemctl start nginx
echo "Listo. Panel: http://<este-servidor>/panel  ·  Estado: systemctl status alianza-servidor"
