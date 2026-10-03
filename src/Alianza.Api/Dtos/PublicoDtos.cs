using System.ComponentModel.DataAnnotations;

namespace Alianza.Api.Dtos;

// Formas pensadas para reemplazar 1:1 los datos hardcodeados del frontend
// (ProjectWikiData en ProjectWikiTemplate.tsx y Socio en SocioModal.tsx).

public record EstadoPublicoDto(string Codigo, string Nombre, string Color);

public record TarjetaSerieDto(string Id, string Nombre, string? Imagen, string Enlace, EstadoPublicoDto Estado);

public record StaffMiembroPublicoDto(string Nombre, string Rol, string? Imagen);

public record StaffGrupoPublicoDto(string Categoria, List<StaffMiembroPublicoDto> Miembros);

public record ImagenGaleriaDto(string Src, string Alt);

public record PersonajePublicoDto(string Nombre, string? Imagen, string Rol, string Descripcion, string? ActorVoz, string? ImagenActorVoz);

public record ObraPublicaDto(string Titulo, string? Url);

public record CreadorPublicoDto(string Nombre, string? Imagen, string Descripcion, Dictionary<string, string> Redes, List<ObraPublicaDto> Obras);

public record ProyectoSocioDto(string Nombre, string? Imagen, string Enlace);

public record WikiPublicaDto(
    string Id,
    string Nombre,
    string? Banner,
    string? Logo,
    /// <summary>Nombre del estado tal como lo muestra la etiqueta ("En Emisión").</summary>
    string Estado,
    EstadoPublicoDto EstadoInfo,
    string? VideoUrl,
    string? VideoLocal,
    string Sinopsis,
    CreadorPublicoDto Creador,
    Dictionary<string, string> Redes,
    Dictionary<string, string> Apoyanos,
    List<string> Carrusel,
    List<PersonajePublicoDto> Personajes,
    List<StaffGrupoPublicoDto> Staff,
    List<ImagenGaleriaDto> Galeria,
    List<ProyectoSocioDto> Socios);

public record SocioPublicoDto(string Id, string Nombre, string? Imagen, string Descripcion, Dictionary<string, string> Redes, List<ProyectoSocioDto> Proyectos);

// ─── Contenido general del sitio y quiz de postulación ────────────────────────

public record EnlaceSitioDto(
    [Required, Plataforma] string Plataforma,
    [Required, UrlHttp, MaxLength(500)] string Url,
    [MaxLength(100)] string? Etiqueta,
    [MaxLength(200)] string? Descripcion);

/// <summary>Textos planos e imágenes sueltas (como URL), listas de imágenes y enlaces agrupados.</summary>
public record SitioPublicoDto(Dictionary<string, string> Textos, Dictionary<string, List<string>> Listas, Dictionary<string, List<EnlaceSitioDto>> Enlaces);

public record PreguntaPublicaDto(int Id, string Texto, string Ayuda, Alianza.Api.Domain.TipoPregunta Tipo, List<string> Opciones, bool Requerida);

public record RespuestaQuizDto(int PreguntaId, List<string>? Valores);

/// <summary>Sitio: campo trampa para bots; las personas lo dejan vacío porque no se ve.</summary>
public record EnviarSolicitudDto(List<RespuestaQuizDto>? Respuestas, string? Sitio);
