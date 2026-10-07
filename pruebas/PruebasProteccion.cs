using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;

namespace Alianza.Pruebas;

public class PruebasProteccion(ServidorDePrueba servidor) : IClassFixture<ServidorDePrueba>
{
    /// <summary>Los eventos se guardan en segundo plano (en lotes): se espera hasta 5 s a que aparezcan.</summary>
    private static async Task<JsonArray> EsperarEventosAsync(HttpClient yish, string filtro, int minimo = 1)
    {
        JsonArray eventos = [];
        for (var i = 0; i < 25; i++)
        {
            eventos = (await yish.GetFromJsonAsync<JsonObject>($"/api/panel/seguridad/eventos?{filtro}"))!["elementos"]!.AsArray();
            if (eventos.Count >= minimo) break;
            await Task.Delay(200);
        }
        return eventos;
    }

    [Fact]
    public async Task InyeccionSql_SeDetectaYLaIpQuedaBloqueada()
    {
        var atacante = servidor.Cliente("10.66.0.1");
        var visitante = servidor.Cliente();
        var yish = await servidor.YishAsync();
        JsonArray eventos;

        // 1. Las firmas de ataque se rechazan (aunque vengan codificadas).
        Assert.Equal(HttpStatusCode.BadRequest, (await atacante.GetAsync("/api/series/x'%20OR%20'1'='1")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await atacante.GetAsync("/api/series?estado=1%2520UNION%2520SELECT%2520contrasena")).StatusCode);

        // 2. Con dos intentos supera el puntaje: queda bloqueada aunque ahora pida algo normal.
        Assert.Equal(HttpStatusCode.Forbidden, (await atacante.GetAsync("/api/sitio")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await visitante.GetAsync("/api/sitio")).StatusCode);

        // 3. YishAdmin lo ve en el registro y en los bloqueos, y puede desbloquearla.
        eventos = await EsperarEventosAsync(yish, "ip=10.66.0.1&tipo=IpBloqueada");
        Assert.Contains("actividad sospechosa", eventos[0]!["detalle"]!.GetValue<string>());
        Assert.Contains((await yish.GetFromJsonAsync<JsonArray>("/api/panel/seguridad/bloqueos"))!, b => b!["ip"]!.GetValue<string>() == "10.66.0.1");
        Assert.Equal(HttpStatusCode.NoContent, (await yish.DeleteAsync("/api/panel/seguridad/bloqueos/10.66.0.1")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await atacante.GetAsync("/api/sitio")).StatusCode);
    }

    [Fact]
    public async Task ComillasEnLosDatos_NoRompenLasConsultas()
    {
        // Lo que no parece ataque llega a la base de datos como parámetro: una comilla no cambia la consulta.
        var visitante = servidor.Cliente();
        Assert.Equal(HttpStatusCode.NotFound, (await visitante.GetAsync("/api/series/o'higgins")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await visitante.GetAsync("/api/series?estado=o'higgins")).StatusCode);
    }

    [Fact]
    public async Task HerramientasDeAtaqueYRecorridoDeCarpetas_SonRechazados()
    {
        var sqlmap = servidor.Cliente();
        var curioso = servidor.Cliente();
        sqlmap.DefaultRequestHeaders.UserAgent.ParseAdd("sqlmap/1.7");

        Assert.Equal(HttpStatusCode.BadRequest, (await sqlmap.GetAsync("/api/sitio")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await curioso.GetAsync("/api/medios/..%2F..%2Fetc%2Fpasswd")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await curioso.GetAsync("/panel/.env")).StatusCode);
    }

    [Fact]
    public async Task CuentaBloqueada_TrasCincoIntentosFallidos()
    {
        var yish = await servidor.YishAsync();
        var respuesta = await yish.PostAsJsonAsync("/api/panel/usuarios", new { nombreUsuario = "victima", nombreVisible = "Víctima", contrasena = ServidorDePrueba.ContrasenaComun });
        respuesta.EnsureSuccessStatusCode();

        // 1. Cinco fallos desde IPs distintas (como un ataque repartido): ninguna IP llega a bloquearse, la cuenta sí.
        for (var i = 1; i <= 5; i++)
        {
            var intento = await servidor.Cliente($"10.77.0.{i}").PostAsJsonAsync("/api/sesion/iniciar", new { nombreUsuario = "victima", contrasena = "Adivinanza123" });
            Assert.Equal(HttpStatusCode.Unauthorized, intento.StatusCode);
        }

        // 2. Ni con la contraseña correcta entra durante 15 minutos; otra cuenta sigue funcionando.
        respuesta = await servidor.Cliente().PostAsJsonAsync("/api/sesion/iniciar", new { nombreUsuario = "victima", contrasena = ServidorDePrueba.ContrasenaComun });
        Assert.Equal(HttpStatusCode.TooManyRequests, respuesta.StatusCode);
        Assert.NotNull((await servidor.YishAsync()).DefaultRequestHeaders.Authorization);
        Assert.NotEmpty(await EsperarEventosAsync(yish, "tipo=CuentaBloqueada"));
    }

    [Fact]
    public async Task BloqueoManual_NoSeEsquivaConUnaIpInventada()
    {
        var yish = await servidor.YishAsync(ip: "10.88.0.1");
        var vecino = servidor.Cliente("10.88.0.2");
        var enganoso = servidor.Cliente("10.88.0.2");
        enganoso.DefaultRequestHeaders.Add("X-Forwarded-For", "8.8.8.8");

        // 1. YishAdmin bloquea una IP (pero no puede bloquearse a sí mismo).
        Assert.Equal(HttpStatusCode.BadRequest, (await yish.PostAsJsonAsync("/api/panel/seguridad/bloqueos", new { ip = "10.88.0.1" })).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await yish.PostAsJsonAsync("/api/panel/seguridad/bloqueos", new { ip = "10.88.0.2", horas = 2, motivo = "Prueba" })).StatusCode);

        // 2. Queda bloqueada, y decir "vengo de otra IP" en X-Forwarded-For no sirve (solo se le cree a nginx).
        Assert.Equal(HttpStatusCode.Forbidden, (await vecino.GetAsync("/api/sitio")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await enganoso.GetAsync("/api/sitio")).StatusCode);

        // 3. Al desbloquearla vuelve a entrar.
        Assert.Equal(HttpStatusCode.NoContent, (await yish.DeleteAsync("/api/panel/seguridad/bloqueos/10.88.0.2")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await vecino.GetAsync("/api/sitio")).StatusCode);
    }

    [Fact]
    public async Task InicioDesdeOtraIp_QuedaRegistrado()
    {
        var yish = await servidor.YishAsync();
        await servidor.ConSesionAsync(ServidorDePrueba.Superadmin, ServidorDePrueba.ContrasenaSuperadmin, ip: "10.99.0.7");

        var eventos = await EsperarEventosAsync(yish, "tipo=InicioDesdeIpNueva&ip=10.99.0.7");
        Assert.Equal("YishAdmin", eventos[0]!["usuario"]!.GetValue<string>());
    }

    [Fact]
    public async Task SoloYish_VeLaSeguridad()
    {
        var yish = await servidor.YishAsync();
        var respuesta = await yish.PostAsJsonAsync("/api/panel/usuarios",
            new { nombreUsuario = "editor-seguridad", nombreVisible = "x", contrasena = ServidorDePrueba.ContrasenaComun, permisos = new[] { new { area = "Sitio" } } });
        respuesta.EnsureSuccessStatusCode();
        var editor = await servidor.ConSesionAsync("editor-seguridad");
        var resumen = await yish.GetFromJsonAsync<JsonObject>("/api/panel/seguridad/resumen");

        Assert.Equal(HttpStatusCode.Forbidden, (await editor.GetAsync("/api/panel/seguridad/resumen")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await servidor.Cliente().GetAsync("/api/panel/seguridad/eventos")).StatusCode);
        Assert.Equal(60, resumen!["peticionesPorMinuto"]!.AsArray().Count);
    }
}
