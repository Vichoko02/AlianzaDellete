using System.IdentityModel.Tokens.Jwt;
using Alianza.Servidor.Datos;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;

namespace Alianza.Servidor.Seguridad;

/// <summary>
/// Quién hace la petición y qué puede hacer. Los permisos se leen de la base de datos en cada petición,
/// así un permiso quitado deja de valer al instante (sin esperar a que venza la sesión).
/// </summary>
public class UsuarioActual(IHttpContextAccessor http, BaseDeDatos bd)
{
    private Usuario? _usuario;
    private bool _cargado;

    public async Task<Usuario?> ObtenerAsync()
    {
        string? id;
        if (_cargado) return _usuario;

        _cargado = true;
        id = http.HttpContext?.User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        if (int.TryParse(id, out var numero))
            _usuario = await bd.Usuarios.Include(u => u.Permisos).FirstOrDefaultAsync(u => u.Id == numero && u.Activo);
        return _usuario;
    }

    public async Task<Usuario> ObligatorioAsync() => await ObtenerAsync() ?? throw new UnauthorizedAccessException();

    /// <summary>Permiso general sobre un área (para Wikis significa "todas las wikis").</summary>
    public async Task<bool> TieneAsync(AreaPermiso area)
    {
        var usuario = await ObtenerAsync();
        return usuario is not null && (usuario.EsSuperadmin || usuario.Permisos.Any(p => p.Area == area && p.SerieId == null));
    }

    public async Task<bool> PuedeEditarSerieAsync(int serieId)
    {
        var usuario = await ObtenerAsync();
        return usuario is not null && (usuario.EsSuperadmin ||
            usuario.Permisos.Any(p => p.Area == AreaPermiso.Wikis && (p.SerieId == null || p.SerieId == serieId)));
    }

    public async Task<bool> PuedeCrearWikisAsync()
    {
        var usuario = await ObtenerAsync();
        return usuario is not null && (usuario.EsSuperadmin || usuario.PuedeCrearWikis);
    }

    /// <summary>null = puede ver todas las wikis; si no, los ids de las wikis que puede editar.</summary>
    public async Task<HashSet<int>?> SeriesEditablesAsync()
    {
        var usuario = await ObligatorioAsync();
        if (usuario.EsSuperadmin || usuario.Permisos.Any(p => p.Area == AreaPermiso.Wikis && p.SerieId == null)) return null;
        return usuario.Permisos.Where(p => p.Area == AreaPermiso.Wikis && p.SerieId != null).Select(p => p.SerieId!.Value).ToHashSet();
    }
}

/// <summary>[RequierePermiso(AreaPermiso.Socios)]: exige ese permiso general (el superadmin siempre pasa).</summary>
public sealed class RequierePermisoAttribute(AreaPermiso area) : Attribute, IAsyncAuthorizationFilter
{
    public async Task OnAuthorizationAsync(AuthorizationFilterContext contexto)
    {
        if (contexto.HttpContext.User.Identity?.IsAuthenticated != true) return; // [Authorize] responde 401
        var actual = contexto.HttpContext.RequestServices.GetRequiredService<UsuarioActual>();
        if (!await actual.TieneAsync(area)) contexto.Result = new ForbidResult();
    }
}
