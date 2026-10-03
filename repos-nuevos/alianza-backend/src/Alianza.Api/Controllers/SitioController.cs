using Alianza.Api.Data;
using Alianza.Api.Domain;
using Alianza.Api.Dtos;
using Alianza.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Alianza.Api.Controllers;

/// <summary>Contenido general del sitio y formulario de postulación. Públicos, sin sesión.</summary>
[ApiController]
[Route("api")]
public class SitioController(ServicioSitio sitio, ServicioQuiz quiz, ILogger<SitioController> log) : ControllerBase
{
    /// <summary>Textos, imágenes y enlaces del sitio (portada, menú, Únete, Apóyanos, pie, etiquetas de las wikis).</summary>
    [HttpGet("sitio")]
    public async Task<SitioPublicoDto> Sitio()
    {
        // Pesa pocos KB: sin caché, para que lo editado en el panel se vea al recargar.
        Response.Headers.CacheControl = "no-cache";
        return await sitio.PublicoAsync();
    }

    /// <summary>Pasos activos del formulario "Postula tu proyecto".</summary>
    [HttpGet("quiz")]
    public async Task<List<PreguntaPublicaDto>> Quiz() => (await quiz.ActivasAsync()).Select(ServicioQuiz.APublica).ToList();

    [HttpPost("quiz/solicitudes")]
    [EnableRateLimiting("quiz")]
    [RequestSizeLimit(64 * 1024)]
    public async Task<IActionResult> Enviar(EnviarSolicitudDto dto)
    {
        // Un bot que rellena el campo oculto recibe la misma respuesta que una persona, pero no se guarda nada.
        if (!string.IsNullOrEmpty(dto.Sitio))
        {
            log.LogInformation("Solicitud descartada por campo trampa desde {Ip}", HttpContext.Connection.RemoteIpAddress);
            return StatusCode(StatusCodes.Status201Created, new { ok = true });
        }
        var s = await quiz.RecibirAsync(dto);
        log.LogInformation("Nueva solicitud {Id} de {Nombre}", s.Id, s.Nombre);
        return StatusCode(StatusCodes.Status201Created, new { ok = true });
    }
}
