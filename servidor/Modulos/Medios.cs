using System.ComponentModel.DataAnnotations;
using System.Security.Cryptography;
using Alianza.Servidor.Datos;
using Alianza.Servidor.Seguridad;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Net.Http.Headers;

namespace Alianza.Servidor.Modulos;

// Imágenes y videos guardados en la base de datos.
// 1) Formatos  2) Lógica (guardar, comprobar, buscar usos)  3) Rutas públicas  4) Rutas del panel.

public record MedioEnPanel(Guid Id, string Url, string NombreArchivo, string TipoContenido, long Tamano, string TextoAlternativo, DateTime SubidoEn);

public record DatosMedio([MaxLength(300)] string? TextoAlternativo);

public class ServicioMedios(BaseDeDatos bd)
{
    public const long TamanoMaximo = 25 * 1024 * 1024; // pensado para un servidor con poca memoria: cada archivo se procesa completo en memoria

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

    /// <summary>Guarda un archivo. Si ya existía uno idéntico (misma huella) devuelve ese y no lo duplica.</summary>
    public async Task<Medio> GuardarAsync(byte[] bytes, string nombreArchivo, string? textoAlternativo)
    {
        string? tipo;
        string huella;
        Medio? existente;
        Medio medio;

        // 1. Validar tamaño, extensión y que el contenido sea realmente de ese tipo.
        if (bytes.Length == 0) throw new ErrorDeNegocio("El archivo está vacío.");
        if (bytes.Length > TamanoMaximo) throw new ErrorDeNegocio($"El archivo supera el máximo de {TamanoMaximo / 1024 / 1024} MB.");
        tipo = TiposPorExtension.GetValueOrDefault(Path.GetExtension(nombreArchivo))
               ?? throw new ErrorDeNegocio("Formato no soportado. Usa webp, png, jpg, gif, svg, mp4 o webm.");
        if (!FirmaCoincide(tipo, bytes)) throw new ErrorDeNegocio("El contenido del archivo no coincide con su extensión.");

        // 2. Si ya está guardado, reutilizarlo.
        huella = Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();
        existente = await bd.Medios.FirstOrDefaultAsync(m => m.Huella == huella);
        if (existente is not null) return existente;

        // 3. Guardarlo.
        medio = new Medio
        {
            Id = Guid.NewGuid(),
            NombreArchivo = Path.GetFileName(nombreArchivo),
            TipoContenido = tipo,
            Tamano = bytes.Length,
            Huella = huella,
            TextoAlternativo = textoAlternativo?.Trim() ?? "",
        };
        medio.Contenido = new ContenidoMedio { MedioId = medio.Id, Bytes = bytes };
        bd.Medios.Add(medio);
        return medio;
    }

    /// <summary>Lanza error si alguno de los ids no existe en la biblioteca.</summary>
    public async Task ComprobarQueExistenAsync(IEnumerable<Guid?> ids)
    {
        var buscados = ids.Where(i => i.HasValue).Select(i => i!.Value).Distinct().ToList();
        if (buscados.Count == 0) return;
        var encontrados = await bd.Medios.Where(m => buscados.Contains(m.Id)).Select(m => m.Id).ToListAsync();
        var faltan = buscados.Except(encontrados).ToList();
        if (faltan.Count > 0) throw new ErrorDeNegocio($"Archivo(s) inexistente(s): {string.Join(", ", faltan)}.");
    }

    /// <summary>Dónde se usa un archivo (para no borrar uno en uso).</summary>
    public async Task<List<string>> UsosAsync(Guid id)
    {
        var usos = new List<string>();
        usos.AddRange(await bd.Series.Where(s => s.PortadaId == id || s.CabeceraId == id || s.LogoId == id || s.VideoPropioId == id || s.CreadorImagenId == id)
            .Select(s => "Serie " + s.Nombre).ToListAsync());
        usos.AddRange(await bd.ImagenesSerie.Where(i => i.MedioId == id)
            .Join(bd.Series, i => i.SerieId, s => s.Id, (i, s) => "Galería o carrusel de " + s.Nombre).ToListAsync());
        usos.AddRange(await bd.Personajes.Where(p => p.ImagenId == id || p.ImagenActorVozId == id).Select(p => "Personaje " + p.Nombre).ToListAsync());
        usos.AddRange(await bd.MiembrosEquipo.Where(m => m.ImagenId == id).Select(m => "Equipo: " + m.Nombre).ToListAsync());
        usos.AddRange(await bd.Socios.Where(s => s.ImagenId == id).Select(s => "Socio " + s.Nombre).ToListAsync());
        usos.AddRange(await bd.TextosSitio.Where(t => t.Valor.Contains(id.ToString())).Select(t => "Sitio: " + t.Etiqueta).ToListAsync());
        return usos.Distinct().ToList();
    }

    /// <summary>Los primeros bytes deben corresponder al tipo declarado (no basta con la extensión).</summary>
    private static bool FirmaCoincide(string tipo, ReadOnlySpan<byte> bytes) => tipo switch
    {
        "image/png" => bytes.StartsWith(new byte[] { 0x89, 0x50, 0x4E, 0x47 }),
        "image/jpeg" => bytes.StartsWith(new byte[] { 0xFF, 0xD8, 0xFF }),
        "image/gif" => bytes.StartsWith("GIF8"u8),
        "image/webp" => bytes.Length > 12 && bytes[..4].SequenceEqual("RIFF"u8) && bytes[8..12].SequenceEqual("WEBP"u8),
        "video/mp4" => bytes.Length > 8 && bytes[4..8].SequenceEqual("ftyp"u8),
        "video/webm" => bytes.StartsWith(new byte[] { 0x1A, 0x45, 0xDF, 0xA3 }),
        "image/svg+xml" => System.Text.Encoding.UTF8.GetString(bytes[..Math.Min(bytes.Length, 1024)]).Contains("<svg", StringComparison.OrdinalIgnoreCase),
        _ => false,
    };
}

/// <summary>GET /api/medios/{id}: sirve el archivo. El contenido de un id nunca cambia, así que se guarda en caché para siempre.</summary>
[ApiController]
public class RutasMedios(BaseDeDatos bd) : ControllerBase
{
    [HttpGet("api/medios/{id:guid}"), HttpHead("api/medios/{id:guid}")]
    public async Task<IActionResult> Servir(Guid id)
    {
        var datos = await bd.Medios.AsNoTracking().Where(m => m.Id == id).Select(m => new { m.TipoContenido, m.Huella }).FirstOrDefaultAsync();
        byte[] bytes;
        if (datos is null) return NotFound();

        Response.Headers.CacheControl = "public, max-age=31536000, immutable";
        Response.Headers.XContentTypeOptions = "nosniff";
        // Un SVG puede traer scripts: se sirve aislado para que no se ejecuten.
        Response.Headers.ContentSecurityPolicy = "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; media-src 'self'; sandbox";
        if (Request.Headers.IfNoneMatch.ToString().Contains(datos.Huella)) return StatusCode(StatusCodes.Status304NotModified);

        bytes = await bd.ContenidosMedio.AsNoTracking().Where(c => c.MedioId == id).Select(c => c.Bytes).FirstAsync();
        return File(bytes, datos.TipoContenido, lastModified: null, entityTag: new EntityTagHeaderValue($"\"{datos.Huella}\""), enableRangeProcessing: true);
    }
}

/// <summary>Biblioteca de medios del panel: cualquier cuenta sube archivos; eliminarlos requiere el permiso Medios.</summary>
[ApiController]
[Authorize]
[Route("api/panel/medios")]
public class RutasMediosPanel(BaseDeDatos bd, ServicioMedios medios, Auditoria auditoria, DireccionesMedios direcciones) : ControllerBase
{
    private MedioEnPanel Formato(Medio m) => new(m.Id, direcciones.De(m.Id), m.NombreArchivo, m.TipoContenido, m.Tamano, m.TextoAlternativo, m.SubidoEn);

    [HttpGet]
    public async Task<Pagina<MedioEnPanel>> Listar([FromQuery] string? buscar, [FromQuery] int pagina = 1, [FromQuery] int tamano = 60)
    {
        IQueryable<Medio> consulta = bd.Medios.AsNoTracking();
        int total;
        List<Medio> elementos;

        // 1. Ajustar la página pedida y filtrar por el texto buscado.
        tamano = Math.Clamp(tamano, 1, 200);
        pagina = Math.Max(pagina, 1);
        if (!string.IsNullOrWhiteSpace(buscar))
            consulta = consulta.Where(m => EF.Functions.ILike(m.NombreArchivo, $"%{buscar.Trim()}%") || EF.Functions.ILike(m.TextoAlternativo, $"%{buscar.Trim()}%"));

        // 2. Contar y traer solo esa página, de lo más nuevo a lo más antiguo.
        total = await consulta.CountAsync();
        elementos = await consulta.OrderByDescending(m => m.SubidoEn).ThenBy(m => m.NombreArchivo).Skip((pagina - 1) * tamano).Take(tamano).ToListAsync();
        return new Pagina<MedioEnPanel>(elementos.Select(Formato).ToList(), total, pagina, tamano);
    }

    [HttpPost]
    [RequestSizeLimit(ServicioMedios.TamanoMaximo + 1024 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = ServicioMedios.TamanoMaximo + 1024 * 1024)]
    public async Task<ActionResult<List<MedioEnPanel>>> Subir([FromForm] List<IFormFile> archivos, [FromForm] string? textoAlternativo)
    {
        var guardados = new List<Medio>();
        if (archivos.Count == 0) throw new ErrorDeNegocio("No se recibió ningún archivo.");

        foreach (var archivo in archivos)
        {
            // Se lee directo a un arreglo de su tamaño exacto: una sola copia en memoria.
            var bytes = new byte[archivo.Length];
            await using (var lectura = archivo.OpenReadStream()) await lectura.ReadExactlyAsync(bytes);
            guardados.Add(await medios.GuardarAsync(bytes, archivo.FileName, textoAlternativo));
        }
        await auditoria.RegistrarAsync("subir", "medio", string.Join(", ", archivos.Select(a => a.FileName)));
        await bd.SaveChangesAsync();
        return guardados.Select(Formato).ToList();
    }

    [HttpPatch("{id:guid}")]
    public async Task<ActionResult<MedioEnPanel>> Actualizar(Guid id, DatosMedio datos)
    {
        var medio = await bd.Medios.FindAsync(id);
        if (medio is null) return NotFound();
        medio.TextoAlternativo = datos.TextoAlternativo?.Trim() ?? "";
        await auditoria.RegistrarAsync("editar", "medio", medio.NombreArchivo);
        await bd.SaveChangesAsync();
        return Formato(medio);
    }

    [HttpGet("{id:guid}/usos")]
    public async Task<ActionResult<List<string>>> Usos(Guid id) =>
        await bd.Medios.AnyAsync(m => m.Id == id) ? await medios.UsosAsync(id) : NotFound();

    [HttpDelete("{id:guid}")]
    [RequierePermiso(AreaPermiso.Medios)]
    public async Task<IActionResult> Eliminar(Guid id)
    {
        var medio = await bd.Medios.FindAsync(id);
        if (medio is null) return NotFound();
        var usos = await medios.UsosAsync(id);
        if (usos.Count > 0) throw new ErrorDeNegocio($"El archivo está en uso: {string.Join("; ", usos.Take(5))}.", StatusCodes.Status409Conflict);

        bd.Medios.Remove(medio);
        await auditoria.RegistrarAsync("eliminar", "medio", medio.NombreArchivo);
        await bd.SaveChangesAsync();
        return NoContent();
    }
}
