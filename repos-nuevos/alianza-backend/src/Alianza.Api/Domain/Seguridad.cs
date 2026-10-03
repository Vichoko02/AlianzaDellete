namespace Alianza.Api.Domain;

public enum OrigenAuth
{
    /// <summary>Contraseña guardada (hash BCrypt) en PostgreSQL.</summary>
    Local = 0,
    /// <summary>Contraseña validada contra el directorio LDAP.</summary>
    Ldap = 1,
}

public class Usuario
{
    public int Id { get; set; }
    public string Username { get; set; } = "";
    /// <summary>Username en minúsculas; garantiza unicidad sin distinguir mayúsculas.</summary>
    public string UsernameNormalizado { get; set; } = "";
    public string NombreVisible { get; set; } = "";
    public string? Email { get; set; }
    public string? PasswordHash { get; set; }
    public OrigenAuth Origen { get; set; }
    /// <summary>Solo existe uno (YishAdmin). La API nunca permite otorgar este flag.</summary>
    public bool EsSuperAdmin { get; set; }
    /// <summary>Habilita crear wikis nuevas. Solo el superadmin puede activarlo.</summary>
    public bool PuedeCrearWikis { get; set; }
    public bool Activo { get; set; } = true;
    /// <summary>Cambia al modificar contraseña, permisos críticos o desactivar; invalida los tokens emitidos.</summary>
    public Guid SelloSeguridad { get; set; } = Guid.NewGuid();
    public DateTime CreadoEn { get; set; } = DateTime.UtcNow;
    public DateTime? UltimoAcceso { get; set; }
    public List<PermisoUsuario> Permisos { get; set; } = [];
}

/// <summary>
/// Área del contenido sobre la que se otorga un permiso de edición.
/// Los visitantes del sitio no inician sesión: solo los usuarios administrativos tienen cuenta.
/// </summary>
public enum AmbitoPermiso
{
    /// <summary>Editar wikis. Con SerieId = una wiki concreta; sin SerieId = todas. Crear wikis requiere además Usuario.PuedeCrearWikis.</summary>
    Wikis = 0,
    /// <summary>Crear, editar y eliminar socios/asociados.</summary>
    Socios = 1,
    /// <summary>Administrar el catálogo de estados de serie.</summary>
    Estados = 2,
    /// <summary>Administrar la biblioteca de medios (eliminar archivos).</summary>
    Medios = 3,
    /// <summary>Editar los textos, imágenes y enlaces generales del sitio (portada, footer, Apóyanos...).</summary>
    Sitio = 4,
}

public class PermisoUsuario
{
    public int Id { get; set; }
    public int UsuarioId { get; set; }
    public AmbitoPermiso Ambito { get; set; }
    public int? SerieId { get; set; }
    public Serie? Serie { get; set; }
    public DateTime OtorgadoEn { get; set; } = DateTime.UtcNow;
    public int? OtorgadoPorId { get; set; }
}

public class RegistroAuditoria
{
    public long Id { get; set; }
    public DateTime Fecha { get; set; } = DateTime.UtcNow;
    public int? UsuarioId { get; set; }
    public string Username { get; set; } = "";
    public string Accion { get; set; } = "";
    public string Entidad { get; set; } = "";
    public string? EntidadId { get; set; }
    public string? Detalle { get; set; }
}
