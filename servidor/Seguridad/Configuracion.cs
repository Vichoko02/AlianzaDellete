namespace Alianza.Servidor.Seguridad;

// Secciones de appsettings.json. Cada clase corresponde a una sección con el mismo nombre;
// en Docker se definen como variables de entorno, ej: Sesiones__Clave, Superadmin__Contrasena.

public class ConfiguracionSesiones
{
    public const string Seccion = "Sesiones";
    /// <summary>Clave para firmar las sesiones (mínimo 32 caracteres). Obligatoria.</summary>
    public string Clave { get; set; } = "";
    public string Emisor { get; set; } = "alianza-servidor";
    public string Audiencia { get; set; } = "alianza-panel";
    public int DuracionHoras { get; set; } = 8;
}

/// <summary>Cuenta del superadministrador que se crea al arrancar si no existe.</summary>
public class ConfiguracionSuperadmin
{
    public const string Seccion = "Superadmin";
    public string NombreUsuario { get; set; } = "YishAdmin";
    public string NombreVisible { get; set; } = "Yish (Administrador)";
    /// <summary>Contraseña inicial. Solo se usa al crear la cuenta; nunca va en el repositorio.</summary>
    public string? Contrasena { get; set; }
}

public class ConfiguracionLdap
{
    public const string Seccion = "Ldap";
    public bool Habilitado { get; set; }
    public string Servidor { get; set; } = "localhost";
    public int Puerto { get; set; } = 389;
    public bool UsarStartTls { get; set; }
    public string BaseDn { get; set; } = "dc=alianza,dc=local";
    /// <summary>Cuenta de servicio del servidor, con permiso de escritura sobre usuarios y grupos.</summary>
    public string CuentaServicioDn { get; set; } = "cn=alianza-backend,ou=services,dc=alianza,dc=local";
    public string CuentaServicioContrasena { get; set; } = "";
    /// <summary>DN del superadmin en el directorio; se agrega a cada grupo nuevo (un grupo no puede quedar vacío).</summary>
    public string SuperadminDn { get; set; } = "uid=yishadmin,ou=people,dc=alianza,dc=local";

    public string UsuariosDn => $"ou=people,{BaseDn}";
    public string GruposDn => $"ou=groups,{BaseDn}";
}

public class ConfiguracionPublica
{
    public const string Seccion = "Publico";
    /// <summary>URL de esta API, para dar direcciones completas de las imágenes. Vacío = direcciones relativas.</summary>
    public string UrlApi { get; set; } = "";
    /// <summary>URL del sitio público, para los enlaces "Ver en el sitio" del panel.</summary>
    public string UrlSitio { get; set; } = "";
}

public class ConfiguracionCargaInicial
{
    public const string Seccion = "CargaInicial";
    /// <summary>Aplica las migraciones pendientes al arrancar.</summary>
    public bool Migrar { get; set; } = true;
    /// <summary>Importa wikis y socios desde ArchivoContenido si la base de datos aún no tiene series.</summary>
    public bool ImportarContenido { get; set; }
    public string ArchivoContenido { get; set; } = "carga-inicial/contenido.json";
    /// <summary>Carpeta src/assets del sitio, de donde se leen las imágenes a importar.</summary>
    public string? CarpetaImagenes { get; set; }
}

public static class Politicas
{
    public const string Superadmin = "Superadmin";
}
