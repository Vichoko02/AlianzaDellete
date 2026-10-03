using Alianza.Api.Data;
using Alianza.Api.Domain;
using Alianza.Api.Dtos;
using Microsoft.EntityFrameworkCore;

namespace Alianza.Api.Services;

/// <summary>
/// Textos, imágenes y enlaces generales del sitio público. El catálogo de claves está aquí: el frontend
/// solo conoce estas claves y el panel solo puede editar sus valores (no inventar claves nuevas).
/// </summary>
public class ServicioSitio(AlianzaDbContext db, ServicioMedios medios, UrlsMedios urls)
{
    public record DefinicionTexto(string Clave, string Grupo, string Etiqueta, TipoTexto Tipo, string PorDefecto);

    // Valores por defecto = textos que tenía el sitio escritos a mano.
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

        new("quiz.titulo", "Formulario de postulación", "Título", TipoTexto.Texto, "Postula tu proyecto"),
        new("quiz.intro", "Formulario de postulación", "Texto inicial", TipoTexto.TextoLargo, "Son solo unos pasos. El equipo de la Alianza revisará tu postulación."),
        new("quiz.exito.titulo", "Formulario de postulación", "Título al enviar", TipoTexto.Texto, "¡Recibimos tu postulación!"),
        new("quiz.exito.texto", "Formulario de postulación", "Texto al enviar", TipoTexto.TextoLargo, "Gracias por confiar en la Alianza. Revisaremos tu propuesta y te escribiremos al correo que nos dejaste."),

        new("apoyanos.titulo", "Apóyanos", "Título del modal", TipoTexto.Texto, "Apóyanos"),
        new("apoyanos.subtitulo", "Apóyanos", "Subtítulo del modal", TipoTexto.Texto, "Tu apoyo hace posible que sigamos creando"),

        new("footer.texto", "Pie de página", "Texto del pie", TipoTexto.Texto, "2026 Alianza"),

        new("wiki.sinopsis", "Wikis", "Sección «Sinopsis»", TipoTexto.Texto, "Sinopsis"),
        new("wiki.galeria", "Wikis", "Enlace «Galería»", TipoTexto.Texto, "Galería"),
        new("wiki.creador", "Wikis", "Sección «Creador»", TipoTexto.Texto, "Creador"),
        new("wiki.staff", "Wikis", "Sección «Staff»", TipoTexto.Texto, "Staff"),
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

    public static readonly string[] GruposEnlaces = ["footer", "apoyanos"];

    public static readonly (string Grupo, string Plataforma, string Url, string Etiqueta, string Descripcion)[] EnlacesIniciales =
    [
        ("footer", "instagram", "https://www.instagram.com/somos_laalianza/", "Instagram", ""),
        ("footer", "twitter", "https://x.com/Somos_LaAlianza", "Twitter / X", ""),
        ("footer", "youtube", "https://www.youtube.com/@Somos_LaAlianza", "YouTube", ""),
        ("apoyanos", "patreon", "https://www.patreon.com/SomoslaAlianza", "Patreon", "Apóyanos directamente y accede a contenido exclusivo"),
        ("apoyanos", "instagram", "https://www.instagram.com/somos_laalianza/", "Instagram", "@somos_laalianza"),
        ("apoyanos", "twitter", "https://x.com/Somos_LaAlianza", "Twitter / X", "@Somos_LaAlianza"),
        ("apoyanos", "youtube", "https://www.youtube.com/@Somos_LaAlianza", "YouTube", "@Somos_LaAlianza"),
    ];

    /// <summary>Crea las claves que falten (las nuevas de cada versión aparecen solas en bases existentes).</summary>
    public async Task SembrarAsync()
    {
        var existentes = await db.TextosSitio.Select(t => t.Clave).ToListAsync();
        var orden = 0;
        foreach (var d in Catalogo)
        {
            orden++;
            if (existentes.Contains(d.Clave)) continue;
            db.TextosSitio.Add(new TextoSitio { Clave = d.Clave, Grupo = d.Grupo, Etiqueta = d.Etiqueta, Tipo = d.Tipo, Valor = d.PorDefecto, Orden = orden });
        }
        if (!await db.EnlacesSitio.AnyAsync())
        {
            var i = 0;
            db.EnlacesSitio.AddRange(EnlacesIniciales.Select(e => new EnlaceSitio
                { Grupo = e.Grupo, Plataforma = e.Plataforma, Url = e.Url, Etiqueta = e.Etiqueta, Descripcion = e.Descripcion, Orden = i++ }));
        }
        await db.SaveChangesAsync();
    }

    private static IEnumerable<Guid> Ids(string valor) =>
        valor.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(v => Guid.TryParse(v, out var g) ? g : Guid.Empty).Where(g => g != Guid.Empty);

    public async Task<SitioPublicoDto> PublicoAsync()
    {
        var textos = await db.TextosSitio.AsNoTracking().ToListAsync();
        var enlaces = await db.EnlacesSitio.AsNoTracking().OrderBy(e => e.Orden).ToListAsync();
        var planos = new Dictionary<string, string>();
        var listas = new Dictionary<string, List<string>>();
        foreach (var t in textos)
        {
            switch (t.Tipo)
            {
                case TipoTexto.ListaImagenes: listas[t.Clave] = Ids(t.Valor).Select(urls.Url).ToList(); break;
                case TipoTexto.Imagen: planos[t.Clave] = Ids(t.Valor).Select(urls.Url).FirstOrDefault() ?? ""; break;
                default: planos[t.Clave] = t.Valor; break;
            }
        }
        return new SitioPublicoDto(planos, listas,
            GruposEnlaces.ToDictionary(g => g, g => enlaces.Where(e => e.Grupo == g)
                .Select(e => new EnlaceSitioDto(e.Plataforma, e.Url, e.Etiqueta, e.Descripcion)).ToList()));
    }

    public async Task<List<CampoSitioDto>> CamposAsync() =>
        (await db.TextosSitio.AsNoTracking().OrderBy(t => t.Orden).ToListAsync())
            .Where(t => Catalogo.Any(c => c.Clave == t.Clave))
            .Select(t => new CampoSitioDto(t.Clave, t.Grupo, t.Etiqueta, t.Tipo, t.Valor)).ToList();

    public async Task<int> GuardarAsync(List<ValorSitioDto> valores)
    {
        var porClave = await db.TextosSitio.ToDictionaryAsync(t => t.Clave);
        var cambiados = 0;
        foreach (var v in valores)
        {
            if (!porClave.TryGetValue(v.Clave, out var t)) throw new ErrorNegocio($"Clave desconocida: {v.Clave}.");
            var valor = (v.Valor ?? "").Trim();
            if (t.Tipo == TipoTexto.Url && valor.Length > 0 && !EsUrlValida(valor))
                throw new ErrorNegocio($"«{t.Etiqueta}» debe ser una URL http(s) o una ruta que empiece con /.");
            if (t.Tipo is TipoTexto.Imagen or TipoTexto.ListaImagenes)
            {
                var ids = Ids(valor).ToList();
                await medios.ValidarExistenAsync(ids.Select(i => (Guid?)i));
                valor = string.Join(",", t.Tipo == TipoTexto.Imagen ? ids.Take(1) : ids);
            }
            if (t.Valor == valor) continue;
            t.Valor = valor;
            t.ActualizadoEn = DateTime.UtcNow;
            cambiados++;
        }
        return cambiados;
    }

    public async Task<List<EnlaceSitioDto>> EnlacesAsync(string grupo) =>
        await db.EnlacesSitio.AsNoTracking().Where(e => e.Grupo == grupo).OrderBy(e => e.Orden)
            .Select(e => new EnlaceSitioDto(e.Plataforma, e.Url, e.Etiqueta, e.Descripcion)).ToListAsync();

    public async Task GuardarEnlacesAsync(string grupo, List<EnlaceSitioDto> enlaces)
    {
        if (!GruposEnlaces.Contains(grupo)) throw new ErrorNegocio("Grupo de enlaces desconocido.");
        db.EnlacesSitio.RemoveRange(await db.EnlacesSitio.Where(e => e.Grupo == grupo).ToListAsync());
        db.EnlacesSitio.AddRange(enlaces.Select((e, i) => new EnlaceSitio
        {
            Grupo = grupo, Plataforma = e.Plataforma, Url = e.Url.Trim(),
            Etiqueta = e.Etiqueta?.Trim() ?? "", Descripcion = e.Descripcion?.Trim() ?? "", Orden = i,
        }));
    }

    private static bool EsUrlValida(string v) =>
        v.StartsWith('/') || v.StartsWith('#') ||
        (Uri.TryCreate(v, UriKind.Absolute, out var u) && (u.Scheme == Uri.UriSchemeHttp || u.Scheme == Uri.UriSchemeHttps));
}
