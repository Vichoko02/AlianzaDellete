using System.Text.Json;
using System.Text.Json.Serialization;
using Alianza.Api.Auth;
using Alianza.Api.Domain;
using Alianza.Api.Dtos;
using Alianza.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Alianza.Api.Data;

public class SeedOpciones
{
    public const string Seccion = "Seed";
    /// <summary>Aplica las migraciones pendientes al iniciar.</summary>
    public bool Migrar { get; set; } = true;
    /// <summary>Importa wikis y socios desde ArchivoDatos si la BD aún no tiene series.</summary>
    public bool ImportarContenido { get; set; }
    public string ArchivoDatos { get; set; } = "seed/seed-data.json";
    /// <summary>Carpeta src/assets del frontend (VistaUsuario) de donde se leen las imágenes a importar.</summary>
    public string? CarpetaAssets { get; set; }
}

/// <summary>Prepara la BD al arrancar: migraciones, catálogo de estados, superadmin y (opcional) contenido inicial.</summary>
public class Inicializador(
    AlianzaDbContext db, ServicioMedios medios, ServicioSeries series, ServicioSocios socios,
    IOptions<SeedOpciones> seed, IOptions<AdminOpciones> admin, ILogger<Inicializador> log)
{
    public static readonly EstadoSerie[] EstadosIniciales =
    [
        new() { Codigo = "en-produccion", Nombre = "En Producción", Color = "#E60000", Orden = 1 },
        new() { Codigo = "en-emision", Nombre = "En Emisión", Color = "#1A6FD4", Orden = 2 },
        new() { Codigo = "pausado", Nombre = "Pausado", Color = "#8A7A1A", Orden = 3 },
        new() { Codigo = "finalizado", Nombre = "Finalizado", Color = "#1A8A3A", Orden = 4 },
        new() { Codigo = "cancelado", Nombre = "Cancelado", Color = "#4A4A4A", Orden = 5 },
        new() { Codigo = "pronto", Nombre = "Muy Pronto", Color = "#6B3FA0", Orden = 6 },
    ];

    public async Task EjecutarAsync()
    {
        if (seed.Value.Migrar) await db.Database.MigrateAsync();
        await EstadosAsync();
        await SuperAdminAsync();
        if (seed.Value.ImportarContenido && !await db.Series.AnyAsync())
        {
            // Todo o nada: si algo falla no queda una importación a medias.
            await using var tx = await db.Database.BeginTransactionAsync();
            await ImportarContenidoAsync();
            await tx.CommitAsync();
        }
    }

    private async Task EstadosAsync()
    {
        if (await db.Estados.AnyAsync()) return;
        db.Estados.AddRange(EstadosIniciales.Select(e => new EstadoSerie { Codigo = e.Codigo, Nombre = e.Nombre, Color = e.Color, Orden = e.Orden }));
        await db.SaveChangesAsync();
    }

    private async Task SuperAdminAsync()
    {
        if (await db.Usuarios.AnyAsync(u => u.EsSuperAdmin)) return;
        var op = admin.Value;
        if (string.IsNullOrWhiteSpace(op.Password))
            throw new InvalidOperationException(
                "No existe el superadministrador y falta su contraseña inicial. Define la variable de entorno Admin__Password.");
        if (Contrasenas.Validar(op.Password) is { } error)
            throw new InvalidOperationException($"Admin__Password no es válida: {error}");

        db.Usuarios.Add(new Usuario
        {
            Username = op.Username,
            UsernameNormalizado = ServicioUsuarios.Normalizar(op.Username),
            NombreVisible = op.NombreVisible,
            Origen = OrigenAuth.Local, // siempre local: si LDAP cae, el superadmin sigue pudiendo entrar
            PasswordHash = Contrasenas.Hashear(op.Password),
            EsSuperAdmin = true,
            PuedeCrearWikis = true,
        });
        await db.SaveChangesAsync();
        log.LogInformation("Superadministrador '{Username}' creado.", op.Username);
    }

    // ─── Importación del contenido que hoy está hardcodeado en el frontend ──────

    private record SeedEnlace(string Nombre, string? Imagen, string? Enlace);
    private record SeedSocio(string Nombre, string? Imagen, string? Descripcion, Dictionary<string, string>? Redes, List<SeedEnlace>? Proyectos);
    private record SeedCreador(string? Nombre, string? Imagen, string? Descripcion, Dictionary<string, string>? Redes, List<SeedObra>? Obras);
    private record SeedObra(string Titulo, string? Url);
    private record SeedPersonaje(string Nombre, string? Imagen, string? Rol, string? Descripcion, string? ActorVoz, string? ImagenActorVoz);
    private record SeedMiembro(string Nombre, string? Rol, string? Imagen);
    private record SeedGrupo(string Categoria, List<SeedMiembro>? Miembros);
    private record SeedImagen(string Src, string? Alt);
    private record SeedSerie(
        string Id, string Nombre, string? Banner, string? Logo, string? Estado, string? VideoUrl, string? VideoLocal, string? Sinopsis,
        SeedCreador? Creador, Dictionary<string, string>? Redes, Dictionary<string, string>? Apoyanos, List<string>? Carrusel,
        List<SeedPersonaje>? Personajes, List<SeedGrupo>? Staff, List<SeedImagen>? Galeria);
    private record SeedDatos(List<SeedSerie> Series, List<SeedSocio> Socios, List<SeedEnlace> Portada);

    private async Task ImportarContenidoAsync()
    {
        var op = seed.Value;
        if (!File.Exists(op.ArchivoDatos)) { log.LogWarning("No se encontró {Archivo}; se omite la importación.", op.ArchivoDatos); return; }
        if (string.IsNullOrWhiteSpace(op.CarpetaAssets) || !Directory.Exists(op.CarpetaAssets))
        {
            log.LogWarning("Seed__CarpetaAssets no apunta a la carpeta de assets del frontend; se omite la importación.");
            return;
        }

        var datos = JsonSerializer.Deserialize<SeedDatos>(await File.ReadAllTextAsync(op.ArchivoDatos),
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true, NumberHandling = JsonNumberHandling.AllowReadingFromString })!;
        var cache = new Dictionary<string, Guid>();

        async Task<Guid?> Medio(string? ruta, string? alt = null)
        {
            if (string.IsNullOrWhiteSpace(ruta) || ruta.StartsWith("http")) return null;
            if (cache.TryGetValue(ruta, out var id)) return id;
            var completa = Path.GetFullPath(Path.Combine(op.CarpetaAssets!, ruta));
            if (!File.Exists(completa)) { log.LogWarning("Asset no encontrado: {Ruta}", ruta); return null; }
            var m = await medios.GuardarAsync(await File.ReadAllBytesAsync(completa), Path.GetFileName(completa), alt, null);
            await db.SaveChangesAsync();
            cache[ruta] = m.Id;
            return m.Id;
        }

        static List<EnlaceDto> Redes(Dictionary<string, string>? r) => (r ?? [])
            .Where(kv => !string.IsNullOrWhiteSpace(kv.Value) && Validacion.Plataformas.Contains(kv.Key) && kv.Value.StartsWith("http"))
            .Select(kv => new EnlaceDto(kv.Key, kv.Value.Trim())).ToList();
        static string? SlugDe(string? enlace) => enlace is not null && enlace.StartsWith("/wiki/") ? enlace["/wiki/".Length..] : null;

        var estados = await db.Estados.ToListAsync();
        var porDefecto = estados.First(e => e.Codigo == "en-produccion");
        var portada = datos.Portada.Select((p, i) => (Slug: SlugDe(p.Enlace), p.Imagen, Orden: i)).Where(p => p.Slug is not null)
            .ToDictionary(p => p.Slug!, p => p);

        foreach (var s in datos.Series)
        {
            var estado = estados.FirstOrDefault(e => string.Equals(e.Nombre, s.Estado?.Trim(), StringComparison.OrdinalIgnoreCase)) ?? porDefecto;
            portada.TryGetValue(s.Id, out var tarjeta);
            var c = s.Creador;
            var dto = new SerieEdicionDto(
                null, s.Id, s.Nombre, s.Sinopsis, estado.Id,
                await Medio(tarjeta.Imagen), await Medio(s.Banner), await Medio(s.Logo),
                string.IsNullOrWhiteSpace(s.VideoUrl) ? null : s.VideoUrl, await Medio(s.VideoLocal),
                new CreadorDto(c?.Nombre, c?.Descripcion, await Medio(c?.Imagen), Redes(c?.Redes),
                    (c?.Obras ?? []).Select(o => new ObraDto(o.Titulo, string.IsNullOrWhiteSpace(o.Url) ? null : o.Url)).ToList()),
                Redes(s.Redes), Redes(s.Apoyanos),
                await Lista(s.Carrusel ?? [], async src => await Medio(src) is { } id ? new ImagenDto(id, "") : null),
                await Lista(s.Galeria ?? [], async g => await Medio(g.Src, g.Alt) is { } id ? new ImagenDto(id, g.Alt) : null),
                await Lista(s.Personajes ?? [], async p => new PersonajeDto(p.Nombre, p.Rol, p.Descripcion, await Medio(p.Imagen), p.ActorVoz, await Medio(p.ImagenActorVoz))),
                await Lista(s.Staff ?? [], async g => new GrupoEquipoDto(g.Categoria,
                    await Lista(g.Miembros ?? [], async m => new MiembroDto(m.Nombre, m.Rol, await Medio(m.Imagen))))),
                tarjeta.Slug is null ? 100 : tarjeta.Orden, Publicada: true);

            var serie = new Serie();
            await series.AplicarAsync(serie, dto);
            db.Series.Add(serie);
            await db.SaveChangesAsync();
        }

        var slugs = await db.Series.ToDictionaryAsync(x => x.Slug, x => x.Id);
        var orden = 0;
        foreach (var so in datos.Socios)
        {
            var serieIds = (so.Proyectos ?? []).Select(p => SlugDe(p.Enlace)).Where(sl => sl is not null && slugs.ContainsKey(sl))
                .Select(sl => slugs[sl!]).Distinct().ToList();
            var socio = new Socio();
            await socios.AplicarAsync(socio, new SocioEdicionDto(null, Slug(so.Nombre), so.Nombre, so.Descripcion,
                await Medio(so.Imagen), orden++, true, Redes(so.Redes), serieIds));
            db.Socios.Add(socio);
            await db.SaveChangesAsync();
        }

        log.LogInformation("Contenido importado: {Series} series, {Socios} socios, {Medios} archivos.",
            datos.Series.Count, datos.Socios.Count, cache.Count);
    }

    private static async Task<List<TOut>> Lista<TIn, TOut>(IEnumerable<TIn> origen, Func<TIn, Task<TOut?>> f)
    {
        var res = new List<TOut>();
        foreach (var x in origen) if (await f(x) is { } y) res.Add(y);
        return res;
    }

    public static string Slug(string texto)
    {
        var normal = texto.Normalize(System.Text.NormalizationForm.FormD);
        var sb = new System.Text.StringBuilder();
        foreach (var ch in normal)
        {
            if (System.Globalization.CharUnicodeInfo.GetUnicodeCategory(ch) == System.Globalization.UnicodeCategory.NonSpacingMark) continue;
            sb.Append(char.IsLetterOrDigit(ch) ? char.ToLowerInvariant(ch) : '-');
        }
        return System.Text.RegularExpressions.Regex.Replace(sb.ToString(), "-+", "-").Trim('-');
    }
}
