using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using Alianza.Servidor.Datos;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;

namespace Alianza.Pruebas;

/// <summary>
/// Levanta el servidor contra una base PostgreSQL real y desechable (se borra al terminar).
/// Servidor de PostgreSQL: variable PRUEBAS_POSTGRES (por defecto localhost, postgres/postgres).
/// </summary>
public class ServidorDePrueba : WebApplicationFactory<Program>, IAsyncLifetime
{
    public const string Superadmin = "YishAdmin";
    public const string ContrasenaSuperadmin = "ClaveDePrueba2026";
    public const string ContrasenaComun = "ClaveSegura123";

    private readonly string conexion;

    public ServidorDePrueba()
    {
        var servidor = Environment.GetEnvironmentVariable("PRUEBAS_POSTGRES") ?? "Host=localhost;Port=5432;Username=postgres;Password=postgres";
        conexion = new NpgsqlConnectionStringBuilder(servidor) { Database = $"alianza_prueba_{Guid.NewGuid():N}" }.ConnectionString;
    }

    protected override void ConfigureWebHost(IWebHostBuilder constructor)
    {
        constructor.UseEnvironment("Pruebas");
        constructor.UseSetting("BaseDeDatos", conexion);
        constructor.UseSetting("Sesiones:Clave", "clave-de-pruebas-de-al-menos-32-caracteres!!");
        constructor.UseSetting("Superadmin:NombreUsuario", Superadmin);
        constructor.UseSetting("Superadmin:Contrasena", ContrasenaSuperadmin);
        constructor.UseSetting("LimiteInicioSesionPorMinuto", "1000");
        constructor.UseSetting("LimitePostulacionesPor10Minutos", "1000");
        // El servidor de pruebas no tiene IP de origen: se toma de la cabecera X-Ip-Prueba (solo existe en las pruebas).
        constructor.ConfigureServices(s => s.AddSingleton<IStartupFilter, IpDePrueba>());
    }

    private sealed class IpDePrueba : IStartupFilter
    {
        public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> siguiente) => app =>
        {
            app.Use((contexto, resto) =>
            {
                var ip = contexto.Request.Headers["X-Ip-Prueba"].ToString();
                contexto.Connection.RemoteIpAddress = System.Net.IPAddress.Parse(ip.Length > 0 ? ip : "10.255.255.254");
                return resto(contexto);
            });
            siguiente(app);
        };
    }

    /// <summary>Cliente que llega desde una IP propia (al azar si no se indica): así una prueba no bloquea a las demás.</summary>
    public HttpClient Cliente(string? ip = null)
    {
        var cliente = CreateClient();
        cliente.DefaultRequestHeaders.Add("X-Ip-Prueba", ip ?? $"10.{Random.Shared.Next(1, 250)}.{Random.Shared.Next(1, 250)}.{Random.Shared.Next(1, 250)}");
        return cliente;
    }

    public Task InitializeAsync() => Task.CompletedTask;

    public new async Task DisposeAsync()
    {
        using (var alcance = Services.CreateScope())
        {
            await alcance.ServiceProvider.GetRequiredService<BaseDeDatos>().Database.EnsureDeletedAsync();
        }
        await base.DisposeAsync();
    }

    /// <summary>Cliente con la sesión de esa cuenta ya iniciada.</summary>
    public async Task<HttpClient> ConSesionAsync(string nombreUsuario, string contrasena = ContrasenaComun, string? ip = null)
    {
        var cliente = Cliente(ip);
        var respuesta = await cliente.PostAsJsonAsync("/api/sesion/iniciar", new { nombreUsuario, contrasena });
        JsonObject? sesion;

        respuesta.EnsureSuccessStatusCode();
        sesion = await respuesta.Content.ReadFromJsonAsync<JsonObject>();
        cliente.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", sesion!["token"]!.GetValue<string>());
        return cliente;
    }

    public Task<HttpClient> YishAsync(string? ip = null) => ConSesionAsync(Superadmin, ContrasenaSuperadmin, ip);
}
