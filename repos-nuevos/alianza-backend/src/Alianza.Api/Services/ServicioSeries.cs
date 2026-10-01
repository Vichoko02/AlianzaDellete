using Alianza.Api.Data;
using Alianza.Api.Domain;
using Alianza.Api.Dtos;
using Microsoft.EntityFrameworkCore;

namespace Alianza.Api.Services;

public class ServicioSeries(AlianzaDbContext db, ServicioMedios medios, UrlsMedios urls)
{
    public IQueryable<Serie> ConTodo() => db.Series
        .Include(s => s.Estado)
        .Include(s => s.Enlaces)
        .Include(s => s.ObrasCreador)
        .Include(s => s.Imagenes)
        .Include(s => s.Personajes)
        .Include(s => s.Equipo).ThenInclude(g => g.Miembros)
        .AsSplitQuery();

    public static EstadoDto AEstadoDto(EstadoSerie e) => new(e.Id, e.Codigo, e.Nombre, e.Color, e.Orden);

    // ─── Edición ────────────────────────────────────────────────────────────

    public SerieEdicionDto AEdicion(Serie s)
    {
        List<EnlaceDto> Enlaces(AmbitoEnlace a) => s.Enlaces.Where(e => e.Ambito == a).OrderBy(e => e.Orden)
            .Select(e => new EnlaceDto(e.Plataforma, e.Url)).ToList();
        List<ImagenDto> Imagenes(TipoImagenSerie t) => s.Imagenes.Where(i => i.Tipo == t).OrderBy(i => i.Orden)
            .Select(i => new ImagenDto(i.MedioId, i.Alt)).ToList();

        return new SerieEdicionDto(
            s.Id, s.Slug, s.Nombre, s.Sinopsis, s.EstadoId, s.PortadaId, s.BannerId, s.LogoId, s.VideoUrl, s.VideoLocalId,
            new CreadorDto(s.CreadorNombre, s.CreadorDescripcion, s.CreadorImagenId, Enlaces(AmbitoEnlace.Creador),
                s.ObrasCreador.OrderBy(o => o.Orden).Select(o => new ObraDto(o.Titulo, o.Url)).ToList()),
            Enlaces(AmbitoEnlace.Serie),
            Enlaces(AmbitoEnlace.Apoyo),
            Imagenes(TipoImagenSerie.Carrusel),
            Imagenes(TipoImagenSerie.Galeria),
            s.Personajes.OrderBy(p => p.Orden)
                .Select(p => new PersonajeDto(p.Nombre, p.Rol, p.Descripcion, p.ImagenId, p.ActorVoz, p.ImagenActorVozId)).ToList(),
            s.Equipo.OrderBy(g => g.Orden).Select(g => new GrupoEquipoDto(g.Categoria,
                g.Miembros.OrderBy(m => m.Orden).Select(m => new MiembroDto(m.Nombre, m.Rol, m.ImagenId)).ToList())).ToList(),
            s.Orden, s.Publicada, s.ActualizadoEn);
    }

    /// <summary>Valida y vuelca el DTO sobre la entidad, reemplazando todas sus colecciones.</summary>
    public async Task AplicarAsync(Serie s, SerieEdicionDto d)
    {
        if (await db.Series.AnyAsync(x => x.Slug == d.Slug && x.Id != s.Id))
            throw new ErrorNegocio($"Ya existe una wiki con el identificador '{d.Slug}'.", StatusCodes.Status409Conflict);
        if (!await db.Estados.AnyAsync(e => e.Id == d.EstadoId))
            throw new ErrorNegocio("El estado indicado no existe.");
        // Control de concurrencia optimista: evita pisar cambios de otro editor.
        // PostgreSQL guarda microsegundos (10 ticks): se compara con esa precisión.
        if (s.Id != 0 && d.ActualizadoEn is { } vista && Math.Abs((s.ActualizadoEn - vista.ToUniversalTime()).Ticks) >= 10)
            throw new ErrorNegocio("Otra persona modificó esta wiki mientras la editabas. Recarga para ver los cambios.", StatusCodes.Status409Conflict);

        var creador = d.Creador ?? new CreadorDto(null, null, null, null, null);
        await medios.ValidarExistenAsync(new[] { d.PortadaId, d.BannerId, d.LogoId, d.VideoLocalId, creador.ImagenId }
            .Concat((d.Carrusel ?? []).Concat(d.Galeria ?? []).Select(i => (Guid?)i.MedioId))
            .Concat((d.Personajes ?? []).SelectMany(p => new[] { p.ImagenId, p.ImagenActorVozId }))
            .Concat((d.Equipo ?? []).SelectMany(g => g.Miembros ?? []).Select(m => m.ImagenId)));

        s.Slug = d.Slug;
        s.Nombre = d.Nombre.Trim();
        s.Sinopsis = d.Sinopsis?.Trim() ?? "";
        s.EstadoId = d.EstadoId;
        s.PortadaId = d.PortadaId;
        s.BannerId = d.BannerId;
        s.LogoId = d.LogoId;
        s.VideoUrl = string.IsNullOrWhiteSpace(d.VideoUrl) ? null : d.VideoUrl.Trim();
        s.VideoLocalId = d.VideoLocalId;
        s.CreadorNombre = creador.Nombre?.Trim() ?? "";
        s.CreadorDescripcion = creador.Descripcion?.Trim() ?? "";
        s.CreadorImagenId = creador.ImagenId;
        s.Orden = d.Orden;
        s.Publicada = d.Publicada;
        s.ActualizadoEn = DateTime.UtcNow;

        // Los hijos se reemplazan completos: es lo que edita el formulario del panel.
        db.RemoveRange(s.Enlaces);
        db.RemoveRange(s.ObrasCreador);
        db.RemoveRange(s.Imagenes);
        db.RemoveRange(s.Personajes);
        db.RemoveRange(s.Equipo);

        s.Enlaces = Enlaces(d.Redes, AmbitoEnlace.Serie)
            .Concat(Enlaces(creador.Redes, AmbitoEnlace.Creador))
            .Concat(Enlaces(d.Apoyo, AmbitoEnlace.Apoyo)).ToList();
        s.ObrasCreador = (creador.Obras ?? []).Select((o, i) => new ObraCreador { Titulo = o.Titulo.Trim(), Url = Vacio(o.Url), Orden = i }).ToList();
        s.Imagenes = Imagenes(d.Carrusel, TipoImagenSerie.Carrusel).Concat(Imagenes(d.Galeria, TipoImagenSerie.Galeria)).ToList();
        s.Personajes = (d.Personajes ?? []).Select((p, i) => new Personaje
        {
            Nombre = p.Nombre.Trim(), Rol = p.Rol?.Trim() ?? "", Descripcion = p.Descripcion?.Trim() ?? "",
            ImagenId = p.ImagenId, ActorVoz = Vacio(p.ActorVoz), ImagenActorVozId = p.ImagenActorVozId, Orden = i,
        }).ToList();
        s.Equipo = (d.Equipo ?? []).Select((g, i) => new GrupoEquipo
        {
            Categoria = g.Categoria.Trim(),
            Orden = i,
            Miembros = (g.Miembros ?? []).Select((m, j) => new MiembroEquipo
                { Nombre = m.Nombre.Trim(), Rol = m.Rol?.Trim() ?? "", ImagenId = m.ImagenId, Orden = j }).ToList(),
        }).ToList();
    }

    private static string? Vacio(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();

    private static IEnumerable<EnlaceRed> Enlaces(List<EnlaceDto>? lista, AmbitoEnlace ambito) =>
        (lista ?? []).Where(e => !string.IsNullOrWhiteSpace(e.Url))
            .Select((e, i) => new EnlaceRed { Ambito = ambito, Plataforma = e.Plataforma, Url = e.Url.Trim(), Orden = i });

    private static IEnumerable<SerieImagen> Imagenes(List<ImagenDto>? lista, TipoImagenSerie tipo) =>
        (lista ?? []).Select((x, i) => new SerieImagen { Tipo = tipo, MedioId = x.MedioId, Alt = x.Alt?.Trim() ?? "", Orden = i });

    // ─── Vista pública ──────────────────────────────────────────────────────

    public static EstadoPublicoDto AEstadoPublico(EstadoSerie e) => new(e.Codigo, e.Nombre, e.Color);

    public async Task<WikiPublicaDto> AWikiPublicaAsync(Serie s)
    {
        Dictionary<string, string> Redes(AmbitoEnlace a) => s.Enlaces.Where(e => e.Ambito == a).OrderBy(e => e.Orden)
            .GroupBy(e => e.Plataforma).ToDictionary(g => g.Key, g => g.First().Url);
        IEnumerable<SerieImagen> Imgs(TipoImagenSerie t) => s.Imagenes.Where(i => i.Tipo == t).OrderBy(i => i.Orden);

        var socios = await db.SociosSeries.Where(x => x.SerieId == s.Id && x.Socio.Publicado)
            .OrderBy(x => x.Socio.Orden).Select(x => x.Socio).ToListAsync();

        return new WikiPublicaDto(
            s.Slug, s.Nombre, urls.Url(s.BannerId), urls.Url(s.LogoId),
            s.Estado.Nombre, AEstadoPublico(s.Estado),
            s.VideoUrl, urls.Url(s.VideoLocalId), s.Sinopsis,
            new CreadorPublicoDto(s.CreadorNombre, urls.Url(s.CreadorImagenId), s.CreadorDescripcion, Redes(AmbitoEnlace.Creador),
                s.ObrasCreador.OrderBy(o => o.Orden).Select(o => new ObraPublicaDto(o.Titulo, o.Url)).ToList()),
            Redes(AmbitoEnlace.Serie),
            Redes(AmbitoEnlace.Apoyo),
            Imgs(TipoImagenSerie.Carrusel).Select(i => urls.Url(i.MedioId)).ToList(),
            s.Personajes.OrderBy(p => p.Orden).Select(p => new PersonajePublicoDto(
                p.Nombre, urls.Url(p.ImagenId), p.Rol, p.Descripcion, p.ActorVoz, urls.Url(p.ImagenActorVozId))).ToList(),
            s.Equipo.OrderBy(g => g.Orden).Select(g => new StaffGrupoPublicoDto(g.Categoria,
                g.Miembros.OrderBy(m => m.Orden).Select(m => new StaffMiembroPublicoDto(m.Nombre, m.Rol, urls.Url(m.ImagenId))).ToList())).ToList(),
            Imgs(TipoImagenSerie.Galeria).Select(i => new ImagenGaleriaDto(urls.Url(i.MedioId), i.Alt)).ToList(),
            socios.Select(x => new ProyectoSocioDto(x.Nombre, urls.Url(x.ImagenId), $"/socios/{x.Slug}")).ToList());
    }
}
