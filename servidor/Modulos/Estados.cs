using System.ComponentModel.DataAnnotations;
using Alianza.Servidor.Datos;
using Alianza.Servidor.Seguridad;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Alianza.Servidor.Modulos;

// Catálogo de estados de serie ("En Emisión", "Cancelado"...).
// 1) Formatos  2) Ruta pública  3) Rutas del panel (leer: cualquier cuenta; editar: permiso Estados).

public record EstadoPublico(string Codigo, string Nombre, string Color);

public record EstadoEnPanel(int Id, string Codigo, string Nombre, string Color, int Orden);

public record DatosEstado(
    [Required, RegularExpression(Validacion.PatronIdentificador, ErrorMessage = Validacion.MensajeIdentificador), MaxLength(50)] string Codigo,
    [Required, MaxLength(80)] string Nombre,
    [Required, RegularExpression(Validacion.PatronColor, ErrorMessage = "Color en formato #RRGGBB.")] string Color,
    int Orden);

public static class FormatoEstado
{
    public static EstadoPublico Publico(EstadoSerie e) => new(e.Codigo, e.Nombre, e.Color);
    public static EstadoEnPanel Panel(EstadoSerie e) => new(e.Id, e.Codigo, e.Nombre, e.Color, e.Orden);
}

[ApiController]
public class RutasEstados(BaseDeDatos bd) : ControllerBase
{
    [HttpGet("api/estados")]
    public async Task<List<EstadoPublico>> Listar() =>
        (await bd.Estados.AsNoTracking().OrderBy(e => e.Orden).ToListAsync()).Select(FormatoEstado.Publico).ToList();
}

[ApiController]
[Authorize]
[Route("api/panel/estados")]
public class RutasEstadosPanel(BaseDeDatos bd, Auditoria auditoria) : ControllerBase
{
    /// <summary>Cualquier cuenta lo necesita para elegir el estado de una wiki.</summary>
    [HttpGet]
    public async Task<List<EstadoEnPanel>> Listar() =>
        (await bd.Estados.AsNoTracking().OrderBy(e => e.Orden).ToListAsync()).Select(FormatoEstado.Panel).ToList();

    [HttpPost]
    [RequierePermiso(AreaPermiso.Estados)]
    public async Task<EstadoEnPanel> Crear(DatosEstado datos)
    {
        var estado = new EstadoSerie { Codigo = datos.Codigo, Nombre = datos.Nombre.Trim(), Color = datos.Color, Orden = datos.Orden };
        if (await bd.Estados.AnyAsync(e => e.Codigo == datos.Codigo))
            throw new ErrorDeNegocio($"Ya existe el estado '{datos.Codigo}'.", StatusCodes.Status409Conflict);

        bd.Estados.Add(estado);
        await auditoria.RegistrarAsync("crear", "estado", datos.Nombre);
        await bd.SaveChangesAsync();
        return FormatoEstado.Panel(estado);
    }

    [HttpPut("{id:int}")]
    [RequierePermiso(AreaPermiso.Estados)]
    public async Task<ActionResult<EstadoEnPanel>> Actualizar(int id, DatosEstado datos)
    {
        var estado = await bd.Estados.FindAsync(id);
        if (estado is null) return NotFound();
        if (await bd.Estados.AnyAsync(e => e.Codigo == datos.Codigo && e.Id != id))
            throw new ErrorDeNegocio($"Ya existe el estado '{datos.Codigo}'.", StatusCodes.Status409Conflict);

        (estado.Codigo, estado.Nombre, estado.Color, estado.Orden) = (datos.Codigo, datos.Nombre.Trim(), datos.Color, datos.Orden);
        await auditoria.RegistrarAsync("editar", "estado", datos.Nombre);
        await bd.SaveChangesAsync();
        return FormatoEstado.Panel(estado);
    }

    [HttpDelete("{id:int}")]
    [RequierePermiso(AreaPermiso.Estados)]
    public async Task<IActionResult> Eliminar(int id)
    {
        var estado = await bd.Estados.FindAsync(id);
        if (estado is null) return NotFound();
        var enUso = await bd.Series.CountAsync(s => s.EstadoId == id);
        if (enUso > 0) throw new ErrorDeNegocio($"El estado lo usan {enUso} serie(s); cámbialas antes de eliminarlo.", StatusCodes.Status409Conflict);

        bd.Estados.Remove(estado);
        await auditoria.RegistrarAsync("eliminar", "estado", estado.Nombre);
        await bd.SaveChangesAsync();
        return NoContent();
    }
}
