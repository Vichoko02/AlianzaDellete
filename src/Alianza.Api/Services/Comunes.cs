using Alianza.Api.Auth;
using Alianza.Api.Data;
using Alianza.Api.Domain;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace Alianza.Api.Services;

/// <summary>Error de regla de negocio que se devuelve al cliente con su mensaje.</summary>
public class ErrorNegocio(string mensaje, int estado = StatusCodes.Status400BadRequest) : Exception(mensaje)
{
    public int Estado { get; } = estado;
}

/// <summary>Convierte ErrorNegocio en una respuesta ProblemDetails sin registrarlo como fallo del servidor.</summary>
public class FiltroErrorNegocio : Microsoft.AspNetCore.Mvc.Filters.IExceptionFilter
{
    public void OnException(Microsoft.AspNetCore.Mvc.Filters.ExceptionContext ctx)
    {
        if (ctx.Exception is not ErrorNegocio e) return;
        ctx.Result = new ObjectResult(new ProblemDetails { Status = e.Estado, Title = e.Message }) { StatusCode = e.Estado };
        ctx.ExceptionHandled = true;
    }
}

public class ManejadorErrores(ILogger<ManejadorErrores> log) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext ctx, Exception ex, CancellationToken ct)
    {
        var (estado, titulo) = ex switch
        {
            ErrorNegocio e => (e.Estado, e.Message),
            UnauthorizedAccessException => (StatusCodes.Status401Unauthorized, "No autenticado."),
            _ => (StatusCodes.Status500InternalServerError, "Error interno del servidor."),
        };
        if (estado == StatusCodes.Status500InternalServerError) log.LogError(ex, "Error no controlado");
        ctx.Response.StatusCode = estado;
        await ctx.Response.WriteAsJsonAsync(new ProblemDetails { Status = estado, Title = titulo }, ct);
        return true;
    }
}

public class OpcionesPublicas
{
    public const string Seccion = "Publico";
    /// <summary>URL base de la API para construir URLs absolutas de medios (ej: https://api.alianza.cl). Vacío = rutas relativas.</summary>
    public string UrlBase { get; set; } = "";
}

public class UrlsMedios(Microsoft.Extensions.Options.IOptions<OpcionesPublicas> op)
{
    private readonly string _base = op.Value.UrlBase.TrimEnd('/');
    public string? Url(Guid? id) => id is null ? null : $"{_base}/api/medios/{id}";
    public string Url(Guid id) => $"{_base}/api/medios/{id}";
}

public class ServicioAuditoria(AlianzaDbContext db, UsuarioActual actual)
{
    /// <summary>Agrega el registro al contexto; se guarda junto con el SaveChanges de la operación.</summary>
    public async Task RegistrarAsync(string accion, string entidad, object? entidadId = null, string? detalle = null)
    {
        var u = await actual.ObtenerAsync();
        db.Auditoria.Add(new RegistroAuditoria
        {
            UsuarioId = u?.Id,
            Username = u?.Username ?? "sistema",
            Accion = accion,
            Entidad = entidad,
            EntidadId = entidadId?.ToString(),
            Detalle = detalle is { Length: > 2000 } ? detalle[..2000] : detalle,
        });
    }
}
