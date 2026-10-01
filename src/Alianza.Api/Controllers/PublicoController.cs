using Alianza.Api.Data;
using Alianza.Api.Dtos;
using Alianza.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Net.Http.Headers;

namespace Alianza.Api.Controllers;

/// <summary>Endpoints de solo lectura para el sitio público. No requieren sesión.</summary>
[ApiController]
[Route("api")]
public class PublicoController(AlianzaDbContext db, ServicioSeries series, ServicioSocios socios, UrlsMedios urls) : ControllerBase
{
    /// <summary>Catálogo de estados de serie.</summary>
    [HttpGet("estados")]
    public async Task<List<EstadoPublicoDto>> Estados() =>
        await db.Estados.OrderBy(e => e.Orden).Select(e => new EstadoPublicoDto(e.Codigo, e.Nombre, e.Color)).ToListAsync();

    /// <summary>Tarjetas de la sección "Proyectos" de la portada. Filtro opcional por código de estado.</summary>
    [HttpGet("series")]
    public async Task<List<TarjetaSerieDto>> Series([FromQuery] string? estado = null)
    {
        var q = db.Series.Where(s => s.Publicada);
        if (!string.IsNullOrEmpty(estado)) q = q.Where(s => s.Estado.Codigo == estado);
        var lista = await q.OrderBy(s => s.Orden).ThenBy(s => s.Nombre)
            .Select(s => new { s.Slug, s.Nombre, s.PortadaId, s.Estado }).ToListAsync();
        return lista.Select(s => new TarjetaSerieDto(s.Slug, s.Nombre, urls.Url(s.PortadaId), $"/wiki/{s.Slug}",
            ServicioSeries.AEstadoPublico(s.Estado))).ToList();
    }

    /// <summary>Datos completos de una wiki (misma forma que ProjectWikiData del frontend).</summary>
    [HttpGet("series/{slug}")]
    public async Task<ActionResult<WikiPublicaDto>> Serie(string slug)
    {
        var s = await series.ConTodo().AsNoTracking().FirstOrDefaultAsync(x => x.Slug == slug && x.Publicada);
        return s is null ? NotFound() : await series.AWikiPublicaAsync(s);
    }

    /// <summary>Socios / asociados publicados.</summary>
    [HttpGet("socios")]
    public async Task<List<SocioPublicoDto>> Socios()
    {
        var lista = await socios.ConTodo().AsNoTracking().Where(s => s.Publicado).OrderBy(s => s.Orden).ThenBy(s => s.Nombre).ToListAsync();
        return lista.Select(socios.APublico).ToList();
    }

    [HttpGet("socios/{slug}")]
    public async Task<ActionResult<SocioPublicoDto>> Socio(string slug)
    {
        var s = await socios.ConTodo().AsNoTracking().FirstOrDefaultAsync(x => x.Slug == slug && x.Publicado);
        return s is null ? NotFound() : socios.APublico(s);
    }

    /// <summary>Sirve una imagen/video guardado en PostgreSQL. El contenido de un id nunca cambia, así que se cachea indefinidamente.</summary>
    [HttpGet("medios/{id:guid}"), HttpHead("medios/{id:guid}")]
    public async Task<IActionResult> Medio(Guid id)
    {
        var meta = await db.Medios.AsNoTracking().Where(m => m.Id == id)
            .Select(m => new { m.TipoContenido, m.Sha256, m.NombreArchivo }).FirstOrDefaultAsync();
        if (meta is null) return NotFound();

        var etag = new EntityTagHeaderValue($"\"{meta.Sha256}\"");
        Response.Headers.CacheControl = "public, max-age=31536000, immutable";
        Response.Headers.XContentTypeOptions = "nosniff";
        // Un SVG puede contener scripts: se sirve en sandbox para que no se ejecuten.
        Response.Headers.ContentSecurityPolicy = "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; media-src 'self'; sandbox";
        if (Request.Headers.IfNoneMatch.ToString().Contains(meta.Sha256))
        {
            Response.Headers.ETag = etag.ToString();
            return StatusCode(StatusCodes.Status304NotModified);
        }

        var datos = await db.MediosContenido.AsNoTracking().Where(c => c.MedioId == id).Select(c => c.Datos).FirstAsync();
        return File(datos, meta.TipoContenido, lastModified: null, entityTag: etag, enableRangeProcessing: true);
    }
}
