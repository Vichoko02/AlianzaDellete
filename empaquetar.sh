#!/bin/bash
# Arma un paquete listo para instalar, con TODO incluido: el servidor autocontenido (no necesita .NET en el
# servidor), el panel compilado y, opcionalmente, el sitio. Se ejecuta en un equipo de desarrollo, no en el servidor.
# Uso: ./empaquetar.sh [ruta a la rama programa/sitio]
#      ARQUITECTURA=linux-arm64 ./empaquetar.sh ...   (por defecto linux-x64)
# 1) compilar el panel  2) publicar el servidor  3) compilar el sitio  4) comprimir.
set -euo pipefail
cd "$(dirname "$0")"
ARQUITECTURA="${ARQUITECTURA:-linux-x64}"
SITIO="${1:-}"
NOMBRE="alianza-$(date +%Y%m%d-%H%M)-$ARQUITECTURA"
DESTINO="paquete/$NOMBRE"

rm -rf "$DESTINO" && mkdir -p "$DESTINO"

# 1. Panel (TypeScript → JavaScript).
npm ci --no-audit --no-fund --silent
npm run build --silent

# 2. Servidor: autocontenido y precompilado (ReadyToRun), así arranca rápido y gasta menos CPU al inicio.
dotnet publish servidor/Alianza.Servidor.csproj -c Release -r "$ARQUITECTURA" --self-contained \
  -p:PublishReadyToRun=true -p:CompilarPanel=false -o "$DESTINO/servidor" --nologo -v q

# 3. Sitio (opcional): se compila y cada archivo de texto se deja también comprimido (.gz) para nginx.
if [ -n "$SITIO" ]; then
  (cd "$SITIO" && npm ci --no-audit --no-fund --silent && npm run build --silent)
  cp -r "$SITIO/dist" "$DESTINO/sitio"
  find "$DESTINO/sitio" -type f \( -name '*.html' -o -name '*.js' -o -name '*.css' -o -name '*.svg' -o -name '*.json' \) -exec gzip -9 -k {} \;
fi

# 4. Archivos de instalación y compresión final.
cp -r sistema instalar.sh "$DESTINO/"
tar -C paquete -czf "paquete/$NOMBRE.tar.gz" "$NOMBRE"
rm -rf "$DESTINO"
echo "Paquete listo: paquete/$NOMBRE.tar.gz"
