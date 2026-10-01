using System.IdentityModel.Tokens.Jwt;
using Alianza.Api.Data;
using Alianza.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Alianza.Api.Auth;

/// <summary>
/// Usuario autenticado de la petición, con sus permisos leídos de la BD
/// (así un permiso revocado deja de valer de inmediato, sin esperar a que expire el token).
/// </summary>
public class UsuarioActual(IHttpContextAccessor http, AlianzaDbContext db)
{
    private Usuario? _usuario;
    private bool _cargado;

    public async Task<Usuario?> ObtenerAsync()
    {
        if (_cargado) return _usuario;
        _cargado = true;
        var sub = http.HttpContext?.User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
                  ?? http.HttpContext?.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (int.TryParse(sub, out var id))
            _usuario = await db.Usuarios.Include(u => u.Permisos).FirstOrDefaultAsync(u => u.Id == id && u.Activo);
        return _usuario;
    }

    public async Task<Usuario> RequeridoAsync() =>
        await ObtenerAsync() ?? throw new UnauthorizedAccessException();

    public async Task<bool> EsSuperAdminAsync() => (await ObtenerAsync())?.EsSuperAdmin == true;

    public async Task<bool> TieneAsync(AmbitoPermiso ambito)
    {
        var u = await ObtenerAsync();
        return u is not null && (u.EsSuperAdmin || u.Permisos.Any(p => p.Ambito == ambito && p.SerieId == null));
    }

    public async Task<bool> PuedeEditarSerieAsync(int serieId)
    {
        var u = await ObtenerAsync();
        return u is not null && (u.EsSuperAdmin ||
            u.Permisos.Any(p => p.Ambito == AmbitoPermiso.Wikis && (p.SerieId == null || p.SerieId == serieId)));
    }

    public async Task<bool> PuedeCrearWikisAsync()
    {
        var u = await ObtenerAsync();
        return u is not null && (u.EsSuperAdmin || u.PuedeCrearWikis);
    }

    /// <summary>null = puede ver todas las wikis en el panel; si no, solo los ids indicados.</summary>
    public async Task<HashSet<int>?> SeriesEditablesAsync()
    {
        var u = await RequeridoAsync();
        if (u.EsSuperAdmin || u.Permisos.Any(p => p.Ambito == AmbitoPermiso.Wikis && p.SerieId == null)) return null;
        return u.Permisos.Where(p => p.Ambito == AmbitoPermiso.Wikis && p.SerieId != null)
            .Select(p => p.SerieId!.Value).ToHashSet();
    }
}
