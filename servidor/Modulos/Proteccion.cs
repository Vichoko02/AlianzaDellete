using System.Collections.Concurrent;
using System.Net;
using System.Text.RegularExpressions;
using System.Threading.Channels;
using Alianza.Servidor.Datos;
using Alianza.Servidor.Seguridad;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Alianza.Servidor.Modulos;

// Protección del servidor. nginx es la primera barrera (países, límites por IP, sondeos de bots); esto es la segunda:
// 1) formatos  2) detector de ataques en la URL  3) servicio: puntaje por IP, bloqueos, cuentas, tráfico
// 4) trabajador en segundo plano que guarda los eventos  5) middleware que revisa cada petición  6) rutas del panel.
// Todo vive en memoria del propio servidor y en PostgreSQL: no depende de servicios externos.

// ─── 1. Formatos ──────────────────────────────────────────────────────────────

public record IpActiva(string Ip, int Eventos, DateTime UltimoEvento, bool Bloqueada);

public record ResumenNginx(int BloqueadasPorPais, int LimitadasPorNginx, int Sondeos, Dictionary<string, int> PaisesBloqueados);

public record ResumenSeguridad(
    Dictionary<string, int> EventosPorTipo, int AlertasSinRevisar, int IpsBloqueadas, List<IpActiva> IpsMasActivas,
    List<int> PeticionesPorMinuto, ResumenNginx? Nginx);

public record AlertasPendientes(int Alertas);

public record DatosRevision(List<long>? Ids);

public record DatosBloqueo(string Ip, int? Horas, string? Motivo);

public record BloqueoEnLista(string Ip, DateTime? Hasta, string Motivo, bool Manual, int Veces, DateTime CreadoEn);

// ─── 2. Detector de ataques en la URL ─────────────────────────────────────────

/// <summary>
/// Reconoce firmas de ataques comunes en la ruta, la consulta y el agente. No es la protección contra inyección SQL
/// (esa la da EF Core: todas las consultas van con parámetros, nunca con texto armado a mano): sirve para detectar
/// a quien lo intenta, registrarlo y bloquearlo antes de que siga probando.
/// </summary>
public static class DetectorDeAtaques
{
    private static readonly TimeSpan Limite = TimeSpan.FromMilliseconds(50);
    private const RegexOptions Opciones = RegexOptions.IgnoreCase | RegexOptions.CultureInvariant | RegexOptions.Compiled;

    private static readonly (string Nombre, Regex Patron)[] EnUrl =
    [
        ("Inyección SQL", new Regex(@"\bunion\b[\s\S]{0,40}\bselect\b|'\s*(or|and)\s+'?\w+'?\s*=\s*'?\w+|\b(pg_sleep|sleep|benchmark|waitfor\s+delay)\s*\(|;\s*(drop|delete|insert|update|alter|truncate)\s|\binformation_schema\b|\bpg_catalog\b|\bxp_cmdshell\b", Opciones, Limite)),
        ("Script (XSS)", new Regex(@"<\s*script|javascript\s*:|\bon(error|load|mouseover|focus|click)\s*=|<\s*(iframe|svg|img|body)\b|document\.cookie", Opciones, Limite)),
        ("Recorrido de carpetas", new Regex(@"\.\.[/\\]|/etc/(passwd|shadow|hosts)|\bwin\.ini\b|/proc/self/", Opciones, Limite)),
        ("Inyección de comandos", new Regex(@"[;|`]\s*(cat|wget|curl|bash|sh|nc|python3?|perl|chmod)\b|\$\([^)]{0,80}\)|\$\{jndi:", Opciones, Limite)),
        ("Sondeo de vulnerabilidades", new Regex(@"\.(php\d?|asp|aspx|jsp|cgi)(\?|$)|/\.(env|git|aws|ssh|htaccess|htpasswd|ds_store)\b|/(wp-admin|wp-login|wp-content|wordpress|phpmyadmin|pma|xmlrpc|cgi-bin|actuator|vendor/phpunit|server-status|boaform|hnap1)\b", Opciones, Limite)),
    ];

    private static readonly Regex Herramientas = new(@"sqlmap|nikto|nmap|masscan|zgrab|acunetix|nessus|wpscan|gobuster|dirbuster|ffuf|nuclei|hydra|havij", Opciones, Limite);

    /// <summary>Devuelve el tipo de ataque reconocido o null.</summary>
    public static string? Revisar(string rutaYConsulta, string agente)
    {
        var texto = Decodificar(rutaYConsulta.Length > 4096 ? rutaYConsulta[..4096] : rutaYConsulta);
        try
        {
            foreach (var (nombre, patron) in EnUrl) if (patron.IsMatch(texto)) return nombre;
            if (Herramientas.IsMatch(agente)) return "Herramienta de ataque";
        }
        catch (RegexMatchTimeoutException) { return "URL diseñada para trabar el servidor"; }
        return null;
    }

    /// <summary>Decodifica dos veces: los ataques suelen venir codificados dos veces (%252e%252e) para esquivar filtros.</summary>
    private static string Decodificar(string texto) => WebUtility.UrlDecode(WebUtility.UrlDecode(texto) ?? "") ?? "";
}

// ─── 3. Servicio de protección ────────────────────────────────────────────────

public class ServicioProteccion(IServiceScopeFactory alcances, IOptions<ConfiguracionProteccion> opciones, ILogger<ServicioProteccion> registro)
{
    private sealed class Puntaje { public DateTime Desde; public int Puntos; public int Eventos; public DateTime Ultimo; }
    private sealed class FallosDeCuenta { public DateTime Desde; public int Fallos; public DateTime? BloqueadaHasta; }

    /// <summary>Qué tan grave es cada evento y cuántos puntos suma a la IP que lo causa.</summary>
    private static readonly Dictionary<TipoEvento, (Gravedad Gravedad, int Puntos)> Reglas = new()
    {
        [TipoEvento.InicioSesionFallido] = (Gravedad.Baja, 5),
        [TipoEvento.CuentaBloqueada] = (Gravedad.Alta, 10),
        [TipoEvento.InicioDesdeIpNueva] = (Gravedad.Media, 0),
        [TipoEvento.AccesoDenegado] = (Gravedad.Media, 5),
        [TipoEvento.SesionInvalida] = (Gravedad.Baja, 2),
        [TipoEvento.LimiteExcedido] = (Gravedad.Media, 10),
        [TipoEvento.PatronDeAtaque] = (Gravedad.Alta, 25),
        [TipoEvento.IpBloqueada] = (Gravedad.Alta, 0),
        [TipoEvento.IpDesbloqueada] = (Gravedad.Baja, 0),
        [TipoEvento.RutaInexistente] = (Gravedad.Baja, 3),
        [TipoEvento.ErrorServidor] = (Gravedad.Media, 0),
        [TipoEvento.SubidaRechazada] = (Gravedad.Media, 5),
        [TipoEvento.BotDetectado] = (Gravedad.Media, 25),
        [TipoEvento.TraficoInusual] = (Gravedad.Alta, 0),
        [TipoEvento.AtaqueDeContrasenas] = (Gravedad.Alta, 0),
    };

    private static readonly TimeSpan Ventana = TimeSpan.FromMinutes(10);
    private readonly ConfiguracionProteccion config = opciones.Value;
    private readonly ConcurrentDictionary<string, DateTime> bloqueadas = new();
    private readonly ConcurrentDictionary<string, int> vecesBloqueada = new();
    private readonly ConcurrentDictionary<string, Puntaje> puntajes = new();
    private readonly ConcurrentDictionary<string, FallosDeCuenta> cuentas = new();
    private readonly ConcurrentDictionary<string, DateTime> ultimoAviso = new();
    private readonly int[] peticionesPorMinuto = new int[60];
    private int peticionesEsteMinuto;
    private int erroresEsteMinuto;
    private int fallosDeInicioEnVentana;
    private DateTime inicioVentanaFallos = DateTime.UtcNow;
    private DateTime ultimaAlertaTrafico = DateTime.MinValue;

    /// <summary>Lo que el trabajador en segundo plano debe guardar en la base de datos.</summary>
    public Channel<object> Cola { get; } = Channel.CreateBounded<object>(new BoundedChannelOptions(5000) { FullMode = BoundedChannelFullMode.DropWrite });

    /// <summary>IP del visitante, siempre en el mismo formato (las IPv4 que llegan como "::ffff:1.2.3.4" quedan como "1.2.3.4").</summary>
    public static string IpDe(HttpContext contexto)
    {
        var direccion = contexto.Connection.RemoteIpAddress;
        if (direccion is null) return "desconocida";
        return (direccion.IsIPv4MappedToIPv6 ? direccion.MapToIPv4() : direccion).ToString();
    }

    // 3.1 Bloqueos de IP

    public async Task CargarBloqueosAsync()
    {
        using var alcance = alcances.CreateScope();
        var bd = alcance.ServiceProvider.GetRequiredService<BaseDeDatos>();
        var ahora = DateTime.UtcNow;
        foreach (var b in await bd.BloqueosIp.AsNoTracking().ToListAsync())
        {
            vecesBloqueada[b.Ip] = b.Veces;
            if (b.Hasta is null || b.Hasta > ahora) bloqueadas[b.Ip] = b.Hasta ?? DateTime.MaxValue;
        }
    }

    public bool EstaBloqueada(string ip)
    {
        if (!bloqueadas.TryGetValue(ip, out var hasta)) return false;
        if (hasta > DateTime.UtcNow) return true;
        bloqueadas.TryRemove(ip, out _);
        return false;
    }

    public int TotalBloqueadas => bloqueadas.Count(b => b.Value > DateTime.UtcNow);

    /// <summary>Nunca se bloquean: la propia máquina (nginx) y las IPs de confianza configuradas.</summary>
    public bool EsDeConfianza(string ip) =>
        ip is "" or "desconocida" || (IPAddress.TryParse(ip, out var direccion) && IPAddress.IsLoopback(direccion)) || config.IpsDeConfianza.Contains(ip);

    /// <summary>Bloquea una IP. Automático: 30 min, ×4 en cada reincidencia (máximo 7 días). Manual: lo que diga YishAdmin.</summary>
    public void Bloquear(string ip, TimeSpan? duracion, string motivo, bool manual, string? usuario = null)
    {
        var veces = vecesBloqueada.AddOrUpdate(ip, 1, (_, v) => v + 1);
        var tiempo = manual ? duracion : TimeSpan.FromMinutes(Math.Min(config.MinutosDeBloqueo * Math.Pow(4, veces - 1), 7 * 24 * 60));
        var hasta = tiempo is null ? (DateTime?)null : DateTime.UtcNow + tiempo.Value;

        bloqueadas[ip] = hasta ?? DateTime.MaxValue;
        puntajes.TryRemove(ip, out _);
        Cola.Writer.TryWrite(new BloqueoIp { Ip = ip, Hasta = hasta, Motivo = motivo, Manual = manual, Veces = veces });
        Registrar(TipoEvento.IpBloqueada, ip, "", $"{(manual ? "Manual" : "Automático")}: {motivo}. Hasta {(hasta is null ? "que se desbloquee" : hasta.Value.ToString("u"))}", usuario);
        registro.LogWarning("IP {Ip} bloqueada ({Motivo})", ip, motivo);
    }

    public void Desbloquear(string ip)
    {
        bloqueadas.TryRemove(ip, out _);
        puntajes.TryRemove(ip, out _);
    }

    // 3.2 Eventos y puntaje

    /// <summary>
    /// Anota un evento de seguridad y suma su puntaje a la IP. Si la IP pasa el umbral en 10 minutos, se bloquea.
    /// Los eventos repetidos de baja gravedad se anotan una vez por minuto (los puntos sí cuentan siempre).
    /// </summary>
    public void Registrar(TipoEvento tipo, string ip, string ruta, string detalle, string? usuario = null)
    {
        var (gravedad, puntos) = Reglas[tipo];
        var ahora = DateTime.UtcNow;
        var repetido = false;
        Puntaje puntaje;

        // 1. Evitar llenar el registro con lo mismo: un aviso por IP y tipo por minuto (las alertas altas siempre).
        if (gravedad != Gravedad.Alta)
        {
            var clave = $"{ip}|{tipo}";
            repetido = ultimoAviso.TryGetValue(clave, out var ultimo) && ahora - ultimo < TimeSpan.FromMinutes(1);
            if (!repetido) ultimoAviso[clave] = ahora;
        }
        if (!repetido)
        {
            Cola.Writer.TryWrite(new EventoSeguridad
            {
                Tipo = tipo, Gravedad = gravedad, Ip = Cortar(ip, 45), Ruta = Cortar(ruta, 300), Usuario = usuario is null ? null : Cortar(usuario, 64),
                Detalle = Cortar(detalle, 500),
            });
        }
        if (gravedad == Gravedad.Alta) registro.LogWarning("Seguridad: {Tipo} desde {Ip} en {Ruta}: {Detalle}", tipo, ip, ruta, detalle);

        // 2. Sumar puntos a la IP y bloquearla si pasa el umbral.
        if (EsDeConfianza(ip) || EstaBloqueada(ip)) return;
        puntaje = puntajes.GetOrAdd(ip, _ => new Puntaje { Desde = ahora });
        lock (puntaje)
        {
            if (ahora - puntaje.Desde > Ventana) { puntaje.Desde = ahora; puntaje.Puntos = 0; puntaje.Eventos = 0; }
            puntaje.Puntos += puntos;
            puntaje.Eventos++;
            puntaje.Ultimo = ahora;
            if (puntaje.Puntos < config.PuntosParaBloquear) return;
        }
        Bloquear(ip, null, $"actividad sospechosa ({puntaje.Puntos} puntos en 10 minutos, último: {tipo})", manual: false);
    }

    public List<IpActiva> IpsMasActivas(int cuantas) => puntajes
        .Where(p => DateTime.UtcNow - p.Value.Desde <= Ventana)
        .OrderByDescending(p => p.Value.Puntos).Take(cuantas)
        .Select(p => new IpActiva(p.Key, p.Value.Eventos, p.Value.Ultimo, EstaBloqueada(p.Key))).ToList();

    // 3.3 Cuentas: bloqueo tras varios intentos fallidos

    /// <summary>¿Está bloqueada temporalmente? Se aplica a cualquier nombre (exista o no) para no revelar qué cuentas existen.</summary>
    public bool CuentaBloqueada(string nombreNormalizado)
    {
        if (!cuentas.TryGetValue(nombreNormalizado, out var fallos)) return false;
        lock (fallos) return fallos.BloqueadaHasta > DateTime.UtcNow;
    }

    public void InicioFallido(string nombreNormalizado, string ip, string ruta)
    {
        var ahora = DateTime.UtcNow;
        var fallos = cuentas.GetOrAdd(nombreNormalizado, _ => new FallosDeCuenta { Desde = ahora });
        var bloquear = false;

        // 1. Contar el fallo de la cuenta (ventana de 15 minutos).
        lock (fallos)
        {
            if (ahora - fallos.Desde > TimeSpan.FromMinutes(15)) { fallos.Desde = ahora; fallos.Fallos = 0; }
            fallos.Fallos++;
            if (fallos.Fallos >= config.FallosParaBloquearCuenta && !(fallos.BloqueadaHasta > ahora))
            {
                fallos.BloqueadaHasta = ahora.AddMinutes(15);
                bloquear = true;
            }
        }
        Interlocked.Increment(ref fallosDeInicioEnVentana);

        // 2. Registrar el fallo y, si corresponde, el bloqueo de la cuenta.
        Registrar(TipoEvento.InicioSesionFallido, ip, ruta, "Usuario o contraseña incorrectos", nombreNormalizado);
        if (bloquear) Registrar(TipoEvento.CuentaBloqueada, ip, ruta, $"{config.FallosParaBloquearCuenta} intentos fallidos: cuenta bloqueada 15 minutos", nombreNormalizado);
    }

    public void InicioExitoso(string nombreNormalizado) => cuentas.TryRemove(nombreNormalizado, out _);

    // 3.4 Tráfico: se cuenta cada petición; una vez por minuto se compara con la hora anterior

    public void ContarPeticion(int estadoHttp)
    {
        Interlocked.Increment(ref peticionesEsteMinuto);
        if (estadoHttp >= 500) Interlocked.Increment(ref erroresEsteMinuto);
    }

    public List<int> TraficoUltimaHora()
    {
        lock (peticionesPorMinuto) return [.. peticionesPorMinuto];
    }

    /// <summary>Lo llama el trabajador cada minuto: detecta tráfico inusual, muchos errores y ataques de contraseñas.</summary>
    public void RevisarMinuto()
    {
        var ahora = DateTime.UtcNow;
        var peticiones = Interlocked.Exchange(ref peticionesEsteMinuto, 0);
        var errores = Interlocked.Exchange(ref erroresEsteMinuto, 0);
        double promedio;

        // 1. Guardar el minuto en el historial de la última hora y calcular el promedio anterior.
        lock (peticionesPorMinuto)
        {
            promedio = peticionesPorMinuto.Average();
            Array.Copy(peticionesPorMinuto, 1, peticionesPorMinuto, 0, 59);
            peticionesPorMinuto[59] = peticiones;
        }

        // 2. Tráfico 5 veces sobre lo normal (y al menos 600 por minuto): posible ataque de denegación de servicio.
        if (peticiones > Math.Max(600, promedio * 5) && ahora - ultimaAlertaTrafico > TimeSpan.FromMinutes(10))
        {
            ultimaAlertaTrafico = ahora;
            Registrar(TipoEvento.TraficoInusual, "", "", $"{peticiones} peticiones en el último minuto (promedio de la hora: {promedio:0})");
        }
        if (errores >= 20) Registrar(TipoEvento.ErrorServidor, "", "", $"{errores} errores del servidor en el último minuto");

        // 3. Muchos inicios fallidos en total (aunque vengan de IPs distintas): alguien prueba contraseñas en masa.
        if (ahora - inicioVentanaFallos > Ventana)
        {
            var fallos = Interlocked.Exchange(ref fallosDeInicioEnVentana, 0);
            inicioVentanaFallos = ahora;
            if (fallos >= 30) Registrar(TipoEvento.AtaqueDeContrasenas, "", "/api/sesion/iniciar", $"{fallos} inicios de sesión fallidos en 10 minutos, desde varias IPs");
        }

        // 4. Limpiar de memoria lo que ya venció.
        foreach (var (ip, p) in puntajes) if (ahora - p.Ultimo > Ventana) puntajes.TryRemove(ip, out _);
        foreach (var (clave, f) in cuentas) if (ahora - f.Desde > TimeSpan.FromMinutes(30)) cuentas.TryRemove(clave, out _);
        foreach (var (clave, cuando) in ultimoAviso) if (ahora - cuando > TimeSpan.FromMinutes(2)) ultimoAviso.TryRemove(clave, out _);
        foreach (var (ip, hasta) in bloqueadas) if (hasta <= ahora) bloqueadas.TryRemove(ip, out _);
    }

    private static string Cortar(string texto, int largo) => texto.Length <= largo ? texto : texto[..largo];
}

// ─── 4. Trabajador en segundo plano ───────────────────────────────────────────

/// <summary>
/// Guarda los eventos en lotes (no una escritura por petición), revisa el tráfico cada minuto
/// y borra cada hora los eventos antiguos y los bloqueos vencidos.
/// </summary>
public class TrabajadorProteccion(ServicioProteccion proteccion, IServiceScopeFactory alcances, IOptions<ConfiguracionProteccion> opciones,
    ILogger<TrabajadorProteccion> registro) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken detener)
    {
        var proximoMinuto = DateTime.UtcNow.AddMinutes(1);
        var proximaLimpieza = DateTime.UtcNow.AddMinutes(5);
        var pendientes = new List<object>();

        await proteccion.CargarBloqueosAsync();
        while (!detener.IsCancellationRequested)
        {
            // 1. Esperar eventos (o un segundo) y juntar los que haya.
            try
            {
                using var espera = CancellationTokenSource.CreateLinkedTokenSource(detener);
                espera.CancelAfter(TimeSpan.FromSeconds(1));
                await proteccion.Cola.Reader.WaitToReadAsync(espera.Token);
            }
            catch (OperationCanceledException) when (!detener.IsCancellationRequested) { }
            while (pendientes.Count < 500 && proteccion.Cola.Reader.TryRead(out var elemento)) pendientes.Add(elemento);

            // 2. Guardarlos de una vez.
            if (pendientes.Count > 0)
            {
                try { await GuardarAsync(pendientes); }
                catch (Exception e) { registro.LogError(e, "No se pudieron guardar {Cantidad} eventos de seguridad", pendientes.Count); }
                pendientes.Clear();
            }

            // 3. Tareas periódicas.
            if (DateTime.UtcNow >= proximoMinuto) { proteccion.RevisarMinuto(); proximoMinuto = DateTime.UtcNow.AddMinutes(1); }
            if (DateTime.UtcNow >= proximaLimpieza)
            {
                try { await LimpiarAsync(); } catch (Exception e) { registro.LogError(e, "Falló la limpieza del registro de seguridad"); }
                proximaLimpieza = DateTime.UtcNow.AddHours(1);
            }
        }
    }

    private async Task GuardarAsync(List<object> elementos)
    {
        using var alcance = alcances.CreateScope();
        var bd = alcance.ServiceProvider.GetRequiredService<BaseDeDatos>();

        bd.EventosSeguridad.AddRange(elementos.OfType<EventoSeguridad>());
        foreach (var bloqueo in elementos.OfType<BloqueoIp>())
        {
            var existente = await bd.BloqueosIp.FindAsync(bloqueo.Ip);
            if (existente is null) { bd.BloqueosIp.Add(bloqueo); continue; }
            existente.Hasta = bloqueo.Hasta;
            existente.Motivo = bloqueo.Motivo;
            existente.Manual = bloqueo.Manual;
            existente.Veces = bloqueo.Veces;
            existente.CreadoEn = DateTime.UtcNow;
        }
        await bd.SaveChangesAsync();
    }

    private async Task LimpiarAsync()
    {
        using var alcance = alcances.CreateScope();
        var bd = alcance.ServiceProvider.GetRequiredService<BaseDeDatos>();
        var limite = DateTime.UtcNow.AddDays(-opciones.Value.DiasDeRegistro);

        await bd.EventosSeguridad.Where(e => e.Fecha < limite).ExecuteDeleteAsync();
        // Los bloqueos vencidos se conservan 30 días para recordar reincidencias.
        await bd.BloqueosIp.Where(b => b.Hasta != null && b.Hasta < DateTime.UtcNow.AddDays(-30)).ExecuteDeleteAsync();
    }
}

// ─── 5. Middleware: revisa cada petición ──────────────────────────────────────

public class MiddlewareProteccion(RequestDelegate siguiente, ServicioProteccion proteccion)
{
    public async Task InvokeAsync(HttpContext contexto)
    {
        var ip = ServicioProteccion.IpDe(contexto);
        var ruta = contexto.Request.Path.Value ?? "";
        var esApi = ruta.StartsWith("/api/", StringComparison.Ordinal);
        string? ataque;

        // 1. IP bloqueada: se corta aquí, sin tocar la base de datos.
        if (proteccion.EstaBloqueada(ip))
        {
            proteccion.ContarPeticion(StatusCodes.Status403Forbidden);
            contexto.Response.StatusCode = StatusCodes.Status403Forbidden;
            await contexto.Response.WriteAsync("Acceso bloqueado temporalmente.");
            return;
        }

        // 2. Firma de ataque en la URL o en el agente: se registra (suma puntos) y no se atiende.
        ataque = DetectorDeAtaques.Revisar(ruta + contexto.Request.QueryString.Value, contexto.Request.Headers.UserAgent.ToString());
        if (ataque is not null)
        {
            proteccion.Registrar(TipoEvento.PatronDeAtaque, ip, ruta, $"{ataque}: {contexto.Request.Path}{contexto.Request.QueryString}");
            proteccion.ContarPeticion(StatusCodes.Status400BadRequest);
            contexto.Response.StatusCode = StatusCodes.Status400BadRequest;
            return;
        }

        // 3. Atender la petición y, según cómo terminó, registrar lo sospechoso.
        contexto.Response.Headers.XContentTypeOptions = "nosniff";
        await siguiente(contexto);
        var estado = contexto.Response.StatusCode;
        var usuario = contexto.User.Identity?.Name;
        proteccion.ContarPeticion(estado);
        if (!esApi) return;
        switch (estado)
        {
            case StatusCodes.Status401Unauthorized when contexto.Request.Headers.Authorization.Count > 0:
                proteccion.Registrar(TipoEvento.SesionInvalida, ip, ruta, "Sesión vencida, cerrada o falsificada"); break;
            case StatusCodes.Status403Forbidden:
                proteccion.Registrar(TipoEvento.AccesoDenegado, ip, ruta, $"{contexto.Request.Method} sin permiso", usuario); break;
            case StatusCodes.Status404NotFound:
                proteccion.Registrar(TipoEvento.RutaInexistente, ip, ruta, $"{contexto.Request.Method} a una ruta o recurso que no existe"); break;
            case StatusCodes.Status429TooManyRequests:
                proteccion.Registrar(TipoEvento.LimiteExcedido, ip, ruta, "Superó el límite de peticiones"); break;
            case >= 500:
                proteccion.Registrar(TipoEvento.ErrorServidor, ip, ruta, $"Error {estado} en {contexto.Request.Method}", usuario); break;
        }
    }
}

// ─── 6. Rutas del panel (solo YishAdmin) ──────────────────────────────────────

[ApiController]
[Authorize(Policy = Politicas.Superadmin)]
[Route("api/panel/seguridad")]
public class RutasSeguridad(BaseDeDatos bd, ServicioProteccion proteccion, Auditoria auditoria, IOptions<ConfiguracionProteccion> opciones) : ControllerBase
{
    private static (DateTime Calculado, ResumenNginx? Datos) resumenNginx;

    [HttpGet("resumen")]
    public async Task<ResumenSeguridad> Resumen()
    {
        var desde = DateTime.UtcNow.AddHours(-24);
        var porTipo = await bd.EventosSeguridad.Where(e => e.Fecha >= desde).GroupBy(e => e.Tipo)
            .Select(g => new { g.Key, Total = g.Count() }).ToDictionaryAsync(x => x.Key.ToString(), x => x.Total);
        var alertas = await bd.EventosSeguridad.CountAsync(e => e.Gravedad == Gravedad.Alta && !e.Revisado);

        return new ResumenSeguridad(porTipo, alertas, proteccion.TotalBloqueadas, proteccion.IpsMasActivas(10), proteccion.TraficoUltimaHora(), LeerNginx());
    }

    /// <summary>Para la insignia del menú: alertas (gravedad alta) sin revisar.</summary>
    [HttpGet("pendientes")]
    public async Task<AlertasPendientes> Pendientes() =>
        new(await bd.EventosSeguridad.CountAsync(e => e.Gravedad == Gravedad.Alta && !e.Revisado));

    [HttpGet("eventos")]
    public async Task<Pagina<EventoSeguridad>> Eventos([FromQuery] TipoEvento? tipo, [FromQuery] Gravedad? gravedad, [FromQuery] string? ip,
        [FromQuery] bool sinRevisar = false, [FromQuery] int pagina = 1, [FromQuery] int tamano = 50)
    {
        IQueryable<EventoSeguridad> consulta = bd.EventosSeguridad.AsNoTracking();
        tamano = Math.Clamp(tamano, 1, 200);
        pagina = Math.Max(pagina, 1);

        if (tipo is { } t) consulta = consulta.Where(e => e.Tipo == t);
        if (gravedad is { } g) consulta = consulta.Where(e => e.Gravedad == g);
        if (!string.IsNullOrWhiteSpace(ip)) consulta = consulta.Where(e => e.Ip == ip.Trim());
        if (sinRevisar) consulta = consulta.Where(e => !e.Revisado && e.Gravedad == Gravedad.Alta);
        var total = await consulta.CountAsync();
        var elementos = await consulta.OrderByDescending(e => e.Id).Skip((pagina - 1) * tamano).Take(tamano).ToListAsync();
        return new Pagina<EventoSeguridad>(elementos, total, pagina, tamano);
    }

    /// <summary>Marca alertas como revisadas: las indicadas o, sin ids, todas.</summary>
    [HttpPost("eventos/revisar")]
    public async Task<IActionResult> Revisar(DatosRevision datos)
    {
        var consulta = bd.EventosSeguridad.Where(e => !e.Revisado);
        if (datos.Ids is { Count: > 0 } ids) consulta = consulta.Where(e => ids.Contains(e.Id));
        await consulta.ExecuteUpdateAsync(e => e.SetProperty(x => x.Revisado, true));
        return NoContent();
    }

    [HttpGet("bloqueos")]
    public async Task<List<BloqueoEnLista>> Bloqueos()
    {
        var ahora = DateTime.UtcNow;
        return await bd.BloqueosIp.AsNoTracking().Where(b => b.Hasta == null || b.Hasta > ahora).OrderByDescending(b => b.CreadoEn)
            .Select(b => new BloqueoEnLista(b.Ip, b.Hasta, b.Motivo, b.Manual, b.Veces, b.CreadoEn)).ToListAsync();
    }

    [HttpPost("bloqueos")]
    public async Task<IActionResult> Bloquear(DatosBloqueo datos)
    {
        var miIp = ServicioProteccion.IpDe(HttpContext);
        if (!IPAddress.TryParse(datos.Ip?.Trim(), out var direccion)) throw new ErrorDeNegocio("La IP no es válida.");
        var ip = direccion.ToString();

        if (ip == miIp) throw new ErrorDeNegocio("No puedes bloquear tu propia IP.");
        if (proteccion.EsDeConfianza(ip)) throw new ErrorDeNegocio("Esa IP es de confianza (la propia máquina o una configurada) y no se bloquea.");
        if (datos.Horas is < 1 or > 24 * 365) throw new ErrorDeNegocio("La duración debe ser entre 1 hora y 1 año (o vacía para indefinido).");

        proteccion.Bloquear(ip, datos.Horas is { } h ? TimeSpan.FromHours(h) : null, string.IsNullOrWhiteSpace(datos.Motivo) ? "Bloqueo manual" : datos.Motivo.Trim(),
            manual: true, User.Identity?.Name);
        await auditoria.RegistrarAsync("bloquear", "ip", ip);
        await bd.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("bloqueos/{ip}")]
    public async Task<IActionResult> Desbloquear(string ip)
    {
        var bloqueo = await bd.BloqueosIp.FindAsync(ip);
        proteccion.Desbloquear(ip);
        if (bloqueo is not null) bloqueo.Hasta = DateTime.UtcNow; // se conserva para recordar reincidencias
        proteccion.Registrar(TipoEvento.IpDesbloqueada, ip, "", "Desbloqueada desde el panel", User.Identity?.Name);
        await auditoria.RegistrarAsync("desbloquear", "ip", ip);
        await bd.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>
    /// Cuenta lo que nginx bloqueó en las últimas 24 horas (países, límites, sondeos), leyendo el final de su registro.
    /// Se calcula como mucho una vez por minuto.
    /// </summary>
    private ResumenNginx? LeerNginx()
    {
        var archivo = opciones.Value.RegistroNginx;
        var porPais = new Dictionary<string, int>();
        int paises = 0, limites = 0, sondeos = 0;
        if (string.IsNullOrEmpty(archivo) || !System.IO.File.Exists(archivo)) return null;
        if (DateTime.UtcNow - resumenNginx.Calculado < TimeSpan.FromMinutes(1)) return resumenNginx.Datos;

        // Formato de cada línea (ver sistema/nginx-alianza-http.conf): fecha ip país permitido estado "petición"
        var desde = DateTimeOffset.UtcNow.AddHours(-24);
        foreach (var linea in UltimasLineas(archivo, 4 * 1024 * 1024))
        {
            var partes = linea.Split(' ', 6);
            if (partes.Length < 5 || !DateTimeOffset.TryParse(partes[0], out var cuando) || cuando < desde) continue;
            var (pais, permitido, estado) = (partes[2], partes[3], partes[4]);
            if (permitido == "0") { paises++; porPais[pais] = porPais.GetValueOrDefault(pais) + 1; }
            else if (estado == "429") limites++;
            else if (estado == "444") sondeos++;
        }
        var datos = new ResumenNginx(paises, limites, sondeos, porPais.OrderByDescending(p => p.Value).Take(15).ToDictionary());
        resumenNginx = (DateTime.UtcNow, datos);
        return datos;
    }

    private static IEnumerable<string> UltimasLineas(string archivo, long bytes)
    {
        using var flujo = new FileStream(archivo, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
        if (flujo.Length > bytes) flujo.Seek(-bytes, SeekOrigin.End);
        using var lector = new StreamReader(flujo);
        if (flujo.Position > 0) lector.ReadLine(); // la primera puede venir cortada
        var lineas = new List<string>();
        while (lector.ReadLine() is { } linea) lineas.Add(linea);
        return lineas;
    }
}
