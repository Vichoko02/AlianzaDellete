using Microsoft.Extensions.Options;
using Novell.Directory.Ldap;

namespace Alianza.Servidor.Seguridad;

/// <summary>
/// Directorio LDAP (programa alianza-ldap). Los permisos viven en PostgreSQL; aquí solo se reflejan
/// como grupos para que otras aplicaciones puedan usarlos. Si LDAP está deshabilitado, no hace nada.
/// </summary>
public class DirectorioLdap(IOptions<ConfiguracionLdap> configuracion, ILogger<DirectorioLdap> registro)
{
    // Grupos que administra el servidor (todos empiezan con "alianza-").
    public const string GrupoAdministradores = "alianza-administradores";
    public const string GrupoCreadoresWikis = "alianza-creadores-wikis";
    public const string GrupoWikis = "alianza-wikis";
    public const string PrefijoGrupoWiki = "alianza-wiki-";
    public const string PrefijoGrupos = "alianza-";

    private readonly ConfiguracionLdap _ldap = configuracion.Value;

    public bool Habilitado => _ldap.Habilitado;

    public static string GrupoDeArea(Datos.AreaPermiso area) => PrefijoGrupos + area.ToString().ToLowerInvariant();

    public async Task<bool> ContrasenaCorrectaAsync(string nombreUsuario, string contrasena)
    {
        // Con contraseña vacía el servidor acepta un acceso anónimo: se rechaza aquí.
        if (!Habilitado || string.IsNullOrEmpty(contrasena)) return false;
        try
        {
            using var conexion = await ConectarAsync(DnUsuario(nombreUsuario), contrasena);
            return conexion.Bound;
        }
        catch (LdapException e) when (e.ResultCode == LdapException.InvalidCredentials)
        {
            return false;
        }
    }

    public async Task CrearUsuarioAsync(string nombreUsuario, string nombreVisible, string? correo, string contrasena)
    {
        LdapAttributeSet atributos;
        if (!Habilitado) return;

        atributos = new LdapAttributeSet
        {
            new LdapAttribute("objectClass", ["top", "person", "organizationalPerson", "inetOrgPerson"]),
            new LdapAttribute("uid", nombreUsuario.ToLowerInvariant()),
            new LdapAttribute("cn", nombreVisible),
            new LdapAttribute("sn", nombreVisible),
            new LdapAttribute("displayName", nombreVisible),
            new LdapAttribute("userPassword", contrasena),
        };
        if (!string.IsNullOrWhiteSpace(correo)) atributos.Add(new LdapAttribute("mail", correo));

        using var conexion = await ConectarAsync();
        await conexion.AddAsync(new LdapEntry(DnUsuario(nombreUsuario), atributos));
        registro.LogInformation("Usuario LDAP creado: {Usuario}", nombreUsuario);
    }

    public async Task CambiarContrasenaAsync(string nombreUsuario, string contrasena)
    {
        if (!Habilitado) return;
        using var conexion = await ConectarAsync();
        await conexion.ModifyAsync(DnUsuario(nombreUsuario),
            new LdapModification(LdapModification.Replace, new LdapAttribute("userPassword", contrasena)));
    }

    /// <summary>Bloquea o desbloquea la cuenta en el directorio, para que tampoco entre a otras aplicaciones.</summary>
    public async Task BloquearAsync(string nombreUsuario, bool bloquear)
    {
        if (!Habilitado) return;
        using var conexion = await ConectarAsync();
        try
        {
            // "000001010000Z" = bloqueo permanente hasta que un administrador lo quite.
            await conexion.ModifyAsync(DnUsuario(nombreUsuario), bloquear
                ? new LdapModification(LdapModification.Replace, new LdapAttribute("pwdAccountLockedTime", "000001010000Z"))
                : new LdapModification(LdapModification.Delete, new LdapAttribute("pwdAccountLockedTime")));
        }
        catch (LdapException e) when (!bloquear && e.ResultCode == LdapException.NoSuchAttribute) { }
    }

    public async Task EliminarUsuarioAsync(string nombreUsuario)
    {
        if (!Habilitado) return;
        using var conexion = await ConectarAsync();
        await DejarEnGruposAsync(conexion, nombreUsuario, []);
        try { await conexion.DeleteAsync(DnUsuario(nombreUsuario)); }
        catch (LdapException e) when (e.ResultCode == LdapException.NoSuchObject) { }
    }

    /// <summary>
    /// Deja al usuario exactamente en los grupos indicados. Un fallo del directorio no deshace nada en PostgreSQL:
    /// se registra y devuelve false (se puede reintentar con "Resincronizar LDAP" en el panel).
    /// </summary>
    public async Task<bool> SincronizarGruposAsync(string nombreUsuario, IReadOnlyCollection<string> grupos)
    {
        if (!Habilitado) return true;
        try
        {
            using var conexion = await ConectarAsync();
            await DejarEnGruposAsync(conexion, nombreUsuario, grupos);
            return true;
        }
        catch (Exception e)
        {
            registro.LogError(e, "No se pudieron sincronizar los grupos LDAP de {Usuario}", nombreUsuario);
            return false;
        }
    }

    // ─── Detalles de la conexión ──────────────────────────────────────────────

    private async Task DejarEnGruposAsync(LdapConnection conexion, string nombreUsuario, IReadOnlyCollection<string> grupos)
    {
        var dnUsuario = DnUsuario(nombreUsuario);
        var deseados = grupos.ToHashSet(StringComparer.OrdinalIgnoreCase);
        var actuales = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        // 1. Grupos administrados por el servidor en los que el usuario está hoy.
        var resultados = await conexion.SearchAsync(_ldap.GruposDn, LdapConnection.ScopeOne,
            $"(&(objectClass=groupOfNames)(member={EscaparFiltro(dnUsuario)}))", ["cn"], false);
        await foreach (var entrada in resultados)
        {
            var nombreGrupo = entrada.GetStringValueOrDefault("cn") ?? "";
            if (nombreGrupo.StartsWith(PrefijoGrupos, StringComparison.OrdinalIgnoreCase)) actuales.Add(nombreGrupo);
        }

        // 2. Agregarlo a los que faltan (creando el grupo si no existe, con el superadmin como primer miembro).
        foreach (var grupo in deseados.Except(actuales))
        {
            try
            {
                await conexion.ModifyAsync(DnGrupo(grupo), new LdapModification(LdapModification.Add, new LdapAttribute("member", dnUsuario)));
            }
            catch (LdapException e) when (e.ResultCode == LdapException.NoSuchObject)
            {
                var miembros = new[] { _ldap.SuperadminDn, dnUsuario }.Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
                await conexion.AddAsync(new LdapEntry(DnGrupo(grupo), new LdapAttributeSet
                {
                    new LdapAttribute("objectClass", ["top", "groupOfNames"]),
                    new LdapAttribute("cn", grupo),
                    new LdapAttribute("member", miembros),
                }));
            }
        }

        // 3. Sacarlo de los que sobran.
        foreach (var grupo in actuales.Except(deseados))
            await conexion.ModifyAsync(DnGrupo(grupo), new LdapModification(LdapModification.Delete, new LdapAttribute("member", dnUsuario)));
    }

    private async Task<LdapConnection> ConectarAsync(string? dn = null, string? contrasena = null)
    {
        var conexion = new LdapConnection();
        try
        {
            await conexion.ConnectAsync(_ldap.Servidor, _ldap.Puerto);
            if (_ldap.UsarStartTls) await conexion.StartTlsAsync();
            await conexion.BindAsync(dn ?? _ldap.CuentaServicioDn, contrasena ?? _ldap.CuentaServicioContrasena);
            return conexion;
        }
        catch
        {
            conexion.Dispose();
            throw;
        }
    }

    private string DnUsuario(string nombreUsuario) => $"uid={EscaparDn(nombreUsuario.ToLowerInvariant())},{_ldap.UsuariosDn}";
    private string DnGrupo(string grupo) => $"cn={EscaparDn(grupo)},{_ldap.GruposDn}";

    /// <summary>Escapa un valor para usarlo dentro de un DN (RFC 4514).</summary>
    private static string EscaparDn(string valor)
    {
        var resultado = new System.Text.StringBuilder();
        for (var i = 0; i < valor.Length; i++)
        {
            var c = valor[i];
            if (c is ',' or '+' or '"' or '\\' or '<' or '>' or ';' or '=' ||
                (i == 0 && (c == ' ' || c == '#')) || (i == valor.Length - 1 && c == ' '))
                resultado.Append('\\');
            resultado.Append(c);
        }
        return resultado.ToString();
    }

    private static string EscaparFiltro(string valor) => valor
        .Replace("\\", "\\5c").Replace("*", "\\2a").Replace("(", "\\28").Replace(")", "\\29").Replace("\0", "\\00");
}
