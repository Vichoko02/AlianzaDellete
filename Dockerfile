# Servidor de La Alianza (.NET 8). Se arma en tres pasos:
# 1) compilar el panel (TypeScript → JavaScript)  2) publicar el servidor  3) imagen final, sin SDK y sin privilegios.

# 1. Panel
FROM node:22-alpine AS panel
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY panel/ panel/
RUN mkdir -p servidor/publico/panel && npm run build

# 2. Servidor
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS servidor
WORKDIR /src
COPY servidor/Alianza.Servidor.csproj servidor/
RUN dotnet restore servidor/Alianza.Servidor.csproj
COPY servidor/ servidor/
COPY carga-inicial/ carga-inicial/
COPY --from=panel /src/servidor/publico/panel/*.js servidor/publico/panel/
RUN dotnet publish servidor/Alianza.Servidor.csproj -c Release -o /app --no-restore -p:UseAppHost=false -p:CompilarPanel=false

# 3. Imagen final
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=servidor /app .
ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_CLI_TELEMETRY_OPTOUT=1
EXPOSE 8080
USER $APP_UID
ENTRYPOINT ["dotnet", "Alianza.Servidor.dll"]
