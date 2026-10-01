using Alianza.Api.Auth;
using Alianza.Api.Data;
using Alianza.Api.Domain;
using Alianza.Api.Dtos;
using Alianza.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Alianza.Api.Controllers.Admin;

/// <summary>
/// Edición de wikis. Reglas:
/// crear → superadmin o usuario con PuedeCrearWikis (que pasa a poder editar la wiki que creó);
/// editar → permiso Wikis sobre esa serie o sobre todas; eliminar → solo superadmin.
/// </summary>
[ApiController]
[Authorize]
[Route("api/admin/series")]
public class SeriesAdminController(
    AlianzaDbContext db, ServicioSeries servicio, UsuarioActual actual, ServicioAuditoria auditoria,
    ServicioUsuarios usuarios, UrlsMedios urls) : ControllerBase
{
    [HttpGet]
    public async Task<List<SerieListaDto>> Listar()
    {
        var editables = await actual.SeriesEditablesAsync();
        var q = db.Series.AsNoTracking();
        if (editables is not null) q = q.Where(s => editables.Contains(s.Id));
        var lista = await q.Include(s => s.Estado).OrderBy(s => s.Orden).ThenBy(s => s.Nombre).ToListAsync();
        return lista.Select(s => new SerieListaDto(s.Id, s.Slug, s.Nombre, ServicioSeries.AEstadoDto(s.Estado),
            urls.Url(s.PortadaId), s.Publicada, s.Orden, s.ActualizadoEn)).ToList();
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<SerieEdicionDto>> Obtener(int id)
    {
        if (!await actual.PuedeEditarSerieAsync(id)) return Forbid();
        var s = await servicio.ConTodo().AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        return s is null ? NotFound() : servicio.AEdicion(s);
    }

    [HttpPost]
    public async Task<ActionResult<SerieEdicionDto>> Crear(SerieEdicionDto dto)
    {
        if (!await actual.PuedeCrearWikisAsync()) return Forbid();
        var u = await actual.RequeridoAsync();

        var s = new Serie();
        await servicio.AplicarAsync(s, dto with { ActualizadoEn = null });
        db.Series.Add(s);
        await db.SaveChangesAsync();

        // Quien crea una wiki (sin ser superadmin ni editor de todas) recibe permiso para editarla.
        if (!await actual.PuedeEditarSerieAsync(s.Id))
        {
            u.Permisos.Add(new PermisoUsuario { Ambito = AmbitoPermiso.Wikis, SerieId = s.Id, OtorgadoPorId = u.Id });
        }
        await auditoria.RegistrarAsync("crear", "serie", s.Id, s.Nombre);
        await db.SaveChangesAsync();
        await usuarios.SincronizarLdapAsync(u);

        var creada = await servicio.ConTodo().AsNoTracking().FirstAsync(x => x.Id == s.Id);
        return CreatedAtAction(nameof(Obtener), new { id = s.Id }, servicio.AEdicion(creada));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<SerieEdicionDto>> Actualizar(int id, SerieEdicionDto dto)
    {
        if (!await actual.PuedeEditarSerieAsync(id)) return Forbid();
        var s = await servicio.ConTodo().FirstOrDefaultAsync(x => x.Id == id);
        if (s is null) return NotFound();

        var slugAnterior = s.Slug;
        await servicio.AplicarAsync(s, dto);
        await auditoria.RegistrarAsync("editar", "serie", s.Id, s.Nombre);
        await db.SaveChangesAsync();

        if (slugAnterior != s.Slug) await ResincronizarEditoresAsync(id);
        var guardada = await servicio.ConTodo().AsNoTracking().FirstAsync(x => x.Id == id);
        return servicio.AEdicion(guardada);
    }

    /// <summary>Cambio rápido de estado (En Emisión, Cancelada...) sin enviar la wiki completa.</summary>
    [HttpPatch("{id:int}/estado")]
    public async Task<IActionResult> CambiarEstado(int id, CambiarEstadoDto dto)
    {
        if (!await actual.PuedeEditarSerieAsync(id)) return Forbid();
        var s = await db.Series.FindAsync(id);
        if (s is null) return NotFound();
        var estado = await db.Estados.FindAsync(dto.EstadoId) ?? throw new ErrorNegocio("El estado indicado no existe.");
        s.EstadoId = estado.Id;
        s.ActualizadoEn = DateTime.UtcNow;
        await auditoria.RegistrarAsync("cambiar-estado", "serie", s.Id, $"{s.Nombre} → {estado.Nombre}");
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = Politicas.SuperAdmin)]
    public async Task<IActionResult> Eliminar(int id)
    {
        var s = await db.Series.FindAsync(id);
        if (s is null) return NotFound();
        var afectados = await UsuariosConPermisoAsync(id);
        db.Series.Remove(s);
        await auditoria.RegistrarAsync("eliminar", "serie", id, s.Nombre);
        await db.SaveChangesAsync();
        foreach (var u in afectados) await usuarios.SincronizarLdapAsync(u);
        return NoContent();
    }

    private Task<List<Usuario>> UsuariosConPermisoAsync(int serieId) =>
        db.Usuarios.Include(u => u.Permisos).Where(u => u.Permisos.Any(p => p.SerieId == serieId)).ToListAsync();

    private async Task ResincronizarEditoresAsync(int serieId)
    {
        foreach (var u in await UsuariosConPermisoAsync(serieId)) await usuarios.SincronizarLdapAsync(u);
    }
}
