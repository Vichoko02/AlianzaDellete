using System.Collections.Concurrent;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using System.Threading.Channels;
using Alianza.Servidor.Datos;
using Alianza.Servidor.Seguridad;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Alianza.Servidor.Modulos;

// Idiomas del sitio. El español es el idioma original; los demás se agregan desde el panel:
// - para todo el sitio (permiso Sitio) o para una wiki en particular (quien puede editarla), y cada uno puede ser
//   de traducción automática (DeepL, en segundo plano) o manual.
// - Las traducciones viven en una memoria común: cada texto se traduce una vez por idioma y se reutiliza.
// - Lo traducido queda guardado: si DeepL no responde, el sitio sigue mostrando lo que ya tenía (o el original).
// Orden: 1) formatos y catálogo  2) servicio de traducción  3) trabajador DeepL  4) idiomas por ámbito  5) rutas del panel.

// ─── 1. Formatos y catálogo ───────────────────────────────────────────────────

public record IdiomaDelCatalogo(string Codigo, string Nombre, bool Automatica);

public record IdiomaPublico(string Codigo, string Nombre);

public record IdiomaConfigurado(string Codigo, string Nombre, bool Automatica);

public record DatosIdioma(string Codigo, bool Automatica);

public record IdiomasDeWiki(List<IdiomaConfigurado> Propios, List<IdiomaConfigurado> DelSitio);

public record CatalogoIdiomas(List<IdiomaDelCatalogo> Idiomas, bool AutomaticaDisponible);

public record TextoTraducible(string Huella, string Original, string? Texto, bool Manual);

public record DatosTraduccion(string Original, string? Texto);

public record ResultadoTraducir(int Encolados);

public static class CatalogoDeIdiomas
{
    /// <summary>Código del sitio → (nombre, código de DeepL o null si DeepL no lo traduce: solo manual).</summary>
    public static readonly Dictionary<string, (string Nombre, string? DeepL)> Todos = new()
    {
        ["en"] = ("English", "EN-US"), ["pt-BR"] = ("Português (Brasil)", "PT-BR"), ["pt"] = ("Português", "PT-PT"),
        ["fr"] = ("Français", "FR"), ["de"] = ("Deutsch", "DE"), ["it"] = ("Italiano", "IT"), ["nl"] = ("Nederlands", "NL"),
        ["pl"] = ("Polski", "PL"), ["sv"] = ("Svenska", "SV"), ["da"] = ("Dansk", "DA"), ["fi"] = ("Suomi", "FI"),
        ["el"] = ("Ελληνικά", "EL"), ["cs"] = ("Čeština", "CS"), ["ro"] = ("Română", "RO"), ["hu"] = ("Magyar", "HU"),
        ["bg"] = ("Български", "BG"), ["sk"] = ("Slovenčina", "SK"), ["sl"] = ("Slovenščina", "SL"), ["et"] = ("Eesti", "ET"),
        ["lv"] = ("Latviešu", "LV"), ["lt"] = ("Lietuvių", "LT"), ["ja"] = ("日本語", "JA"), ["ko"] = ("한국어", "KO"),
        ["zh"] = ("中文", "ZH-HANS"), ["uk"] = ("Українська", "UK"), ["tr"] = ("Türkçe", "TR"), ["id"] = ("Bahasa Indonesia", "ID"),
        ["nb"] = ("Norsk", "NB"), ["ar"] = ("العربية", "AR"),
        // Sin traducción automática: solo manual.
        ["arn"] = ("Mapudungun", null), ["qu"] = ("Runa Simi (Quechua)", null), ["gn"] = ("Avañe'ẽ (Guaraní)", null),
        ["ay"] = ("Aymar aru", null), ["ca"] = ("Català", null), ["eu"] = ("Euskara", null), ["gl"] = ("Galego", null),
    };

    public static string Nombre(string codigo) => Todos.TryGetValue(codigo, out var i) ? i.Nombre : codigo;
}

// ─── 2. Servicio de traducción (memoria común, en memoria del servidor) ───────

/// <summary>Sección "Traduccion": la clave de DeepL activa la traducción automática.</summary>
public class ConfiguracionTraduccion
{
    public const string Seccion = "Traduccion";
    /// <summary>Clave de la API de DeepL. Las del plan gratuito terminan en ":fx". Vacía = solo traducción manual.</summary>
    public string ClaveDeepL { get; set; } = "";
    /// <summary>Dirección de la API. Vacía = se elige sola según la clave (gratuita o de pago).</summary>
    public string Url { get; set; } = "";
}

public class ServicioTraduccion(IServiceScopeFactory alcances, IOptions<ConfiguracionTraduccion> opciones, ILogger<ServicioTraduccion> registro)
{
    /// <summary>Propiedades (en el JSON público) cuyos textos se traducen. Nombres propios, enlaces e identificadores no.</summary>
    private static readonly HashSet<string> Traducibles = ["sinopsis", "descripcion", "rol", "categoria", "textoAlternativo", "texto", "ayuda", "etiqueta", "etiquetas"];
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private readonly ConcurrentDictionary<(string Idioma, string Huella), string> memoria = new();
    private readonly ConcurrentDictionary<(string Idioma, string Huella), byte> pendientes = new();

    public Channel<(string Idioma, string Original)> Cola { get; } =
        Channel.CreateBounded<(string, string)>(new BoundedChannelOptions(20000) { FullMode = BoundedChannelFullMode.DropWrite });

    public bool AutomaticaDisponible => !string.IsNullOrWhiteSpace(opciones.Value.ClaveDeepL);

    public static string Huella(string texto) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(texto.Trim()))).ToLowerInvariant();

    public async Task CargarAsync()
    {
        using var alcance = alcances.CreateScope();
        var bd = alcance.ServiceProvider.GetRequiredService<BaseDeDatos>();
        await foreach (var t in bd.Traducciones.AsNoTracking().Select(t => new { t.Idioma, t.Huella, t.Texto }).AsAsyncEnumerable())
            memoria[(t.Idioma, t.Huella)] = t.Texto;
        registro.LogInformation("{Cantidad} traducciones cargadas en memoria", memoria.Count);
    }

    public string? Buscar(string idioma, string original) => memoria.TryGetValue((idioma, Huella(original)), out var t) ? t : null;

    public void Recordar(string idioma, string huella, string? texto)
    {
        if (texto is null) memoria.TryRemove((idioma, huella), out _); else memoria[(idioma, huella)] = texto;
    }

    /// <summary>Pide la traducción automática de un texto (una sola vez aunque lo pidan muchos visitantes).</summary>
    public bool Encolar(string idioma, string original)
    {
        if (!AutomaticaDisponible || CatalogoDeIdiomas.Todos.GetValueOrDefault(idioma).DeepL is null) return false;
        if (!pendientes.TryAdd((idioma, Huella(original)), 0)) return false;
        return Cola.Writer.TryWrite((idioma, original));
    }

    public void Terminado(string idioma, string original) => pendientes.TryRemove((idioma, Huella(original)), out _);

    /// <summary>Convierte una respuesta pública a JSON (como la ve el sitio).</summary>
    public static JsonNode AJson(object respuesta) => JsonSerializer.SerializeToNode(respuesta, Json)!;

    /// <summary>
    /// Traduce un JSON público: reemplaza cada texto traducible por su traducción si existe.
    /// Si falta y el idioma es automático, la pide en segundo plano (mientras tanto se muestra el original).
    /// </summary>
    public JsonNode Traducir(JsonNode original, string idioma, bool automatica)
    {
        var copia = original.DeepClone();
        Recorrer(copia, null, (texto) =>
        {
            var traduccion = Buscar(idioma, texto);
            if (traduccion is null && automatica) Encolar(idioma, texto);
            return traduccion;
        });
        return copia;
    }

    /// <summary>Todos los textos traducibles de un JSON público (para el editor de traducciones del panel).</summary>
    public static List<string> Textos(JsonNode json)
    {
        var textos = new List<string>();
        Recorrer(json.DeepClone(), null, (texto) => { textos.Add(texto); return null; });
        return textos.Distinct().ToList();
    }

    /// <summary>Recorre el JSON y aplica <paramref name="cambiar"/> a cada texto traducible (devuelve null para dejarlo igual).</summary>
    private static void Recorrer(JsonNode? nodo, string? propiedad, Func<string, string?> cambiar)
    {
        switch (nodo)
        {
            case JsonObject objeto:
                foreach (var (clave, valor) in objeto.ToList())
                {
                    // Los textos generales del sitio ("textos") se traducen todos; el nombre de un estado también.
                    var traducir = Traducibles.Contains(clave) || propiedad == "textos" || (propiedad == "estado" && clave == "nombre");
                    if (traducir && valor is JsonValue v && v.TryGetValue<string>(out var texto) && EsTraducible(texto))
                        objeto[clave] = cambiar(texto) ?? texto;
                    else Recorrer(valor, clave, cambiar);
                }
                break;
            case JsonArray arreglo:
                for (var i = 0; i < arreglo.Count; i++)
                {
                    if (propiedad == "etiquetas" && arreglo[i] is JsonValue v && v.TryGetValue<string>(out var texto) && EsTraducible(texto))
                        arreglo[i] = cambiar(texto) ?? texto;
                    else Recorrer(arreglo[i], propiedad, cambiar);
                }
                break;
        }
    }

    /// <summary>Se traduce lo que tiene letras y no es una dirección (enlaces, rutas de imágenes).</summary>
    private static bool EsTraducible(string texto) =>
        texto.Any(char.IsLetter) && !texto.StartsWith("http", StringComparison.OrdinalIgnoreCase) && !texto.StartsWith('/');
}

// ─── 3. Trabajador: traducción automática con DeepL, en lotes y en segundo plano ─

public class TrabajadorTraduccion(ServicioTraduccion traduccion, CachePublica cache, IHttpClientFactory clientes, IServiceScopeFactory alcances,
    IOptions<ConfiguracionTraduccion> opciones, ILogger<TrabajadorTraduccion> registro) : BackgroundService
{
    private record RespuestaDeepL(List<TraduccionDeepL> Translations);
    private record TraduccionDeepL(string Text);

    protected override async Task ExecuteAsync(CancellationToken detener)
    {
        var lote = new List<(string Idioma, string Original)>();
        await traduccion.CargarAsync();

        while (await traduccion.Cola.Reader.WaitToReadAsync(detener))
        {
            // 1. Juntar lo pendiente (esperando un momento a que lleguen más textos) y agrupar por idioma.
            await Task.Delay(TimeSpan.FromSeconds(1), detener);
            while (lote.Count < 500 && traduccion.Cola.Reader.TryRead(out var pedido)) lote.Add(pedido);

            // 2. Traducir de a 50 textos por idioma y guardar.
            foreach (var grupo in lote.GroupBy(p => p.Idioma))
                foreach (var parte in grupo.Select(p => p.Original).Chunk(50))
                {
                    try { await TraducirAsync(grupo.Key, parte, detener); }
                    catch (Exception e) when (e is not OperationCanceledException)
                    {
                        registro.LogWarning(e, "DeepL no tradujo {Cantidad} textos al {Idioma}; se reintentará cuando alguien los vuelva a pedir", parte.Length, grupo.Key);
                    }
                    finally { foreach (var texto in parte) traduccion.Terminado(grupo.Key, texto); }
                }
            lote.Clear();
            cache.Vaciar();
        }
    }

    private async Task TraducirAsync(string idioma, string[] textos, CancellationToken detener)
    {
        var config = opciones.Value;
        var url = string.IsNullOrWhiteSpace(config.Url)
            ? (config.ClaveDeepL.EndsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com")
            : config.Url.TrimEnd('/');
        var cliente = clientes.CreateClient("deepl");
        using var pedido = new HttpRequestMessage(HttpMethod.Post, $"{url}/v2/translate")
        {
            // Con largo conocido (no por partes): algunas APIs y proxies no aceptan cuerpos sin Content-Length.
            Content = new StringContent(JsonSerializer.Serialize(new { text = textos, source_lang = "ES", target_lang = CatalogoDeIdiomas.Todos[idioma].DeepL, preserve_formatting = true }),
                Encoding.UTF8, "application/json"),
        };
        pedido.Headers.TryAddWithoutValidation("Authorization", $"DeepL-Auth-Key {config.ClaveDeepL}");

        // 1. Pedir la traducción.
        using var respuesta = await cliente.SendAsync(pedido, detener);
        if ((int)respuesta.StatusCode == 456) { registro.LogError("DeepL: se agotó la cuota mensual de caracteres"); return; }
        respuesta.EnsureSuccessStatusCode();
        var datos = await respuesta.Content.ReadFromJsonAsync<RespuestaDeepL>(cancellationToken: detener);
        if (datos is null || datos.Translations.Count != textos.Length) return;

        // 2. Guardar (sin pisar las traducciones manuales) y dejarlas en memoria.
        using var alcance = alcances.CreateScope();
        var bd = alcance.ServiceProvider.GetRequiredService<BaseDeDatos>();
        for (var i = 0; i < textos.Length; i++)
        {
            var huella = ServicioTraduccion.Huella(textos[i]);
            var existente = await bd.Traducciones.FindAsync([idioma, huella], detener);
            if (existente is { Manual: true }) continue;
            if (existente is null) bd.Traducciones.Add(existente = new Traduccion { Idioma = idioma, Huella = huella, Original = textos[i].Trim() });
            existente.Texto = datos.Translations[i].Text;
            existente.ActualizadaEn = DateTime.UtcNow;
            traduccion.Recordar(idioma, huella, existente.Texto);
        }
        await bd.SaveChangesAsync(detener);
        registro.LogInformation("DeepL tradujo {Cantidad} textos al {Idioma}", textos.Length, idioma);
    }
}

// ─── 4. Idiomas por ámbito (sitio completo o una wiki) ────────────────────────

public class ServicioIdiomas(BaseDeDatos bd, ServicioTraduccion traduccion)
{
    public async Task<List<IdiomaConfigurado>> DelSitioAsync() =>
        (await bd.IdiomasOfrecidos.AsNoTracking().Where(i => i.SerieId == null).OrderBy(i => i.Id).ToListAsync())
            .Select(i => new IdiomaConfigurado(i.Codigo, CatalogoDeIdiomas.Nombre(i.Codigo), i.Automatica)).ToList();

    public async Task<List<IdiomaConfigurado>> DeLaWikiAsync(int serieId) =>
        (await bd.IdiomasOfrecidos.AsNoTracking().Where(i => i.SerieId == serieId).OrderBy(i => i.Id).ToListAsync())
            .Select(i => new IdiomaConfigurado(i.Codigo, CatalogoDeIdiomas.Nombre(i.Codigo), i.Automatica)).ToList();

    /// <summary>Idiomas que muestra una wiki: los del sitio más los propios (los propios mandan sobre el modo).</summary>
    public async Task<List<IdiomaConfigurado>> EfectivosDeLaWikiAsync(int serieId)
    {
        var propios = await DeLaWikiAsync(serieId);
        return propios.Concat((await DelSitioAsync()).Where(s => propios.All(p => p.Codigo != s.Codigo))).ToList();
    }

    /// <summary>Reemplaza los idiomas de un ámbito (null = sitio) y pide la traducción automática de lo que falte.</summary>
    public async Task GuardarAsync(int? serieId, List<DatosIdioma> idiomas)
    {
        var desconocido = idiomas.FirstOrDefault(i => !CatalogoDeIdiomas.Todos.ContainsKey(i.Codigo));
        if (desconocido is not null) throw new ErrorDeNegocio($"Idioma desconocido: {desconocido.Codigo}.");
        if (idiomas.Any(i => i.Automatica && CatalogoDeIdiomas.Todos[i.Codigo].DeepL is null))
            throw new ErrorDeNegocio("Alguno de los idiomas no tiene traducción automática: márcalo como manual.");
        if (idiomas.Select(i => i.Codigo).Distinct().Count() != idiomas.Count) throw new ErrorDeNegocio("Hay idiomas repetidos.");

        bd.IdiomasOfrecidos.RemoveRange(await bd.IdiomasOfrecidos.Where(i => i.SerieId == serieId).ToListAsync());
        bd.IdiomasOfrecidos.AddRange(idiomas.Select(i => new IdiomaOfrecido { SerieId = serieId, Codigo = i.Codigo, Automatica = i.Automatica }));
    }

    public async Task<List<TextoTraducible>> TextosAsync(JsonNode fuente, string idioma)
    {
        var textos = ServicioTraduccion.Textos(fuente);
        var huellas = textos.Select(ServicioTraduccion.Huella).ToList();
        var guardadas = await bd.Traducciones.AsNoTracking().Where(t => t.Idioma == idioma && huellas.Contains(t.Huella)).ToDictionaryAsync(t => t.Huella);
        return textos.Select(t =>
        {
            var huella = ServicioTraduccion.Huella(t);
            return guardadas.TryGetValue(huella, out var g) ? new TextoTraducible(huella, t, g.Texto, g.Manual) : new TextoTraducible(huella, t, null, false);
        }).ToList();
    }

    /// <summary>Guarda traducciones manuales. Solo acepta textos que pertenecen a la fuente (el ámbito que la persona puede editar).</summary>
    public async Task<int> GuardarTraduccionesAsync(JsonNode fuente, string idioma, List<DatosTraduccion> datos)
    {
        var permitidos = ServicioTraduccion.Textos(fuente).Select(t => t.Trim()).ToHashSet();
        var cambiados = 0;
        foreach (var d in datos)
        {
            var original = d.Original.Trim();
            if (!permitidos.Contains(original)) throw new ErrorDeNegocio("Uno de los textos no pertenece a lo que puedes traducir.");
            var huella = ServicioTraduccion.Huella(original);
            var existente = await bd.Traducciones.FindAsync(idioma, huella);
            var texto = d.Texto?.Trim();

            // Vacía = se borra la traducción (vuelve el original, o la automática si el idioma lo es).
            if (string.IsNullOrEmpty(texto))
            {
                if (existente is not null) { bd.Traducciones.Remove(existente); traduccion.Recordar(idioma, huella, null); cambiados++; }
                continue;
            }
            if (existente is { Manual: true } && existente.Texto == texto) continue;
            if (existente is null) bd.Traducciones.Add(existente = new Traduccion { Idioma = idioma, Huella = huella, Original = original });
            existente.Texto = texto;
            existente.Manual = true;
            existente.ActualizadaEn = DateTime.UtcNow;
            traduccion.Recordar(idioma, huella, texto);
            cambiados++;
        }
        return cambiados;
    }

    public int EncolarFaltantes(JsonNode fuente, string idioma) =>
        ServicioTraduccion.Textos(fuente).Count(t => traduccion.Buscar(idioma, t) is null && traduccion.Encolar(idioma, t));
}

// ─── 5. Rutas del panel ───────────────────────────────────────────────────────

[ApiController]
[Authorize]
[Route("api/panel/idiomas")]
public class RutasIdiomasPanel(BaseDeDatos bd, ServicioIdiomas idiomas, ServicioTraduccion traduccion, ServicioSitio sitio, ServicioSeries series,
    ServicioSocios socios, ServicioPostulaciones postulaciones, UsuarioActual actual, Auditoria auditoria, CachePublica cache) : ControllerBase
{
    [HttpGet("catalogo")]
    public CatalogoIdiomas Catalogo() => new(
        CatalogoDeIdiomas.Todos.Select(i => new IdiomaDelCatalogo(i.Key, i.Value.Nombre, i.Value.DeepL is not null)).OrderBy(i => i.Nombre).ToList(),
        traduccion.AutomaticaDisponible);

    // 5.1 Sitio completo (permiso Sitio)

    [HttpGet("sitio")]
    [RequierePermiso(AreaPermiso.Sitio)]
    public Task<List<IdiomaConfigurado>> DelSitio() => idiomas.DelSitioAsync();

    [HttpPut("sitio")]
    [RequierePermiso(AreaPermiso.Sitio)]
    public async Task<List<IdiomaConfigurado>> GuardarDelSitio(List<DatosIdioma> datos)
    {
        await idiomas.GuardarAsync(null, datos);
        await auditoria.RegistrarAsync("idiomas", "sitio", string.Join(", ", datos.Select(d => $"{d.Codigo}{(d.Automatica ? " (auto)" : "")}")));
        await bd.SaveChangesAsync();
        foreach (var d in datos.Where(d => d.Automatica)) idiomas.EncolarFaltantes(await FuenteSitioAsync(), d.Codigo);
        return await idiomas.DelSitioAsync();
    }

    [HttpGet("sitio/traducciones")]
    [RequierePermiso(AreaPermiso.Sitio)]
    public async Task<List<TextoTraducible>> TraduccionesDelSitio([FromQuery] string idioma) => await idiomas.TextosAsync(await FuenteSitioAsync(), Idioma(idioma));

    [HttpPut("sitio/traducciones")]
    [RequierePermiso(AreaPermiso.Sitio)]
    public async Task<IActionResult> GuardarTraduccionesDelSitio([FromQuery] string idioma, List<DatosTraduccion> datos)
    {
        var cambiados = await idiomas.GuardarTraduccionesAsync(await FuenteSitioAsync(), Idioma(idioma), datos);
        await auditoria.RegistrarAsync("traducir", "sitio", $"{cambiados} textos al {idioma}");
        await bd.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("sitio/traducir")]
    [RequierePermiso(AreaPermiso.Sitio)]
    public async Task<ResultadoTraducir> TraducirSitio([FromQuery] string idioma) => new(idiomas.EncolarFaltantes(await FuenteSitioAsync(), Idioma(idioma)));

    // 5.2 Una wiki (quien puede editarla)

    [HttpGet("series/{id:int}")]
    public async Task<IdiomasDeWiki> DeLaWiki(int id)
    {
        await ExigirWikiAsync(id);
        return new IdiomasDeWiki(await idiomas.DeLaWikiAsync(id), await idiomas.DelSitioAsync());
    }

    [HttpPut("series/{id:int}")]
    public async Task<IdiomasDeWiki> GuardarDeLaWiki(int id, List<DatosIdioma> datos)
    {
        await ExigirWikiAsync(id);
        await idiomas.GuardarAsync(id, datos);
        await auditoria.RegistrarAsync("idiomas", "serie", $"{id}: {string.Join(", ", datos.Select(d => d.Codigo))}");
        await bd.SaveChangesAsync();
        foreach (var d in datos.Where(d => d.Automatica)) idiomas.EncolarFaltantes(await FuenteWikiAsync(id), d.Codigo);
        return new IdiomasDeWiki(await idiomas.DeLaWikiAsync(id), await idiomas.DelSitioAsync());
    }

    [HttpGet("series/{id:int}/traducciones")]
    public async Task<List<TextoTraducible>> TraduccionesDeLaWiki(int id, [FromQuery] string idioma)
    {
        await ExigirWikiAsync(id);
        return await idiomas.TextosAsync(await FuenteWikiAsync(id), Idioma(idioma));
    }

    [HttpPut("series/{id:int}/traducciones")]
    public async Task<IActionResult> GuardarTraduccionesDeLaWiki(int id, [FromQuery] string idioma, List<DatosTraduccion> datos)
    {
        await ExigirWikiAsync(id);
        var cambiados = await idiomas.GuardarTraduccionesAsync(await FuenteWikiAsync(id), Idioma(idioma), datos);
        await auditoria.RegistrarAsync("traducir", "serie", $"{id}: {cambiados} textos al {idioma}");
        await bd.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("series/{id:int}/traducir")]
    public async Task<ResultadoTraducir> TraducirWiki(int id, [FromQuery] string idioma)
    {
        await ExigirWikiAsync(id);
        return new(idiomas.EncolarFaltantes(await FuenteWikiAsync(id), Idioma(idioma)));
    }

    // 5.3 Ayudas

    private static string Idioma(string codigo) =>
        CatalogoDeIdiomas.Todos.ContainsKey(codigo) ? codigo : throw new ErrorDeNegocio("Idioma desconocido.");

    private async Task ExigirWikiAsync(int id)
    {
        if (!await bd.Series.AnyAsync(s => s.Id == id)) throw new ErrorDeNegocio("La wiki no existe.", StatusCodes.Status404NotFound);
        if (!await actual.PuedeEditarSerieAsync(id)) throw new ErrorDeNegocio("No tienes permiso sobre esta wiki.", StatusCodes.Status403Forbidden);
    }

    /// <summary>Textos del sitio que se traducen en el ámbito "sitio": portada, socios, estados y formulario.</summary>
    private async Task<JsonNode> FuenteSitioAsync() => new JsonArray(
        ServicioTraduccion.AJson(await sitio.PublicoAsync(series, socios)),
        ServicioTraduccion.AJson(await postulaciones.PublicasAsync()));

    private async Task<JsonNode> FuenteWikiAsync(int id)
    {
        var serie = await series.ConTodo().AsNoTracking().FirstAsync(s => s.Id == id);
        var wiki = await series.APublicaAsync(serie);
        // Los socios de la wiki y el estado se traducen con el sitio.
        return ServicioTraduccion.AJson(wiki with { Socios = [] });
    }
}
