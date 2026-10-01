namespace Alianza.Api.Domain;

/// <summary>Catálogo de estados de una serie ("En Emisión", "Cancelada", ...). Se administra desde el panel.</summary>
public class EstadoSerie
{
    public int Id { get; set; }
    /// <summary>Identificador estable para el frontend (clases CSS, filtros): "en-emision", "cancelada".</summary>
    public string Codigo { get; set; } = "";
    public string Nombre { get; set; } = "";
    /// <summary>Color en hex (#RRGGBB) para la etiqueta del estado.</summary>
    public string Color { get; set; } = "#888888";
    public int Orden { get; set; }
}

/// <summary>Serie / proyecto con wiki propia.</summary>
public class Serie
{
    public int Id { get; set; }
    public string Slug { get; set; } = "";
    public string Nombre { get; set; } = "";
    public string Sinopsis { get; set; } = "";
    public int EstadoId { get; set; }
    public EstadoSerie Estado { get; set; } = null!;

    /// <summary>Imagen de la tarjeta en la portada.</summary>
    public Guid? PortadaId { get; set; }
    public Guid? BannerId { get; set; }
    public Guid? LogoId { get; set; }
    public string? VideoUrl { get; set; }
    public Guid? VideoLocalId { get; set; }

    public string CreadorNombre { get; set; } = "";
    public string CreadorDescripcion { get; set; } = "";
    public Guid? CreadorImagenId { get; set; }

    public int Orden { get; set; }
    public bool Publicada { get; set; } = true;
    public DateTime CreadoEn { get; set; } = DateTime.UtcNow;
    public DateTime ActualizadoEn { get; set; } = DateTime.UtcNow;

    public List<EnlaceRed> Enlaces { get; set; } = [];
    public List<ObraCreador> ObrasCreador { get; set; } = [];
    public List<SerieImagen> Imagenes { get; set; } = [];
    public List<Personaje> Personajes { get; set; } = [];
    public List<GrupoEquipo> Equipo { get; set; } = [];
    public List<SocioSerie> Socios { get; set; } = [];
}

public enum AmbitoEnlace
{
    /// <summary>Redes oficiales de la serie.</summary>
    Serie = 0,
    /// <summary>Redes del creador de la serie.</summary>
    Creador = 1,
    /// <summary>Enlaces de apoyo económico ("Apóyanos").</summary>
    Apoyo = 2,
    /// <summary>Redes de un socio/asociado.</summary>
    Socio = 3,
}

/// <summary>Enlace a una red social o plataforma (instagram, youtube, patreon...).</summary>
public class EnlaceRed
{
    public int Id { get; set; }
    public AmbitoEnlace Ambito { get; set; }
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

public class SerieImagen
{
    public int Id { get; set; }
    public int SerieId { get; set; }
    public TipoImagenSerie Tipo { get; set; }
    public Guid MedioId { get; set; }
    public string Alt { get; set; } = "";
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

/// <summary>Socio / asociado de la Alianza.</summary>
public class Socio
{
    public int Id { get; set; }
    public string Slug { get; set; } = "";
    public string Nombre { get; set; } = "";
    public string Descripcion { get; set; } = "";
    public Guid? ImagenId { get; set; }
    public int Orden { get; set; }
    public bool Publicado { get; set; } = true;
    public DateTime CreadoEn { get; set; } = DateTime.UtcNow;
    public DateTime ActualizadoEn { get; set; } = DateTime.UtcNow;

    public List<EnlaceRed> Enlaces { get; set; } = [];
    public List<SocioSerie> Series { get; set; } = [];
}

public class SocioSerie
{
    public int SocioId { get; set; }
    public Socio Socio { get; set; } = null!;
    public int SerieId { get; set; }
    public Serie Serie { get; set; } = null!;
    public int Orden { get; set; }
}

/// <summary>Metadatos de un archivo (imagen/video) almacenado en la base de datos.</summary>
public class Medio
{
    public Guid Id { get; set; }
    public string NombreArchivo { get; set; } = "";
    public string TipoContenido { get; set; } = "";
    public long Tamano { get; set; }
    /// <summary>SHA-256 en hex; evita guardar dos veces el mismo archivo.</summary>
    public string Sha256 { get; set; } = "";
    public string Alt { get; set; } = "";
    public DateTime CreadoEn { get; set; } = DateTime.UtcNow;
    public int? SubidoPorId { get; set; }
    public MedioContenido Contenido { get; set; } = null!;
}

/// <summary>Bytes del archivo, en tabla aparte para no cargarlos al listar metadatos.</summary>
public class MedioContenido
{
    public Guid MedioId { get; set; }
    public byte[] Datos { get; set; } = [];
}
