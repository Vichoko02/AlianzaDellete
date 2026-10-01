using System.Security.Cryptography;
using Alianza.Api.Data;
using Alianza.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Alianza.Api.Services;

public class ServicioMedios(AlianzaDbContext db)
{
    public const long TamanoMaximo = 60 * 1024 * 1024;

    private static readonly Dictionary<string, string> TiposPorExtension = new(StringComparer.OrdinalIgnoreCase)
    {
        [".webp"] = "image/webp",
        [".png"] = "image/png",
        [".jpg"] = "image/jpeg",
        [".jpeg"] = "image/jpeg",
        [".gif"] = "image/gif",
        [".svg"] = "image/svg+xml",
        [".mp4"] = "video/mp4",
        [".webm"] = "video/webm",
    };

    public static string? TipoPorExtension(string nombre) =>
        TiposPorExtension.GetValueOrDefault(Path.GetExtension(nombre));

    /// <summary>Comprueba que los primeros bytes correspondan al tipo declarado (no basta con la extensión).</summary>
    private static bool FirmaValida(string tipo, ReadOnlySpan<byte> d) => tipo switch
    {
        "image/png" => d.StartsWith(new byte[] { 0x89, 0x50, 0x4E, 0x47 }),
        "image/jpeg" => d.StartsWith(new byte[] { 0xFF, 0xD8, 0xFF }),
        "image/gif" => d.StartsWith("GIF8"u8),
        "image/webp" => d.Length > 12 && d[..4].SequenceEqual("RIFF"u8) && d[8..12].SequenceEqual("WEBP"u8),
        "video/mp4" => d.Length > 8 && d[4..8].SequenceEqual("ftyp"u8),
        "video/webm" => d.StartsWith(new byte[] { 0x1A, 0x45, 0xDF, 0xA3 }),
        "image/svg+xml" => System.Text.Encoding.UTF8.GetString(d[..Math.Min(d.Length, 1024)]).Contains("<svg", StringComparison.OrdinalIgnoreCase),
        _ => false,
    };

    /// <summary>Guarda un archivo en la BD. Si ya existía uno idéntico (mismo SHA-256) devuelve ese.</summary>
    public async Task<Medio> GuardarAsync(byte[] datos, string nombreArchivo, string? alt, int? usuarioId)
    {
        if (datos.Length == 0) throw new ErrorNegocio("El archivo está vacío.");
        if (datos.Length > TamanoMaximo) throw new ErrorNegocio($"El archivo supera el máximo de {TamanoMaximo / 1024 / 1024} MB.");
        var tipo = TipoPorExtension(nombreArchivo)
                   ?? throw new ErrorNegocio("Formato no soportado. Usa webp, png, jpg, gif, svg, mp4 o webm.");
        if (!FirmaValida(tipo, datos)) throw new ErrorNegocio("El contenido del archivo no coincide con su extensión.");

        var sha = Convert.ToHexString(SHA256.HashData(datos)).ToLowerInvariant();
        var existente = await db.Medios.FirstOrDefaultAsync(m => m.Sha256 == sha);
        if (existente is not null) return existente;

        var medio = new Medio
        {
            Id = Guid.NewGuid(),
            NombreArchivo = Path.GetFileName(nombreArchivo),
            TipoContenido = tipo,
            Tamano = datos.Length,
            Sha256 = sha,
            Alt = alt?.Trim() ?? "",
            SubidoPorId = usuarioId,
        };
        medio.Contenido = new MedioContenido { MedioId = medio.Id, Datos = datos };
        db.Medios.Add(medio);
        return medio;
    }

    /// <summary>Lanza error si alguno de los ids no existe en la biblioteca.</summary>
    public async Task ValidarExistenAsync(IEnumerable<Guid?> ids)
    {
        var lista = ids.Where(i => i.HasValue).Select(i => i!.Value).Distinct().ToList();
        if (lista.Count == 0) return;
        var encontrados = await db.Medios.Where(m => lista.Contains(m.Id)).Select(m => m.Id).ToListAsync();
        var faltan = lista.Except(encontrados).ToList();
        if (faltan.Count > 0) throw new ErrorNegocio($"Medio(s) inexistente(s): {string.Join(", ", faltan)}.");
    }

    /// <summary>Indica dónde se usa un medio (para impedir borrarlo si está en uso).</summary>
    public async Task<List<string>> UsosAsync(Guid id)
    {
        var usos = new List<string>();
        usos.AddRange(await db.Series.Where(s => s.PortadaId == id || s.BannerId == id || s.LogoId == id || s.VideoLocalId == id || s.CreadorImagenId == id)
            .Select(s => "Serie " + s.Nombre).ToListAsync());
        usos.AddRange(await db.SerieImagenes.Where(i => i.MedioId == id)
            .Join(db.Series, i => i.SerieId, s => s.Id, (i, s) => "Galería/carrusel de " + s.Nombre).ToListAsync());
        usos.AddRange(await db.Personajes.Where(p => p.ImagenId == id || p.ImagenActorVozId == id)
            .Select(p => "Personaje " + p.Nombre).ToListAsync());
        usos.AddRange(await db.MiembrosEquipo.Where(m => m.ImagenId == id).Select(m => "Equipo: " + m.Nombre).ToListAsync());
        usos.AddRange(await db.Socios.Where(s => s.ImagenId == id).Select(s => "Socio " + s.Nombre).ToListAsync());
        return usos.Distinct().ToList();
    }
}
