using Alianza.Api.Auth;
using Alianza.Api.Data;
using Alianza.Api.Domain;
using Alianza.Api.Dtos;
using Alianza.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Alianza.Api.Controllers.Admin;

[ApiController]
[Authorize]
[RequierePermiso(AmbitoPermiso.Sitio)]
[Route("api/admin/sitio")]
public class SitioAdminController(AlianzaDbContext db, ServicioSitio sitio, ServicioAuditoria auditoria) : ControllerBase
{
    [HttpGet]
    public Task<List<CampoSitioDto>> Campos() => sitio.CamposAsync();

    [HttpPut]
    public async Task<List<CampoSitioDto>> Guardar(List<ValorSitioDto> valores)
    {
        var n = await sitio.GuardarAsync(valores);
        if (n > 0) await auditoria.RegistrarAsync("editar", "sitio", null, $"{n} texto(s)");
        await db.SaveChangesAsync();
        return await sitio.CamposAsync();
    }

    [HttpGet("enlaces/{grupo}")]
    public Task<List<EnlaceSitioDto>> Enlaces(string grupo) => sitio.EnlacesAsync(grupo);

    [HttpPut("enlaces/{grupo}")]
    public async Task<List<EnlaceSitioDto>> GuardarEnlaces(string grupo, List<EnlaceSitioDto> enlaces)
    {
        await sitio.GuardarEnlacesAsync(grupo, enlaces);
        await auditoria.RegistrarAsync("editar", "enlaces-sitio", grupo, $"{enlaces.Count} enlace(s)");
        await db.SaveChangesAsync();
        return await sitio.EnlacesAsync(grupo);
    }
}

/// <summary>Formulario de postulación y solicitudes recibidas: exclusivo del superadmin (YishAdmin).</summary>
[ApiController]
[Authorize(Policy = Politicas.SuperAdmin)]
[Route("api/admin")]
public class SolicitudesController(AlianzaDbContext db, ServicioQuiz quiz, ServicioAuditoria auditoria) : ControllerBase
{
    [HttpGet("quiz")]
    public async Task<List<PreguntaEdicionDto>> Preguntas() =>
        await db.PreguntasQuiz.AsNoTracking().OrderBy(p => p.Orden)
            .Select(p => new PreguntaEdicionDto(p.Id, p.Texto, p.Ayuda, p.Tipo, p.Opciones, p.Requerida, p.Activa)).ToListAsync();

    [HttpPut("quiz")]
    public async Task<List<PreguntaEdicionDto>> GuardarPreguntas(List<PreguntaEdicionDto> preguntas)
    {
        await quiz.GuardarAsync(preguntas);
        await auditoria.RegistrarAsync("editar", "quiz", null, $"{preguntas.Count(p => p.Activa)} paso(s) activo(s)");
        await db.SaveChangesAsync();
        return await Preguntas();
    }

    [HttpGet("solicitudes")]
    public async Task<PaginaDto<SolicitudListaDto>> Listar([FromQuery] EstadoSolicitud? estado, [FromQuery] int pagina = 1, [FromQuery] int tamano = 30)
    {
        tamano = Math.Clamp(tamano, 1, 100);
        pagina = Math.Max(pagina, 1);
        var q = db.Solicitudes.AsNoTracking();
        q = estado is { } e ? q.Where(s => s.Estado == e) : q.Where(s => s.Estado != EstadoSolicitud.Archivada);
        var total = await q.CountAsync();
        var items = await q.OrderByDescending(s => s.Fecha).Skip((pagina - 1) * tamano).Take(tamano)
            .Select(s => new
            {
                s.Id, s.Fecha, s.Nombre, s.Email, s.Estado,
                Resumen = s.Respuestas.OrderByDescending(r => r.Respuesta.Length).Select(r => r.Respuesta).FirstOrDefault() ?? "",
            }).ToListAsync();
        return new PaginaDto<SolicitudListaDto>(items.Select(s => new SolicitudListaDto(
            s.Id, s.Fecha, s.Nombre, s.Email, s.Estado, s.Resumen.Length > 140 ? s.Resumen[..140] + "…" : s.Resumen)).ToList(), total, pagina, tamano);
    }

    /// <summary>Para el contador del panel y el aviso de solicitudes nuevas (se consulta periódicamente).</summary>
    [HttpGet("solicitudes/pendientes")]
    public async Task<PendientesDto> Pendientes()
    {
        var nuevas = db.Solicitudes.AsNoTracking().Where(s => s.Estado == EstadoSolicitud.Nueva);
        var ultima = await nuevas.OrderByDescending(s => s.Id).Select(s => new { s.Id, s.Nombre, s.Fecha }).FirstOrDefaultAsync();
        return new PendientesDto(await nuevas.CountAsync(), ultima?.Id, ultima?.Nombre, ultima?.Fecha);
    }

    /// <summary>Detalle de la solicitud. Abrir una solicitud nueva la marca como leída.</summary>
    [HttpGet("solicitudes/{id:long}")]
    public async Task<ActionResult<SolicitudDto>> Obtener(long id)
    {
        var s = await db.Solicitudes.Include(x => x.Respuestas).FirstOrDefaultAsync(x => x.Id == id);
        if (s is null) return NotFound();
        if (s.Estado == EstadoSolicitud.Nueva)
        {
            s.Estado = EstadoSolicitud.Leida;
            s.LeidaEn = DateTime.UtcNow;
            await db.SaveChangesAsync();
        }
        return new SolicitudDto(s.Id, s.Fecha, s.Nombre, s.Email, s.Estado, s.LeidaEn,
            s.Respuestas.OrderBy(r => r.Orden).Select(r => new RespuestaDto(r.Pregunta, r.Respuesta)).ToList());
    }

    [HttpPatch("solicitudes/{id:long}/estado")]
    public async Task<IActionResult> CambiarEstado(long id, CambiarEstadoSolicitudDto dto)
    {
        var s = await db.Solicitudes.FindAsync(id);
        if (s is null) return NotFound();
        s.Estado = dto.Estado;
        if (dto.Estado != EstadoSolicitud.Nueva) s.LeidaEn ??= DateTime.UtcNow; else s.LeidaEn = null;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("solicitudes/{id:long}")]
    public async Task<IActionResult> Eliminar(long id)
    {
        var s = await db.Solicitudes.FindAsync(id);
        if (s is null) return NotFound();
        db.Solicitudes.Remove(s);
        await auditoria.RegistrarAsync("eliminar", "solicitud", id, $"{s.Nombre} <{s.Email}>");
        await db.SaveChangesAsync();
        return NoContent();
    }
}
