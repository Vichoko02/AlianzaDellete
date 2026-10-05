using System.ComponentModel.DataAnnotations;
using Alianza.Servidor.Datos;
using Alianza.Servidor.Seguridad;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Alianza.Servidor.Modulos;

// Textos, imágenes y enlaces generales del sitio (portada, menú, Únete, Apóyanos, pie, etiquetas de las wikis).
// 1) Formatos  2) Catálogo de textos  3) Lógica  4) Ruta pública  5) Rutas del panel (permiso Sitio).
// El sitio solo conoce las claves del catálogo y el panel solo puede cambiar sus valores, no inventar claves.

public record EnlaceSitioDatos(
    [Required, Plataforma] string Plataforma,
    [Required, UrlHttp, MaxLength(500)] string Url,
    [MaxLength(100)] string? Etiqueta,
    [MaxLength(200)] string? Descripcion);

/// <summary>Textos (las imágenes sueltas ya como URL), listas de imágenes y enlaces agrupados.</summary>
public record SitioPublico(Dictionary<string, string> Textos, Dictionary<string, List<string>> Listas, Dictionary<string, List<EnlaceSitioDatos>> Enlaces);

public record CampoSitio(string Clave, string Grupo, string Etiqueta, TipoTexto Tipo, string Valor);

public record DatosCampoSitio([Required, MaxLength(100)] string Clave, [MaxLength(8000)] string? Valor);

public class ServicioSitio(BaseDeDatos bd, ServicioMedios medios, DireccionesMedios direcciones)
{
    public record DefinicionTexto(string Clave, string Grupo, string Etiqueta, TipoTexto Tipo, string PorDefecto);

    // Valores por defecto = los textos que el sitio tenía escritos a mano.
    public static readonly DefinicionTexto[] Catalogo =
    [
        new("inicio.carrusel", "Portada", "Banners del carrusel superior", TipoTexto.ListaImagenes, ""),
        new("inicio.hero.antetitulo", "Portada", "Antetítulo del eslogan", TipoTexto.Texto, "— Proyecto Alianza —"),
        new("inicio.hero.eslogan", "Portada", "Eslogan", TipoTexto.TextoLargo, "Apoyando talentos con inspiración por medio de la colaboración."),
        new("inicio.sobre.titulo", "Portada", "Título «Sobre nosotros»", TipoTexto.Texto, "Sobre Nosotros"),
        new("inicio.sobre.texto", "Portada", "Texto «Sobre nosotros»", TipoTexto.TextoLargo,
            "Somos una alianza de creadores independientes unidos por la pasión de contar historias y llevar sus proyectos al siguiente nivel a través de la colaboración."),
        new("inicio.sobre.destacado", "Portada", "Frase destacada «Sobre nosotros»", TipoTexto.Texto, "Conoce a nuestros talentos/asociados."),
        new("inicio.asociados.titulo", "Portada", "Título de la sección de asociados", TipoTexto.Texto, "Asociados"),
        new("inicio.proyectos.titulo", "Portada", "Título de la sección de proyectos", TipoTexto.Texto, "Proyectos"),

        new("nav.sobre", "Menú", "Enlace «Sobre nosotros»", TipoTexto.Texto, "Sobre Nosotros"),
        new("nav.miembros", "Menú", "Enlace a los proyectos", TipoTexto.Texto, "Miembros"),
        new("nav.unete", "Menú", "Enlace «Únete»", TipoTexto.Texto, "Únete"),
        new("nav.apoyanos", "Menú", "Enlace «Apóyanos»", TipoTexto.Texto, "Apóyanos"),

        new("unete.antetitulo", "Únete", "Antetítulo", TipoTexto.Texto, "Programa de Patrocinios"),
        new("unete.titulo", "Únete", "Título", TipoTexto.Texto, "¿Cómo unirte?"),
        new("unete.intro1", "Únete", "Primer párrafo", TipoTexto.TextoLargo,
            "En la Alianza estamos bastante conscientes del esfuerzo titánico que se requiere para poder sacar adelante un proyecto, añadido a los marcados prejuicios que acarrean los proyectos independientes en Latinoamérica, hacen casi imposible poder sacar un proyecto adelante."),
        new("unete.intro2", "Únete", "Segundo párrafo", TipoTexto.TextoLargo,
            "Así que si tu proyecto necesita apoyo y quieres formar parte de este movimiento, completa nuestro formulario de postulación."),
        new("unete.paso1.titulo", "Únete", "Paso 1 · título", TipoTexto.Texto, "Revisa nuestros proyectos"),
        new("unete.paso1.texto", "Únete", "Paso 1 · texto", TipoTexto.TextoLargo,
            "Tener un proyecto claro y definido es fundamental para poder formar parte de la Alianza, así que te recomendamos revisar nuestros proyectos actuales para entender mejor el tipo de contenido que apoyamos."),
        new("unete.paso2.titulo", "Únete", "Paso 2 · título", TipoTexto.Texto, "Prepara tu propuesta"),
        new("unete.paso2.texto", "Únete", "Paso 2 · texto", TipoTexto.TextoLargo,
            "Reúne ejemplos de tu trabajo: animaciones, voces, música, arte... y elabora una propuesta clara de tu proyecto."),
        new("unete.paso3.titulo", "Únete", "Paso 3 · título", TipoTexto.Texto, "Postula tu proyecto"),
        new("unete.paso3.texto", "Únete", "Paso 3 · texto", TipoTexto.TextoLargo,
            "Completa el formulario de postulación con tu propuesta, tu portafolio y tu área de interés."),
        new("unete.boton", "Únete", "Botón que abre el formulario", TipoTexto.Texto, "Postular mi proyecto"),

        new("formulario.titulo", "Formulario de postulación", "Título", TipoTexto.Texto, "Postula tu proyecto"),
        new("formulario.intro", "Formulario de postulación", "Texto inicial", TipoTexto.TextoLargo, "Son solo unos pasos. El equipo de la Alianza revisará tu postulación."),
        new("formulario.exito.titulo", "Formulario de postulación", "Título al enviar", TipoTexto.Texto, "¡Recibimos tu postulación!"),
        new("formulario.exito.texto", "Formulario de postulación", "Texto al enviar", TipoTexto.TextoLargo, "Gracias por confiar en la Alianza. Revisaremos tu propuesta y te escribiremos al correo que nos dejaste."),

        new("apoyanos.titulo", "Apóyanos", "Título del modal", TipoTexto.Texto, "Apóyanos"),
        new("apoyanos.subtitulo", "Apóyanos", "Subtítulo del modal", TipoTexto.Texto, "Tu apoyo hace posible que sigamos creando"),

        new("pie.texto", "Pie de página", "Texto del pie", TipoTexto.Texto, "2026 Alianza"),

        new("wiki.sinopsis", "Wikis", "Sección «Sinopsis»", TipoTexto.Texto, "Sinopsis"),
        new("wiki.galeria", "Wikis", "Enlace «Galería»", TipoTexto.Texto, "Galería"),
        new("wiki.creador", "Wikis", "Sección «Creador»", TipoTexto.Texto, "Creador"),
        new("wiki.equipo", "Wikis", "Sección del equipo", TipoTexto.Texto, "Staff"),
        new("wiki.arte", "Wikis", "Enlace «Arte»", TipoTexto.Texto, "Arte"),
        new("wiki.arteTitulo", "Wikis", "Sección «Arte del proyecto»", TipoTexto.Texto, "Arte del Proyecto"),
        new("wiki.personajes", "Wikis", "Sección «Personajes»", TipoTexto.Texto, "Personajes"),
        new("wiki.actorVoz", "Wikis", "Etiqueta «Actor de voz»", TipoTexto.Texto, "Actor de Voz"),
        new("wiki.otrasObras", "Wikis", "Etiqueta «Otras obras»", TipoTexto.Texto, "Otras obras"),
        new("wiki.apoyaProyecto", "Wikis", "Etiqueta de las redes de apoyo", TipoTexto.Texto, "apoya este proyecto"),
        new("wiki.apoyanos", "Wikis", "Etiqueta «Apóyanos» de la wiki", TipoTexto.Texto, "Apóyanos"),
        new("wiki.trailer", "Wikis", "Texto cuando no hay video", TipoTexto.Texto, "Trailer / Avance"),
        new("wiki.noEncontrada", "Wikis", "Mensaje de wiki inexistente", TipoTexto.Texto, "No encontramos este proyecto."),

        new("socio.proyectos", "Socios", "Título «Proyectos» en la ficha del socio", TipoTexto.Texto, "Proyectos"),
    ];

    public static readonly string[] GruposDeEnlaces = ["pie", "apoyanos"];

    public static readonly (string Grupo, string Plataforma, string Url, string Etiqueta, string Descripcion)[] EnlacesIniciales =
    [
        ("pie", "instagram", "https://www.instagram.com/somos_laalianza/", "Instagram", ""),
        ("pie", "twitter", "https://x.com/Somos_LaAlianza", "Twitter / X", ""),
        ("pie", "youtube", "https://www.youtube.com/@Somos_LaAlianza", "YouTube", ""),
        ("apoyanos", "patreon", "https://www.patreon.com/SomoslaAlianza", "Patreon", "Apóyanos directamente y accede a contenido exclusivo"),
        ("apoyanos", "instagram", "https://www.instagram.com/somos_laalianza/", "Instagram", "@somos_laalianza"),
        ("apoyanos", "twitter", "https://x.com/Somos_LaAlianza", "Twitter / X", "@Somos_LaAlianza"),
        ("apoyanos", "youtube", "https://www.youtube.com/@Somos_LaAlianza", "YouTube", "@Somos_LaAlianza"),
    ];

    /// <summary>Crea las claves que falten: las claves nuevas de cada versión aparecen solas en bases existentes.</summary>
    public async Task SembrarAsync()
    {
        var existentes = await bd.TextosSitio.Select(t => t.Clave).ToListAsync();
        var orden = 0;

        foreach (var definicion in Catalogo)
        {
            orden++;
            if (existentes.Contains(definicion.Clave)) continue;
            bd.TextosSitio.Add(new TextoSitio
            {
                Clave = definicion.Clave, Grupo = definicion.Grupo, Etiqueta = definicion.Etiqueta,
                Tipo = definicion.Tipo, Valor = definicion.PorDefecto, Orden = orden,
            });
        }
        if (!await bd.EnlacesSitio.AnyAsync())
            bd.EnlacesSitio.AddRange(EnlacesIniciales.Select((e, i) => new EnlaceSitio
                { Grupo = e.Grupo, Plataforma = e.Plataforma, Url = e.Url, Etiqueta = e.Etiqueta, Descripcion = e.Descripcion, Orden = i }));
        await bd.SaveChangesAsync();
    }

    public async Task<SitioPublico> PublicoAsync()
    {
        var textos = await bd.TextosSitio.AsNoTracking().ToListAsync();
        var enlaces = await bd.EnlacesSitio.AsNoTracking().OrderBy(e => e.Orden).ToListAsync();
        var planos = new Dictionary<string, string>();
        var listas = new Dictionary<string, List<string>>();

        foreach (var texto in textos)
        {
            switch (texto.Tipo)
            {
                case TipoTexto.ListaImagenes: listas[texto.Clave] = Ids(texto.Valor).Select(direcciones.De).ToList(); break;
                case TipoTexto.Imagen: planos[texto.Clave] = Ids(texto.Valor).Select(direcciones.De).FirstOrDefault() ?? ""; break;
                default: planos[texto.Clave] = texto.Valor; break;
            }
        }
        return new SitioPublico(planos, listas, GruposDeEnlaces.ToDictionary(g => g, g => enlaces.Where(e => e.Grupo == g)
            .Select(e => new EnlaceSitioDatos(e.Plataforma, e.Url, e.Etiqueta, e.Descripcion)).ToList()));
    }

    public async Task<List<CampoSitio>> CamposAsync() =>
        (await bd.TextosSitio.AsNoTracking().OrderBy(t => t.Orden).ToListAsync())
            .Where(t => Catalogo.Any(c => c.Clave == t.Clave))
            .Select(t => new CampoSitio(t.Clave, t.Grupo, t.Etiqueta, t.Tipo, t.Valor)).ToList();

    /// <summary>Guarda los valores recibidos y devuelve cuántos cambiaron.</summary>
    public async Task<int> GuardarAsync(List<DatosCampoSitio> valores)
    {
        var porClave = await bd.TextosSitio.ToDictionaryAsync(t => t.Clave);
        var cambiados = 0;

        foreach (var nuevo in valores)
        {
            if (!porClave.TryGetValue(nuevo.Clave, out var texto)) throw new ErrorDeNegocio($"Clave desconocida: {nuevo.Clave}.");
            var valor = (nuevo.Valor ?? "").Trim();

            // Cada tipo de campo se valida a su manera.
            if (texto.Tipo == TipoTexto.Url && valor.Length > 0 && !(valor.StartsWith('/') || valor.StartsWith('#') || Validacion.EsUrlHttp(valor)))
                throw new ErrorDeNegocio($"«{texto.Etiqueta}» debe ser una URL http(s) o una ruta que empiece con /.");
            if (texto.Tipo is TipoTexto.Imagen or TipoTexto.ListaImagenes)
            {
                var ids = Ids(valor).ToList();
                await medios.ComprobarQueExistenAsync(ids.Select(i => (Guid?)i));
                valor = string.Join(",", texto.Tipo == TipoTexto.Imagen ? ids.Take(1) : ids);
            }

            if (texto.Valor == valor) continue;
            texto.Valor = valor;
            cambiados++;
        }
        return cambiados;
    }

    public Task<List<EnlaceSitioDatos>> EnlacesAsync(string grupo) =>
        bd.EnlacesSitio.AsNoTracking().Where(e => e.Grupo == grupo).OrderBy(e => e.Orden)
            .Select(e => new EnlaceSitioDatos(e.Plataforma, e.Url, e.Etiqueta, e.Descripcion)).ToListAsync();

    public async Task GuardarEnlacesAsync(string grupo, List<EnlaceSitioDatos> enlaces)
    {
        if (!GruposDeEnlaces.Contains(grupo)) throw new ErrorDeNegocio("Grupo de enlaces desconocido.");
        bd.EnlacesSitio.RemoveRange(await bd.EnlacesSitio.Where(e => e.Grupo == grupo).ToListAsync());
        bd.EnlacesSitio.AddRange(enlaces.Select((e, i) => new EnlaceSitio
        {
            Grupo = grupo, Plataforma = e.Plataforma, Url = e.Url.Trim(),
            Etiqueta = e.Etiqueta?.Trim() ?? "", Descripcion = e.Descripcion?.Trim() ?? "", Orden = i,
        }));
    }

    private static IEnumerable<Guid> Ids(string valor) =>
        valor.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(v => Guid.TryParse(v, out var id) ? id : Guid.Empty).Where(id => id != Guid.Empty);
}

[ApiController]
public class RutasSitio(ServicioSitio sitio) : ControllerBase
{
    [HttpGet("api/sitio")]
    public async Task<SitioPublico> Obtener()
    {
        // Pesa pocos KB: sin caché, para que lo editado en el panel se vea al recargar.
        Response.Headers.CacheControl = "no-cache";
        return await sitio.PublicoAsync();
    }
}

[ApiController]
[Authorize]
[RequierePermiso(AreaPermiso.Sitio)]
[Route("api/panel/sitio")]
public class RutasSitioPanel(BaseDeDatos bd, ServicioSitio sitio, Auditoria auditoria) : ControllerBase
{
    [HttpGet]
    public Task<List<CampoSitio>> Campos() => sitio.CamposAsync();

    [HttpPut]
    public async Task<List<CampoSitio>> Guardar(List<DatosCampoSitio> valores)
    {
        var cambiados = await sitio.GuardarAsync(valores);
        if (cambiados > 0) await auditoria.RegistrarAsync("editar", "sitio", $"{cambiados} texto(s)");
        await bd.SaveChangesAsync();
        return await sitio.CamposAsync();
    }

    [HttpGet("enlaces/{grupo}")]
    public Task<List<EnlaceSitioDatos>> Enlaces(string grupo) => sitio.EnlacesAsync(grupo);

    [HttpPut("enlaces/{grupo}")]
    public async Task<List<EnlaceSitioDatos>> GuardarEnlaces(string grupo, List<EnlaceSitioDatos> enlaces)
    {
        await sitio.GuardarEnlacesAsync(grupo, enlaces);
        await auditoria.RegistrarAsync("editar", "enlaces del sitio", $"{grupo}: {enlaces.Count} enlace(s)");
        await bd.SaveChangesAsync();
        return await sitio.EnlacesAsync(grupo);
    }
}
