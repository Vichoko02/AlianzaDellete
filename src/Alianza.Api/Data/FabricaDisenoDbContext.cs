using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Alianza.Api.Data;

/// <summary>Usada solo por "dotnet ef" para generar migraciones sin arrancar la aplicación completa.</summary>
public class FabricaDisenoDbContext : IDesignTimeDbContextFactory<AlianzaDbContext>
{
    public AlianzaDbContext CreateDbContext(string[] args) => new(new DbContextOptionsBuilder<AlianzaDbContext>()
        .UseNpgsql(Environment.GetEnvironmentVariable("ConnectionStrings__Alianza") ?? "Host=localhost;Database=alianza_diseno")
        .UseSnakeCaseNamingConvention()
        .Options);
}
