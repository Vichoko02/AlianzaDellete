using System.ComponentModel.DataAnnotations;
using Alianza.Servidor.Datos;
using Alianza.Servidor.Seguridad;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Options;

namespace Alianza.Servidor.Modulos;

// Piezas que usan todos los módulos: errores, validaciones, paginación, direcciones de imágenes y auditoría.

/// <summary>Regla de negocio no cumplida: se responde al panel con su mensaje.</summary>
public class ErrorDeNegocio(string mensaje, int codigoHttp = StatusCodes.Status400BadRequest) : Exception(mensaje)
{
    public int CodigoHttp { get; } = codigoHttp;
}

/// <summary>Convierte ErrorDeNegocio en una respuesta 400/409 con el mensaje, sin registrarlo como fallo.</summary>
public class FiltroErrorDeNegocio : IExceptionFilter
{
    public void OnException(ExceptionContext contexto)
    {
        if (contexto.Exception is not ErrorDeNegocio error) return;
        contexto.Result = new ObjectResult(new ProblemDetails { Status = error.CodigoHttp, Title = error.Message }) { StatusCode = error.CodigoHttp };
        contexto.ExceptionHandled = true;
    }
}

/// <summary>Cualquier otro error: se registra y se responde un mensaje genérico.</summary>
public class ManejadorDeErrores(ILogger<ManejadorDeErrores> registro) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext contexto, Exception error, CancellationToken cancelar)
    {
        var (codigo, mensaje) = error switch
        {
            ErrorDeNegocio e => (e.CodigoHttp, e.Message),
            UnauthorizedAccessException => (StatusCodes.Status401Unauthorized, "No autenticado."),
            _ => (StatusCodes.Status500InternalServerError, "Error interno del servidor."),
        };
        if (codigo == StatusCodes.Status500InternalServerError) registro.LogError(error, "Error no controlado");
        contexto.Response.StatusCode = codigo;
        await contexto.Response.WriteAsJsonAsync(new ProblemDetails { Status = codigo, Title = mensaje }, cancelar);
        return true;
    }
}

public static class Validacion
{
    public const string PatronIdentificador = "^[a-z0-9]+(-[a-z0-9]+)*$";
    public const string MensajeIdentificador = "Solo minúsculas, números y guiones (ej: triple-boca).";
    public const string PatronColor = "^#[0-9a-fA-F]{6}$";
    public const string PatronNombreUsuario = "^[A-Za-z0-9._-]{3,64}$";

    public static readonly HashSet<string> Plataformas =
    [
        "instagram", "twitter", "youtube", "tiktok", "discord", "patreon", "kofi", "buymeacoffee",
        "vaquite", "facebook", "twitch", "kick", "doblaje", "web",
    ];

    public static bool EsUrlHttp(string? valor) =>
        Uri.TryCreate(valor, UriKind.Absolute, out var url) && (url.Scheme == Uri.UriSchemeHttp || url.Scheme == Uri.UriSchemeHttps);
}

/// <summary>[UrlHttp]: solo direcciones http(s) absolutas (bloquea enlaces "javascript:").</summary>
public sealed class UrlHttpAttribute : ValidationAttribute
{
    protected override ValidationResult? IsValid(object? valor, ValidationContext contexto) =>
        valor is null or "" || Validacion.EsUrlHttp(valor as string)
            ? ValidationResult.Success
            : new ValidationResult($"'{valor}' no es una URL http(s) válida.", [contexto.MemberName!]);
}

/// <summary>[Plataforma]: una de las redes conocidas (instagram, youtube...).</summary>
public sealed class PlataformaAttribute : ValidationAttribute
{
    protected override ValidationResult? IsValid(object? valor, ValidationContext contexto) =>
        valor is string texto && Validacion.Plataformas.Contains(texto)
            ? ValidationResult.Success
            : new ValidationResult($"Plataforma no soportada. Usa: {string.Join(", ", Validacion.Plataformas)}.", [contexto.MemberName!]);
}

public record Pagina<T>(List<T> Elementos, int Total, int Numero, int Tamano);

/// <summary>Arma la dirección pública de una imagen o video: {UrlApi}/api/medios/{id}.</summary>
public class DireccionesMedios(IOptions<ConfiguracionPublica> configuracion)
{
    private readonly string _base = configuracion.Value.UrlApi.TrimEnd('/');
    public string? De(Guid? id) => id is null ? null : $"{_base}/api/medios/{id}";
    public string De(Guid id) => $"{_base}/api/medios/{id}";
}

/// <summary>Deja constancia de quién hizo qué. Se guarda junto con el resto de la operación.</summary>
public class Auditoria(BaseDeDatos bd, UsuarioActual actual)
{
    public async Task RegistrarAsync(string accion, string entidad, string? detalle = null)
    {
        var usuario = await actual.ObtenerAsync();
        bd.Auditoria.Add(new RegistroAuditoria
        {
            NombreUsuario = usuario?.NombreUsuario ?? "sistema",
            Accion = accion,
            Entidad = entidad,
            Detalle = detalle is { Length: > 2000 } ? detalle[..2000] : detalle,
        });
    }
}
