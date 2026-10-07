using System.ComponentModel.DataAnnotations;
using System.Net.Mail;
using Alianza.Servidor.Datos;
using Alianza.Servidor.Seguridad;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace Alianza.Servidor.Modulos;

// Formulario «Postula tu proyecto» y las postulaciones que llegan por él.
// 1) Formatos  2) Lógica (preguntas iniciales, recibir y validar, editar el formulario)
// 3) Rutas públicas  4) Rutas del panel (solo superadmin).

// ─── 1. Formatos ──────────────────────────────────────────────────────────────

public record PreguntaPublica(int Id, string Texto, string Ayuda, TipoPregunta Tipo, List<string> Opciones, bool Obligatoria);

public record DatosRespuesta(int PreguntaId, List<string>? Valores);

/// <summary>Sitio: campo trampa para bots; las personas lo dejan vacío porque no se ve.</summary>
public record DatosPostulacion(List<DatosRespuesta>? Respuestas, string? Sitio);

public record PreguntaEditable(
    int? Id,
    [Required, MaxLength(300)] string Texto,
    [MaxLength(500)] string? Ayuda,
    TipoPregunta Tipo,
    List<string>? Opciones,
    bool Obligatoria,
    bool Activa);

public record PostulacionEnLista(long Id, DateTime RecibidaEn, string Nombre, string Correo, EstadoPostulacion Estado, string Resumen);

public record RespuestaPublica(string Pregunta, string Valor);

public record PostulacionCompleta(long Id, DateTime RecibidaEn, string Nombre, string Correo, EstadoPostulacion Estado, List<RespuestaPublica> Respuestas);

public record DatosEstadoPostulacion(EstadoPostulacion Estado);

public record Pendientes(int Nuevas, long? UltimaId, string? UltimoNombre);

// ─── 2. Lógica ────────────────────────────────────────────────────────────────

public class ServicioPostulaciones(BaseDeDatos bd)
{
    public const int MinimoPasos = 3;
    public const int MaximoPasos = 5;

    public static readonly Pregunta[] PreguntasIniciales =
    [
        new() { Orden = 1, Tipo = TipoPregunta.Nombre, Texto = "¿Cómo te llamas?", Ayuda = "Tu nombre o el de tu estudio." },
        new() { Orden = 2, Tipo = TipoPregunta.Correo, Texto = "¿A qué correo te escribimos?", Ayuda = "Solo lo usaremos para responder tu postulación." },
        new()
        {
            Orden = 3, Tipo = TipoPregunta.Opcion, Texto = "¿Qué tipo de proyecto tienes?",
            Opciones = ["Serie animada", "Cómic o webcomic", "Videojuego", "Música", "Doblaje / actuación de voz", "Otro"],
        },
        new() { Orden = 4, Tipo = TipoPregunta.Opcion, Texto = "¿En qué etapa está?", Opciones = ["Es una idea", "Preproducción", "En producción", "Ya está publicado"] },
        new()
        {
            Orden = 5, Tipo = TipoPregunta.TextoLargo, Texto = "Cuéntanos de tu proyecto",
            Ayuda = "¿De qué trata, qué apoyo buscas? Incluye enlaces a tu portafolio o redes.",
        },
    ];

    public async Task SembrarAsync()
    {
        if (await bd.Preguntas.AnyAsync()) return;
        bd.Preguntas.AddRange(PreguntasIniciales.Select(p => new Pregunta
            { Orden = p.Orden, Tipo = p.Tipo, Texto = p.Texto, Ayuda = p.Ayuda, Opciones = [.. p.Opciones] }));
        await bd.SaveChangesAsync();
    }

    public Task<List<Pregunta>> ActivasAsync() => bd.Preguntas.AsNoTracking().Where(p => p.Activa).OrderBy(p => p.Orden).ToListAsync();

    /// <summary>Valida las respuestas contra las preguntas activas y guarda la postulación.</summary>
    public async Task<Postulacion> RecibirAsync(DatosPostulacion datos)
    {
        var preguntas = await ActivasAsync();
        var respuestas = (datos.Respuestas ?? []).GroupBy(r => r.PreguntaId).ToDictionary(g => g.Key, g => g.First());
        var postulacion = new Postulacion();
        var orden = 0;

        // 1. El formulario debe existir y las respuestas deben ser de sus preguntas.
        if (preguntas.Count == 0) throw new ErrorDeNegocio("El formulario no está disponible en este momento.");
        if (respuestas.Keys.Any(id => preguntas.All(p => p.Id != id)))
            throw new ErrorDeNegocio("El formulario cambió mientras lo completabas. Recarga la página e inténtalo de nuevo.");

        // 2. Cada pregunta, en orden: obligatoria, opción válida, correo válido, largo máximo.
        foreach (var pregunta in preguntas)
        {
            var valores = respuestas.TryGetValue(pregunta.Id, out var respuesta)
                ? (respuesta.Valores ?? []).Select(v => (v ?? "").Trim()).Where(v => v.Length > 0).Distinct().ToList()
                : [];
            var limite = pregunta.Tipo switch { TipoPregunta.TextoLargo => 4000, TipoPregunta.Correo => 255, _ => 300 };
            string texto;

            if (valores.Count == 0)
            {
                if (pregunta.Obligatoria) throw new ErrorDeNegocio($"Falta responder: «{pregunta.Texto}».");
                continue;
            }
            switch (pregunta.Tipo)
            {
                case TipoPregunta.Opcion when valores.Count != 1 || !pregunta.Opciones.Contains(valores[0]):
                case TipoPregunta.VariasOpciones when valores.Any(v => !pregunta.Opciones.Contains(v)):
                    throw new ErrorDeNegocio($"Elige una opción válida en «{pregunta.Texto}».");
                case TipoPregunta.Correo when !EsCorreo(valores[0]):
                    throw new ErrorDeNegocio("El correo no es válido.");
            }
            texto = string.Join(", ", valores);
            if (texto.Length > limite) throw new ErrorDeNegocio($"La respuesta a «{pregunta.Texto}» es demasiado larga (máximo {limite} caracteres).");

            if (pregunta.Tipo == TipoPregunta.Nombre) postulacion.Nombre = texto;
            if (pregunta.Tipo == TipoPregunta.Correo) postulacion.Correo = texto;
            postulacion.Respuestas.Add(new Respuesta { Orden = orden++, Pregunta = pregunta.Texto, Valor = texto });
        }

        // 3. Guardar.
        if (string.IsNullOrEmpty(postulacion.Nombre)) postulacion.Nombre = "Sin nombre";
        bd.Postulaciones.Add(postulacion);
        await bd.SaveChangesAsync();
        return postulacion;
    }

    /// <summary>Reemplaza el formulario completo. Reglas: de 3 a 5 pasos activos y un correo obligatorio.</summary>
    public async Task GuardarFormularioAsync(List<PreguntaEditable> lista)
    {
        var activas = lista.Where(p => p.Activa).ToList();
        var actuales = await bd.Preguntas.ToDictionaryAsync(p => p.Id);
        var conservadas = new HashSet<int>();

        // 1. Reglas.
        if (activas.Count is < MinimoPasos or > MaximoPasos)
            throw new ErrorDeNegocio($"El formulario debe tener entre {MinimoPasos} y {MaximoPasos} pasos activos (tiene {activas.Count}).");
        if (!activas.Any(p => p.Tipo == TipoPregunta.Correo && p.Obligatoria))
            throw new ErrorDeNegocio("Incluye una pregunta activa y obligatoria de tipo Correo, para poder responder a quien postula.");
        if (activas.Count(p => p.Tipo == TipoPregunta.Correo) > 1 || activas.Count(p => p.Tipo == TipoPregunta.Nombre) > 1)
            throw new ErrorDeNegocio("Solo puede haber una pregunta de tipo Nombre y una de tipo Correo.");
        foreach (var p in lista.Where(p => p.Tipo is TipoPregunta.Opcion or TipoPregunta.VariasOpciones))
            if (Limpiar(p.Opciones).Count < 2) throw new ErrorDeNegocio($"«{p.Texto}» necesita al menos dos opciones.");

        // 2. Actualizar las existentes y agregar las nuevas, en el orden recibido.
        for (var i = 0; i < lista.Count; i++)
        {
            var datos = lista[i];
            var pregunta = datos.Id is { } id && actuales.TryGetValue(id, out var existente) ? existente : new Pregunta();
            if (pregunta.Id == 0) bd.Preguntas.Add(pregunta); else conservadas.Add(pregunta.Id);
            pregunta.Orden = i + 1;
            pregunta.Texto = datos.Texto.Trim();
            pregunta.Ayuda = datos.Ayuda?.Trim() ?? "";
            pregunta.Tipo = datos.Tipo;
            pregunta.Opciones = datos.Tipo is TipoPregunta.Opcion or TipoPregunta.VariasOpciones ? Limpiar(datos.Opciones) : [];
            pregunta.Obligatoria = datos.Obligatoria;
            pregunta.Activa = datos.Activa;
        }

        // 3. Borrar las que ya no vienen.
        bd.Preguntas.RemoveRange(actuales.Values.Where(p => !conservadas.Contains(p.Id)));
    }

    private static bool EsCorreo(string valor) =>
        valor.Length <= 255 && MailAddress.TryCreate(valor, out var correo) && correo.Address == valor && valor.Contains('.');

    private static List<string> Limpiar(List<string>? opciones) =>
        (opciones ?? []).Select(o => o.Trim()).Where(o => o.Length > 0).Distinct().Take(12).ToList();
}

// ─── 3. Rutas públicas ────────────────────────────────────────────────────────

[ApiController]
[Route("api/formulario")]
public class RutasFormulario(ServicioPostulaciones postulaciones, CachePublica cache, ServicioProteccion proteccion, ILogger<RutasFormulario> registro) : ControllerBase
{
    [HttpGet]
    public Task<List<PreguntaPublica>> Preguntas() => cache.ObtenerAsync("formulario", async () =>
        (await postulaciones.ActivasAsync()).Select(p => new PreguntaPublica(p.Id, p.Texto, p.Ayuda, p.Tipo, p.Opciones, p.Obligatoria)).ToList());

    [HttpPost("postulaciones")]
    [EnableRateLimiting("postulaciones")]
    [RequestSizeLimit(64 * 1024)]
    public async Task<IActionResult> Enviar(DatosPostulacion datos)
    {
        Postulacion postulacion;
        // Un bot que rellena el campo oculto recibe la misma respuesta que una persona, pero no se guarda nada.
        if (!string.IsNullOrEmpty(datos.Sitio))
        {
            registro.LogInformation("Postulación descartada por el campo trampa desde {Ip}", HttpContext.Connection.RemoteIpAddress);
            proteccion.Registrar(TipoEvento.BotDetectado, ServicioProteccion.IpDe(HttpContext), Request.Path, "Rellenó el campo trampa del formulario");
            return StatusCode(StatusCodes.Status201Created, new { recibida = true });
        }
        postulacion = await postulaciones.RecibirAsync(datos);
        registro.LogInformation("Nueva postulación {Id} de {Nombre}", postulacion.Id, postulacion.Nombre);
        return StatusCode(StatusCodes.Status201Created, new { recibida = true });
    }
}

// ─── 4. Rutas del panel (solo superadmin) ─────────────────────────────────────

[ApiController]
[Authorize(Policy = Politicas.Superadmin)]
[Route("api/panel")]
public class RutasPostulacionesPanel(BaseDeDatos bd, ServicioPostulaciones postulaciones, Auditoria auditoria) : ControllerBase
{
    [HttpGet("formulario")]
    public Task<List<PreguntaEditable>> Formulario() =>
        bd.Preguntas.AsNoTracking().OrderBy(p => p.Orden)
            .Select(p => new PreguntaEditable(p.Id, p.Texto, p.Ayuda, p.Tipo, p.Opciones, p.Obligatoria, p.Activa)).ToListAsync();

    [HttpPut("formulario")]
    public async Task<List<PreguntaEditable>> GuardarFormulario(List<PreguntaEditable> preguntas)
    {
        await postulaciones.GuardarFormularioAsync(preguntas);
        await auditoria.RegistrarAsync("editar", "formulario", $"{preguntas.Count(p => p.Activa)} paso(s) activo(s)");
        await bd.SaveChangesAsync();
        return await Formulario();
    }

    /// <summary>Sin estado: la bandeja (nuevas y leídas). Con estado: solo ese.</summary>
    [HttpGet("postulaciones")]
    public async Task<Pagina<PostulacionEnLista>> Listar([FromQuery] EstadoPostulacion? estado, [FromQuery] int pagina = 1, [FromQuery] int tamano = 30)
    {
        IQueryable<Postulacion> consulta = bd.Postulaciones.AsNoTracking();
        int total;
        tamano = Math.Clamp(tamano, 1, 100);
        pagina = Math.Max(pagina, 1);

        consulta = estado is { } filtro ? consulta.Where(p => p.Estado == filtro) : consulta.Where(p => p.Estado != EstadoPostulacion.Archivada);
        total = await consulta.CountAsync();
        var elementos = await consulta.OrderByDescending(p => p.RecibidaEn).Skip((pagina - 1) * tamano).Take(tamano)
            .Select(p => new
            {
                p.Id, p.RecibidaEn, p.Nombre, p.Correo, p.Estado,
                // La respuesta más larga suele ser la descripción del proyecto: sirve de resumen.
                Resumen = p.Respuestas.OrderByDescending(r => r.Valor.Length).Select(r => r.Valor).FirstOrDefault() ?? "",
            }).ToListAsync();
        return new Pagina<PostulacionEnLista>(elementos.Select(p => new PostulacionEnLista(
            p.Id, p.RecibidaEn, p.Nombre, p.Correo, p.Estado, p.Resumen.Length > 140 ? p.Resumen[..140] + "…" : p.Resumen)).ToList(), total, pagina, tamano);
    }

    /// <summary>Contador del panel y aviso de postulaciones nuevas (el panel lo consulta cada 30 segundos).</summary>
    [HttpGet("postulaciones/pendientes")]
    public async Task<Pendientes> Pendientes()
    {
        var nuevas = bd.Postulaciones.AsNoTracking().Where(p => p.Estado == EstadoPostulacion.Nueva);
        var ultima = await nuevas.OrderByDescending(p => p.Id).Select(p => new { p.Id, p.Nombre }).FirstOrDefaultAsync();
        return new Pendientes(await nuevas.CountAsync(), ultima?.Id, ultima?.Nombre);
    }

    /// <summary>Detalle. Abrir una postulación nueva la marca como leída.</summary>
    [HttpGet("postulaciones/{id:long}")]
    public async Task<ActionResult<PostulacionCompleta>> Obtener(long id)
    {
        var postulacion = await bd.Postulaciones.Include(p => p.Respuestas).FirstOrDefaultAsync(p => p.Id == id);
        if (postulacion is null) return NotFound();
        if (postulacion.Estado == EstadoPostulacion.Nueva)
        {
            postulacion.Estado = EstadoPostulacion.Leida;
            await bd.SaveChangesAsync();
        }
        return new PostulacionCompleta(postulacion.Id, postulacion.RecibidaEn, postulacion.Nombre, postulacion.Correo, postulacion.Estado,
            postulacion.Respuestas.OrderBy(r => r.Orden).Select(r => new RespuestaPublica(r.Pregunta, r.Valor)).ToList());
    }

    [HttpPatch("postulaciones/{id:long}/estado")]
    public async Task<IActionResult> CambiarEstado(long id, DatosEstadoPostulacion datos)
    {
        var postulacion = await bd.Postulaciones.FindAsync(id);
        if (postulacion is null) return NotFound();
        postulacion.Estado = datos.Estado;
        await bd.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("postulaciones/{id:long}")]
    public async Task<IActionResult> Eliminar(long id)
    {
        var postulacion = await bd.Postulaciones.FindAsync(id);
        if (postulacion is null) return NotFound();
        bd.Postulaciones.Remove(postulacion);
        await auditoria.RegistrarAsync("eliminar", "postulación", $"{postulacion.Nombre} <{postulacion.Correo}>");
        await bd.SaveChangesAsync();
        return NoContent();
    }
}
