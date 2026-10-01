using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;

namespace Alianza.Api.Tests;

public class ApiTests(FabricaApi api) : IClassFixture<FabricaApi>
{
    private static readonly byte[] PngMinimo = Convert.FromBase64String(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==");

    private static object Wiki(string slug, int estadoId, object? extra = null) => new
    {
        slug, nombre = $"Serie {slug}", sinopsis = "Sinopsis", estadoId, orden = 1, publicada = true,
        redes = extra ?? Array.Empty<object>(),
    };

    private async Task<int> EstadoIdAsync(HttpClient c, string codigo)
    {
        var estados = await c.GetFromJsonAsync<JsonArray>("/api/admin/estados");
        return estados!.First(e => e!["codigo"]!.GetValue<string>() == codigo)!["id"]!.GetValue<int>();
    }

    private async Task<int> CrearWikiAsync(HttpClient c, string slug, string estado = "en-produccion")
    {
        var r = await c.PostAsJsonAsync("/api/admin/series", Wiki(slug, await EstadoIdAsync(c, estado)));
        Assert.Equal(HttpStatusCode.Created, r.StatusCode);
        return (await r.Content.ReadFromJsonAsync<JsonObject>())!["id"]!.GetValue<int>();
    }

    private async Task<int> CrearUsuarioAsync(HttpClient admin, string username, bool puedeCrearWikis = false, object[]? permisos = null)
    {
        var r = await admin.PostAsJsonAsync("/api/admin/usuarios", new
        {
            username, nombreVisible = username, password = "ClaveSegura123", puedeCrearWikis,
            permisos = permisos ?? [],
        }, Json.Opciones);
        Assert.Equal(HttpStatusCode.Created, r.StatusCode);
        return (await r.Content.ReadFromJsonAsync<JsonObject>())!["id"]!.GetValue<int>();
    }

    [Fact]
    public async Task Login_ConCredencialesIncorrectas_Devuelve401()
    {
        var c = api.CreateClient();
        var r = await c.PostAsJsonAsync("/api/auth/login", new { username = FabricaApi.AdminUser, password = "mala" });
        Assert.Equal(HttpStatusCode.Unauthorized, r.StatusCode);
        r = await c.PostAsJsonAsync("/api/auth/login", new { username = "noexiste", password = "mala" });
        Assert.Equal(HttpStatusCode.Unauthorized, r.StatusCode);
    }

    [Fact]
    public async Task Login_NoDistingueMayusculasEnElUsuario()
    {
        var c = await api.ClienteAsync("yishadmin", FabricaApi.AdminPass);
        var yo = await c.GetFromJsonAsync<JsonObject>("/api/auth/yo");
        Assert.True(yo!["esSuperAdmin"]!.GetValue<bool>());
    }

    [Fact]
    public async Task Panel_SinSesion_Devuelve401()
    {
        var r = await api.CreateClient().GetAsync("/api/admin/series");
        Assert.Equal(HttpStatusCode.Unauthorized, r.StatusCode);
    }

    [Fact]
    public async Task EstadoDeLaSerie_VieneDeLaBaseDeDatos()
    {
        var admin = await api.AdminAsync();
        var id = await CrearWikiAsync(admin, "estado-bd");
        var publico = api.CreateClient();

        var wiki = await publico.GetFromJsonAsync<JsonObject>("/api/series/estado-bd");
        Assert.Equal("En Producción", wiki!["estado"]!.GetValue<string>());

        var cancelado = await EstadoIdAsync(admin, "cancelado");
        (await admin.PatchAsJsonAsync($"/api/admin/series/{id}/estado", new { estadoId = cancelado })).EnsureSuccessStatusCode();

        wiki = await publico.GetFromJsonAsync<JsonObject>("/api/series/estado-bd");
        Assert.Equal("Cancelado", wiki!["estado"]!.GetValue<string>());
        Assert.Equal("cancelado", wiki["estadoInfo"]!["codigo"]!.GetValue<string>());

        var tarjetas = await publico.GetFromJsonAsync<JsonArray>("/api/series?estado=cancelado");
        Assert.Contains(tarjetas!, t => t!["id"]!.GetValue<string>() == "estado-bd");
    }

    [Fact]
    public async Task SoloElSuperAdmin_PuedeGestionarUsuarios()
    {
        var admin = await api.AdminAsync();
        await CrearUsuarioAsync(admin, "editor-sin-poder", permisos: [new { ambito = "Socios" }]);
        var editor = await api.ClienteAsync("editor-sin-poder", "ClaveSegura123");

        var r = await editor.PostAsJsonAsync("/api/admin/usuarios", new { username = "otro", nombreVisible = "x", password = "ClaveSegura123" });
        Assert.Equal(HttpStatusCode.Forbidden, r.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await editor.GetAsync("/api/admin/usuarios")).StatusCode);
    }

    [Fact]
    public async Task CrearWikis_RequiereElBoolQueActivaElSuperAdmin()
    {
        var admin = await api.AdminAsync();
        var uid = await CrearUsuarioAsync(admin, "creador");
        var creador = await api.ClienteAsync("creador", "ClaveSegura123");
        var estado = await EstadoIdAsync(admin, "pronto");

        var r = await creador.PostAsJsonAsync("/api/admin/series", Wiki("sin-permiso", estado));
        Assert.Equal(HttpStatusCode.Forbidden, r.StatusCode);

        (await admin.PutAsJsonAsync($"/api/admin/usuarios/{uid}",
            new { nombreVisible = "creador", activo = true, puedeCrearWikis = true })).EnsureSuccessStatusCode();

        r = await creador.PostAsJsonAsync("/api/admin/series", Wiki("con-permiso", estado));
        Assert.Equal(HttpStatusCode.Created, r.StatusCode);
        var id = (await r.Content.ReadFromJsonAsync<JsonObject>())!["id"]!.GetValue<int>();

        // Quien crea la wiki puede editarla, pero no eliminarla (solo superadmin).
        var dto = await creador.GetFromJsonAsync<JsonObject>($"/api/admin/series/{id}");
        dto!["nombre"] = "Renombrada";
        Assert.Equal(HttpStatusCode.OK, (await creador.PutAsJsonAsync($"/api/admin/series/{id}", dto)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await creador.DeleteAsync($"/api/admin/series/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await admin.DeleteAsync($"/api/admin/series/{id}")).StatusCode);
    }

    [Fact]
    public async Task PermisoPorWiki_NoPermiteEditarOtras()
    {
        var admin = await api.AdminAsync();
        var a = await CrearWikiAsync(admin, "wiki-a");
        var b = await CrearWikiAsync(admin, "wiki-b");
        await CrearUsuarioAsync(admin, "editor-a", permisos: [new { ambito = "Wikis", serieId = a }]);
        var editor = await api.ClienteAsync("editor-a", "ClaveSegura123");

        var lista = await editor.GetFromJsonAsync<JsonArray>("/api/admin/series");
        Assert.Single(lista!);
        Assert.Equal(HttpStatusCode.OK, (await editor.GetAsync($"/api/admin/series/{a}")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await editor.GetAsync($"/api/admin/series/{b}")).StatusCode);

        var dtoB = await admin.GetFromJsonAsync<JsonObject>($"/api/admin/series/{b}");
        Assert.Equal(HttpStatusCode.Forbidden, (await editor.PutAsJsonAsync($"/api/admin/series/{b}", dtoB)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await editor.GetAsync("/api/admin/socios")).StatusCode);
    }

    [Fact]
    public async Task SuperAdmin_NoSePuedeDesactivarNiEliminarNiDuplicar()
    {
        var admin = await api.AdminAsync();
        var usuarios = await admin.GetFromJsonAsync<JsonArray>("/api/admin/usuarios");
        var yish = usuarios!.First(u => u!["esSuperAdmin"]!.GetValue<bool>())!["id"]!.GetValue<int>();

        Assert.Equal(HttpStatusCode.BadRequest, (await admin.DeleteAsync($"/api/admin/usuarios/{yish}")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PutAsJsonAsync($"/api/admin/usuarios/{yish}",
            new { nombreVisible = "Yish", activo = false, puedeCrearWikis = true })).StatusCode);

        // Aunque se envíe esSuperAdmin, el usuario nuevo nunca lo es.
        var r = await admin.PostAsJsonAsync("/api/admin/usuarios",
            new { username = "intruso", nombreVisible = "x", password = "ClaveSegura123", esSuperAdmin = true });
        var creado = await r.Content.ReadFromJsonAsync<JsonObject>();
        Assert.False(creado!["esSuperAdmin"]!.GetValue<bool>());
    }

    [Fact]
    public async Task DesactivarUsuario_RevocaSuToken()
    {
        var admin = await api.AdminAsync();
        var id = await CrearUsuarioAsync(admin, "temporal");
        var temporal = await api.ClienteAsync("temporal", "ClaveSegura123");
        Assert.Equal(HttpStatusCode.OK, (await temporal.GetAsync("/api/auth/yo")).StatusCode);

        (await admin.PutAsJsonAsync($"/api/admin/usuarios/{id}", new { nombreVisible = "temporal", activo = false, puedeCrearWikis = false }))
            .EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Unauthorized, (await temporal.GetAsync("/api/auth/yo")).StatusCode);
    }

    [Fact]
    public async Task Medios_SeGuardanEnLaBdYValidanElContenido()
    {
        var admin = await api.AdminAsync();
        var form = new MultipartFormDataContent { { new ByteArrayContent(PngMinimo), "archivos", "punto.png" } };
        var r = await admin.PostAsync("/api/admin/medios", form);
        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var url = (await r.Content.ReadFromJsonAsync<JsonArray>())![0]!["url"]!.GetValue<string>();

        var descarga = await api.CreateClient().GetAsync(url);
        Assert.Equal("image/png", descarga.Content.Headers.ContentType!.MediaType);
        Assert.Equal(PngMinimo, await descarga.Content.ReadAsByteArrayAsync());

        var falso = new MultipartFormDataContent { { new ByteArrayContent("<script>alert(1)</script>"u8.ToArray()), "archivos", "falso.png" } };
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsync("/api/admin/medios", falso)).StatusCode);
    }

    [Fact]
    public async Task EnlacesJavascript_SonRechazados()
    {
        var admin = await api.AdminAsync();
        var estado = await EstadoIdAsync(admin, "en-emision");
        var r = await admin.PostAsJsonAsync("/api/admin/series",
            Wiki("xss", estado, new[] { new { plataforma = "youtube", url = "javascript:alert(1)" } }));
        Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
    }

    [Fact]
    public async Task EstadoEnUso_NoSePuedeEliminar()
    {
        var admin = await api.AdminAsync();
        await CrearWikiAsync(admin, "usa-estado", "finalizado");
        var id = await EstadoIdAsync(admin, "finalizado");
        Assert.Equal(HttpStatusCode.Conflict, (await admin.DeleteAsync($"/api/admin/estados/{id}")).StatusCode);
    }

    [Fact]
    public async Task Socios_SeVinculanALasWikis()
    {
        var admin = await api.AdminAsync();
        var serie = await CrearWikiAsync(admin, "con-socio");
        var r = await admin.PostAsJsonAsync("/api/admin/socios", new
        {
            slug = "socio-prueba", nombre = "Socio Prueba", descripcion = "d", orden = 1, publicado = true,
            redes = new[] { new { plataforma = "twitch", url = "https://twitch.tv/x" } }, serieIds = new[] { serie },
        });
        Assert.Equal(HttpStatusCode.Created, r.StatusCode);

        var socios = await api.CreateClient().GetFromJsonAsync<JsonArray>("/api/socios");
        var socio = socios!.First(s => s!["id"]!.GetValue<string>() == "socio-prueba")!;
        Assert.Equal("/wiki/con-socio", socio["proyectos"]![0]!["enlace"]!.GetValue<string>());
        Assert.Equal("https://twitch.tv/x", socio["redes"]!["twitch"]!.GetValue<string>());
    }

    [Fact]
    public async Task EdicionConcurrente_DevuelveConflicto()
    {
        var admin = await api.AdminAsync();
        var id = await CrearWikiAsync(admin, "concurrente");
        var copiaA = await admin.GetFromJsonAsync<JsonObject>($"/api/admin/series/{id}");
        var copiaB = await admin.GetFromJsonAsync<JsonObject>($"/api/admin/series/{id}");

        copiaA!["nombre"] = "Cambio A";
        Assert.Equal(HttpStatusCode.OK, (await admin.PutAsJsonAsync($"/api/admin/series/{id}", copiaA)).StatusCode);
        copiaB!["nombre"] = "Cambio B";
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PutAsJsonAsync($"/api/admin/series/{id}", copiaB)).StatusCode);
    }
}
