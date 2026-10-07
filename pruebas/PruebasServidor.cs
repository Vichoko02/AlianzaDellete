using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;

namespace Alianza.Pruebas;

public class PruebasServidor(ServidorDePrueba servidor) : IClassFixture<ServidorDePrueba>
{
    private static readonly byte[] PngMinimo = Convert.FromBase64String(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==");

    // ─── Ayudas ───────────────────────────────────────────────────────────────

    private static object Wiki(string identificador, int estadoId, object? redes = null) => new
    {
        identificador, nombre = $"Serie {identificador}", sinopsis = "Sinopsis", estadoId, orden = 1, publicada = true,
        redes = redes ?? Array.Empty<object>(),
    };

    private static async Task<int> IdEstadoAsync(HttpClient cliente, string codigo)
    {
        var estados = await cliente.GetFromJsonAsync<JsonArray>("/api/panel/estados");
        return estados!.First(e => e!["codigo"]!.GetValue<string>() == codigo)!["id"]!.GetValue<int>();
    }

    private static async Task<int> CrearWikiAsync(HttpClient cliente, string identificador, string estado = "en-produccion")
    {
        var respuesta = await cliente.PostAsJsonAsync("/api/panel/series", Wiki(identificador, await IdEstadoAsync(cliente, estado)));
        Assert.Equal(HttpStatusCode.Created, respuesta.StatusCode);
        return (await respuesta.Content.ReadFromJsonAsync<JsonObject>())!["id"]!.GetValue<int>();
    }

    private static async Task<int> CrearUsuarioAsync(HttpClient yish, string nombreUsuario, bool puedeCrearWikis = false, object[]? permisos = null)
    {
        var respuesta = await yish.PostAsJsonAsync("/api/panel/usuarios", new
        {
            nombreUsuario, nombreVisible = nombreUsuario, contrasena = ServidorDePrueba.ContrasenaComun, puedeCrearWikis,
            permisos = permisos ?? [],
        });
        Assert.Equal(HttpStatusCode.Created, respuesta.StatusCode);
        return (await respuesta.Content.ReadFromJsonAsync<JsonObject>())!["id"]!.GetValue<int>();
    }

    private static async Task<int> NuevasAsync(HttpClient yish) =>
        (await yish.GetFromJsonAsync<JsonObject>("/api/panel/postulaciones/pendientes"))!["nuevas"]!.GetValue<int>();

    /// <summary>Respuestas válidas para todas las preguntas del formulario.</summary>
    private static async Task<List<object>> RespuestasValidasAsync(HttpClient cliente, string nombre, string correo)
    {
        var preguntas = await cliente.GetFromJsonAsync<JsonArray>("/api/formulario");
        return preguntas!.Select(p =>
        {
            var valor = p!["tipo"]!.GetValue<string>() switch
            {
                "Nombre" => nombre,
                "Correo" => correo,
                "Opcion" or "VariasOpciones" => p["opciones"]![0]!.GetValue<string>(),
                _ => "Una serie animada sobre la Alianza. Portafolio: https://ejemplo.cl",
            };
            return (object)new { preguntaId = p["id"]!.GetValue<int>(), valores = new[] { valor } };
        }).ToList();
    }

    // ─── Sesiones ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task IniciarSesion_ConDatosIncorrectos_Devuelve401()
    {
        var cliente = servidor.Cliente();
        var conClaveMala = await cliente.PostAsJsonAsync("/api/sesion/iniciar", new { nombreUsuario = ServidorDePrueba.Superadmin, contrasena = "mala" });
        var sinCuenta = await cliente.PostAsJsonAsync("/api/sesion/iniciar", new { nombreUsuario = "noexiste", contrasena = "mala" });

        Assert.Equal(HttpStatusCode.Unauthorized, conClaveMala.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, sinCuenta.StatusCode);
    }

    [Fact]
    public async Task IniciarSesion_NoDistingueMayusculas()
    {
        var cliente = await servidor.ConSesionAsync("yishadmin", ServidorDePrueba.ContrasenaSuperadmin);
        var perfil = await cliente.GetFromJsonAsync<JsonObject>("/api/sesion/perfil");

        Assert.True(perfil!["esSuperadmin"]!.GetValue<bool>());
    }

    [Fact]
    public async Task Panel_SinSesion_Devuelve401()
    {
        var respuesta = await servidor.Cliente().GetAsync("/api/panel/series");

        Assert.Equal(HttpStatusCode.Unauthorized, respuesta.StatusCode);
    }

    [Fact]
    public async Task DesactivarCuenta_CierraSuSesion()
    {
        var yish = await servidor.YishAsync();
        var id = await CrearUsuarioAsync(yish, "temporal");
        var temporal = await servidor.ConSesionAsync("temporal");

        Assert.Equal(HttpStatusCode.OK, (await temporal.GetAsync("/api/sesion/perfil")).StatusCode);
        (await yish.PutAsJsonAsync($"/api/panel/usuarios/{id}", new { nombreVisible = "temporal", activo = false, puedeCrearWikis = false }))
            .EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Unauthorized, (await temporal.GetAsync("/api/sesion/perfil")).StatusCode);
    }

    // ─── Usuarios y permisos ──────────────────────────────────────────────────

    [Fact]
    public async Task SoloYish_GestionaUsuarios()
    {
        var yish = await servidor.YishAsync();
        await CrearUsuarioAsync(yish, "editor-sin-poder", permisos: [new { area = "Socios" }]);
        var editor = await servidor.ConSesionAsync("editor-sin-poder");

        var crear = await editor.PostAsJsonAsync("/api/panel/usuarios", new { nombreUsuario = "otro", nombreVisible = "x", contrasena = ServidorDePrueba.ContrasenaComun });
        var listar = await editor.GetAsync("/api/panel/usuarios");

        Assert.Equal(HttpStatusCode.Forbidden, crear.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, listar.StatusCode);
    }

    [Fact]
    public async Task CrearWikis_RequiereElPermisoQueActivaYish()
    {
        var yish = await servidor.YishAsync();
        var idCuenta = await CrearUsuarioAsync(yish, "creador");
        var creador = await servidor.ConSesionAsync("creador");
        var estado = await IdEstadoAsync(yish, "pronto");
        HttpResponseMessage respuesta;
        JsonObject? editable;
        int idWiki;

        // 1. Sin el permiso no puede crear.
        respuesta = await creador.PostAsJsonAsync("/api/panel/series", Wiki("sin-permiso", estado));
        Assert.Equal(HttpStatusCode.Forbidden, respuesta.StatusCode);

        // 2. Yish lo activa y ahora sí puede.
        (await yish.PutAsJsonAsync($"/api/panel/usuarios/{idCuenta}", new { nombreVisible = "creador", activo = true, puedeCrearWikis = true }))
            .EnsureSuccessStatusCode();
        respuesta = await creador.PostAsJsonAsync("/api/panel/series", Wiki("con-permiso", estado));
        Assert.Equal(HttpStatusCode.Created, respuesta.StatusCode);
        idWiki = (await respuesta.Content.ReadFromJsonAsync<JsonObject>())!["id"]!.GetValue<int>();

        // 3. Puede editar la wiki que creó, pero solo Yish la elimina.
        editable = await creador.GetFromJsonAsync<JsonObject>($"/api/panel/series/{idWiki}");
        editable!["nombre"] = "Renombrada";
        Assert.Equal(HttpStatusCode.OK, (await creador.PutAsJsonAsync($"/api/panel/series/{idWiki}", editable)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await creador.DeleteAsync($"/api/panel/series/{idWiki}")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await yish.DeleteAsync($"/api/panel/series/{idWiki}")).StatusCode);
    }

    [Fact]
    public async Task PermisoSobreUnaWiki_NoDaAccesoAOtras()
    {
        var yish = await servidor.YishAsync();
        var a = await CrearWikiAsync(yish, "wiki-a");
        var b = await CrearWikiAsync(yish, "wiki-b");
        await CrearUsuarioAsync(yish, "editor-a", permisos: [new { area = "Wikis", serieId = a }]);
        var editor = await servidor.ConSesionAsync("editor-a");
        var lista = await editor.GetFromJsonAsync<JsonArray>("/api/panel/series");
        var editableB = await yish.GetFromJsonAsync<JsonObject>($"/api/panel/series/{b}");

        Assert.Single(lista!);
        Assert.Equal(HttpStatusCode.OK, (await editor.GetAsync($"/api/panel/series/{a}")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await editor.GetAsync($"/api/panel/series/{b}")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await editor.PutAsJsonAsync($"/api/panel/series/{b}", editableB)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await editor.GetAsync("/api/panel/socios")).StatusCode);
    }

    [Fact]
    public async Task Yish_NoSePuedeDesactivarNiEliminarNiDuplicar()
    {
        var yish = await servidor.YishAsync();
        var usuarios = await yish.GetFromJsonAsync<JsonArray>("/api/panel/usuarios");
        var idYish = usuarios!.First(u => u!["esSuperadmin"]!.GetValue<bool>())!["id"]!.GetValue<int>();
        HttpResponseMessage respuesta;
        JsonObject? creado;

        // 1. No se elimina ni se desactiva.
        Assert.Equal(HttpStatusCode.BadRequest, (await yish.DeleteAsync($"/api/panel/usuarios/{idYish}")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await yish.PutAsJsonAsync($"/api/panel/usuarios/{idYish}",
            new { nombreVisible = "Yish", activo = false, puedeCrearWikis = true })).StatusCode);

        // 2. Aunque se envíe esSuperadmin, la cuenta nueva nunca lo es.
        respuesta = await yish.PostAsJsonAsync("/api/panel/usuarios",
            new { nombreUsuario = "intruso", nombreVisible = "x", contrasena = ServidorDePrueba.ContrasenaComun, esSuperadmin = true });
        creado = await respuesta.Content.ReadFromJsonAsync<JsonObject>();
        Assert.False(creado!["esSuperadmin"]!.GetValue<bool>());
    }

    // ─── Wikis, estados y socios ──────────────────────────────────────────────

    [Fact]
    public async Task EstadoDeLaSerie_VieneDeLaBaseDeDatos()
    {
        var yish = await servidor.YishAsync();
        var publico = servidor.Cliente();
        var id = await CrearWikiAsync(yish, "estado-bd");
        var cancelado = await IdEstadoAsync(yish, "cancelado");
        JsonObject? wiki;
        JsonArray? tarjetas;

        // 1. Al crearla tiene el estado indicado.
        wiki = await publico.GetFromJsonAsync<JsonObject>("/api/series/estado-bd");
        Assert.Equal("En Producción", wiki!["estado"]!["nombre"]!.GetValue<string>());

        // 2. Se cambia desde el panel y el sitio lo refleja.
        (await yish.PatchAsJsonAsync($"/api/panel/series/{id}/estado", new { estadoId = cancelado })).EnsureSuccessStatusCode();
        wiki = await publico.GetFromJsonAsync<JsonObject>("/api/series/estado-bd");
        Assert.Equal("Cancelado", wiki!["estado"]!["nombre"]!.GetValue<string>());
        Assert.Equal("cancelado", wiki["estado"]!["codigo"]!.GetValue<string>());

        // 3. El filtro por estado de la portada la encuentra.
        tarjetas = await publico.GetFromJsonAsync<JsonArray>("/api/series?estado=cancelado");
        Assert.Contains(tarjetas!, t => t!["identificador"]!.GetValue<string>() == "estado-bd");
    }

    [Fact]
    public async Task EnlacesJavascript_SonRechazados()
    {
        var yish = await servidor.YishAsync();
        var estado = await IdEstadoAsync(yish, "en-emision");
        var respuesta = await yish.PostAsJsonAsync("/api/panel/series",
            Wiki("xss", estado, new[] { new { plataforma = "youtube", url = "javascript:alert(1)" } }));

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    [Fact]
    public async Task EstadoEnUso_NoSePuedeEliminar()
    {
        var yish = await servidor.YishAsync();
        await CrearWikiAsync(yish, "usa-estado", "finalizado");
        var id = await IdEstadoAsync(yish, "finalizado");

        Assert.Equal(HttpStatusCode.Conflict, (await yish.DeleteAsync($"/api/panel/estados/{id}")).StatusCode);
    }

    [Fact]
    public async Task EdicionAlMismoTiempo_DevuelveConflicto()
    {
        var yish = await servidor.YishAsync();
        var id = await CrearWikiAsync(yish, "concurrente");
        var copiaA = await yish.GetFromJsonAsync<JsonObject>($"/api/panel/series/{id}");
        var copiaB = await yish.GetFromJsonAsync<JsonObject>($"/api/panel/series/{id}");

        copiaA!["nombre"] = "Cambio A";
        copiaB!["nombre"] = "Cambio B";
        Assert.Equal(HttpStatusCode.OK, (await yish.PutAsJsonAsync($"/api/panel/series/{id}", copiaA)).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await yish.PutAsJsonAsync($"/api/panel/series/{id}", copiaB)).StatusCode);
    }

    [Fact]
    public async Task Socios_SeVinculanALasWikis()
    {
        var yish = await servidor.YishAsync();
        var serie = await CrearWikiAsync(yish, "con-socio");
        var respuesta = await yish.PostAsJsonAsync("/api/panel/socios", new
        {
            identificador = "socio-prueba", nombre = "Socio Prueba", descripcion = "d", orden = 1, publicado = true,
            redes = new[] { new { plataforma = "twitch", url = "https://twitch.tv/x" } }, serieIds = new[] { serie },
        });
        JsonArray? socios;
        JsonNode socio;

        Assert.Equal(HttpStatusCode.Created, respuesta.StatusCode);
        socios = await servidor.Cliente().GetFromJsonAsync<JsonArray>("/api/socios");
        socio = socios!.First(s => s!["identificador"]!.GetValue<string>() == "socio-prueba")!;
        Assert.Equal("/wiki/con-socio", socio["proyectos"]![0]!["enlace"]!.GetValue<string>());
        Assert.Equal("https://twitch.tv/x", socio["redes"]!["twitch"]!.GetValue<string>());
    }

    // ─── Medios ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task Medios_SeGuardanEnLaBaseDeDatosYSeValidanSusBytes()
    {
        var yish = await servidor.YishAsync();
        var imagen = new MultipartFormDataContent { { new ByteArrayContent(PngMinimo), "archivos", "punto.png" } };
        var falsa = new MultipartFormDataContent { { new ByteArrayContent("<script>alert(1)</script>"u8.ToArray()), "archivos", "falso.png" } };
        HttpResponseMessage respuesta;
        HttpResponseMessage descarga;
        string url;

        // 1. Se sube y se descarga igual.
        respuesta = await yish.PostAsync("/api/panel/medios", imagen);
        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
        url = (await respuesta.Content.ReadFromJsonAsync<JsonArray>())![0]!["url"]!.GetValue<string>();
        descarga = await servidor.Cliente().GetAsync(url);
        Assert.Equal("image/png", descarga.Content.Headers.ContentType!.MediaType);
        Assert.Equal(PngMinimo, await descarga.Content.ReadAsByteArrayAsync());

        // 2. Un archivo que dice ser PNG pero no lo es se rechaza.
        Assert.Equal(HttpStatusCode.BadRequest, (await yish.PostAsync("/api/panel/medios", falsa)).StatusCode);
    }

    // ─── Textos del sitio ─────────────────────────────────────────────────────

    [Fact]
    public async Task Sitio_TextosVienenDeLaBaseDeDatosYSoloLosEditaQuienTienePermiso()
    {
        var publico = servidor.Cliente();
        var yish = await servidor.YishAsync();
        var cambio = new[] { new { clave = "inicio.hero.eslogan", valor = "Nuevo eslogan" } };
        JsonObject? sitio;
        HttpClient sinPermiso;

        // 1. Valores iniciales.
        sitio = await publico.GetFromJsonAsync<JsonObject>("/api/sitio");
        Assert.Equal("Apoyando talentos con inspiración por medio de la colaboración.", sitio!["textos"]!["inicio.hero.eslogan"]!.GetValue<string>());
        Assert.Equal(3, sitio["enlaces"]!["pie"]!.AsArray().Count);

        // 2. Sin permiso de Sitio no se puede editar.
        await CrearUsuarioAsync(yish, "sin-sitio", permisos: [new { area = "Socios" }]);
        sinPermiso = await servidor.ConSesionAsync("sin-sitio");
        Assert.Equal(HttpStatusCode.Forbidden, (await sinPermiso.PutAsJsonAsync("/api/panel/sitio", cambio)).StatusCode);

        // 3. Yish edita y el sitio lo muestra.
        Assert.Equal(HttpStatusCode.OK, (await yish.PutAsJsonAsync("/api/panel/sitio", cambio)).StatusCode);
        sitio = await publico.GetFromJsonAsync<JsonObject>("/api/sitio");
        Assert.Equal("Nuevo eslogan", sitio!["textos"]!["inicio.hero.eslogan"]!.GetValue<string>());

        // 4. Claves desconocidas y enlaces peligrosos se rechazan.
        Assert.Equal(HttpStatusCode.BadRequest, (await yish.PutAsJsonAsync("/api/panel/sitio",
            new[] { new { clave = "no.existe", valor = "x" } })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await yish.PutAsJsonAsync("/api/panel/sitio/enlaces/pie",
            new[] { new { plataforma = "instagram", url = "javascript:alert(1)" } })).StatusCode);
    }

    // ─── Formulario de postulación ────────────────────────────────────────────

    [Fact]
    public async Task Postulacion_LlegaALaBaseDeDatosYSoloLaVeYish()
    {
        var publico = servidor.Cliente();
        var yish = await servidor.YishAsync();
        var preguntas = await publico.GetFromJsonAsync<JsonArray>("/api/formulario");
        var antes = await NuevasAsync(yish);
        HttpResponseMessage respuesta;
        JsonObject? pendientes;
        JsonObject? detalle;
        HttpClient editor;

        // 1. El formulario tiene entre 3 y 5 pasos.
        Assert.InRange(preguntas!.Count, 3, 5);

        // 2. Se envía y aparece como nueva en el panel de Yish.
        respuesta = await publico.PostAsJsonAsync("/api/formulario/postulaciones",
            new { respuestas = await RespuestasValidasAsync(publico, "Ana Postulante", "ana@ejemplo.cl") });
        Assert.Equal(HttpStatusCode.Created, respuesta.StatusCode);
        pendientes = await yish.GetFromJsonAsync<JsonObject>("/api/panel/postulaciones/pendientes");
        Assert.Equal(antes + 1, pendientes!["nuevas"]!.GetValue<int>());
        Assert.Equal("Ana Postulante", pendientes["ultimoNombre"]!.GetValue<string>());

        // 3. Al abrirla se ve completa y queda leída.
        detalle = await yish.GetFromJsonAsync<JsonObject>($"/api/panel/postulaciones/{pendientes["ultimaId"]!.GetValue<long>()}");
        Assert.Equal("ana@ejemplo.cl", detalle!["correo"]!.GetValue<string>());
        Assert.Equal(preguntas.Count, detalle["respuestas"]!.AsArray().Count);
        Assert.Equal(antes, await NuevasAsync(yish));

        // 4. Nadie más las ve.
        await CrearUsuarioAsync(yish, "editor-curioso", permisos: [new { area = "Sitio" }]);
        editor = await servidor.ConSesionAsync("editor-curioso");
        Assert.Equal(HttpStatusCode.Forbidden, (await editor.GetAsync("/api/panel/postulaciones")).StatusCode);
    }

    [Fact]
    public async Task Postulacion_ValidaRespuestasEIgnoraBots()
    {
        var publico = servidor.Cliente();
        var yish = await servidor.YishAsync();
        var conCorreoMalo = await RespuestasValidasAsync(publico, "X", "no-es-correo");
        var incompleta = (await RespuestasValidasAsync(publico, "X", "x@ejemplo.cl")).Take(1).ToList();
        var bot = new { respuestas = await RespuestasValidasAsync(publico, "Bot", "bot@ejemplo.cl"), sitio = "https://spam.example" };
        var antes = await NuevasAsync(yish);

        Assert.Equal(HttpStatusCode.BadRequest, (await publico.PostAsJsonAsync("/api/formulario/postulaciones", new { respuestas = conCorreoMalo })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await publico.PostAsJsonAsync("/api/formulario/postulaciones", new { respuestas = incompleta })).StatusCode);
        // El bot rellena el campo oculto: se le responde igual, pero no se guarda.
        Assert.Equal(HttpStatusCode.Created, (await publico.PostAsJsonAsync("/api/formulario/postulaciones", bot)).StatusCode);
        Assert.Equal(antes, await NuevasAsync(yish));
    }

    [Fact]
    public async Task Formulario_DebeTenerEntre3Y5PasosYUnCorreo()
    {
        var yish = await servidor.YishAsync();
        var actuales = await yish.GetFromJsonAsync<JsonArray>("/api/panel/formulario");
        var dos = actuales!.Take(2).ToList();
        var sinCorreo = actuales.Where(p => p!["tipo"]!.GetValue<string>() != "Correo").ToList();

        Assert.Equal(HttpStatusCode.BadRequest, (await yish.PutAsJsonAsync("/api/panel/formulario", dos)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await yish.PutAsJsonAsync("/api/panel/formulario", sinCorreo)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await yish.PutAsJsonAsync("/api/panel/formulario", actuales)).StatusCode);
    }
}
