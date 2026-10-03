using System.Net.Http.Headers;
using System.Net.Http.Json;
using Alianza.Api.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;

namespace Alianza.Api.Tests;

/// <summary>
/// Levanta la API contra una base PostgreSQL real y desechable.
/// Conexión al servidor: variable ALIANZA_TEST_PG (por defecto localhost, postgres/postgres).
/// </summary>
public class FabricaApi : WebApplicationFactory<Program>, IAsyncLifetime
{
    public const string AdminUser = "YishAdmin";
    public const string AdminPass = "ClaveDePrueba2026";

    private readonly string _conexion;

    public FabricaApi()
    {
        var servidor = Environment.GetEnvironmentVariable("ALIANZA_TEST_PG")
                       ?? "Host=localhost;Port=5432;Username=postgres;Password=postgres";
        _conexion = new NpgsqlConnectionStringBuilder(servidor) { Database = $"alianza_test_{Guid.NewGuid():N}" }.ConnectionString;
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("ConnectionStrings:Alianza", _conexion);
        builder.UseSetting("Jwt:Clave", "clave-de-pruebas-de-al-menos-32-caracteres!!");
        builder.UseSetting("Admin:Username", AdminUser);
        builder.UseSetting("Admin:Password", AdminPass);
        builder.UseSetting("LimiteLoginPorMinuto", "1000");
        builder.UseSetting("LimiteSolicitudesPor10Minutos", "1000");
    }

    public Task InitializeAsync() => Task.CompletedTask;

    public new async Task DisposeAsync()
    {
        using (var scope = Services.CreateScope())
        {
            await scope.ServiceProvider.GetRequiredService<AlianzaDbContext>().Database.EnsureDeletedAsync();
        }
        await base.DisposeAsync();
    }

    public async Task<HttpClient> ClienteAsync(string usuario, string password)
    {
        var c = CreateClient();
        var r = await c.PostAsJsonAsync("/api/auth/login", new { username = usuario, password });
        r.EnsureSuccessStatusCode();
        var sesion = await r.Content.ReadFromJsonAsync<SesionPrueba>(Json.Opciones);
        c.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", sesion!.Token);
        return c;
    }

    public Task<HttpClient> AdminAsync() => ClienteAsync(AdminUser, AdminPass);
}

public record SesionPrueba(string Token);

public static class Json
{
    public static readonly System.Text.Json.JsonSerializerOptions Opciones = new(System.Text.Json.JsonSerializerDefaults.Web)
    {
        Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() },
    };
}
