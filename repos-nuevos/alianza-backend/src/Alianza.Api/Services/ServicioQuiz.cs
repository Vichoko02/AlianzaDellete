using System.Net.Mail;
using Alianza.Api.Data;
using Alianza.Api.Domain;
using Alianza.Api.Dtos;
using Microsoft.EntityFrameworkCore;

namespace Alianza.Api.Services;

/// <summary>Quiz "Postula tu proyecto" del sitio y las solicitudes que genera.</summary>
public class ServicioQuiz(AlianzaDbContext db)
{
    public const int MinPasos = 3;
    public const int MaxPasos = 5;

    public static readonly PreguntaQuiz[] PreguntasIniciales =
    [
        new() { Orden = 1, Tipo = TipoPregunta.Nombre, Texto = "¿Cómo te llamas?", Ayuda = "Tu nombre o el de tu estudio." },
        new() { Orden = 2, Tipo = TipoPregunta.Email, Texto = "¿A qué correo te escribimos?", Ayuda = "Solo lo usaremos para responder tu postulación." },
        new()
        {
            Orden = 3, Tipo = TipoPregunta.Opcion, Texto = "¿Qué tipo de proyecto tienes?",
            Opciones = ["Serie animada", "Cómic o webcomic", "Videojuego", "Música", "Doblaje / actuación de voz", "Otro"],
        },
        new()
        {
            Orden = 4, Tipo = TipoPregunta.Opcion, Texto = "¿En qué etapa está?",
            Opciones = ["Es una idea", "Preproducción", "En producción", "Ya está publicado"],
        },
        new()
        {
            Orden = 5, Tipo = TipoPregunta.TextoLargo, Texto = "Cuéntanos de tu proyecto",
            Ayuda = "¿De qué trata, qué apoyo buscas? Incluye enlaces a tu portafolio o redes.",
        },
    ];

    public async Task SembrarAsync()
    {
        if (await db.PreguntasQuiz.AnyAsync()) return;
        db.PreguntasQuiz.AddRange(PreguntasIniciales.Select(p => new PreguntaQuiz
            { Orden = p.Orden, Tipo = p.Tipo, Texto = p.Texto, Ayuda = p.Ayuda, Opciones = [.. p.Opciones], Requerida = true, Activa = true }));
        await db.SaveChangesAsync();
    }

    public Task<List<PreguntaQuiz>> ActivasAsync() =>
        db.PreguntasQuiz.AsNoTracking().Where(p => p.Activa).OrderBy(p => p.Orden).ToListAsync();

    public static PreguntaPublicaDto APublica(PreguntaQuiz p) => new(p.Id, p.Texto, p.Ayuda, p.Tipo, p.Opciones, p.Requerida);

    /// <summary>Valida las respuestas contra las preguntas activas y guarda la solicitud.</summary>
    public async Task<Solicitud> RecibirAsync(EnviarSolicitudDto dto)
    {
        var preguntas = await ActivasAsync();
        if (preguntas.Count == 0) throw new ErrorNegocio("El formulario no está disponible en este momento.");
        var respuestas = (dto.Respuestas ?? []).GroupBy(r => r.PreguntaId).ToDictionary(g => g.Key, g => g.First());
        if (respuestas.Keys.Any(id => preguntas.All(p => p.Id != id)))
            throw new ErrorNegocio("El formulario cambió mientras lo completabas. Recarga la página e inténtalo de nuevo.");

        var solicitud = new Solicitud();
        var orden = 0;
        foreach (var p in preguntas)
        {
            var valores = respuestas.TryGetValue(p.Id, out var r)
                ? (r.Valores ?? []).Select(v => (v ?? "").Trim()).Where(v => v.Length > 0).Distinct().ToList()
                : [];
            if (valores.Count == 0)
            {
                if (p.Requerida) throw new ErrorNegocio($"Falta responder: «{p.Texto}».");
                continue;
            }

            switch (p.Tipo)
            {
                case TipoPregunta.Opcion when valores.Count != 1 || !p.Opciones.Contains(valores[0]):
                case TipoPregunta.VariasOpciones when valores.Any(v => !p.Opciones.Contains(v)):
                    throw new ErrorNegocio($"Elige una opción válida en «{p.Texto}».");
                case TipoPregunta.Email when !EsEmail(valores[0]):
                    throw new ErrorNegocio("El correo no es válido.");
            }
            var limite = p.Tipo == TipoPregunta.TextoLargo ? 4000 : p.Tipo == TipoPregunta.Email ? 255 : 300;
            var texto = string.Join(", ", valores);
            if (texto.Length > limite) throw new ErrorNegocio($"La respuesta a «{p.Texto}» es demasiado larga (máximo {limite} caracteres).");

            if (p.Tipo == TipoPregunta.Nombre) solicitud.Nombre = texto[..Math.Min(texto.Length, 150)];
            if (p.Tipo == TipoPregunta.Email) solicitud.Email = texto;
            solicitud.Respuestas.Add(new RespuestaSolicitud { Orden = orden++, Pregunta = p.Texto, Respuesta = texto });
        }
        if (string.IsNullOrEmpty(solicitud.Nombre)) solicitud.Nombre = "Sin nombre";
        db.Solicitudes.Add(solicitud);
        await db.SaveChangesAsync();
        return solicitud;
    }

    private static bool EsEmail(string v) =>
        v.Length <= 255 && MailAddress.TryCreate(v, out var m) && m.Address == v && v.Contains('.');

    /// <summary>Reemplaza el quiz completo. Reglas: 3 a 5 pasos activos y un correo requerido para poder responder.</summary>
    public async Task GuardarAsync(List<PreguntaEdicionDto> lista)
    {
        var activas = lista.Where(p => p.Activa).ToList();
        if (activas.Count is < MinPasos or > MaxPasos)
            throw new ErrorNegocio($"El formulario debe tener entre {MinPasos} y {MaxPasos} pasos activos (tiene {activas.Count}).");
        if (!activas.Any(p => p.Tipo == TipoPregunta.Email && p.Requerida))
            throw new ErrorNegocio("Incluye una pregunta activa y obligatoria de tipo Correo, para poder responder a quien postula.");
        if (activas.Count(p => p.Tipo == TipoPregunta.Email) > 1 || activas.Count(p => p.Tipo == TipoPregunta.Nombre) > 1)
            throw new ErrorNegocio("Solo puede haber una pregunta de tipo Nombre y una de tipo Correo.");
        foreach (var p in lista.Where(p => p.Tipo is TipoPregunta.Opcion or TipoPregunta.VariasOpciones))
        {
            var opciones = Limpiar(p.Opciones);
            if (opciones.Count < 2) throw new ErrorNegocio($"«{p.Texto}» necesita al menos dos opciones.");
        }

        var actuales = await db.PreguntasQuiz.ToDictionaryAsync(p => p.Id);
        var conservadas = new HashSet<int>();
        for (var i = 0; i < lista.Count; i++)
        {
            var d = lista[i];
            var p = d.Id is { } id && actuales.TryGetValue(id, out var existente) ? existente : new PreguntaQuiz();
            if (p.Id == 0) db.PreguntasQuiz.Add(p); else conservadas.Add(p.Id);
            p.Orden = i + 1;
            p.Texto = d.Texto.Trim();
            p.Ayuda = d.Ayuda?.Trim() ?? "";
            p.Tipo = d.Tipo;
            p.Opciones = d.Tipo is TipoPregunta.Opcion or TipoPregunta.VariasOpciones ? Limpiar(d.Opciones) : [];
            p.Requerida = d.Requerida;
            p.Activa = d.Activa;
        }
        db.PreguntasQuiz.RemoveRange(actuales.Values.Where(p => !conservadas.Contains(p.Id)));
    }

    private static List<string> Limpiar(List<string>? opciones) =>
        (opciones ?? []).Select(o => o.Trim()).Where(o => o.Length > 0).Distinct().Take(12).ToList();
}
