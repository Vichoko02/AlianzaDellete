// Tablas de la base de datos. Cada clase es una tabla; cada propiedad, una columna.
// Orden: 1) contenido del sitio (series, socios, medios), 2) textos y formulario, 3) cuentas y permisos.
namespace Alianza.Servidor.Datos;

// ─── 1. Contenido: series (wikis), socios y archivos ──────────────────────────

/// <summary>Estado de una serie: "En Emisión", "Cancelado"... Se administra desde el panel.</summary>
public class EstadoSerie
{
    public int Id { get; set; }
    /// <summary>Identificador estable para el sitio (clases CSS, filtros): "en-emision".</summary>
    public string Codigo { get; set; } = "";
    public string Nombre { get; set; } = "";
    /// <summary>Color de la etiqueta en formato #RRGGBB.</summary>
    public string Color { get; set; } = "#888888";
    public int Orden { get; set; }
}

/// <summary>Serie o proyecto con wiki propia.</summary>
public class Serie
{
    public int Id { get; set; }
    /// <summary>Parte de la dirección: /wiki/{Identificador}.</summary>
    public string Identificador { get; set; } = "";
    public string Nombre { get; set; } = "";
    public string Sinopsis { get; set; } = "";
    public int EstadoId { get; set; }
    public EstadoSerie Estado { get; set; } = null!;

    public Guid? PortadaId { get; set; }
    public Guid? CabeceraId { get; set; }
    public Guid? LogoId { get; set; }
    public string? UrlVideo { get; set; }
    public Guid? VideoPropioId { get; set; }

    public string CreadorNombre { get; set; } = "";
    public string CreadorDescripcion { get; set; } = "";
    public Guid? CreadorImagenId { get; set; }

    public int Orden { get; set; }
    public bool Publicada { get; set; } = true;
    public DateTime CreadaEn { get; set; } = DateTime.UtcNow;
    public DateTime ActualizadaEn { get; set; } = DateTime.UtcNow;

    public List<Enlace> Enlaces { get; set; } = [];
    public List<ObraCreador> ObrasCreador { get; set; } = [];
    public List<ImagenSerie> Imagenes { get; set; } = [];
    public List<Personaje> Personajes { get; set; } = [];
    public List<GrupoEquipo> Equipo { get; set; } = [];
    public List<SocioSerie> Socios { get; set; } = [];
}

public enum UsoEnlace
{
    /// <summary>Redes oficiales de la serie.</summary>
    Serie = 0,
    /// <summary>Redes del creador de la serie.</summary>
    Creador = 1,
    /// <summary>Enlaces de apoyo económico ("Apóyanos").</summary>
    Apoyo = 2,
    /// <summary>Redes de un socio.</summary>
    Socio = 3,
}

/// <summary>Enlace a una red o plataforma (instagram, youtube, patreon...) de una serie o de un socio.</summary>
public class Enlace
{
    public int Id { get; set; }
    public UsoEnlace Uso { get; set; }
    public string Plataforma { get; set; } = "";
    public string Url { get; set; } = "";
    public int Orden { get; set; }
    public int? SerieId { get; set; }
    public int? SocioId { get; set; }
}

public class ObraCreador
{
    public int Id { get; set; }
    public int SerieId { get; set; }
    public string Titulo { get; set; } = "";
    public string? Url { get; set; }
    public int Orden { get; set; }
}

public enum TipoImagenSerie
{
    Carrusel = 0,
    Galeria = 1,
}

public class ImagenSerie
{
    public int Id { get; set; }
    public int SerieId { get; set; }
    public TipoImagenSerie Tipo { get; set; }
    public Guid MedioId { get; set; }
    public string TextoAlternativo { get; set; } = "";
    public int Orden { get; set; }
}

public class Personaje
{
    public int Id { get; set; }
    public int SerieId { get; set; }
    public string Nombre { get; set; } = "";
    public string Rol { get; set; } = "";
    public string Descripcion { get; set; } = "";
    public Guid? ImagenId { get; set; }
    public string? ActorVoz { get; set; }
    public Guid? ImagenActorVozId { get; set; }
    public int Orden { get; set; }
}

/// <summary>Categoría del equipo de una serie ("Animatics", "Actores de Voz"...).</summary>
public class GrupoEquipo
{
    public int Id { get; set; }
    public int SerieId { get; set; }
    public string Categoria { get; set; } = "";
    public int Orden { get; set; }
    public List<MiembroEquipo> Miembros { get; set; } = [];
}

public class MiembroEquipo
{
    public int Id { get; set; }
    public int GrupoId { get; set; }
    public string Nombre { get; set; } = "";
    public string Rol { get; set; } = "";
    public Guid? ImagenId { get; set; }
    public int Orden { get; set; }
}

/// <summary>Socio o asociado de la Alianza.</summary>
public class Socio
{
    public int Id { get; set; }
    public string Identificador { get; set; } = "";
    public string Nombre { get; set; } = "";
    public string Descripcion { get; set; } = "";
    public Guid? ImagenId { get; set; }
    public int Orden { get; set; }
    public bool Publicado { get; set; } = true;
    public DateTime ActualizadoEn { get; set; } = DateTime.UtcNow;

    public List<Enlace> Enlaces { get; set; } = [];
    public List<SocioSerie> Series { get; set; } = [];
}

/// <summary>Une un socio con las series en las que participa.</summary>
public class SocioSerie
{
    public int SocioId { get; set; }
    public Socio Socio { get; set; } = null!;
    public int SerieId { get; set; }
    public Serie Serie { get; set; } = null!;
    public int Orden { get; set; }
}

/// <summary>Datos de una imagen o video guardado en la base de datos.</summary>
public class Medio
{
    public Guid Id { get; set; }
    public string NombreArchivo { get; set; } = "";
    public string TipoContenido { get; set; } = "";
    public long Tamano { get; set; }
    /// <summary>Huella SHA-256 en hexadecimal: evita guardar dos veces el mismo archivo.</summary>
    public string Huella { get; set; } = "";
    public string TextoAlternativo { get; set; } = "";
    public DateTime SubidoEn { get; set; } = DateTime.UtcNow;
    public ContenidoMedio Contenido { get; set; } = null!;
}

/// <summary>Bytes del archivo, en tabla aparte para no cargarlos al listar.</summary>
public class ContenidoMedio
{
    public Guid MedioId { get; set; }
    public byte[] Bytes { get; set; } = [];
}

// ─── 2. Textos del sitio y formulario de postulación ──────────────────────────

public enum TipoTexto
{
    Texto = 0,
    TextoLargo = 1,
    Url = 2,
    /// <summary>Valor = id de un medio.</summary>
    Imagen = 3,
    /// <summary>Valor = ids de medios separados por coma, en orden.</summary>
    ListaImagenes = 4,
}

/// <summary>Texto o imagen editable del sitio (eslogan, "Sobre nosotros", títulos...).</summary>
public class TextoSitio
{
    /// <summary>Clave estable que usa el sitio, ej: "inicio.eslogan".</summary>
    public string Clave { get; set; } = "";
    /// <summary>Agrupa los campos en el panel ("Portada", "Únete"...).</summary>
    public string Grupo { get; set; } = "";
    public string Etiqueta { get; set; } = "";
    public TipoTexto Tipo { get; set; }
    public string Valor { get; set; } = "";
    public int Orden { get; set; }
}

/// <summary>Enlace general del sitio: redes del pie de página u opciones de "Apóyanos".</summary>
public class EnlaceSitio
{
    public int Id { get; set; }
    /// <summary>"pie" o "apoyanos".</summary>
    public string Grupo { get; set; } = "";
    public string Plataforma { get; set; } = "";
    public string Url { get; set; } = "";
    public string Etiqueta { get; set; } = "";
    public string Descripcion { get; set; } = "";
    public int Orden { get; set; }
}

public enum TipoPregunta
{
    /// <summary>Nombre de quien postula.</summary>
    Nombre = 0,
    /// <summary>Correo de contacto (obligatorio para poder responder).</summary>
    Correo = 1,
    Texto = 2,
    TextoLargo = 3,
    Opcion = 4,
    VariasOpciones = 5,
}

/// <summary>Paso del formulario "Postula tu proyecto". El formulario activo tiene entre 3 y 5 pasos.</summary>
public class Pregunta
{
    public int Id { get; set; }
    public int Orden { get; set; }
    public string Texto { get; set; } = "";
    public string Ayuda { get; set; } = "";
    public TipoPregunta Tipo { get; set; }
    public List<string> Opciones { get; set; } = [];
    public bool Obligatoria { get; set; } = true;
    public bool Activa { get; set; } = true;
}

public enum EstadoPostulacion
{
    Nueva = 0,
    Leida = 1,
    Archivada = 2,
}

/// <summary>Postulación enviada desde el sitio. Llega como notificación al superadmin.</summary>
public class Postulacion
{
    public long Id { get; set; }
    public DateTime RecibidaEn { get; set; } = DateTime.UtcNow;
    public string Nombre { get; set; } = "";
    public string Correo { get; set; } = "";
    public EstadoPostulacion Estado { get; set; }
    public List<Respuesta> Respuestas { get; set; } = [];
}

/// <summary>Respuesta guardada junto con el texto de la pregunta tal como estaba al enviarse.</summary>
public class Respuesta
{
    public long Id { get; set; }
    public long PostulacionId { get; set; }
    public int Orden { get; set; }
    public string Pregunta { get; set; } = "";
    public string Valor { get; set; } = "";
}

// ─── 3. Cuentas del panel, permisos y auditoría ───────────────────────────────

public enum OrigenCuenta
{
    /// <summary>Contraseña guardada (hash BCrypt) en PostgreSQL.</summary>
    Local = 0,
    /// <summary>Contraseña validada contra el directorio LDAP.</summary>
    Ldap = 1,
}

/// <summary>Cuenta del panel. Los visitantes del sitio no tienen cuenta.</summary>
public class Usuario
{
    public int Id { get; set; }
    public string NombreUsuario { get; set; } = "";
    /// <summary>NombreUsuario en minúsculas: hace único el nombre sin distinguir mayúsculas.</summary>
    public string NombreUsuarioNormalizado { get; set; } = "";
    public string NombreVisible { get; set; } = "";
    public string? Correo { get; set; }
    public string? HashContrasena { get; set; }
    public OrigenCuenta Origen { get; set; }
    /// <summary>Solo existe uno (YishAdmin). Ninguna ruta de la API permite otorgarlo.</summary>
    public bool EsSuperadmin { get; set; }
    /// <summary>Permite crear wikis nuevas. Solo el superadmin lo activa.</summary>
    public bool PuedeCrearWikis { get; set; }
    public bool Activo { get; set; } = true;
    /// <summary>Cambia al cambiar la contraseña o desactivar la cuenta: invalida las sesiones abiertas.</summary>
    public Guid SelloSesion { get; set; } = Guid.NewGuid();
    public DateTime CreadoEn { get; set; } = DateTime.UtcNow;
    public DateTime? UltimoAcceso { get; set; }
    public List<Permiso> Permisos { get; set; } = [];
}

/// <summary>Área sobre la que un usuario puede editar.</summary>
public enum AreaPermiso
{
    /// <summary>Editar wikis: con SerieId, una wiki; sin SerieId, todas.</summary>
    Wikis = 0,
    Socios = 1,
    Estados = 2,
    /// <summary>Eliminar archivos de la biblioteca de medios.</summary>
    Medios = 3,
    /// <summary>Editar los textos, imágenes y enlaces generales del sitio.</summary>
    Sitio = 4,
}

public class Permiso
{
    public int Id { get; set; }
    public int UsuarioId { get; set; }
    public AreaPermiso Area { get; set; }
    public int? SerieId { get; set; }
    public Serie? Serie { get; set; }
}

public class RegistroAuditoria
{
    public long Id { get; set; }
    public DateTime Fecha { get; set; } = DateTime.UtcNow;
    public string NombreUsuario { get; set; } = "";
    public string Accion { get; set; } = "";
    public string Entidad { get; set; } = "";
    public string? Detalle { get; set; }
}
