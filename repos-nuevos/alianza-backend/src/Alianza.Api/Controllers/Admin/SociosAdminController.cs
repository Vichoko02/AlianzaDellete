using Alianza.Api.Auth;
using Alianza.Api.Data;
using Alianza.Api.Domain;
using Alianza.Api.Dtos;
using Alianza.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;

namespace Alianza.Api.Controllers.Admin;

/// <summary>Exige que el usuario tenga el permiso indicado (o sea superadmin).</summary>
public sealed class RequierePermisoAttribute(AmbitoPermiso ambito) : Attribute, IAsyncAuthorizationFilter
{
    public async Task OnAuthorizationAsync(AuthorizationFilterContext ctx)
    {
        if (ctx.HttpContext.User.Identity?.IsAuthenticated != true) return; // [Authorize] devuelve 401
        var actual = ctx.HttpContext.RequestServices.GetRequiredService<UsuarioActual>();
        if (!await actual.TieneAsync(ambito)) ctx.Result = new ForbidResult();
    }
}

[ApiController]
[Authorize]
[RequierePermiso(AmbitoPermiso.Socios)]
[Route("api/admin/socios")]
public class SociosAdminController(AlianzaDbContext db, ServicioSocios servicio, ServicioAuditoria auditoria, UrlsMedios urls) : ControllerBase
{
    [HttpGet]
    public async Task<List<SocioListaDto>> Listar()
    {
        var lista = await db.Socios.AsNoTracking().OrderBy(s => s.Orden).ThenBy(s => s.Nombre).ToListAsync();
        return lista.Select(s => new SocioListaDto(s.Id, s.Slug, s.Nombre, urls.Url(s.ImagenId), s.Publicado, s.Orden)).ToList();
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<SocioEdicionDto>> Obtener(int id)
    {
        var s = await servicio.ConTodo().AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        return s is null ? NotFound() : ServicioSocios.AEdicion(s);
    }

    [HttpPost]
    public async Task<ActionResult<SocioEdicionDto>> Crear(SocioEdicionDto dto)
    {
        var s = new Socio();
        await servicio.AplicarAsync(s, dto);
        db.Socios.Add(s);
        await db.SaveChangesAsync();
        await auditoria.RegistrarAsync("crear", "socio", s.Id, s.Nombre);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Obtener), new { id = s.Id }, ServicioSocios.AEdicion(s));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<SocioEdicionDto>> Actualizar(int id, SocioEdicionDto dto)
    {
        var s = await servicio.ConTodo().FirstOrDefaultAsync(x => x.Id == id);
        if (s is null) return NotFound();
        await servicio.AplicarAsync(s, dto);
        await auditoria.RegistrarAsync("editar", "socio", s.Id, s.Nombre);
        await db.SaveChangesAsync();
        return ServicioSocios.AEdicion(s);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Eliminar(int id)
    {
        var s = await db.Socios.FindAsync(id);
        if (s is null) return NotFound();
        db.Socios.Remove(s);
        await auditoria.RegistrarAsync("eliminar", "socio", id, s.Nombre);
        await db.SaveChangesAsync();
        return NoContent();
    }
}

[ApiController]
[Authorize]
[Route("api/admin/estados")]
public class EstadosAdminController(AlianzaDbContext db, ServicioAuditoria auditoria) : ControllerBase
{
    /// <summary>Cualquier usuario del panel lo necesita para el selector de estado de una wiki.</summary>
    [HttpGet]
    public async Task<List<EstadoDto>> Listar() =>
        (await db.Estados.AsNoTracking().OrderBy(e => e.Orden).ToListAsync()).Select(ServicioSeries.AEstadoDto).ToList();

    [HttpPost]
    [RequierePermiso(AmbitoPermiso.Estados)]
    public async Task<ActionResult<EstadoDto>> Crear(GuardarEstadoDto dto)
    {
        if (await db.Estados.AnyAsync(e => e.Codigo == dto.Codigo))
            throw new ErrorNegocio($"Ya existe el estado '{dto.Codigo}'.", StatusCodes.Status409Conflict);
        var e = new EstadoSerie { Codigo = dto.Codigo, Nombre = dto.Nombre.Trim(), Color = dto.Color, Orden = dto.Orden };
        db.Estados.Add(e);
        await auditoria.RegistrarAsync("crear", "estado", dto.Codigo, dto.Nombre);
        await db.SaveChangesAsync();
        return ServicioSeries.AEstadoDto(e);
    }

    [HttpPut("{id:int}")]
    [RequierePermiso(AmbitoPermiso.Estados)]
    public async Task<ActionResult<EstadoDto>> Actualizar(int id, GuardarEstadoDto dto)
    {
        var e = await db.Estados.FindAsync(id);
        if (e is null) return NotFound();
        if (await db.Estados.AnyAsync(x => x.Codigo == dto.Codigo && x.Id != id))
            throw new ErrorNegocio($"Ya existe el estado '{dto.Codigo}'.", StatusCodes.Status409Conflict);
        (e.Codigo, e.Nombre, e.Color, e.Orden) = (dto.Codigo, dto.Nombre.Trim(), dto.Color, dto.Orden);
        await auditoria.RegistrarAsync("editar", "estado", id, dto.Nombre);
        await db.SaveChangesAsync();
        return ServicioSeries.AEstadoDto(e);
    }

    [HttpDelete("{id:int}")]
    [RequierePermiso(AmbitoPermiso.Estados)]
    public async Task<IActionResult> Eliminar(int id)
    {
        var e = await db.Estados.FindAsync(id);
        if (e is null) return NotFound();
        var enUso = await db.Series.CountAsync(s => s.EstadoId == id);
        if (enUso > 0) throw new ErrorNegocio($"El estado lo usan {enUso} serie(s); cámbialas antes de eliminarlo.", StatusCodes.Status409Conflict);
        db.Estados.Remove(e);
        await auditoria.RegistrarAsync("eliminar", "estado", id, e.Nombre);
        await db.SaveChangesAsync();
        return NoContent();
    }
}

[ApiController]
[Authorize]
[Route("api/admin/medios")]
public class MediosAdminController(AlianzaDbContext db, ServicioMedios servicio, UsuarioActual actual, ServicioAuditoria auditoria, UrlsMedios urls) : ControllerBase
{
    private MedioDto ADto(Medio m) => new(m.Id, urls.Url(m.Id), m.NombreArchivo, m.TipoContenido, m.Tamano, m.Alt, m.CreadoEn);

    [HttpGet]
    public async Task<PaginaDto<MedioDto>> Listar([FromQuery] string? buscar, [FromQuery] int pagina = 1, [FromQuery] int tamano = 60)
    {
        tamano = Math.Clamp(tamano, 1, 200);
        pagina = Math.Max(pagina, 1);
        var q = db.Medios.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(buscar))
            q = q.Where(m => EF.Functions.ILike(m.NombreArchivo, $"%{buscar.Trim()}%") || EF.Functions.ILike(m.Alt, $"%{buscar.Trim()}%"));
        var total = await q.CountAsync();
        var items = await q.OrderByDescending(m => m.CreadoEn).ThenBy(m => m.NombreArchivo)
            .Skip((pagina - 1) * tamano).Take(tamano).ToListAsync();
        return new PaginaDto<MedioDto>(items.Select(ADto).ToList(), total, pagina, tamano);
    }

    /// <summary>Subida de archivos: cualquier usuario del panel (hace falta para editar wikis y socios).</summary>
    [HttpPost]
    [RequestSizeLimit(ServicioMedios.TamanoMaximo + 1024 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = ServicioMedios.TamanoMaximo + 1024 * 1024)]
    public async Task<ActionResult<List<MedioDto>>> Subir([FromForm] List<IFormFile> archivos, [FromForm] string? alt)
    {
        if (archivos.Count == 0) throw new ErrorNegocio("No se recibió ningún archivo.");
        var u = await actual.RequeridoAsync();
        var resultado = new List<Medio>();
        foreach (var f in archivos)
        {
            using var ms = new MemoryStream();
            await f.CopyToAsync(ms);
            resultado.Add(await servicio.GuardarAsync(ms.ToArray(), f.FileName, alt, u.Id));
        }
        await auditoria.RegistrarAsync("subir", "medio", null, string.Join(", ", archivos.Select(a => a.FileName)));
        await db.SaveChangesAsync();
        return resultado.Select(ADto).ToList();
    }

    /// <summary>Texto alternativo por defecto del archivo (accesibilidad).</summary>
    [HttpPatch("{id:guid}")]
    public async Task<ActionResult<MedioDto>> Actualizar(Guid id, ActualizarMedioDto dto)
    {
        var m = await db.Medios.FindAsync(id);
        if (m is null) return NotFound();
        m.Alt = dto.Alt?.Trim() ?? "";
        await auditoria.RegistrarAsync("editar", "medio", id, m.NombreArchivo);
        await db.SaveChangesAsync();
        return ADto(m);
    }

    /// <summary>Dónde se usa el archivo (series, personajes, equipo, socios).</summary>
    [HttpGet("{id:guid}/usos")]
    public async Task<ActionResult<List<string>>> Usos(Guid id) =>
        await db.Medios.AnyAsync(m => m.Id == id) ? await servicio.UsosAsync(id) : NotFound();

    [HttpDelete("{id:guid}")]
    [RequierePermiso(AmbitoPermiso.Medios)]
    public async Task<IActionResult> Eliminar(Guid id)
    {
        var m = await db.Medios.FindAsync(id);
        if (m is null) return NotFound();
        var usos = await servicio.UsosAsync(id);
        if (usos.Count > 0) throw new ErrorNegocio($"El archivo está en uso: {string.Join("; ", usos.Take(5))}.", StatusCodes.Status409Conflict);
        db.Medios.Remove(m);
        await auditoria.RegistrarAsync("eliminar", "medio", id, m.NombreArchivo);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
