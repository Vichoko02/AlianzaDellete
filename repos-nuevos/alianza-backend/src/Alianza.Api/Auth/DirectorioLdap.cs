using Microsoft.Extensions.Options;
using Novell.Directory.Ldap;

namespace Alianza.Api.Auth;

/// <summary>
/// Operaciones sobre el directorio LDAP. Los permisos viven en PostgreSQL (fuente de verdad)
/// y se reflejan como grupos LDAP para que otros servicios de la Alianza puedan usarlos.
/// </summary>
public interface IDirectorioLdap
{
    bool Habilitado { get; }
    Task<bool> AutenticarAsync(string username, string password);
    Task CrearUsuarioAsync(string username, string nombreVisible, string? email, string password);
    Task CambiarPasswordAsync(string username, string password);
    Task EliminarUsuarioAsync(string username);
    /// <summary>Bloquea o desbloquea la cuenta en el directorio (ppolicy), para que tampoco entre en otras apps.</summary>
    Task BloquearAsync(string username, bool bloquear);
    /// <summary>Deja al usuario exactamente en los grupos indicados (entre los grupos que gestiona el backend).</summary>
    Task SincronizarGruposAsync(string username, IReadOnlyCollection<string> grupos);
}

public static class GruposLdap
{
    /// <summary>Todas las cuentas administrativas activas.</summary>
    public const string Administradores = "alianza-administradores";
    public const string CreadoresWikis = "alianza-creadores-wikis";
    public const string WikisTodas = "alianza-wikis";
    public const string Socios = "alianza-socios";
    public const string Estados = "alianza-estados";
    public const string Medios = "alianza-medios";
    public const string Sitio = "alianza-sitio";
    public const string PrefijoWiki = "alianza-wiki-";
    public const string PrefijoGestionado = "alianza-";
}

public sealed class DirectorioLdapDeshabilitado : IDirectorioLdap
{
    public bool Habilitado => false;
    public Task<bool> AutenticarAsync(string username, string password) => Task.FromResult(false);
    public Task CrearUsuarioAsync(string username, string nombreVisible, string? email, string password) => Task.CompletedTask;
    public Task CambiarPasswordAsync(string username, string password) => Task.CompletedTask;
    public Task EliminarUsuarioAsync(string username) => Task.CompletedTask;
    public Task BloquearAsync(string username, bool bloquear) => Task.CompletedTask;
    public Task SincronizarGruposAsync(string username, IReadOnlyCollection<string> grupos) => Task.CompletedTask;
}

public sealed class DirectorioLdap(IOptions<LdapOpciones> opciones, ILogger<DirectorioLdap> log) : IDirectorioLdap
{
    private readonly LdapOpciones _op = opciones.Value;
    public bool Habilitado => true;

    private string DnUsuario(string username) => $"uid={Escapar(username.ToLowerInvariant())},{_op.UsuariosDn}";
    private string DnGrupo(string cn) => $"cn={Escapar(cn)},{_op.GruposDn}";

    /// <summary>Escapa un valor para usarlo dentro de un RDN (RFC 4514).</summary>
    private static string Escapar(string valor)
    {
        var sb = new System.Text.StringBuilder();
        for (var i = 0; i < valor.Length; i++)
        {
            var c = valor[i];
            if (c is ',' or '+' or '"' or '\\' or '<' or '>' or ';' or '=' ||
                (i == 0 && (c == ' ' || c == '#')) || (i == valor.Length - 1 && c == ' '))
                sb.Append('\\');
            sb.Append(c);
        }
        return sb.ToString();
    }

    private async Task<LdapConnection> ConectarAsync(string? dn = null, string? password = null)
    {
        var cn = new LdapConnection();
        try
        {
            await cn.ConnectAsync(_op.Host, _op.Puerto);
            if (_op.UsarStartTls) await cn.StartTlsAsync();
            await cn.BindAsync(dn ?? _op.BindDn, password ?? _op.BindPassword);
            return cn;
        }
        catch
        {
            cn.Dispose();
            throw;
        }
    }

    public async Task<bool> AutenticarAsync(string username, string password)
    {
        // Un bind con contraseña vacía es un "bind anónimo" que el servidor acepta: hay que rechazarlo aquí.
        if (string.IsNullOrEmpty(password)) return false;
        try
        {
            using var cn = await ConectarAsync(DnUsuario(username), password);
            return cn.Bound;
        }
        catch (LdapException e) when (e.ResultCode == LdapException.InvalidCredentials)
        {
            return false;
        }
    }

    public async Task CrearUsuarioAsync(string username, string nombreVisible, string? email, string password)
    {
        using var cn = await ConectarAsync();
        var attrs = new LdapAttributeSet
        {
            new LdapAttribute("objectClass", ["top", "person", "organizationalPerson", "inetOrgPerson"]),
            new LdapAttribute("uid", username.ToLowerInvariant()),
            new LdapAttribute("cn", nombreVisible),
            new LdapAttribute("sn", nombreVisible),
            new LdapAttribute("displayName", nombreVisible),
            new LdapAttribute("userPassword", password),
        };
        if (!string.IsNullOrWhiteSpace(email)) attrs.Add(new LdapAttribute("mail", email));
        await cn.AddAsync(new LdapEntry(DnUsuario(username), attrs));
        log.LogInformation("Usuario LDAP creado: {Username}", username);
    }

    public async Task CambiarPasswordAsync(string username, string password)
    {
        using var cn = await ConectarAsync();
        await cn.ModifyAsync(DnUsuario(username),
            new LdapModification(LdapModification.Replace, new LdapAttribute("userPassword", password)));
    }

    public async Task EliminarUsuarioAsync(string username)
    {
        using var cn = await ConectarAsync();
        await SincronizarGruposAsync(cn, username, []);
        try
        {
            await cn.DeleteAsync(DnUsuario(username));
        }
        catch (LdapException e) when (e.ResultCode == LdapException.NoSuchObject) { }
    }

    public async Task BloquearAsync(string username, bool bloquear)
    {
        using var cn = await ConectarAsync();
        try
        {
            // "000001010000Z" = bloqueo permanente hasta que un administrador lo quite (overlay ppolicy).
            await cn.ModifyAsync(DnUsuario(username), bloquear
                ? new LdapModification(LdapModification.Replace, new LdapAttribute("pwdAccountLockedTime", "000001010000Z"))
                : new LdapModification(LdapModification.Delete, new LdapAttribute("pwdAccountLockedTime")));
        }
        catch (LdapException e) when (!bloquear && e.ResultCode == LdapException.NoSuchAttribute) { }
    }

    public async Task SincronizarGruposAsync(string username, IReadOnlyCollection<string> grupos)
    {
        using var cn = await ConectarAsync();
        await SincronizarGruposAsync(cn, username, grupos);
    }

    private async Task SincronizarGruposAsync(LdapConnection cn, string username, IReadOnlyCollection<string> grupos)
    {
        var dnUsuario = DnUsuario(username);
        var deseados = grupos.ToHashSet(StringComparer.OrdinalIgnoreCase);

        // Grupos gestionados por el backend en los que el usuario está hoy.
        var actuales = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var res = await cn.SearchAsync(_op.GruposDn, LdapConnection.ScopeOne,
            $"(&(objectClass=groupOfNames)(member={EscaparFiltro(dnUsuario)}))", ["cn"], false);
        await foreach (var e in res)
        {
            var cnGrupo = e.GetStringValueOrDefault("cn") ?? "";
            if (cnGrupo.StartsWith(GruposLdap.PrefijoGestionado, StringComparison.OrdinalIgnoreCase))
                actuales.Add(cnGrupo);
        }

        foreach (var g in deseados.Except(actuales))
        {
            try
            {
                await cn.ModifyAsync(DnGrupo(g), new LdapModification(LdapModification.Add, new LdapAttribute("member", dnUsuario)));
            }
            catch (LdapException e) when (e.ResultCode == LdapException.NoSuchObject)
            {
                // groupOfNames exige al menos un miembro: el grupo nace con el superadmin y el usuario.
                var miembros = new[] { _op.MiembroPorDefectoDn, dnUsuario }.Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
                await cn.AddAsync(new LdapEntry(DnGrupo(g), new LdapAttributeSet
                {
                    new LdapAttribute("objectClass", ["top", "groupOfNames"]),
                    new LdapAttribute("cn", g),
                    new LdapAttribute("member", miembros),
                }));
            }
        }

        foreach (var g in actuales.Except(deseados))
        {
            await cn.ModifyAsync(DnGrupo(g), new LdapModification(LdapModification.Delete, new LdapAttribute("member", dnUsuario)));
        }
    }

    private static string EscaparFiltro(string valor) => valor
        .Replace("\\", "\\5c").Replace("*", "\\2a").Replace("(", "\\28").Replace(")", "\\29").Replace("\0", "\\00");
}
