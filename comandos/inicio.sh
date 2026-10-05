#!/bin/bash
# Arranque del directorio LDAP de La Alianza.
# La primera vez (sin configuración) genera cn=config desde configuracion/slapd.ldif.tmpl y carga arranque/*.ldif.tmpl;
# las siguientes veces solo arranca slapd con los datos guardados. Lo ejecuta el servicio alianza-ldap (systemd).
set -euo pipefail

. "$(dirname "$0")/comun.sh"

log() { echo "[alianza-ldap] $*"; }

requerir() {
  local nombre="$1"
  local valor="${!nombre:-}"
  if [ -z "$valor" ]; then
    log "Falta la variable ${nombre}."; exit 1
  fi
  if [ "${#valor}" -lt 12 ]; then
    log "${nombre} debe tener al menos 12 caracteres."; exit 1
  fi
}

ejecutar_como() {
  if [ "$(id -u)" = "0" ] && id "$LDAP_USUARIO" >/dev/null 2>&1; then
    chown -R "$LDAP_USUARIO:$LDAP_USUARIO" "$LDAP_CONF_DIR" "$LDAP_DATA_DIR" "$LDAP_RUN_DIR"
    echo "-u $LDAP_USUARIO -g $LDAP_USUARIO"
  fi
}

inicializar() {
  requerir LDAP_CONTRASENA_ADMIN
  requerir LDAP_CONTRASENA_SERVIDOR
  requerir LDAP_CONTRASENA_YISHADMIN

  log "Inicializando directorio ${LDAP_BASE_DN}…"
  LDAP_CONTRASENA_ADMIN_HASH="$(slappasswd -h '{SSHA}' -s "$LDAP_CONTRASENA_ADMIN")"
  LDAP_CONTRASENA_SERVIDOR_HASH="$(slappasswd -h '{SSHA}' -s "$LDAP_CONTRASENA_SERVIDOR")"
  LDAP_CONTRASENA_YISHADMIN_HASH="$(slappasswd -h '{SSHA}' -s "$LDAP_CONTRASENA_YISHADMIN")"
  export LDAP_CONTRASENA_ADMIN_HASH LDAP_CONTRASENA_SERVIDOR_HASH LDAP_CONTRASENA_YISHADMIN_HASH

  # Solo se sustituyen estas variables (las plantillas pueden contener otros "$").
  local vars='${LDAP_BASE_DN} ${LDAP_DC} ${LDAP_ORGANIZACION} ${LDAP_DATA_DIR} ${LDAP_RUN_DIR} ${LDAP_MODULE_DIR} ${LDAP_SCHEMA_DIR} ${LDAP_CONTRASENA_ADMIN_HASH} ${LDAP_CONTRASENA_SERVIDOR_HASH} ${LDAP_CONTRASENA_YISHADMIN_HASH}'
  local tmp; tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' RETURN

  envsubst "$vars" < "$LDAP_PLANTILLAS_DIR/configuracion/slapd.ldif.tmpl" > "$tmp/slapd.ldif"
  slapadd -n0 -F "$LDAP_CONF_DIR" -l "$tmp/slapd.ldif" -q

  # Los datos se cargan con slapd en marcha (solo por ldapi) para que actúen memberof y ppolicy.
  # shellcheck disable=SC2046
  slapd -h "$LDAPI_URL" -F "$LDAP_CONF_DIR" $(ejecutar_como)
  for i in $(seq 30); do
    ldapsearch -Q -Y EXTERNAL -H "$LDAPI_URL" -b "" -s base >/dev/null 2>&1 && break
    sleep 0.5
  done
  for plantilla in "$LDAP_PLANTILLAS_DIR"/arranque/*.ldif.tmpl; do
    log "Cargando $(basename "$plantilla")"
    envsubst "$vars" < "$plantilla" > "$tmp/datos.ldif"
    ldapadd -x -H "$LDAPI_URL" -D "cn=admin,${LDAP_BASE_DN}" -y <(printf '%s' "$LDAP_CONTRASENA_ADMIN") -f "$tmp/datos.ldif" >/dev/null
  done
  kill "$(cat "$LDAP_RUN_DIR/slapd.pid")"
  for i in $(seq 30); do [ -f "$LDAP_RUN_DIR/slapd.pid" ] || break; sleep 0.5; done
  log "Directorio inicializado."
}

mkdir -p "$LDAP_CONF_DIR" "$LDAP_DATA_DIR" "$LDAP_RUN_DIR"
if [ ! -e "$LDAP_CONF_DIR/cn=config.ldif" ]; then
  inicializar
fi

log "Arrancando slapd (${LDAP_URLS})"
# shellcheck disable=SC2046
exec slapd -h "$LDAP_URLS ${LDAPI_URL}" -F "$LDAP_CONF_DIR" $(ejecutar_como) -d "$LDAP_NIVEL_LOG"
