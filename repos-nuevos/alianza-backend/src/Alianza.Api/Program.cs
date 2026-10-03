using System.IdentityModel.Tokens.Jwt;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Alianza.Api.Auth;
using Alianza.Api.Data;
using Alianza.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;

// ─── Opciones ────────────────────────────────────────────────────────────────
builder.Services.Configure<JwtOpciones>(config.GetSection(JwtOpciones.Seccion));
builder.Services.Configure<AdminOpciones>(config.GetSection(AdminOpciones.Seccion));
builder.Services.Configure<LdapOpciones>(config.GetSection(LdapOpciones.Seccion));
builder.Services.Configure<SeedOpciones>(config.GetSection(SeedOpciones.Seccion));
builder.Services.Configure<OpcionesPublicas>(config.GetSection(OpcionesPublicas.Seccion));

var jwt = config.GetSection(JwtOpciones.Seccion).Get<JwtOpciones>() ?? new JwtOpciones();
if (jwt.Clave.Length < 32)
    throw new InvalidOperationException("Jwt__Clave es obligatoria y debe tener al menos 32 caracteres.");

// ─── Datos y servicios ───────────────────────────────────────────────────────
builder.Services.AddDbContext<AlianzaDbContext>(o => o
    .UseNpgsql(config.GetConnectionString("Alianza"))
    .UseSnakeCaseNamingConvention());

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<UsuarioActual>();
builder.Services.AddScoped<ServicioAuditoria>();
builder.Services.AddScoped<ServicioMedios>();
builder.Services.AddScoped<ServicioSeries>();
builder.Services.AddScoped<ServicioSocios>();
builder.Services.AddScoped<ServicioUsuarios>();
builder.Services.AddScoped<ServicioSitio>();
builder.Services.AddScoped<ServicioQuiz>();
builder.Services.AddScoped<Inicializador>();
builder.Services.AddSingleton<UrlsMedios>();
builder.Services.AddSingleton<ServicioTokens>();
if (config.GetValue<bool>("Ldap:Habilitado"))
    builder.Services.AddSingleton<IDirectorioLdap, DirectorioLdap>();
else
    builder.Services.AddSingleton<IDirectorioLdap, DirectorioLdapDeshabilitado>();

// ─── Autenticación (solo cuentas administrativas; el sitio público no tiene login) ───
JwtSecurityTokenHandler.DefaultMapInboundClaims = false;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.MapInboundClaims = false;
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidIssuer = jwt.Emisor,
            ValidAudience = jwt.Audiencia,
            IssuerSigningKey = ServicioTokens.Clave(jwt),
            ValidateIssuerSigningKey = true,
            ClockSkew = TimeSpan.FromMinutes(1),
            NameClaimType = JwtRegisteredClaimNames.UniqueName,
        };
        o.Events = new JwtBearerEvents
        {
            // El token deja de valer si el usuario fue desactivado o cambió su contraseña.
            OnTokenValidated = async ctx =>
            {
                var db = ctx.HttpContext.RequestServices.GetRequiredService<AlianzaDbContext>();
                var sub = ctx.Principal?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
                var sello = ctx.Principal?.FindFirst(Claims.Sello)?.Value;
                var valido = int.TryParse(sub, out var id) && Guid.TryParse(sello, out var g) &&
                             await db.Usuarios.AnyAsync(u => u.Id == id && u.Activo && u.SelloSeguridad == g);
                if (!valido) ctx.Fail("Sesión revocada.");
            },
        };
    });
builder.Services.AddAuthorizationBuilder()
    .AddPolicy(Politicas.SuperAdmin, p => p.RequireAuthenticatedUser().RequireClaim(Claims.SuperAdmin, "true"));

builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.AddPolicy("login", ctx => RateLimitPartition.GetFixedWindowLimiter(
        ctx.Connection.RemoteIpAddress?.ToString() ?? "desconocida",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = config.GetValue("LimiteLoginPorMinuto", 10), Window = TimeSpan.FromMinutes(1) }));
    // Formulario público de postulación: pocas solicitudes por IP para frenar el spam.
    o.AddPolicy("quiz", ctx => RateLimitPartition.GetFixedWindowLimiter(
        ctx.Connection.RemoteIpAddress?.ToString() ?? "desconocida",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = config.GetValue("LimiteSolicitudesPor10Minutos", 5), Window = TimeSpan.FromMinutes(10) }));
});

// ─── API ─────────────────────────────────────────────────────────────────────
builder.Services.AddControllers(o => o.Filters.Add<FiltroErrorNegocio>()).AddJsonOptions(o =>
    o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddExceptionHandler<ManejadorErrores>();
builder.Services.AddProblemDetails();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(o =>
{
    o.SwaggerDoc("v1", new() { Title = "API La Alianza", Version = "v1" });
    o.AddSecurityDefinition("Bearer", new()
    {
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http, Scheme = "bearer", BearerFormat = "JWT",
        Description = "Token obtenido en POST /api/auth/login",
    });
    o.AddSecurityRequirement(new()
    {
        [new() { Reference = new() { Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme, Id = "Bearer" } }] = [],
    });
});

var origenes = config.GetSection("Cors:Origenes").Get<string[]>() ?? [];
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.WithOrigins(origenes).AllowAnyHeader().AllowAnyMethod()
    .WithExposedHeaders("X-Advertencia")));

builder.Services.Configure<ForwardedHeadersOptions>(o =>
{
    o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    // Detrás de un proxy inverso (nginx/caddy) en la misma red de Docker.
    o.KnownNetworks.Clear();
    o.KnownProxies.Clear();
});
builder.Services.AddHealthChecks().AddDbContextCheck<AlianzaDbContext>();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    await scope.ServiceProvider.GetRequiredService<Inicializador>().EjecutarAsync();
}

app.UseForwardedHeaders();
app.UseExceptionHandler();
if (app.Environment.IsDevelopment() || config.GetValue<bool>("Swagger"))
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Panel de administración: archivos estáticos en wwwroot/admin, servidos en /admin.
app.UseDefaultFiles();
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        var h = ctx.Context.Response.Headers;
        h.XContentTypeOptions = "nosniff";
        h.XFrameOptions = "DENY";
        h["Referrer-Policy"] = "no-referrer";
        h.ContentSecurityPolicy = "default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; " +
                                  "style-src 'self'; script-src 'self'; frame-src https://www.youtube.com; frame-ancestors 'none'";
        if (ctx.File.Name.EndsWith(".html")) h.CacheControl = "no-cache";
    },
});
app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/salud");
app.MapGet("/", () => Results.Redirect("/admin/")).ExcludeFromDescription();

app.Run();

public partial class Program;
