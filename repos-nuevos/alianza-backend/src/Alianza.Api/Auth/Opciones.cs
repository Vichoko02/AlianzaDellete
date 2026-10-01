namespace Alianza.Api.Auth;

public class JwtOpciones
{
    public const string Seccion = "Jwt";
    public string Emisor { get; set; } = "alianza-backend";
    public string Audiencia { get; set; } = "alianza-admin";
    /// <summary>Clave HMAC de al menos 32 caracteres. Obligatoria (variable Jwt__Clave).</summary>
    public string Clave { get; set; } = "";
    public int DuracionHoras { get; set; } = 8;
}

/// <summary>Cuenta del superadministrador que se crea al iniciar si no existe.</summary>
public class AdminOpciones
{
    public const string Seccion = "Admin";
    public string Username { get; set; } = "YishAdmin";
    public string NombreVisible { get; set; } = "Yish (Administrador)";
    /// <summary>Contraseña inicial. Solo se usa al crear la cuenta; nunca se guarda en el repositorio (variable Admin__Password).</summary>
    public string? Password { get; set; }
}

public class LdapOpciones
{
    public const string Seccion = "Ldap";
    public bool Habilitado { get; set; }
    public string Host { get; set; } = "localhost";
    public int Puerto { get; set; } = 389;
    public bool UsarStartTls { get; set; }
    public string BaseDn { get; set; } = "dc=alianza,dc=local";
    public string UsuariosOu { get; set; } = "ou=people";
    public string GruposOu { get; set; } = "ou=groups";
    /// <summary>Cuenta de servicio con permiso de escritura sobre usuarios y grupos.</summary>
    public string BindDn { get; set; } = "cn=alianza-backend,ou=services,dc=alianza,dc=local";
    public string BindPassword { get; set; } = "";
    /// <summary>DN del superadmin en el directorio; se agrega a cada grupo nuevo (groupOfNames exige al menos un miembro).</summary>
    public string MiembroPorDefectoDn { get; set; } = "uid=yishadmin,ou=people,dc=alianza,dc=local";

    public string UsuariosDn => $"{UsuariosOu},{BaseDn}";
    public string GruposDn => $"{GruposOu},{BaseDn}";
}

public static class Politicas
{
    public const string SuperAdmin = "SuperAdmin";
}
