using System.ComponentModel.DataAnnotations;
using Alianza.Api.Domain;

namespace Alianza.Api.Dtos;

public static class Validacion
{
    public const string PatronSlug = "^[a-z0-9]+(-[a-z0-9]+)*$";
    public const string MensajeSlug = "Solo minúsculas, números y guiones (ej: triple-boca).";
    public const string PatronColor = "^#[0-9a-fA-F]{6}$";
    public const string PatronUsername = "^[A-Za-z0-9._-]{3,64}$";

    public static readonly HashSet<string> Plataformas =
    [
        "instagram", "twitter", "youtube", "tiktok", "discord", "patreon", "kofi", "buymeacoffee",
        "vaquite", "facebook", "twitch", "kick", "doblaje", "web",
    ];
}

/// <summary>Exige URL absoluta http/https (evita enlaces "javascript:" en el sitio).</summary>
public sealed class UrlHttpAttribute : ValidationAttribute
{
    protected override ValidationResult? IsValid(object? value, ValidationContext ctx)
    {
        if (value is null or "") return ValidationResult.Success;
        return value is string s && Uri.TryCreate(s, UriKind.Absolute, out var u) && (u.Scheme == Uri.UriSchemeHttp || u.Scheme == Uri.UriSchemeHttps)
            ? ValidationResult.Success
            : new ValidationResult($"'{value}' no es una URL http(s) válida.", [ctx.MemberName!]);
    }
}

public sealed class PlataformaAttribute : ValidationAttribute
{
    protected override ValidationResult? IsValid(object? value, ValidationContext ctx) =>
        value is string s && Validacion.Plataformas.Contains(s)
            ? ValidationResult.Success
            : new ValidationResult($"Plataforma no soportada. Usa: {string.Join(", ", Validacion.Plataformas)}.", [ctx.MemberName!]);
}

// ─── Auth ──────────────────────────────────────────────────────────────────────

public record LoginDto([Required, MaxLength(64)] string Username, [Required, MaxLength(200)] string Password);

public record CambiarPasswordDto([Required] string PasswordActual, [Required] string PasswordNueva);

public record SesionDto(string Token, DateTime Expira, PerfilDto Usuario);

public record PerfilDto(
    int Id,
    string Username,
    string NombreVisible,
    string? Email,
    OrigenAuth Origen,
    bool EsSuperAdmin,
    bool PuedeCrearWikis,
    List<PermisoDto> Permisos);

// ─── Usuarios y permisos (solo superadmin) ────────────────────────────────────

public record PermisoDto(AmbitoPermiso Ambito, int? SerieId, string? SerieNombre = null);

public record UsuarioListaDto(
    int Id, string Username, string NombreVisible, string? Email, OrigenAuth Origen, bool EsSuperAdmin,
    bool PuedeCrearWikis, bool Activo, DateTime CreadoEn, DateTime? UltimoAcceso, List<PermisoDto> Permisos);

public record CrearUsuarioDto(
    [Required, RegularExpression(Validacion.PatronUsername, ErrorMessage = "Usuario: 3-64 caracteres (letras, números, punto, guion).")] string Username,
    [Required, MaxLength(150)] string NombreVisible,
    [EmailAddress, MaxLength(255)] string? Email,
    [Required] string Password,
    OrigenAuth Origen = OrigenAuth.Local,
    bool PuedeCrearWikis = false,
    List<PermisoDto>? Permisos = null);

public record ActualizarUsuarioDto(
    [Required, MaxLength(150)] string NombreVisible,
    [EmailAddress, MaxLength(255)] string? Email,
    bool Activo,
    bool PuedeCrearWikis);

public record RestablecerPasswordDto([Required] string Password);

// ─── Estados ──────────────────────────────────────────────────────────────────

public record EstadoDto(int Id, string Codigo, string Nombre, string Color, int Orden);

public record GuardarEstadoDto(
    [Required, RegularExpression(Validacion.PatronSlug, ErrorMessage = Validacion.MensajeSlug), MaxLength(50)] string Codigo,
    [Required, MaxLength(80)] string Nombre,
    [Required, RegularExpression(Validacion.PatronColor, ErrorMessage = "Color en formato #RRGGBB.")] string Color,
    int Orden);

// ─── Medios ───────────────────────────────────────────────────────────────────

public record ActualizarMedioDto([MaxLength(300)] string? Alt);

public record MedioDto(Guid Id, string Url, string NombreArchivo, string TipoContenido, long Tamano, string Alt, DateTime CreadoEn);

// ─── Series / wikis ───────────────────────────────────────────────────────────

public record EnlaceDto([Required, Plataforma] string Plataforma, [Required, UrlHttp, MaxLength(500)] string Url);

public record ObraDto([Required, MaxLength(200)] string Titulo, [UrlHttp, MaxLength(500)] string? Url);

public record ImagenDto(Guid MedioId, [MaxLength(300)] string? Alt);

public record PersonajeDto(
    [Required, MaxLength(150)] string Nombre,
    [MaxLength(150)] string? Rol,
    [MaxLength(4000)] string? Descripcion,
    Guid? ImagenId,
    [MaxLength(150)] string? ActorVoz,
    Guid? ImagenActorVozId);

public record MiembroDto([Required, MaxLength(150)] string Nombre, [MaxLength(150)] string? Rol, Guid? ImagenId);

public record GrupoEquipoDto([Required, MaxLength(100)] string Categoria, List<MiembroDto> Miembros);

public record CreadorDto(
    [MaxLength(150)] string? Nombre,
    [MaxLength(4000)] string? Descripcion,
    Guid? ImagenId,
    List<EnlaceDto>? Redes,
    List<ObraDto>? Obras);

public record SerieEdicionDto(
    int? Id,
    [Required, RegularExpression(Validacion.PatronSlug, ErrorMessage = Validacion.MensajeSlug), MaxLength(80)] string Slug,
    [Required, MaxLength(150)] string Nombre,
    [MaxLength(8000)] string? Sinopsis,
    int EstadoId,
    Guid? PortadaId,
    Guid? BannerId,
    Guid? LogoId,
    [UrlHttp, MaxLength(500)] string? VideoUrl,
    Guid? VideoLocalId,
    CreadorDto? Creador,
    List<EnlaceDto>? Redes,
    List<EnlaceDto>? Apoyo,
    List<ImagenDto>? Carrusel,
    List<ImagenDto>? Galeria,
    List<PersonajeDto>? Personajes,
    List<GrupoEquipoDto>? Equipo,
    int Orden,
    bool Publicada,
    DateTime? ActualizadoEn = null);

public record CambiarEstadoDto(int EstadoId);

public record CambiarPublicadaDto(bool Publicada);

public record SerieListaDto(int Id, string Slug, string Nombre, EstadoDto Estado, string? Portada, bool Publicada, int Orden, DateTime ActualizadoEn);

// ─── Socios ───────────────────────────────────────────────────────────────────

public record SocioEdicionDto(
    int? Id,
    [Required, RegularExpression(Validacion.PatronSlug, ErrorMessage = Validacion.MensajeSlug), MaxLength(80)] string Slug,
    [Required, MaxLength(150)] string Nombre,
    [MaxLength(4000)] string? Descripcion,
    Guid? ImagenId,
    int Orden,
    bool Publicado,
    List<EnlaceDto>? Redes,
    List<int>? SerieIds);

public record SocioListaDto(int Id, string Slug, string Nombre, string? Imagen, bool Publicado, int Orden);

// ─── Panel ────────────────────────────────────────────────────────────────────

public record ResumenDto(int Series, int SeriesPublicadas, int Socios, int Medios, long BytesMedios, int Usuarios, Dictionary<string, int> SeriesPorEstado);

public record AuditoriaDto(long Id, DateTime Fecha, string Username, string Accion, string Entidad, string? EntidadId, string? Detalle);

public record PaginaDto<T>(List<T> Items, int Total, int Pagina, int TamanoPagina);

// ─── Sitio, quiz y solicitudes ────────────────────────────────────────────────

public record CampoSitioDto(string Clave, string Grupo, string Etiqueta, TipoTexto Tipo, string Valor);

public record ValorSitioDto([Required, MaxLength(100)] string Clave, [MaxLength(8000)] string? Valor);

public record PreguntaEdicionDto(
    int? Id,
    [Required, MaxLength(300)] string Texto,
    [MaxLength(500)] string? Ayuda,
    TipoPregunta Tipo,
    List<string>? Opciones,
    bool Requerida,
    bool Activa);

public record SolicitudListaDto(long Id, DateTime Fecha, string Nombre, string Email, EstadoSolicitud Estado, string Resumen);

public record RespuestaDto(string Pregunta, string Respuesta);

public record SolicitudDto(long Id, DateTime Fecha, string Nombre, string Email, EstadoSolicitud Estado, DateTime? LeidaEn, List<RespuestaDto> Respuestas);

public record CambiarEstadoSolicitudDto(EstadoSolicitud Estado);

public record PendientesDto(int Nuevas, long? UltimaId, string? UltimoNombre, DateTime? UltimaFecha);
