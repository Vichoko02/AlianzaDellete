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
/// Gestión de cuentas administrativas y sus permisos. Exclusivo del superadmin (YishAdmin):
/// es el único que puede crear usuarios, activar "puede crear wikis" y asignar permisos.
/// </summary>
[ApiController]
[Authorize(Policy = Politicas.SuperAdmin)]
[Route("api/admin/usuarios")]
public class UsuariosController(
    AlianzaDbContext db, ServicioUsuarios servicio, IDirectorioLdap ldap, UsuarioActual actual,
    ServicioAuditoria auditoria) : ControllerBase
{
    private Task<Usuario?> CargarAsync(int id) =>
        db.Usuarios.Include(u => u.Permisos).ThenInclude(p => p.Serie).FirstOrDefaultAsync(u => u.Id == id);

    [HttpGet]
    public async Task<List<UsuarioListaDto>> Listar()
    {
        var lista = await db.Usuarios.AsNoTracking().Include(u => u.Permisos).ThenInclude(p => p.Serie)
            .OrderByDescending(u => u.EsSuperAdmin).ThenBy(u => u.Username).ToListAsync();
        return lista.Select(ServicioUsuarios.ALista).ToList();
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<UsuarioListaDto>> Obtener(int id) =>
        await CargarAsync(id) is { } u ? ServicioUsuarios.ALista(u) : NotFound();

    [HttpPost]
    public async Task<ActionResult<UsuarioListaDto>> Crear(CrearUsuarioDto dto)
    {
        if (Contrasenas.Validar(dto.Password) is { } error) throw new ErrorNegocio(error);
        var normalizado = ServicioUsuarios.Normalizar(dto.Username);
        if (await db.Usuarios.AnyAsync(u => u.UsernameNormalizado == normalizado))
            throw new ErrorNegocio($"El usuario '{dto.Username}' ya existe.", StatusCodes.Status409Conflict);
        if (dto.Origen == OrigenAuth.Ldap && !ldap.Habilitado)
            throw new ErrorNegocio("La integración LDAP está deshabilitada; crea el usuario con origen Local.");

        var yo = await actual.RequeridoAsync();
        var permisos = await servicio.ValidarPermisosAsync(dto.Permisos);
        var u = new Usuario
        {
            Username = dto.Username.Trim(),
            UsernameNormalizado = normalizado,
            NombreVisible = dto.NombreVisible.Trim(),
            Email = string.IsNullOrWhiteSpace(dto.Email) ? null : dto.Email.Trim(),
            Origen = dto.Origen,
            PasswordHash = dto.Origen == OrigenAuth.Local ? Contrasenas.Hashear(dto.Password) : null,
            PuedeCrearWikis = dto.PuedeCrearWikis,
            EsSuperAdmin = false, // nunca se crea otro superadmin
            Permisos = permisos.Select(p => new PermisoUsuario { Ambito = p.Ambito, SerieId = p.SerieId, OtorgadoPorId = yo.Id }).ToList(),
        };

        if (u.Origen == OrigenAuth.Ldap)
        {
            // Primero el directorio: si falla, no queda un usuario a medias en la BD.
            await ldap.CrearUsuarioAsync(u.Username, u.NombreVisible, u.Email, dto.Password);
        }

        db.Usuarios.Add(u);
        await auditoria.RegistrarAsync("crear", "usuario", null, $"{u.Username} ({u.Origen})");
        try
        {
            await db.SaveChangesAsync();
        }
        catch when (u.Origen == OrigenAuth.Ldap)
        {
            await ldap.EliminarUsuarioAsync(u.Username);
            throw;
        }

        await servicio.SincronizarLdapAsync(u);
        return CreatedAtAction(nameof(Obtener), new { id = u.Id }, ServicioUsuarios.ALista((await CargarAsync(u.Id))!));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<UsuarioListaDto>> Actualizar(int id, ActualizarUsuarioDto dto)
    {
        var u = await CargarAsync(id);
        if (u is null) return NotFound();
        if (u.EsSuperAdmin && !dto.Activo) throw new ErrorNegocio("La cuenta del superadministrador no se puede desactivar.");

        var cambiaActivo = u.Activo != dto.Activo;
        if (u.Activo && !dto.Activo) u.SelloSeguridad = Guid.NewGuid(); // cierra sus sesiones abiertas
        if (cambiaActivo && u.Origen == OrigenAuth.Ldap) await ldap.BloquearAsync(u.Username, !dto.Activo);
        u.NombreVisible = dto.NombreVisible.Trim();
        u.Email = string.IsNullOrWhiteSpace(dto.Email) ? null : dto.Email.Trim();
        u.Activo = dto.Activo;
        if (!u.EsSuperAdmin) u.PuedeCrearWikis = dto.PuedeCrearWikis;

        await auditoria.RegistrarAsync("editar", "usuario", u.Id,
            $"{u.Username}: activo={u.Activo}, puedeCrearWikis={u.PuedeCrearWikis}");
        await db.SaveChangesAsync();
        await servicio.SincronizarLdapAsync(u);
        return ServicioUsuarios.ALista(u);
    }

    /// <summary>Reemplaza todos los permisos del usuario por la lista enviada.</summary>
    [HttpPut("{id:int}/permisos")]
    public async Task<ActionResult<UsuarioListaDto>> AsignarPermisos(int id, List<PermisoDto> permisos)
    {
        var u = await CargarAsync(id);
        if (u is null) return NotFound();
        if (u.EsSuperAdmin) throw new ErrorNegocio("El superadministrador ya tiene todos los permisos.");

        var yo = await actual.RequeridoAsync();
        var nuevos = await servicio.ValidarPermisosAsync(permisos);
        db.Permisos.RemoveRange(u.Permisos);
        u.Permisos = nuevos.Select(p => new PermisoUsuario { Ambito = p.Ambito, SerieId = p.SerieId, OtorgadoPorId = yo.Id }).ToList();

        await auditoria.RegistrarAsync("permisos", "usuario", u.Id,
            $"{u.Username}: " + string.Join(", ", nuevos.Select(p => p.SerieId is null ? p.Ambito.ToString() : $"{p.Ambito}#{p.SerieId}")));
        await db.SaveChangesAsync();

        u = (await CargarAsync(id))!;
        var sincronizado = await servicio.SincronizarLdapAsync(u);
        if (!sincronizado) Response.Headers["X-Advertencia"] = "Permisos guardados, pero no se pudieron reflejar en LDAP.";
        return ServicioUsuarios.ALista(u);
    }

    [HttpPost("{id:int}/password")]
    public async Task<IActionResult> RestablecerPassword(int id, RestablecerPasswordDto dto)
    {
        var u = await CargarAsync(id);
        if (u is null) return NotFound();
        if (Contrasenas.Validar(dto.Password) is { } error) throw new ErrorNegocio(error);

        if (u.Origen == OrigenAuth.Ldap) await ldap.CambiarPasswordAsync(u.Username, dto.Password);
        else u.PasswordHash = Contrasenas.Hashear(dto.Password);
        u.SelloSeguridad = Guid.NewGuid();

        await auditoria.RegistrarAsync("restablecer-password", "usuario", u.Id, u.Username);
        await db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Vuelve a escribir en LDAP los grupos del usuario (útil si el directorio estuvo caído).</summary>
    [HttpPost("{id:int}/sincronizar-ldap")]
    public async Task<IActionResult> SincronizarLdap(int id)
    {
        var u = await CargarAsync(id);
        if (u is null) return NotFound();
        if (u.Origen != OrigenAuth.Ldap || !ldap.Habilitado) throw new ErrorNegocio("El usuario no es de origen LDAP o LDAP está deshabilitado.");
        await ldap.SincronizarGruposAsync(u.Username, await servicio.GruposLdapAsync(u));
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Eliminar(int id)
    {
        var u = await db.Usuarios.FindAsync(id);
        if (u is null) return NotFound();
        if (u.EsSuperAdmin) throw new ErrorNegocio("La cuenta del superadministrador no se puede eliminar.");

        db.Usuarios.Remove(u);
        await auditoria.RegistrarAsync("eliminar", "usuario", id, u.Username);
        await db.SaveChangesAsync();
        if (u.Origen == OrigenAuth.Ldap) await ldap.EliminarUsuarioAsync(u.Username);
        return NoContent();
    }
}

[ApiController]
[Authorize]
[Route("api/admin")]
public class PanelController(AlianzaDbContext db, Microsoft.Extensions.Options.IOptions<OpcionesPublicas> publico) : ControllerBase
{
    [HttpGet("config")]
    public object Config() => new { urlSitio = publico.Value.UrlSitio.TrimEnd('/') };

    [HttpGet("resumen")]
    public async Task<ResumenDto> Resumen()
    {
        var porEstado = await db.Series.GroupBy(s => s.Estado.Nombre).Select(g => new { g.Key, Total = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Total);
        return new ResumenDto(
            await db.Series.CountAsync(),
            await db.Series.CountAsync(s => s.Publicada),
            await db.Socios.CountAsync(),
            await db.Medios.CountAsync(),
            await db.Medios.SumAsync(m => (long?)m.Tamano) ?? 0,
            await db.Usuarios.CountAsync(u => u.Activo),
            porEstado);
    }

    [HttpGet("auditoria")]
    [Authorize(Policy = Politicas.SuperAdmin)]
    public async Task<PaginaDto<AuditoriaDto>> Auditoria([FromQuery] int pagina = 1, [FromQuery] int tamano = 50)
    {
        tamano = Math.Clamp(tamano, 1, 200);
        pagina = Math.Max(pagina, 1);
        var total = await db.Auditoria.CountAsync();
        var items = await db.Auditoria.AsNoTracking().OrderByDescending(a => a.Id)
            .Skip((pagina - 1) * tamano).Take(tamano)
            .Select(a => new AuditoriaDto(a.Id, a.Fecha, a.Username, a.Accion, a.Entidad, a.EntidadId, a.Detalle))
            .ToListAsync();
        return new PaginaDto<AuditoriaDto>(items, total, pagina, tamano);
    }
}
