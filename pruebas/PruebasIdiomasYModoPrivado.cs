using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;

namespace Alianza.Pruebas;

public class PruebasModoPrivado(ServidorDePrueba servidor) : IClassFixture<ServidorDePrueba>
{
    [Fact]
    public async Task ModoPrivado_SoloLasIpsDeLaListaVenElSitio()
    {
        var yish = await servidor.YishAsync();
        var invitado = servidor.Cliente("10.50.3.3");
        var extrano = servidor.Cliente("10.60.0.1");
        HttpResponseMessage respuesta;

        // 1. No se puede activar con la lista vacía (nadie podría ver el sitio).
        respuesta = await yish.PutAsJsonAsync("/api/panel/seguridad/privado", new { activo = true });
        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);

        // 2. Se agrega una red y se activa.
        (await yish.PostAsJsonAsync("/api/panel/seguridad/privado/ips", new { red = "10.50.0.0/16", nota = "Equipo" })).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.BadRequest, (await yish.PostAsJsonAsync("/api/panel/seguridad/privado/ips", new { red = "no-es-ip" })).StatusCode);
        (await yish.PutAsJsonAsync("/api/panel/seguridad/privado", new { activo = true })).EnsureSuccessStatusCode();

        // 3. La red de la lista entra; el resto ve "privado" (también las imágenes y el formulario).
        Assert.Equal(HttpStatusCode.OK, (await invitado.GetAsync("/api/sitio")).StatusCode);
        respuesta = await extrano.GetAsync("/api/sitio");
        Assert.Equal(HttpStatusCode.Forbidden, respuesta.StatusCode);
        Assert.True((await respuesta.Content.ReadFromJsonAsync<JsonObject>())!["privado"]!.GetValue<bool>());
        Assert.Equal(HttpStatusCode.Forbidden, (await extrano.GetAsync("/api/formulario")).StatusCode);

        // 4. El panel sigue accesible desde cualquier IP (para poder apagarlo).
        Assert.Equal(HttpStatusCode.Unauthorized, (await extrano.PostAsJsonAsync("/api/sesion/iniciar", new { nombreUsuario = "x", contrasena = "y" })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await yish.GetAsync("/api/panel/seguridad/privado")).StatusCode);

        // 5. No se puede quitar la última IP con el modo activo; al desactivarlo, todos vuelven a entrar.
        var estado = await yish.GetFromJsonAsync<JsonObject>("/api/panel/seguridad/privado");
        var id = estado!["ips"]![0]!["id"]!.GetValue<int>();
        Assert.Equal(HttpStatusCode.BadRequest, (await yish.DeleteAsync($"/api/panel/seguridad/privado/ips/{id}")).StatusCode);
        (await yish.PutAsJsonAsync("/api/panel/seguridad/privado", new { activo = false })).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.OK, (await extrano.GetAsync("/api/sitio")).StatusCode);
    }

    [Fact]
    public async Task ModoPrivado_SoloLoManejaYish()
    {
        var yish = await servidor.YishAsync();
        (await yish.PostAsJsonAsync("/api/panel/usuarios", new { nombreUsuario = "editor-privado", nombreVisible = "x",
            contrasena = ServidorDePrueba.ContrasenaComun, permisos = new[] { new { area = "Sitio" } } })).EnsureSuccessStatusCode();
        var editor = await servidor.ConSesionAsync("editor-privado");

        Assert.Equal(HttpStatusCode.Forbidden, (await editor.PutAsJsonAsync("/api/panel/seguridad/privado", new { activo = false })).StatusCode);
    }
}

public class PruebasIdiomas(ServidorDePrueba servidor) : IClassFixture<ServidorDePrueba>
{
    private const string Eslogan = "Apoyando talentos con inspiración por medio de la colaboración.";

    /// <summary>La traducción automática ocurre en segundo plano: se reintenta hasta 5 s.</summary>
    private static async Task<JsonNode> EsperarAsync(HttpClient cliente, string ruta, Func<JsonNode, bool> listo)
    {
        JsonNode? json = null;
        for (var i = 0; i < 25; i++)
        {
            json = await cliente.GetFromJsonAsync<JsonNode>(ruta);
            if (listo(json!)) return json!;
            await Task.Delay(200);
        }
        return json!;
    }

    private static async Task<int> CrearWikiAsync(HttpClient yish, string identificador, string sinopsis)
    {
        var estados = await yish.GetFromJsonAsync<JsonArray>("/api/panel/estados");
        var respuesta = await yish.PostAsJsonAsync("/api/panel/series", new
        {
            identificador, nombre = identificador, sinopsis, estadoId = estados![0]!["id"]!.GetValue<int>(), orden = 1, publicada = true,
        });
        respuesta.EnsureSuccessStatusCode();
        return (await respuesta.Content.ReadFromJsonAsync<JsonObject>())!["id"]!.GetValue<int>();
    }

    [Fact]
    public async Task IdiomaDelSitio_AutomaticoYCorregidoAMano()
    {
        var yish = await servidor.YishAsync();
        var visitante = servidor.Cliente();
        JsonNode sitio;

        // 1. Yish agrega inglés automático: el sitio en inglés se traduce solo (primero llega el original, luego la traducción).
        (await yish.PutAsJsonAsync("/api/panel/idiomas/sitio", new[] { new { codigo = "en", automatica = true } })).EnsureSuccessStatusCode();
        sitio = await EsperarAsync(visitante, "/api/sitio?idioma=en", s => s["textos"]!["inicio.hero.eslogan"]!.GetValue<string>().StartsWith("[EN-US]"));
        Assert.Equal($"[EN-US] {Eslogan}", sitio["textos"]!["inicio.hero.eslogan"]!.GetValue<string>());
        Assert.Contains(sitio["idiomas"]!.AsArray(), i => i!["codigo"]!.GetValue<string>() == "en");

        // 2. Sin idioma (o uno que no se ofrece) sigue en español.
        Assert.Equal(Eslogan, (await visitante.GetFromJsonAsync<JsonNode>("/api/sitio"))!["textos"]!["inicio.hero.eslogan"]!.GetValue<string>());
        Assert.Equal(Eslogan, (await visitante.GetFromJsonAsync<JsonNode>("/api/sitio?idioma=fr"))!["textos"]!["inicio.hero.eslogan"]!.GetValue<string>());

        // 3. Una corrección manual reemplaza a la automática y la traducción automática ya no la pisa.
        (await yish.PutAsJsonAsync("/api/panel/idiomas/sitio/traducciones?idioma=en",
            new[] { new { original = Eslogan, texto = "Supporting talent through collaboration." } })).EnsureSuccessStatusCode();
        (await yish.PostAsync("/api/panel/idiomas/sitio/traducir?idioma=en", null)).EnsureSuccessStatusCode();
        await Task.Delay(1500);
        sitio = (await visitante.GetFromJsonAsync<JsonNode>("/api/sitio?idioma=en"))!;
        Assert.Equal("Supporting talent through collaboration.", sitio["textos"]!["inicio.hero.eslogan"]!.GetValue<string>());
        var textos = await yish.GetFromJsonAsync<JsonArray>("/api/panel/idiomas/sitio/traducciones?idioma=en");
        Assert.True(textos!.First(t => t!["original"]!.GetValue<string>() == Eslogan)!["manual"]!.GetValue<bool>());

        // 4. Un idioma sin traducción automática solo puede ser manual.
        Assert.Equal(HttpStatusCode.BadRequest,
            (await yish.PutAsJsonAsync("/api/panel/idiomas/sitio", new[] { new { codigo = "arn", automatica = true } })).StatusCode);
    }

    [Fact]
    public async Task IdiomasDeUnaWiki_LosDecideQuienLaEdita()
    {
        var yish = await servidor.YishAsync();
        var propia = await CrearWikiAsync(yish, "wiki-idiomas", "Una historia de la Alianza.");
        var ajena = await CrearWikiAsync(yish, "wiki-ajena", "Otra historia.");
        (await yish.PostAsJsonAsync("/api/panel/usuarios", new { nombreUsuario = "autora", nombreVisible = "Autora",
            contrasena = ServidorDePrueba.ContrasenaComun, permisos = new[] { new { area = "Wikis", serieId = propia } } })).EnsureSuccessStatusCode();
        var autora = await servidor.ConSesionAsync("autora");
        JsonNode wiki;

        // 1. La autora agrega francés manual a su wiki y traduce la sinopsis.
        (await autora.PutAsJsonAsync($"/api/panel/idiomas/series/{propia}", new[] { new { codigo = "fr", automatica = false } })).EnsureSuccessStatusCode();
        (await autora.PutAsJsonAsync($"/api/panel/idiomas/series/{propia}/traducciones?idioma=fr",
            new[] { new { original = "Una historia de la Alianza.", texto = "Une histoire de l'Alliance." } })).EnsureSuccessStatusCode();
        wiki = (await servidor.Cliente().GetFromJsonAsync<JsonNode>("/api/series/wiki-idiomas?idioma=fr"))!;
        Assert.Equal("Une histoire de l'Alliance.", wiki["sinopsis"]!.GetValue<string>());
        Assert.Contains(wiki["idiomas"]!.AsArray(), i => i!["codigo"]!.GetValue<string>() == "fr");

        // 2. Al ser manual, lo que no tradujo queda en español (no se llama a DeepL por eso).
        Assert.Equal("Una historia de la Alianza.", (await servidor.Cliente().GetFromJsonAsync<JsonNode>("/api/series/wiki-idiomas"))!["sinopsis"]!.GetValue<string>());

        // 3. No puede tocar los idiomas de otra wiki ni traducir textos que no son de la suya.
        Assert.Equal(HttpStatusCode.Forbidden,
            (await autora.PutAsJsonAsync($"/api/panel/idiomas/series/{ajena}", new[] { new { codigo = "fr", automatica = false } })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await autora.PutAsJsonAsync($"/api/panel/idiomas/series/{propia}/traducciones?idioma=fr",
            new[] { new { original = "Otra historia.", texto = "Une autre histoire." } })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await autora.GetAsync("/api/panel/idiomas/sitio")).StatusCode);
    }

    [Fact]
    public async Task Formulario_SeTraduceYSigueRecibiendoLasOpcionesOriginales()
    {
        var yish = await servidor.YishAsync();
        var visitante = servidor.Cliente();
        (await yish.PutAsJsonAsync("/api/panel/idiomas/sitio", new[] { new { codigo = "en", automatica = true } })).EnsureSuccessStatusCode();

        // 1. Las etiquetas llegan traducidas; las opciones (lo que se envía) siguen en español.
        var preguntas = (await EsperarAsync(visitante, "/api/formulario?idioma=en",
            p => p.AsArray().All(x => x!["texto"]!.GetValue<string>().StartsWith("[EN-US]")))).AsArray();
        var conOpciones = preguntas.First(p => p!["opciones"]!.AsArray().Count > 0)!;
        Assert.StartsWith("[EN-US]", conOpciones["etiquetas"]![0]!.GetValue<string>());
        Assert.DoesNotContain("[EN-US]", conOpciones["opciones"]![0]!.GetValue<string>());

        // 2. Se envía con los valores originales y el servidor lo acepta.
        var respuestas = preguntas.Select(p => (object)new
        {
            preguntaId = p!["id"]!.GetValue<int>(),
            valores = new[]
            {
                p["tipo"]!.GetValue<string>() switch
                {
                    "Correo" => "visitor@example.com",
                    "Opcion" or "VariasOpciones" => p["opciones"]![0]!.GetValue<string>(),
                    _ => "An animated series",
                },
            },
        }).ToList();
        Assert.Equal(HttpStatusCode.Created, (await visitante.PostAsJsonAsync("/api/formulario/postulaciones", new { respuestas })).StatusCode);
    }
}

public class PruebasDeteccionDeIdioma(ServidorDePrueba servidor) : IClassFixture<ServidorDePrueba>
{
    /// <summary>Idioma con que responde el servidor a un navegador con esa cabecera Accept-Language.</summary>
    private async Task<string> IdiomaParaAsync(string? navegador, string ruta = "/api/sitio")
    {
        var cliente = servidor.Cliente();
        if (navegador is not null) cliente.DefaultRequestHeaders.Add("Accept-Language", navegador);
        return (await cliente.GetFromJsonAsync<JsonNode>(ruta))!["idioma"]!.GetValue<string>();
    }

    [Theory]
    [InlineData(null, "es")]                     // sin preferencia: español, el idioma principal
    [InlineData("es-CL,es;q=0.9,en;q=0.8", "es")] // prefiere español aunque también hable inglés
    [InlineData("en-US,en;q=0.9", "en")]
    [InlineData("pt-PT,pt;q=0.9", "pt-BR")]      // portugués de Portugal → el portugués que se ofrece
    [InlineData("fr-CA", "fr")]
    [InlineData("de-DE,de;q=0.9", "de")]
    [InlineData("ja-JP,ja;q=0.9,en;q=0.5", "en")] // japonés no se ofrece: su siguiente preferencia
    [InlineData("ja-JP,zh;q=0.8", "es")]         // ninguno se ofrece: español
    public async Task DetectaElIdiomaDelNavegador(string? navegador, string esperado) =>
        Assert.Equal(esperado, await IdiomaParaAsync(navegador));

    [Fact]
    public async Task LaEleccionDelVisitanteMandaSobreElNavegador()
    {
        Assert.Equal("es", await IdiomaParaAsync("en-US", "/api/sitio?idioma=es"));
        Assert.Equal("de", await IdiomaParaAsync("en-US", "/api/sitio?idioma=de"));
    }

    [Fact]
    public async Task LaWikiTambienDetecta()
    {
        var yish = await servidor.YishAsync();
        var estados = await yish.GetFromJsonAsync<JsonArray>("/api/panel/estados");
        (await yish.PostAsJsonAsync("/api/panel/series", new { identificador = "deteccion", nombre = "Detección", sinopsis = "Hola",
            estadoId = estados![0]!["id"]!.GetValue<int>(), orden = 1, publicada = true })).EnsureSuccessStatusCode();

        Assert.Equal("de", await IdiomaParaAsync("de-AT", "/api/series/deteccion"));
        var respuesta = await servidor.Cliente().GetAsync("/api/series/deteccion");
        Assert.Contains("Accept-Language", respuesta.Headers.Vary);
    }
}
