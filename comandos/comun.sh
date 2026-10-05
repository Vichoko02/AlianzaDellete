#!/bin/bash
# Valores que comparten todos los comandos. Se leen de /etc/alianza/ldap.env si existe;
# cada uno puede sobrescribirse con una variable de entorno (así lo hacen las pruebas).
[ -r /etc/alianza/ldap.env ] && [ -z "${LDAP_SIN_ARCHIVO_ENV:-}" ] && set -a && . /etc/alianza/ldap.env && set +a

: "${LDAP_DOMINIO:=alianza.local}"
: "${LDAP_ORGANIZACION:=La Alianza}"
: "${LDAP_CONF_DIR:=/var/lib/alianza-ldap/configuracion}"
: "${LDAP_DATA_DIR:=/var/lib/alianza-ldap/datos}"
: "${LDAP_RUN_DIR:=/run/alianza-ldap}"
: "${LDAP_MODULE_DIR:=/usr/lib/ldap}"
: "${LDAP_SCHEMA_DIR:=/etc/ldap/schema}"
: "${LDAP_PLANTILLAS_DIR:=/opt/alianza-ldap}"
# Solo escucha en la propia máquina: el servidor de La Alianza corre en el mismo equipo.
: "${LDAP_URLS:=ldap://127.0.0.1/}"
: "${LDAP_USUARIO:=openldap}"
# "0" no registra cada operación (ahorra disco y CPU); usa "stats" para depurar.
: "${LDAP_NIVEL_LOG:=0}"

# alianza.local → dc=alianza,dc=local
LDAP_BASE_DN="dc=${LDAP_DOMINIO//./,dc=}"
LDAP_DC="${LDAP_DOMINIO%%.*}"
LDAPI_URL="ldapi://$(printf '%s' "${LDAP_RUN_DIR}/ldapi" | sed 's|/|%2F|g')"
export LDAP_BASE_DN LDAP_DC LDAP_ORGANIZACION LDAP_DATA_DIR LDAP_RUN_DIR LDAP_MODULE_DIR LDAP_SCHEMA_DIR
