using Alianza.Servidor.Datos;
using Alianza.Servidor.Seguridad;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Alianza.Servidor.Modulos;

// Datos generales del panel: resumen de la portada del panel, configuración y auditoría.

public record Resumen(int Series, int SeriesPublicadas, int Socios, int Medios, long BytesMedios, int Usuarios, Dictionary<string, int> SeriesPorEstado);

public record ConfiguracionPanel(string UrlSitio);

[ApiController]
[Authorize]
[Route("api/panel")]
public class RutasPanel(BaseDeDatos bd, IOptions<ConfiguracionPublica> publica) : ControllerBase
{
    [HttpGet("configuracion")]
    public ConfiguracionPanel Configuracion() => new(publica.Value.UrlSitio.TrimEnd('/'));

    [HttpGet("resumen")]
    public async Task<Resumen> Resumen()
    {
        var porEstado = await bd.Series.GroupBy(s => s.Estado.Nombre).Select(g => new { g.Key, Total = g.Count() }).ToDictionaryAsync(x => x.Key, x => x.Total);
        return new Resumen(
            await bd.Series.CountAsync(),
            await bd.Series.CountAsync(s => s.Publicada),
            await bd.Socios.CountAsync(),
            await bd.Medios.CountAsync(),
            await bd.Medios.SumAsync(m => (long?)m.Tamano) ?? 0,
            await bd.Usuarios.CountAsync(u => u.Activo),
            porEstado);
    }

    [HttpGet("auditoria")]
    [Authorize(Policy = Politicas.Superadmin)]
    public async Task<Pagina<RegistroAuditoria>> Auditoria([FromQuery] int pagina = 1, [FromQuery] int tamano = 50)
    {
        int total;
        List<RegistroAuditoria> elementos;
        tamano = Math.Clamp(tamano, 1, 200);
        pagina = Math.Max(pagina, 1);

        total = await bd.Auditoria.CountAsync();
        elementos = await bd.Auditoria.AsNoTracking().OrderByDescending(a => a.Id).Skip((pagina - 1) * tamano).Take(tamano).ToListAsync();
        return new Pagina<RegistroAuditoria>(elementos, total, pagina, tamano);
    }
}
