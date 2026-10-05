// Punto de entrada del servidor. Se lee de arriba abajo, en el mismo orden en que ocurre:
// 1) leer la configuración  2) registrar los servicios  3) configurar las sesiones del panel
// 4) configurar la API  5) preparar la base de datos  6) definir el recorrido de cada petición  7) arrancar.
using System.IdentityModel.Tokens.Jwt;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Alianza.Servidor.Datos;
using Alianza.Servidor.Modulos;
using Alianza.Servidor.Seguridad;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var constructor = WebApplication.CreateBuilder(new WebApplicationOptions { Args = args, WebRootPath = "publico" });
var configuracion = constructor.Configuration;
var servicios = constructor.Services;
var sesiones = configuracion.GetSection(ConfiguracionSesiones.Seccion).Get<ConfiguracionSesiones>() ?? new ConfiguracionSesiones();
var origenesPermitidos = configuracion.GetSection("OrigenesPermitidos").Get<string[]>() ?? [];

// ─── 1. Configuración ─────────────────────────────────────────────────────────

if (sesiones.Clave.Length < 32) throw new InvalidOperationException("Sesiones__Clave es obligatoria y debe tener al menos 32 caracteres.");
servicios.Configure<ConfiguracionSesiones>(configuracion.GetSection(ConfiguracionSesiones.Seccion));
servicios.Configure<ConfiguracionSuperadmin>(configuracion.GetSection(ConfiguracionSuperadmin.Seccion));
servicios.Configure<ConfiguracionLdap>(configuracion.GetSection(ConfiguracionLdap.Seccion));
servicios.Configure<ConfiguracionPublica>(configuracion.GetSection(ConfiguracionPublica.Seccion));
servicios.Configure<ConfiguracionCargaInicial>(configuracion.GetSection(ConfiguracionCargaInicial.Seccion));

// ─── 2. Servicios ─────────────────────────────────────────────────────────────

servicios.AddDbContext<BaseDeDatos>(o => o.UseNpgsql(configuracion["BaseDeDatos"]).UseSnakeCaseNamingConvention());
servicios.AddHttpContextAccessor();
servicios.AddScoped<UsuarioActual>();
servicios.AddScoped<Auditoria>();
servicios.AddScoped<ServicioMedios>();
servicios.AddScoped<ServicioSeries>();
servicios.AddScoped<ServicioSocios>();
servicios.AddScoped<ServicioSitio>();
servicios.AddScoped<ServicioPostulaciones>();
servicios.AddScoped<ServicioUsuarios>();
servicios.AddScoped<CargaInicial>();
servicios.AddSingleton<DireccionesMedios>();
servicios.AddSingleton<Sesiones>();
servicios.AddSingleton<DirectorioLdap>();

// ─── 3. Sesiones del panel (solo cuentas administrativas; el sitio público no tiene inicio de sesión) ───

JwtSecurityTokenHandler.DefaultMapInboundClaims = false;
servicios.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o =>
{
    o.MapInboundClaims = false;
    o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidIssuer = sesiones.Emisor,
        ValidAudience = sesiones.Audiencia,
        IssuerSigningKey = Sesiones.Llave(sesiones),
        ValidateIssuerSigningKey = true,
        ClockSkew = TimeSpan.FromMinutes(1),
        NameClaimType = JwtRegisteredClaimNames.UniqueName,
    };
    o.Events = new JwtBearerEvents
    {
        // La sesión deja de valer si la cuenta se desactivó o cambió su contraseña (cambia el sello).
        OnTokenValidated = async contexto =>
        {
            var bd = contexto.HttpContext.RequestServices.GetRequiredService<BaseDeDatos>();
            var id = contexto.Principal?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
            var sello = contexto.Principal?.FindFirst(DatosSesion.Sello)?.Value;
            var vigente = int.TryParse(id, out var numero) && Guid.TryParse(sello, out var guid) &&
                          await bd.Usuarios.AnyAsync(u => u.Id == numero && u.Activo && u.SelloSesion == guid);
            if (!vigente) contexto.Fail("Sesión cerrada.");
        },
    };
});
servicios.AddAuthorizationBuilder()
    .AddPolicy(Politicas.Superadmin, p => p.RequireAuthenticatedUser().RequireClaim(DatosSesion.Superadmin, "true"));

// Límites por IP: intentos de inicio de sesión y envíos del formulario público.
servicios.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.AddPolicy("inicio-sesion", contexto => RateLimitPartition.GetFixedWindowLimiter(contexto.Connection.RemoteIpAddress?.ToString() ?? "?",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = configuracion.GetValue("LimiteInicioSesionPorMinuto", 10), Window = TimeSpan.FromMinutes(1) }));
    o.AddPolicy("postulaciones", contexto => RateLimitPartition.GetFixedWindowLimiter(contexto.Connection.RemoteIpAddress?.ToString() ?? "?",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = configuracion.GetValue("LimitePostulacionesPor10Minutos", 5), Window = TimeSpan.FromMinutes(10) }));
});

// ─── 4. API ───────────────────────────────────────────────────────────────────

servicios.AddControllers(o => o.Filters.Add<FiltroErrorDeNegocio>())
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
servicios.AddExceptionHandler<ManejadorDeErrores>();
servicios.AddProblemDetails();
servicios.AddCors(o => o.AddDefaultPolicy(p => p.WithOrigins(origenesPermitidos).AllowAnyHeader().AllowAnyMethod().WithExposedHeaders("X-Advertencia")));
servicios.Configure<ForwardedHeadersOptions>(o =>
{
    // Detrás de un proxy inverso (Caddy, nginx) que agrega la IP real del visitante.
    o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    o.KnownNetworks.Clear();
    o.KnownProxies.Clear();
});

var app = constructor.Build();

// ─── 5. Base de datos ─────────────────────────────────────────────────────────

using (var alcance = app.Services.CreateScope())
{
    await alcance.ServiceProvider.GetRequiredService<CargaInicial>().EjecutarAsync();
}

// ─── 6. Recorrido de cada petición, en orden ──────────────────────────────────

app.UseForwardedHeaders();
app.UseExceptionHandler();
// Panel: archivos de la carpeta publico/panel, servidos en /panel.
app.UseDefaultFiles();
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = contexto =>
    {
        var cabeceras = contexto.Context.Response.Headers;
        cabeceras.XContentTypeOptions = "nosniff";
        cabeceras.XFrameOptions = "DENY";
        cabeceras["Referrer-Policy"] = "no-referrer";
        cabeceras.ContentSecurityPolicy = "default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; " +
                                          "style-src 'self'; script-src 'self'; frame-src https://www.youtube.com; frame-ancestors 'none'";
        if (contexto.File.Name.EndsWith(".html")) cabeceras.CacheControl = "no-cache";
    },
});
app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/salud", async (BaseDeDatos bd) => await bd.Database.CanConnectAsync() ? Results.Text("Bien") : Results.StatusCode(503));
app.MapGet("/", () => Results.Redirect("/panel/"));

// ─── 7. Arrancar ──────────────────────────────────────────────────────────────

app.Run();

/// <summary>Visible para las pruebas (WebApplicationFactory).</summary>
public partial class Program;
