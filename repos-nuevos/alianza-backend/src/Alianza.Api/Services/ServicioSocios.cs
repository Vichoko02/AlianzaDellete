using Alianza.Api.Data;
using Alianza.Api.Domain;
using Alianza.Api.Dtos;
using Microsoft.EntityFrameworkCore;

namespace Alianza.Api.Services;

public class ServicioSocios(AlianzaDbContext db, ServicioMedios medios, UrlsMedios urls)
{
    public IQueryable<Socio> ConTodo() => db.Socios
        .Include(s => s.Enlaces)
        .Include(s => s.Series).ThenInclude(x => x.Serie)
        .AsSplitQuery();

    public static SocioEdicionDto AEdicion(Socio s) => new(
        s.Id, s.Slug, s.Nombre, s.Descripcion, s.ImagenId, s.Orden, s.Publicado,
        s.Enlaces.OrderBy(e => e.Orden).Select(e => new EnlaceDto(e.Plataforma, e.Url)).ToList(),
        s.Series.OrderBy(x => x.Orden).Select(x => x.SerieId).ToList());

    public async Task AplicarAsync(Socio s, SocioEdicionDto d)
    {
        if (await db.Socios.AnyAsync(x => x.Slug == d.Slug && x.Id != s.Id))
            throw new ErrorNegocio($"Ya existe un socio con el identificador '{d.Slug}'.", StatusCodes.Status409Conflict);
        await medios.ValidarExistenAsync([d.ImagenId]);
        var serieIds = (d.SerieIds ?? []).Distinct().ToList();
        if (serieIds.Count > 0 && await db.Series.CountAsync(x => serieIds.Contains(x.Id)) != serieIds.Count)
            throw new ErrorNegocio("Alguna de las series vinculadas no existe.");

        s.Slug = d.Slug;
        s.Nombre = d.Nombre.Trim();
        s.Descripcion = d.Descripcion?.Trim() ?? "";
        s.ImagenId = d.ImagenId;
        s.Orden = d.Orden;
        s.Publicado = d.Publicado;
        s.ActualizadoEn = DateTime.UtcNow;

        db.RemoveRange(s.Enlaces);
        db.RemoveRange(s.Series);
        s.Enlaces = (d.Redes ?? []).Where(e => !string.IsNullOrWhiteSpace(e.Url))
            .Select((e, i) => new EnlaceRed { Ambito = AmbitoEnlace.Socio, Plataforma = e.Plataforma, Url = e.Url.Trim(), Orden = i }).ToList();
        s.Series = serieIds.Select((id, i) => new SocioSerie { SerieId = id, Orden = i }).ToList();
    }

    public SocioPublicoDto APublico(Socio s) => new(
        s.Slug, s.Nombre, urls.Url(s.ImagenId), s.Descripcion,
        s.Enlaces.OrderBy(e => e.Orden).GroupBy(e => e.Plataforma).ToDictionary(g => g.Key, g => g.First().Url),
        s.Series.Where(x => x.Serie.Publicada).OrderBy(x => x.Orden)
            .Select(x => new ProyectoSocioDto(x.Serie.Nombre, urls.Url(x.Serie.PortadaId), $"/wiki/{x.Serie.Slug}")).ToList());
}
