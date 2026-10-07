using System.Text.Json.Nodes;
using System.ComponentModel.DataAnnotations;
using Alianza.Servidor.Datos;
using Alianza.Servidor.Seguridad;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Alianza.Servidor.Modulos;

// Series y sus wikis.
// 1) Formatos  2) Lógica (leer, guardar, armar la wiki pública)  3) Rutas públicas  4) Rutas del panel.
//
// Reglas del panel: crear → superadmin o cuenta con «puede crear wikis» (y queda con permiso sobre la wiki);
// editar → permiso Wikis sobre esa serie o sobre todas; eliminar → solo superadmin.

// ─── 1. Formatos ──────────────────────────────────────────────────────────────

public record DatosEnlace([Required, Plataforma] string Plataforma, [Required, UrlHttp, MaxLength(500)] string Url);

public record DatosObra([Required, MaxLength(200)] string Titulo, [UrlHttp, MaxLength(500)] string? Url);

public record DatosImagen(Guid MedioId, [MaxLength(300)] string? TextoAlternativo);

public record DatosPersonaje(
    [Required, MaxLength(150)] string Nombre,
    [MaxLength(150)] string? Rol,
    [MaxLength(4000)] string? Descripcion,
    Guid? ImagenId,
    [MaxLength(150)] string? ActorVoz,
    Guid? ImagenActorVozId);

public record DatosMiembro([Required, MaxLength(150)] string Nombre, [MaxLength(150)] string? Rol, Guid? ImagenId);

public record DatosGrupoEquipo([Required, MaxLength(100)] string Categoria, List<DatosMiembro> Miembros);

public record DatosCreador(
    [MaxLength(150)] string? Nombre,
    [MaxLength(4000)] string? Descripcion,
    Guid? ImagenId,
    List<DatosEnlace>? Redes,
    List<DatosObra>? Obras);

/// <summary>Wiki completa tal como la edita el panel (se lee y se guarda entera).</summary>
public record SerieEditable(
    int? Id,
    [Required, RegularExpression(Validacion.PatronIdentificador, ErrorMessage = Validacion.MensajeIdentificador), MaxLength(80)] string Identificador,
    [Required, MaxLength(150)] string Nombre,
    [MaxLength(8000)] string? Sinopsis,
    int EstadoId,
    Guid? PortadaId,
    Guid? CabeceraId,
    Guid? LogoId,
    [UrlHttp, MaxLength(500)] string? UrlVideo,
    Guid? VideoPropioId,
    DatosCreador? Creador,
    List<DatosEnlace>? Redes,
    List<DatosEnlace>? Apoyo,
    List<DatosImagen>? Carrusel,
    List<DatosImagen>? Galeria,
    List<DatosPersonaje>? Personajes,
    List<DatosGrupoEquipo>? Equipo,
    int Orden,
    bool Publicada,
    DateTime? ActualizadaEn = null);

public record SerieEnLista(int Id, string Identificador, string Nombre, EstadoEnPanel Estado, string? Portada, bool Publicada, int Orden, DateTime ActualizadaEn);

public record DatosCambioEstado(int EstadoId);

public record DatosVisibilidad(bool Publicada);

// Formato público: el que usa el sitio para pintar cada wiki.

public record TarjetaSerie(string Identificador, string Nombre, string? Imagen, string Enlace, EstadoPublico Estado);

public record ProyectoDeSocio(string Nombre, string? Imagen, string Enlace);

public record WikiPublica(
    string Identificador,
    string Nombre,
    string? Cabecera,
    string? Logo,
    EstadoPublico Estado,
    string? UrlVideo,
    string? VideoPropio,
    string Sinopsis,
    CreadorPublico Creador,
    Dictionary<string, string> Redes,
    Dictionary<string, string> Apoyo,
    List<string> Carrusel,
    List<PersonajePublico> Personajes,
    List<GrupoPublico> Equipo,
    List<ImagenPublica> Galeria,
    List<ProyectoDeSocio> Socios);

public record CreadorPublico(string Nombre, string? Imagen, string Descripcion, Dictionary<string, string> Redes, List<DatosObra> Obras);
public record PersonajePublico(string Nombre, string? Imagen, string Rol, string Descripcion, string? ActorVoz, string? ImagenActorVoz);
public record MiembroPublico(string Nombre, string Rol, string? Imagen);
public record GrupoPublico(string Categoria, List<MiembroPublico> Miembros);
public record ImagenPublica(string Url, string TextoAlternativo);

// ─── 2. Lógica ────────────────────────────────────────────────────────────────

public class ServicioSeries(BaseDeDatos bd, ServicioMedios medios, DireccionesMedios direcciones)
{
    public async Task<List<TarjetaSerie>> TarjetasAsync(string? estado = null)
    {
        var consulta = bd.Series.Where(s => s.Publicada);
        if (!string.IsNullOrEmpty(estado)) consulta = consulta.Where(s => s.Estado.Codigo == estado);
        var lista = await consulta.OrderBy(s => s.Orden).ThenBy(s => s.Nombre).Select(s => new { s.Identificador, s.Nombre, s.PortadaId, s.Estado }).ToListAsync();
        return lista.Select(s => new TarjetaSerie(s.Identificador, s.Nombre, direcciones.De(s.PortadaId), $"/wiki/{s.Identificador}", FormatoEstado.Publico(s.Estado))).ToList();
    }

    public IQueryable<Serie> ConTodo() => bd.Series
        .Include(s => s.Estado)
        .Include(s => s.Enlaces)
        .Include(s => s.ObrasCreador)
        .Include(s => s.Imagenes)
        .Include(s => s.Personajes)
        .Include(s => s.Equipo).ThenInclude(g => g.Miembros)
        .AsSplitQuery();

    public static SerieEditable AEditable(Serie s)
    {
        List<DatosEnlace> Enlaces(UsoEnlace uso) => s.Enlaces.Where(e => e.Uso == uso).OrderBy(e => e.Orden).Select(e => new DatosEnlace(e.Plataforma, e.Url)).ToList();
        List<DatosImagen> Imagenes(TipoImagenSerie tipo) => s.Imagenes.Where(i => i.Tipo == tipo).OrderBy(i => i.Orden).Select(i => new DatosImagen(i.MedioId, i.TextoAlternativo)).ToList();

        return new SerieEditable(
            s.Id, s.Identificador, s.Nombre, s.Sinopsis, s.EstadoId, s.PortadaId, s.CabeceraId, s.LogoId, s.UrlVideo, s.VideoPropioId,
            new DatosCreador(s.CreadorNombre, s.CreadorDescripcion, s.CreadorImagenId, Enlaces(UsoEnlace.Creador),
                s.ObrasCreador.OrderBy(o => o.Orden).Select(o => new DatosObra(o.Titulo, o.Url)).ToList()),
            Enlaces(UsoEnlace.Serie),
            Enlaces(UsoEnlace.Apoyo),
            Imagenes(TipoImagenSerie.Carrusel),
            Imagenes(TipoImagenSerie.Galeria),
            s.Personajes.OrderBy(p => p.Orden).Select(p => new DatosPersonaje(p.Nombre, p.Rol, p.Descripcion, p.ImagenId, p.ActorVoz, p.ImagenActorVozId)).ToList(),
            s.Equipo.OrderBy(g => g.Orden).Select(g => new DatosGrupoEquipo(g.Categoria,
                g.Miembros.OrderBy(m => m.Orden).Select(m => new DatosMiembro(m.Nombre, m.Rol, m.ImagenId)).ToList())).ToList(),
            s.Orden, s.Publicada, s.ActualizadaEn);
    }

    /// <summary>Comprueba los datos y los copia sobre la serie, reemplazando todas sus listas.</summary>
    public async Task GuardarAsync(Serie serie, SerieEditable datos)
    {
        var creador = datos.Creador ?? new DatosCreador(null, null, null, null, null);
        var imagenesUsadas = new List<Guid?> { datos.PortadaId, datos.CabeceraId, datos.LogoId, datos.VideoPropioId, creador.ImagenId };

        // 1. Comprobaciones: identificador libre, estado existente, nadie más editó, imágenes existentes.
        if (await bd.Series.AnyAsync(x => x.Identificador == datos.Identificador && x.Id != serie.Id))
            throw new ErrorDeNegocio($"Ya existe una wiki con el identificador '{datos.Identificador}'.", StatusCodes.Status409Conflict);
        if (!await bd.Estados.AnyAsync(e => e.Id == datos.EstadoId))
            throw new ErrorDeNegocio("El estado indicado no existe.");
        // PostgreSQL guarda microsegundos (10 ticks): se compara con esa precisión.
        if (serie.Id != 0 && datos.ActualizadaEn is { } vista && Math.Abs((serie.ActualizadaEn - vista.ToUniversalTime()).Ticks) >= 10)
            throw new ErrorDeNegocio("Otra persona modificó esta wiki mientras la editabas. Recarga para ver los cambios.", StatusCodes.Status409Conflict);
        imagenesUsadas.AddRange((datos.Carrusel ?? []).Concat(datos.Galeria ?? []).Select(i => (Guid?)i.MedioId));
        imagenesUsadas.AddRange((datos.Personajes ?? []).SelectMany(p => new[] { p.ImagenId, p.ImagenActorVozId }));
        imagenesUsadas.AddRange((datos.Equipo ?? []).SelectMany(g => g.Miembros ?? []).Select(m => m.ImagenId));
        await medios.ComprobarQueExistenAsync(imagenesUsadas);

        // 2. Datos simples.
        serie.Identificador = datos.Identificador;
        serie.Nombre = datos.Nombre.Trim();
        serie.Sinopsis = datos.Sinopsis?.Trim() ?? "";
        serie.EstadoId = datos.EstadoId;
        serie.PortadaId = datos.PortadaId;
        serie.CabeceraId = datos.CabeceraId;
        serie.LogoId = datos.LogoId;
        serie.UrlVideo = Vacio(datos.UrlVideo);
        serie.VideoPropioId = datos.VideoPropioId;
        serie.CreadorNombre = creador.Nombre?.Trim() ?? "";
        serie.CreadorDescripcion = creador.Descripcion?.Trim() ?? "";
        serie.CreadorImagenId = creador.ImagenId;
        serie.Orden = datos.Orden;
        serie.Publicada = datos.Publicada;
        serie.ActualizadaEn = DateTime.UtcNow;

        // 3. Listas: se borran las anteriores y se escriben las nuevas en el orden recibido.
        bd.RemoveRange(serie.Enlaces);
        bd.RemoveRange(serie.ObrasCreador);
        bd.RemoveRange(serie.Imagenes);
        bd.RemoveRange(serie.Personajes);
        bd.RemoveRange(serie.Equipo);
        serie.Enlaces = [.. AEnlaces(datos.Redes, UsoEnlace.Serie), .. AEnlaces(creador.Redes, UsoEnlace.Creador), .. AEnlaces(datos.Apoyo, UsoEnlace.Apoyo)];
        serie.ObrasCreador = (creador.Obras ?? []).Select((o, i) => new ObraCreador { Titulo = o.Titulo.Trim(), Url = Vacio(o.Url), Orden = i }).ToList();
        serie.Imagenes = [.. AImagenes(datos.Carrusel, TipoImagenSerie.Carrusel), .. AImagenes(datos.Galeria, TipoImagenSerie.Galeria)];
        serie.Personajes = (datos.Personajes ?? []).Select((p, i) => new Personaje
        {
            Nombre = p.Nombre.Trim(), Rol = p.Rol?.Trim() ?? "", Descripcion = p.Descripcion?.Trim() ?? "",
            ImagenId = p.ImagenId, ActorVoz = Vacio(p.ActorVoz), ImagenActorVozId = p.ImagenActorVozId, Orden = i,
        }).ToList();
        serie.Equipo = (datos.Equipo ?? []).Select((g, i) => new GrupoEquipo
        {
            Categoria = g.Categoria.Trim(),
            Orden = i,
            Miembros = (g.Miembros ?? []).Select((m, j) => new MiembroEquipo { Nombre = m.Nombre.Trim(), Rol = m.Rol?.Trim() ?? "", ImagenId = m.ImagenId, Orden = j }).ToList(),
        }).ToList();
    }

    /// <summary>Arma la wiki tal como la muestra el sitio.</summary>
    public async Task<WikiPublica> APublicaAsync(Serie s)
    {
        Dictionary<string, string> Redes(UsoEnlace uso) => s.Enlaces.Where(e => e.Uso == uso).OrderBy(e => e.Orden)
            .GroupBy(e => e.Plataforma).ToDictionary(g => g.Key, g => g.First().Url);
        IEnumerable<ImagenSerie> Imagenes(TipoImagenSerie tipo) => s.Imagenes.Where(i => i.Tipo == tipo).OrderBy(i => i.Orden);
        var socios = await bd.SociosSeries.Where(x => x.SerieId == s.Id && x.Socio.Publicado).OrderBy(x => x.Socio.Orden).Select(x => x.Socio).ToListAsync();

        return new WikiPublica(
            s.Identificador, s.Nombre, direcciones.De(s.CabeceraId), direcciones.De(s.LogoId), FormatoEstado.Publico(s.Estado),
            s.UrlVideo, direcciones.De(s.VideoPropioId), s.Sinopsis,
            new CreadorPublico(s.CreadorNombre, direcciones.De(s.CreadorImagenId), s.CreadorDescripcion, Redes(UsoEnlace.Creador),
                s.ObrasCreador.OrderBy(o => o.Orden).Select(o => new DatosObra(o.Titulo, o.Url)).ToList()),
            Redes(UsoEnlace.Serie),
            Redes(UsoEnlace.Apoyo),
            Imagenes(TipoImagenSerie.Carrusel).Select(i => direcciones.De(i.MedioId)).ToList(),
            s.Personajes.OrderBy(p => p.Orden).Select(p => new PersonajePublico(
                p.Nombre, direcciones.De(p.ImagenId), p.Rol, p.Descripcion, p.ActorVoz, direcciones.De(p.ImagenActorVozId))).ToList(),
            s.Equipo.OrderBy(g => g.Orden).Select(g => new GrupoPublico(g.Categoria,
                g.Miembros.OrderBy(m => m.Orden).Select(m => new MiembroPublico(m.Nombre, m.Rol, direcciones.De(m.ImagenId))).ToList())).ToList(),
            Imagenes(TipoImagenSerie.Galeria).Select(i => new ImagenPublica(direcciones.De(i.MedioId), i.TextoAlternativo)).ToList(),
            socios.Select(x => new ProyectoDeSocio(x.Nombre, direcciones.De(x.ImagenId), $"/socios/{x.Identificador}")).ToList());
    }

    private static string? Vacio(string? texto) => string.IsNullOrWhiteSpace(texto) ? null : texto.Trim();

    private static IEnumerable<Enlace> AEnlaces(List<DatosEnlace>? lista, UsoEnlace uso) =>
        (lista ?? []).Where(e => !string.IsNullOrWhiteSpace(e.Url)).Select((e, i) => new Enlace { Uso = uso, Plataforma = e.Plataforma, Url = e.Url.Trim(), Orden = i });

    private static IEnumerable<ImagenSerie> AImagenes(List<DatosImagen>? lista, TipoImagenSerie tipo) =>
        (lista ?? []).Select((x, i) => new ImagenSerie { Tipo = tipo, MedioId = x.MedioId, TextoAlternativo = x.TextoAlternativo?.Trim() ?? "", Orden = i });
}

// ─── 3. Rutas públicas ────────────────────────────────────────────────────────

[ApiController]
[Route("api/series")]
public class RutasSeries(BaseDeDatos bd, ServicioSeries series, ServicioIdiomas idiomas, ServicioTraduccion traduccion, CachePublica cache) : ControllerBase
{
    /// <summary>Tarjetas de la portada, solo series publicadas. Filtro opcional por código de estado.</summary>
    [HttpGet]
    public Task<List<TarjetaSerie>> Listar([FromQuery] string? estado = null) =>
        // Solo la lista completa se guarda en memoria; con filtro se consulta directo.
        string.IsNullOrEmpty(estado) ? cache.ObtenerAsync("series", () => series.TarjetasAsync()) : series.TarjetasAsync(estado);

    /// <summary>Wiki completa, en el idioma elegido (?idioma=) o el del navegador, si la wiki o el sitio lo ofrecen; si no, en español.</summary>
    [HttpGet("{identificador}")]
    public async Task<ActionResult<JsonNode>> Wiki(string identificador, [FromQuery] string? idioma)
    {
        // 1. Idiomas que ofrece la wiki (los suyos y los del sitio) y el que corresponde a este visitante.
        var ofrecidos = await cache.ObtenerAsync<List<IdiomaConfigurado>?>($"idiomas-wiki:{identificador}", async () =>
        {
            var id = await bd.Series.Where(x => x.Identificador == identificador && x.Publicada).Select(x => (int?)x.Id).FirstOrDefaultAsync();
            return id is null ? null : await idiomas.EfectivosDeLaWikiAsync(id.Value);
        });
        if (ofrecidos is null) return NotFound();
        var elegido = ServicioIdiomas.Elegir(ofrecidos, idioma, Request);
        Response.Headers.Vary = "Accept-Language";

        // 2. La wiki en ese idioma (guardada en memoria por idioma).
        var wiki = await cache.ObtenerAsync<JsonNode?>($"wiki:{identificador}:{elegido?.Codigo}", async () =>
        {
            var serie = await series.ConTodo().AsNoTracking().FirstOrDefaultAsync(x => x.Identificador == identificador && x.Publicada);
            if (serie is null) return null;
            var json = ServicioTraduccion.AJson(await series.APublicaAsync(serie));
            if (elegido is not null) json = traduccion.Traducir(json, elegido.Codigo, elegido.Automatica);
            json["idiomas"] = ServicioTraduccion.AJson(ofrecidos.Select(i => new IdiomaPublico(i.Codigo, i.Nombre)).ToList());
            json["idioma"] = elegido?.Codigo ?? "es";
            return json;
        });
        return wiki is null ? NotFound() : wiki;
    }
}

// ─── 4. Rutas del panel ───────────────────────────────────────────────────────

[ApiController]
[Authorize]
[Route("api/panel/series")]
public class RutasSeriesPanel(BaseDeDatos bd, ServicioSeries series, UsuarioActual actual, Auditoria auditoria,
    ServicioUsuarios usuarios, DireccionesMedios direcciones) : ControllerBase
{
    /// <summary>Lista de wikis que la cuenta puede editar.</summary>
    [HttpGet]
    public async Task<List<SerieEnLista>> Listar()
    {
        var editables = await actual.SeriesEditablesAsync();
        var consulta = bd.Series.AsNoTracking();
        if (editables is not null) consulta = consulta.Where(s => editables.Contains(s.Id));
        var lista = await consulta.Include(s => s.Estado).OrderBy(s => s.Orden).ThenBy(s => s.Nombre).ToListAsync();
        return lista.Select(s => new SerieEnLista(s.Id, s.Identificador, s.Nombre, FormatoEstado.Panel(s.Estado),
            direcciones.De(s.PortadaId), s.Publicada, s.Orden, s.ActualizadaEn)).ToList();
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<SerieEditable>> Obtener(int id)
    {
        Serie? serie;
        if (!await actual.PuedeEditarSerieAsync(id)) return Forbid();
        serie = await series.ConTodo().AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        return serie is null ? NotFound() : ServicioSeries.AEditable(serie);
    }

    [HttpPost]
    public async Task<ActionResult<SerieEditable>> Crear(SerieEditable datos)
    {
        var serie = new Serie();
        Usuario usuario;
        if (!await actual.PuedeCrearWikisAsync()) return Forbid();
        usuario = await actual.ObligatorioAsync();

        // 1. Guardar la wiki.
        await series.GuardarAsync(serie, datos with { ActualizadaEn = null });
        bd.Series.Add(serie);
        await bd.SaveChangesAsync();

        // 2. Quien la creó (si no es superadmin ni edita todas) recibe permiso para editarla.
        if (!await actual.PuedeEditarSerieAsync(serie.Id))
            usuario.Permisos.Add(new Permiso { Area = AreaPermiso.Wikis, SerieId = serie.Id });
        await auditoria.RegistrarAsync("crear", "serie", serie.Nombre);
        await bd.SaveChangesAsync();
        await usuarios.ReflejarEnLdapAsync(usuario);

        // 3. Devolverla como quedó.
        serie = await series.ConTodo().AsNoTracking().FirstAsync(x => x.Id == serie.Id);
        return CreatedAtAction(nameof(Obtener), new { id = serie.Id }, ServicioSeries.AEditable(serie));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<SerieEditable>> Actualizar(int id, SerieEditable datos)
    {
        Serie? serie;
        string identificadorAnterior;
        if (!await actual.PuedeEditarSerieAsync(id)) return Forbid();
        serie = await series.ConTodo().FirstOrDefaultAsync(x => x.Id == id);
        if (serie is null) return NotFound();

        identificadorAnterior = serie.Identificador;
        await series.GuardarAsync(serie, datos);
        await auditoria.RegistrarAsync("editar", "serie", serie.Nombre);
        await bd.SaveChangesAsync();

        // El grupo LDAP de la wiki lleva su identificador: si cambió, se actualizan sus editores.
        if (identificadorAnterior != serie.Identificador) await ReflejarEditoresEnLdapAsync(id);
        serie = await series.ConTodo().AsNoTracking().FirstAsync(x => x.Id == id);
        return ServicioSeries.AEditable(serie);
    }

    /// <summary>Cambio rápido de estado (En Emisión, Cancelado...) desde la lista.</summary>
    [HttpPatch("{id:int}/estado")]
    public async Task<IActionResult> CambiarEstado(int id, DatosCambioEstado datos)
    {
        Serie? serie;
        EstadoSerie? estado;
        if (!await actual.PuedeEditarSerieAsync(id)) return Forbid();
        serie = await bd.Series.FindAsync(id);
        if (serie is null) return NotFound();
        estado = await bd.Estados.FindAsync(datos.EstadoId) ?? throw new ErrorDeNegocio("El estado indicado no existe.");

        serie.EstadoId = estado.Id;
        serie.ActualizadaEn = DateTime.UtcNow;
        await auditoria.RegistrarAsync("cambiar-estado", "serie", $"{serie.Nombre} → {estado.Nombre}");
        await bd.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Publica u oculta la wiki desde la lista.</summary>
    [HttpPatch("{id:int}/visibilidad")]
    public async Task<IActionResult> CambiarVisibilidad(int id, DatosVisibilidad datos)
    {
        Serie? serie;
        if (!await actual.PuedeEditarSerieAsync(id)) return Forbid();
        serie = await bd.Series.FindAsync(id);
        if (serie is null) return NotFound();

        serie.Publicada = datos.Publicada;
        serie.ActualizadaEn = DateTime.UtcNow;
        await auditoria.RegistrarAsync(datos.Publicada ? "publicar" : "ocultar", "serie", serie.Nombre);
        await bd.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = Politicas.Superadmin)]
    public async Task<IActionResult> Eliminar(int id)
    {
        var serie = await bd.Series.FindAsync(id);
        List<Usuario> editores;
        if (serie is null) return NotFound();

        editores = await EditoresAsync(id);
        bd.Series.Remove(serie);
        await auditoria.RegistrarAsync("eliminar", "serie", serie.Nombre);
        await bd.SaveChangesAsync();
        foreach (var editor in editores) await usuarios.ReflejarEnLdapAsync(editor);
        return NoContent();
    }

    private Task<List<Usuario>> EditoresAsync(int serieId) =>
        bd.Usuarios.Include(u => u.Permisos).Where(u => u.Permisos.Any(p => p.SerieId == serieId)).ToListAsync();

    private async Task ReflejarEditoresEnLdapAsync(int serieId)
    {
        foreach (var editor in await EditoresAsync(serieId)) await usuarios.ReflejarEnLdapAsync(editor);
    }
}
