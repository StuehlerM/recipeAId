# ── Build stage ──────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /source

# Restore dependencies first (better layer caching)
COPY RecipeAId.sln .
COPY src/RecipeAId.Core/RecipeAId.Core.csproj   src/RecipeAId.Core/
COPY src/RecipeAId.Data/RecipeAId.Data.csproj   src/RecipeAId.Data/
COPY src/RecipeAId.Api/RecipeAId.Api.csproj     src/RecipeAId.Api/
COPY tests/RecipeAId.Tests/RecipeAId.Tests.csproj tests/RecipeAId.Tests/
RUN dotnet restore

# Copy sources and publish
COPY . .
RUN dotnet publish src/RecipeAId.Api/RecipeAId.Api.csproj \
    -c Release -o /app/publish --no-restore

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

# curl is used by the Docker Compose health check
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# SQLite database lives in a mounted volume
VOLUME /data
ENV ConnectionStrings__DefaultConnection="Data Source=/data/recipeaid.db"

EXPOSE 8080
ENTRYPOINT ["dotnet", "RecipeAId.Api.dll"]
