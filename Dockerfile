# Directorio LDAP de La Alianza (OpenLDAP 2.6 sobre Ubuntu LTS).
FROM ubuntu:24.04

RUN apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends slapd ldap-utils gettext-base ca-certificates \
 && rm -rf /var/lib/apt/lists/* /etc/ldap/slapd.d/* /var/lib/ldap/* \
 && mkdir -p /run/slapd && chown openldap:openldap /run/slapd /etc/ldap/slapd.d /var/lib/ldap

COPY configuracion/ /opt/alianza-ldap/configuracion/
COPY arranque/ /opt/alianza-ldap/arranque/
COPY comandos/ /opt/alianza-ldap/comandos/
RUN chmod +x /opt/alianza-ldap/comandos/*.sh

# Configuración (cn=config) y datos persisten en volúmenes.
VOLUME ["/etc/ldap/slapd.d", "/var/lib/ldap"]
EXPOSE 389

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD ldapsearch -Q -Y EXTERNAL -H ldapi://%2Frun%2Fslapd%2Fldapi -b "" -s base >/dev/null 2>&1 || exit 1

ENTRYPOINT ["/opt/alianza-ldap/comandos/inicio.sh"]
