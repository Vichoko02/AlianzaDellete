using Alianza.Api.Auth;
using Alianza.Api.Data;
using Alianza.Api.Domain;
using Alianza.Api.Dtos;
using Microsoft.EntityFrameworkCore;

namespace Alianza.Api.Services;

public class ServicioUsuarios(AlianzaDbContext db, IDirectorioLdap ldap, ILogger<ServicioUsuarios> log)
{
    public static string Normalizar(string username) => username.Trim().ToLowerInvariant();

    public static PerfilDto APerfil(Usuario u) => new(
        u.Id, u.Username, u.NombreVisible, u.Email, u.Origen, u.EsSuperAdmin, u.EsSuperAdmin || u.PuedeCrearWikis,
        u.Permisos.Select(p => new PermisoDto(p.Ambito, p.SerieId, p.Serie?.Nombre)).ToList());

    public static UsuarioListaDto ALista(Usuario u) => new(
        u.Id, u.Username, u.NombreVisible, u.Email, u.Origen, u.EsSuperAdmin, u.PuedeCrearWikis, u.Activo, u.CreadoEn, u.UltimoAcceso,
        u.Permisos.OrderBy(p => p.Ambito).ThenBy(p => p.Serie?.Nombre)
            .Select(p => new PermisoDto(p.Ambito, p.SerieId, p.Serie?.Nombre)).ToList());

    /// <summary>Normaliza la lista de permisos: quita duplicados, ignora SerieId salvo en Wikis y valida que las series existan.</summary>
    public async Task<List<PermisoDto>> ValidarPermisosAsync(IEnumerable<PermisoDto>? permisos)
    {
        var lista = (permisos ?? [])
            .Select(p => p with { SerieId = p.Ambito == AmbitoPermiso.Wikis ? p.SerieId : null, SerieNombre = null })
            .Distinct().ToList();
        if (lista.Any(p => !Enum.IsDefined(p.Ambito))) throw new ErrorNegocio("Ámbito de permiso desconocido.");
        // "Todas las wikis" engloba los permisos por wiki concreta.
        if (lista.Any(p => p.Ambito == AmbitoPermiso.Wikis && p.SerieId == null))
            lista.RemoveAll(p => p.Ambito == AmbitoPermiso.Wikis && p.SerieId != null);
        var ids = lista.Where(p => p.SerieId != null).Select(p => p.SerieId!.Value).ToList();
        if (ids.Count > 0 && await db.Series.CountAsync(s => ids.Contains(s.Id)) != ids.Count)
            throw new ErrorNegocio("Alguna de las wikis indicadas no existe.");
        return lista;
    }

    /// <summary>Grupos LDAP que corresponden a los permisos del usuario.</summary>
    public async Task<List<string>> GruposLdapAsync(Usuario u)
    {
        if (!u.Activo) return [];
        var grupos = new List<string> { GruposLdap.Administradores };
        if (u.PuedeCrearWikis) grupos.Add(GruposLdap.CreadoresWikis);
        foreach (var p in u.Permisos)
        {
            grupos.Add(p.Ambito switch
            {
                AmbitoPermiso.Wikis when p.SerieId is null => GruposLdap.WikisTodas,
                AmbitoPermiso.Wikis => GruposLdap.PrefijoWiki + await db.Series.Where(s => s.Id == p.SerieId).Select(s => s.Slug).FirstAsync(),
                AmbitoPermiso.Socios => GruposLdap.Socios,
                AmbitoPermiso.Estados => GruposLdap.Estados,
                AmbitoPermiso.Medios => GruposLdap.Medios,
                _ => throw new ArgumentOutOfRangeException(),
            });
        }
        return grupos.Distinct().ToList();
    }

    /// <summary>
    /// Refleja los permisos como grupos LDAP. Un fallo del directorio no deshace el cambio en PostgreSQL
    /// (que es la fuente de verdad); se registra para reintentar con "Resincronizar LDAP".
    /// </summary>
    public async Task<bool> SincronizarLdapAsync(Usuario u)
    {
        if (!ldap.Habilitado || u.Origen != OrigenAuth.Ldap) return true;
        try
        {
            await ldap.SincronizarGruposAsync(u.Username, await GruposLdapAsync(u));
            return true;
        }
        catch (Exception e)
        {
            log.LogError(e, "No se pudieron sincronizar los grupos LDAP de {Username}", u.Username);
            return false;
        }
    }
}
