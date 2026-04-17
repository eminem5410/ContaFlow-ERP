# Etapa 1: Build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copiar csproj files primero para aprovechar cache de Docker
COPY ContaFlow.Domain/ContaFlow.Domain.csproj ContaFlow.Domain/
COPY ContaFlow.Application/ContaFlow.Application.csproj ContaFlow.Application/
COPY ContaFlow.Infrastructure/ContaFlow.Infrastructure.csproj ContaFlow.Infrastructure/
COPY ContaFlow.API/ContaFlow.API.csproj ContaFlow.API/

# Restaurar dependencias
RUN dotnet restore "ContaFlow.API/ContaFlow.API.csproj"

# Copiar todo el código fuente
COPY . .

# Build de producción
WORKDIR /src/ContaFlow.API
RUN dotnet publish "ContaFlow.API.csproj" \
    -c Release \
    -o /app/publish \
    --no-restore \
    /p:PublishTrimmed=false

# Etapa 2: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS runtime
WORKDIR /app

# Instalar curl para healthcheck
RUN apk add --no-cache curl

# Usuario no-root para seguridad
RUN adduser -D -s /bin/sh appuser && chown -R appuser /app
USER appuser

COPY --from=build /app/publish .

# Exponer puerto
EXPOSE 8080

ENV ASPNETCORE_URLS=http://+:8080

ENTRYPOINT ["dotnet", "ContaFlow.API.dll"]
