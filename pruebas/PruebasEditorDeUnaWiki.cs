using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;

namespace Alianza.Pruebas;

/// <summary>Una cuenta administrativa que solo puede tocar una wiki (como la de Metrecalia) y sus idiomas.</summary>
public class PruebasEditorDeUnaWiki(ServidorDePrueba servidor) : IClassFixture<ServidorDePrueba>
{
    private static readonly byte[] PngMinimo = Convert.FromBase64String(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==");

    private static async Task<int> CrearWikiAsync(HttpClient yish, string identificador)
    {
        var estados = await yish.GetFromJsonAsync<JsonArray>("/api/panel/estados");
        var r = await yish.PostAsJsonAsync("/api/panel/series", new { identificador, nombre = identificador, sinopsis = "Sinopsis", estadoId = estados![0]!["id"]!.GetValue<int>(), orden = 1, publicada = true });
        r.EnsureSuccessStatusCode();
        return (await r.Content.ReadFromJsonAsync<JsonObject>())!["id"]!.GetValue<int>();
    }

    [Fact]
    public async Task CuentaDeMetrecalia_SoloTocaSuWikiYSusIdiomas()
    {
        var yish = await servidor.YishAsync();
        var metrecalia = await CrearWikiAsync(yish, "metrecalia-prueba");
        var otra = await CrearWikiAsync(yish, "otra-wiki");
        var socio = await yish.PostAsJsonAsync("/api/panel/socios", new { identificador = "julio-di-esto", nombre = "Julio di esto", descripcion = "d", orden = 1, publicado = true });
        socio.EnsureSuccessStatusCode();
        var idSocio = (await socio.Content.ReadFromJsonAsync<JsonObject>())!["id"]!.GetValue<int>();

        // 1. Yish crea la cuenta con permiso solo sobre la wiki de Metrecalia.
        (await yish.PostAsJsonAsync("/api/panel/usuarios", new { nombreUsuario = "metrecalia", nombreVisible = "Equipo Metrecalia",
            contrasena = ServidorDePrueba.ContrasenaComun, permisos = new[] { new { area = "Wikis", serieId = metrecalia } } })).EnsureSuccessStatusCode();
        var editor = await servidor.ConSesionAsync("metrecalia");

        // 2. Sube la imagen alternativa y agrega al equipo a Julio López, marcado como socio (Julio di esto).
        var subida = await editor.PostAsync("/api/panel/medios", new MultipartFormDataContent { { new ByteArrayContent(PngMinimo), "archivos", "julio-di-esto.png" } });
        Assert.Equal(HttpStatusCode.OK, subida.StatusCode);
        var imagenAlternativa = (await subida.Content.ReadFromJsonAsync<JsonArray>())![0]!["id"]!.GetValue<string>();
        var elegibles = await editor.GetFromJsonAsync<JsonArray>("/api/panel/series/socios-para-elegir");
        Assert.Contains(elegibles!, s => s!["id"]!.GetValue<int>() == idSocio);

        var wiki = await editor.GetFromJsonAsync<JsonObject>($"/api/panel/series/{metrecalia}");
        wiki!["equipo"] = new JsonArray(new JsonObject
        {
            ["categoria"] = "Actores de Voz",
            ["miembros"] = new JsonArray(new JsonObject
            {
                ["nombre"] = "Julio López", ["rol"] = "Loriner Gatherson", ["socioId"] = idSocio, ["imagenAlternativaId"] = imagenAlternativa,
            }),
        });
        Assert.Equal(HttpStatusCode.OK, (await editor.PutAsJsonAsync($"/api/panel/series/{metrecalia}", wiki)).StatusCode);

        // 3. El sitio muestra al miembro como socio, con su imagen alternativa.
        var publica = await servidor.Cliente().GetFromJsonAsync<JsonObject>("/api/series/metrecalia-prueba");
        var julio = publica!["equipo"]![0]!["miembros"]![0]!;
        Assert.Equal("julio-di-esto", julio["socio"]!.GetValue<string>());
        Assert.Equal($"/api/medios/{imagenAlternativa}", julio["imagenAlternativa"]!.GetValue<string>());

        // 4. Cambia los idiomas de su wiki.
        Assert.Equal(HttpStatusCode.OK, (await editor.PutAsJsonAsync($"/api/panel/idiomas/series/{metrecalia}",
            new[] { new { codigo = "en", automatica = false } })).StatusCode);

        // 5. Lo que NO puede hacer: otra wiki, crear wikis, socios, usuarios, textos o idiomas del sitio, seguridad.
        Assert.Equal(HttpStatusCode.Forbidden, (await editor.GetAsync($"/api/panel/series/{otra}")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await editor.PutAsJsonAsync($"/api/panel/idiomas/series/{otra}", new[] { new { codigo = "en", automatica = false } })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await editor.PostAsJsonAsync("/api/panel/series", new { identificador = "nueva", nombre = "x", estadoId = 1, orden = 1 })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await editor.DeleteAsync($"/api/panel/series/{metrecalia}")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await editor.GetAsync("/api/panel/socios")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await editor.GetAsync("/api/panel/usuarios")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await editor.PutAsJsonAsync("/api/panel/sitio", Array.Empty<object>())).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await editor.GetAsync("/api/panel/idiomas/sitio")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await editor.GetAsync("/api/panel/seguridad/resumen")).StatusCode);
        Assert.Single((await editor.GetFromJsonAsync<JsonArray>("/api/panel/series"))!);
    }

    [Fact]
    public async Task MiembroSocio_SinImagenAlternativaUsaLaDelSocio_YSiElSocioNoEstaPublicadoNoSeMuestra()
    {
        var yish = await servidor.YishAsync();
        var serie = await CrearWikiAsync(yish, "wiki-socios");
        var subida = await yish.PostAsync("/api/panel/medios", new MultipartFormDataContent { { new ByteArrayContent(PngMinimo), "archivos", "socio.png" } });
        var imagenSocio = (await subida.Content.ReadFromJsonAsync<JsonArray>())![0]!["id"]!.GetValue<string>();
        var r = await yish.PostAsJsonAsync("/api/panel/socios", new { identificador = "socio-oculto", nombre = "Socio", orden = 1, publicado = true, imagenId = imagenSocio });
        var idSocio = (await r.Content.ReadFromJsonAsync<JsonObject>())!["id"]!.GetValue<int>();
        var wiki = await yish.GetFromJsonAsync<JsonObject>($"/api/panel/series/{serie}");
        wiki!["equipo"] = JsonNode.Parse($$"""[{ "categoria": "Arte", "miembros": [{ "nombre": "Ana", "rol": "Arte", "socioId": {{idSocio}} }] }]""");
        (await yish.PutAsJsonAsync($"/api/panel/series/{serie}", wiki)).EnsureSuccessStatusCode();

        // 1. Sin imagen alternativa propia, se usa la del socio.
        var ana = (await servidor.Cliente().GetFromJsonAsync<JsonObject>("/api/series/wiki-socios"))!["equipo"]![0]!["miembros"]![0]!;
        Assert.Equal($"/api/medios/{imagenSocio}", ana["imagenAlternativa"]!.GetValue<string>());

        // 2. Si el socio se oculta, el miembro sigue en el equipo pero ya no figura como socio.
        var socio = await yish.GetFromJsonAsync<JsonObject>($"/api/panel/socios/{idSocio}");
        socio!["publicado"] = false;
        (await yish.PutAsJsonAsync($"/api/panel/socios/{idSocio}", socio)).EnsureSuccessStatusCode();
        ana = (await servidor.Cliente().GetFromJsonAsync<JsonObject>("/api/series/wiki-socios"))!["equipo"]![0]!["miembros"]![0]!;
        Assert.Null(ana["socio"]);
        Assert.Null(ana["imagenAlternativa"]);

        // 3. Un socio que no existe se rechaza.
        wiki = await yish.GetFromJsonAsync<JsonObject>($"/api/panel/series/{serie}");
        wiki!["equipo"]![0]!["miembros"]![0]!["socioId"] = 99999;
        Assert.Equal(HttpStatusCode.BadRequest, (await yish.PutAsJsonAsync($"/api/panel/series/{serie}", wiki)).StatusCode);
    }
}
