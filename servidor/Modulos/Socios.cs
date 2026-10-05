using System.ComponentModel.DataAnnotations;
using Alianza.Servidor.Datos;
using Alianza.Servidor.Seguridad;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Alianza.Servidor.Modulos;

// Socios o asociados de la Alianza.
// 1) Formatos  2) Lógica  3) Rutas públicas  4) Rutas del panel (permiso Socios).

public record SocioEditable(
    int? Id,
    [Required, RegularExpression(Validacion.PatronIdentificador, ErrorMessage = Validacion.MensajeIdentificador), MaxLength(80)] string Identificador,
    [Required, MaxLength(150)] string Nombre,
    [MaxLength(4000)] string? Descripcion,
    Guid? ImagenId,
    int Orden,
    bool Publicado,
    List<DatosEnlace>? Redes,
    List<int>? SerieIds);

public record SocioEnLista(int Id, string Identificador, string Nombre, string? Imagen, bool Publicado, int Orden);

public record SocioPublico(string Identificador, string Nombre, string? Imagen, string Descripcion, Dictionary<string, string> Redes, List<ProyectoDeSocio> Proyectos);

public class ServicioSocios(BaseDeDatos bd, ServicioMedios medios, DireccionesMedios direcciones)
{
    public IQueryable<Socio> ConTodo() => bd.Socios
        .Include(s => s.Enlaces)
        .Include(s => s.Series).ThenInclude(x => x.Serie)
        .AsSplitQuery();

    public static SocioEditable AEditable(Socio s) => new(
        s.Id, s.Identificador, s.Nombre, s.Descripcion, s.ImagenId, s.Orden, s.Publicado,
        s.Enlaces.OrderBy(e => e.Orden).Select(e => new DatosEnlace(e.Plataforma, e.Url)).ToList(),
        s.Series.OrderBy(x => x.Orden).Select(x => x.SerieId).ToList());

    public SocioPublico APublico(Socio s) => new(
        s.Identificador, s.Nombre, direcciones.De(s.ImagenId), s.Descripcion,
        s.Enlaces.OrderBy(e => e.Orden).GroupBy(e => e.Plataforma).ToDictionary(g => g.Key, g => g.First().Url),
        s.Series.Where(x => x.Serie.Publicada).OrderBy(x => x.Orden)
            .Select(x => new ProyectoDeSocio(x.Serie.Nombre, direcciones.De(x.Serie.PortadaId), $"/wiki/{x.Serie.Identificador}")).ToList());

    public async Task<List<SocioPublico>> PublicosAsync()
    {
        var lista = await ConTodo().AsNoTracking().Where(s => s.Publicado).OrderBy(s => s.Orden).ThenBy(s => s.Nombre).ToListAsync();
        return lista.Select(APublico).ToList();
    }

    public async Task GuardarAsync(Socio socio, SocioEditable datos)
    {
        var serieIds = (datos.SerieIds ?? []).Distinct().ToList();

        // 1. Comprobaciones.
        if (await bd.Socios.AnyAsync(x => x.Identificador == datos.Identificador && x.Id != socio.Id))
            throw new ErrorDeNegocio($"Ya existe un socio con el identificador '{datos.Identificador}'.", StatusCodes.Status409Conflict);
        await medios.ComprobarQueExistenAsync([datos.ImagenId]);
        if (serieIds.Count > 0 && await bd.Series.CountAsync(x => serieIds.Contains(x.Id)) != serieIds.Count)
            throw new ErrorDeNegocio("Alguna de las series vinculadas no existe.");

        // 2. Datos simples.
        socio.Identificador = datos.Identificador;
        socio.Nombre = datos.Nombre.Trim();
        socio.Descripcion = datos.Descripcion?.Trim() ?? "";
        socio.ImagenId = datos.ImagenId;
        socio.Orden = datos.Orden;
        socio.Publicado = datos.Publicado;
        socio.ActualizadoEn = DateTime.UtcNow;

        // 3. Redes y series vinculadas, reemplazadas completas.
        bd.RemoveRange(socio.Enlaces);
        bd.RemoveRange(socio.Series);
        socio.Enlaces = (datos.Redes ?? []).Where(e => !string.IsNullOrWhiteSpace(e.Url))
            .Select((e, i) => new Enlace { Uso = UsoEnlace.Socio, Plataforma = e.Plataforma, Url = e.Url.Trim(), Orden = i }).ToList();
        socio.Series = serieIds.Select((id, i) => new SocioSerie { SerieId = id, Orden = i }).ToList();
    }
}

[ApiController]
[Route("api/socios")]
public class RutasSocios(ServicioSocios socios, CachePublica cache) : ControllerBase
{
    [HttpGet]
    public Task<List<SocioPublico>> Listar() => cache.ObtenerAsync("socios", socios.PublicosAsync);

    [HttpGet("{identificador}")]
    public async Task<ActionResult<SocioPublico>> Obtener(string identificador)
    {
        var socio = await socios.ConTodo().AsNoTracking().FirstOrDefaultAsync(x => x.Identificador == identificador && x.Publicado);
        return socio is null ? NotFound() : socios.APublico(socio);
    }
}

[ApiController]
[Authorize]
[RequierePermiso(AreaPermiso.Socios)]
[Route("api/panel/socios")]
public class RutasSociosPanel(BaseDeDatos bd, ServicioSocios socios, Auditoria auditoria, DireccionesMedios direcciones) : ControllerBase
{
    [HttpGet]
    public async Task<List<SocioEnLista>> Listar()
    {
        var lista = await bd.Socios.AsNoTracking().OrderBy(s => s.Orden).ThenBy(s => s.Nombre).ToListAsync();
        return lista.Select(s => new SocioEnLista(s.Id, s.Identificador, s.Nombre, direcciones.De(s.ImagenId), s.Publicado, s.Orden)).ToList();
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<SocioEditable>> Obtener(int id)
    {
        var socio = await socios.ConTodo().AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        return socio is null ? NotFound() : ServicioSocios.AEditable(socio);
    }

    [HttpPost]
    public async Task<ActionResult<SocioEditable>> Crear(SocioEditable datos)
    {
        var socio = new Socio();
        await socios.GuardarAsync(socio, datos);
        bd.Socios.Add(socio);
        await auditoria.RegistrarAsync("crear", "socio", socio.Nombre);
        await bd.SaveChangesAsync();
        return CreatedAtAction(nameof(Obtener), new { id = socio.Id }, ServicioSocios.AEditable(socio));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<SocioEditable>> Actualizar(int id, SocioEditable datos)
    {
        var socio = await socios.ConTodo().FirstOrDefaultAsync(x => x.Id == id);
        if (socio is null) return NotFound();
        await socios.GuardarAsync(socio, datos);
        await auditoria.RegistrarAsync("editar", "socio", socio.Nombre);
        await bd.SaveChangesAsync();
        return ServicioSocios.AEditable(socio);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Eliminar(int id)
    {
        var socio = await bd.Socios.FindAsync(id);
        if (socio is null) return NotFound();
        bd.Socios.Remove(socio);
        await auditoria.RegistrarAsync("eliminar", "socio", socio.Nombre);
        await bd.SaveChangesAsync();
        return NoContent();
    }
}
