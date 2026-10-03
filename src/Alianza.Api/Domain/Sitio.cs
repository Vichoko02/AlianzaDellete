namespace Alianza.Api.Domain;

public enum TipoTexto
{
    Texto = 0,
    TextoLargo = 1,
    Url = 2,
    /// <summary>Valor = id de un Medio.</summary>
    Imagen = 3,
    /// <summary>Valor = ids de Medio separados por coma, en orden.</summary>
    ListaImagenes = 4,
}

/// <summary>Texto o imagen editable del sitio público (eslogan, "Sobre nosotros", títulos de sección...).</summary>
public class TextoSitio
{
    /// <summary>Clave estable que usa el frontend, ej: "inicio.eslogan".</summary>
    public string Clave { get; set; } = "";
    /// <summary>Agrupa los campos en el panel ("Portada", "Únete", "Wikis"...).</summary>
    public string Grupo { get; set; } = "";
    public string Etiqueta { get; set; } = "";
    public TipoTexto Tipo { get; set; }
    public string Valor { get; set; } = "";
    public int Orden { get; set; }
    public DateTime ActualizadoEn { get; set; } = DateTime.UtcNow;
}

/// <summary>Enlace general del sitio (redes del footer, opciones del modal "Apóyanos").</summary>
public class EnlaceSitio
{
    public int Id { get; set; }
    /// <summary>"footer" o "apoyanos".</summary>
    public string Grupo { get; set; } = "";
    public string Plataforma { get; set; } = "";
    public string Url { get; set; } = "";
    public string Etiqueta { get; set; } = "";
    public string Descripcion { get; set; } = "";
    public int Orden { get; set; }
}

public enum TipoPregunta
{
    /// <summary>Nombre de quien postula (se guarda también en Solicitud.Nombre).</summary>
    Nombre = 0,
    /// <summary>Correo de contacto (se valida y se guarda en Solicitud.Email).</summary>
    Email = 1,
    Texto = 2,
    TextoLargo = 3,
    /// <summary>Una opción de la lista.</summary>
    Opcion = 4,
    /// <summary>Una o más opciones de la lista.</summary>
    VariasOpciones = 5,
}

/// <summary>Paso del quiz "Postula tu proyecto". El quiz activo tiene entre 3 y 5 pasos.</summary>
public class PreguntaQuiz
{
    public int Id { get; set; }
    public int Orden { get; set; }
    public string Texto { get; set; } = "";
    public string Ayuda { get; set; } = "";
    public TipoPregunta Tipo { get; set; }
    public List<string> Opciones { get; set; } = [];
    public bool Requerida { get; set; } = true;
    public bool Activa { get; set; } = true;
}

public enum EstadoSolicitud
{
    Nueva = 0,
    Leida = 1,
    Archivada = 2,
}

/// <summary>Postulación enviada desde el quiz del sitio; llega como notificación al superadmin.</summary>
public class Solicitud
{
    public long Id { get; set; }
    public DateTime Fecha { get; set; } = DateTime.UtcNow;
    public string Nombre { get; set; } = "";
    public string Email { get; set; } = "";
    public EstadoSolicitud Estado { get; set; }
    public DateTime? LeidaEn { get; set; }
    public List<RespuestaSolicitud> Respuestas { get; set; } = [];
}

/// <summary>Respuesta guardada con el texto de la pregunta tal como estaba al enviarse.</summary>
public class RespuestaSolicitud
{
    public long Id { get; set; }
    public long SolicitudId { get; set; }
    public int Orden { get; set; }
    public string Pregunta { get; set; } = "";
    public string Respuesta { get; set; } = "";
}
