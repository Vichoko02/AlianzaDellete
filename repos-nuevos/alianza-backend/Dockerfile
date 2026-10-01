# API de La Alianza (.NET 8). Imagen final sin SDK y ejecutándose como usuario sin privilegios.
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY src/Alianza.Api/Alianza.Api.csproj src/Alianza.Api/
RUN dotnet restore src/Alianza.Api/Alianza.Api.csproj
COPY src/ src/
RUN dotnet publish src/Alianza.Api/Alianza.Api.csproj -c Release -o /app --no-restore /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app .
COPY seed/ seed/
ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_CLI_TELEMETRY_OPTOUT=1
EXPOSE 8080
USER $APP_UID
ENTRYPOINT ["dotnet", "Alianza.Api.dll"]
