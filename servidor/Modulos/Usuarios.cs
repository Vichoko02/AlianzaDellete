using System.ComponentModel.DataAnnotations;
using Alianza.Servidor.Datos;
using Alianza.Servidor.Seguridad;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Alianza.Servidor.Modulos;

// Cuentas del panel y sus permisos. Solo YishAdmin (el superadmin) crea cuentas, asigna permisos
// y activa «puede crear wikis». Los visitantes del sitio no tienen cuenta.
// 1) Formatos  2) Lógica  3) Rutas del panel (solo superadmin).

// ─── 1. Formatos ──────────────────────────────────────────────────────────────

public record DatosPermiso(AreaPermiso Area, int? SerieId, string? SerieNombre = null);

public record PerfilUsuario(int Id, string NombreUsuario, string NombreVisible, string? Correo, OrigenCuenta Origen,
    bool EsSuperadmin, bool PuedeCrearWikis, List<DatosPermiso> Permisos);

public record UsuarioEnLista(int Id, string NombreUsuario, string NombreVisible, string? Correo, OrigenCuenta Origen, bool EsSuperadmin,
    bool PuedeCrearWikis, bool Activo, DateTime CreadoEn, DateTime? UltimoAcceso, List<DatosPermiso> Permisos);

public record DatosNuevoUsuario(
    [Required, RegularExpression(Validacion.PatronNombreUsuario, ErrorMessage = "Usuario: 3-64 caracteres (letras, números, punto, guion).")] string NombreUsuario,
    [Required, MaxLength(150)] string NombreVisible,
    [EmailAddress, MaxLength(255)] string? Correo,
    [Required] string Contrasena,
    OrigenCuenta Origen = OrigenCuenta.Local,
    bool PuedeCrearWikis = false,
    List<DatosPermiso>? Permisos = null);

public record DatosUsuario(
    [Required, MaxLength(150)] string NombreVisible,
    [EmailAddress, MaxLength(255)] string? Correo,
    bool Activo,
    bool PuedeCrearWikis);

public record DatosNuevaContrasena([Required] string Contrasena);

// ─── 2. Lógica ────────────────────────────────────────────────────────────────

public class ServicioUsuarios(BaseDeDatos bd, DirectorioLdap ldap)
{
    public static string Normalizar(string nombreUsuario) => nombreUsuario.Trim().ToLowerInvariant();

    public static PerfilUsuario APerfil(Usuario u) => new(
        u.Id, u.NombreUsuario, u.NombreVisible, u.Correo, u.Origen, u.EsSuperadmin, u.EsSuperadmin || u.PuedeCrearWikis,
        u.Permisos.Select(p => new DatosPermiso(p.Area, p.SerieId, p.Serie?.Nombre)).ToList());

    public static UsuarioEnLista ALista(Usuario u) => new(
        u.Id, u.NombreUsuario, u.NombreVisible, u.Correo, u.Origen, u.EsSuperadmin, u.PuedeCrearWikis, u.Activo, u.CreadoEn, u.UltimoAcceso,
        u.Permisos.OrderBy(p => p.Area).ThenBy(p => p.Serie?.Nombre).Select(p => new DatosPermiso(p.Area, p.SerieId, p.Serie?.Nombre)).ToList());

    public Task<Usuario?> CargarAsync(int id) =>
        bd.Usuarios.Include(u => u.Permisos).ThenInclude(p => p.Serie).FirstOrDefaultAsync(u => u.Id == id);

    /// <summary>Quita repetidos, ignora SerieId fuera de Wikis y comprueba que las wikis existan.</summary>
    public async Task<List<DatosPermiso>> LimpiarPermisosAsync(IEnumerable<DatosPermiso>? permisos)
    {
        var lista = (permisos ?? []).Select(p => p with { SerieId = p.Area == AreaPermiso.Wikis ? p.SerieId : null, SerieNombre = null }).Distinct().ToList();
        List<int> ids;

        if (lista.Any(p => !Enum.IsDefined(p.Area))) throw new ErrorDeNegocio("Área de permiso desconocida.");
        // «Todas las wikis» incluye los permisos de wikis concretas.
        if (lista.Any(p => p.Area == AreaPermiso.Wikis && p.SerieId == null))
            lista.RemoveAll(p => p.Area == AreaPermiso.Wikis && p.SerieId != null);
        ids = lista.Where(p => p.SerieId != null).Select(p => p.SerieId!.Value).ToList();
        if (ids.Count > 0 && await bd.Series.CountAsync(s => ids.Contains(s.Id)) != ids.Count)
            throw new ErrorDeNegocio("Alguna de las wikis indicadas no existe.");
        return lista;
    }

    /// <summary>Copia los permisos de la cuenta como grupos del directorio LDAP (solo cuentas de origen LDAP).</summary>
    public async Task<bool> ReflejarEnLdapAsync(Usuario usuario)
    {
        var grupos = new List<string>();
        if (!ldap.Habilitado || usuario.Origen != OrigenCuenta.Ldap) return true;

        if (usuario.Activo)
        {
            grupos.Add(DirectorioLdap.GrupoAdministradores);
            if (usuario.PuedeCrearWikis) grupos.Add(DirectorioLdap.GrupoCreadoresWikis);
            foreach (var permiso in usuario.Permisos)
            {
                if (permiso.Area == AreaPermiso.Wikis && permiso.SerieId is null) grupos.Add(DirectorioLdap.GrupoWikis);
                else if (permiso.Area == AreaPermiso.Wikis)
                    grupos.Add(DirectorioLdap.PrefijoGrupoWiki + await bd.Series.Where(s => s.Id == permiso.SerieId).Select(s => s.Identificador).FirstAsync());
                else grupos.Add(DirectorioLdap.GrupoDeArea(permiso.Area));
            }
        }
        return await ldap.SincronizarGruposAsync(usuario.NombreUsuario, grupos.Distinct().ToList());
    }
}

// ─── 3. Rutas del panel (solo superadmin) ─────────────────────────────────────

[ApiController]
[Authorize(Policy = Politicas.Superadmin)]
[Route("api/panel/usuarios")]
public class RutasUsuariosPanel(BaseDeDatos bd, ServicioUsuarios usuarios, DirectorioLdap ldap, UsuarioActual actual, Auditoria auditoria) : ControllerBase
{
    [HttpGet]
    public async Task<List<UsuarioEnLista>> Listar()
    {
        var lista = await bd.Usuarios.AsNoTracking().Include(u => u.Permisos).ThenInclude(p => p.Serie)
            .OrderByDescending(u => u.EsSuperadmin).ThenBy(u => u.NombreUsuario).ToListAsync();
        return lista.Select(ServicioUsuarios.ALista).ToList();
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<UsuarioEnLista>> Obtener(int id) =>
        await usuarios.CargarAsync(id) is { } usuario ? ServicioUsuarios.ALista(usuario) : NotFound();

    [HttpPost]
    public async Task<ActionResult<UsuarioEnLista>> Crear(DatosNuevoUsuario datos)
    {
        var normalizado = ServicioUsuarios.Normalizar(datos.NombreUsuario);
        List<DatosPermiso> permisos;
        Usuario usuario;

        // 1. Comprobaciones.
        if (Contrasenas.Problema(datos.Contrasena) is { } problema) throw new ErrorDeNegocio(problema);
        if (await bd.Usuarios.AnyAsync(u => u.NombreUsuarioNormalizado == normalizado))
            throw new ErrorDeNegocio($"El usuario '{datos.NombreUsuario}' ya existe.", StatusCodes.Status409Conflict);
        if (datos.Origen == OrigenCuenta.Ldap && !ldap.Habilitado)
            throw new ErrorDeNegocio("LDAP está deshabilitado; crea la cuenta con origen Local.");
        permisos = await usuarios.LimpiarPermisosAsync(datos.Permisos);

        // 2. Armar la cuenta. Nunca se crea otro superadmin.
        usuario = new Usuario
        {
            NombreUsuario = datos.NombreUsuario.Trim(),
            NombreUsuarioNormalizado = normalizado,
            NombreVisible = datos.NombreVisible.Trim(),
            Correo = string.IsNullOrWhiteSpace(datos.Correo) ? null : datos.Correo.Trim(),
            Origen = datos.Origen,
            HashContrasena = datos.Origen == OrigenCuenta.Local ? Contrasenas.Cifrar(datos.Contrasena) : null,
            PuedeCrearWikis = datos.PuedeCrearWikis,
            Permisos = permisos.Select(p => new Permiso { Area = p.Area, SerieId = p.SerieId }).ToList(),
        };

        // 3. Primero el directorio (si falla, no queda una cuenta a medias), luego la base de datos.
        if (usuario.Origen == OrigenCuenta.Ldap) await ldap.CrearUsuarioAsync(usuario.NombreUsuario, usuario.NombreVisible, usuario.Correo, datos.Contrasena);
        bd.Usuarios.Add(usuario);
        await auditoria.RegistrarAsync("crear", "usuario", $"{usuario.NombreUsuario} ({usuario.Origen})");
        try { await bd.SaveChangesAsync(); }
        catch when (usuario.Origen == OrigenCuenta.Ldap)
        {
            await ldap.EliminarUsuarioAsync(usuario.NombreUsuario);
            throw;
        }

        // 4. Reflejar sus permisos en LDAP y devolverla.
        await usuarios.ReflejarEnLdapAsync(usuario);
        return CreatedAtAction(nameof(Obtener), new { id = usuario.Id }, ServicioUsuarios.ALista((await usuarios.CargarAsync(usuario.Id))!));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<UsuarioEnLista>> Actualizar(int id, DatosUsuario datos)
    {
        var usuario = await usuarios.CargarAsync(id);
        bool cambiaActivo;
        if (usuario is null) return NotFound();
        if (usuario.EsSuperadmin && !datos.Activo) throw new ErrorDeNegocio("La cuenta del superadministrador no se puede desactivar.");

        cambiaActivo = usuario.Activo != datos.Activo;
        if (usuario.Activo && !datos.Activo) usuario.SelloSesion = Guid.NewGuid(); // cierra sus sesiones abiertas
        if (cambiaActivo && usuario.Origen == OrigenCuenta.Ldap) await ldap.BloquearAsync(usuario.NombreUsuario, !datos.Activo);
        usuario.NombreVisible = datos.NombreVisible.Trim();
        usuario.Correo = string.IsNullOrWhiteSpace(datos.Correo) ? null : datos.Correo.Trim();
        usuario.Activo = datos.Activo;
        if (!usuario.EsSuperadmin) usuario.PuedeCrearWikis = datos.PuedeCrearWikis;

        await auditoria.RegistrarAsync("editar", "usuario", $"{usuario.NombreUsuario}: activo={usuario.Activo}, puedeCrearWikis={usuario.PuedeCrearWikis}");
        await bd.SaveChangesAsync();
        await usuarios.ReflejarEnLdapAsync(usuario);
        return ServicioUsuarios.ALista(usuario);
    }

    /// <summary>Reemplaza todos los permisos de la cuenta por la lista enviada.</summary>
    [HttpPut("{id:int}/permisos")]
    public async Task<ActionResult<UsuarioEnLista>> AsignarPermisos(int id, List<DatosPermiso> permisos)
    {
        var usuario = await usuarios.CargarAsync(id);
        List<DatosPermiso> nuevos;
        if (usuario is null) return NotFound();
        if (usuario.EsSuperadmin) throw new ErrorDeNegocio("El superadministrador ya tiene todos los permisos.");

        nuevos = await usuarios.LimpiarPermisosAsync(permisos);
        bd.Permisos.RemoveRange(usuario.Permisos);
        usuario.Permisos = nuevos.Select(p => new Permiso { Area = p.Area, SerieId = p.SerieId }).ToList();
        await auditoria.RegistrarAsync("permisos", "usuario",
            $"{usuario.NombreUsuario}: " + string.Join(", ", nuevos.Select(p => p.SerieId is null ? p.Area.ToString() : $"{p.Area} #{p.SerieId}")));
        await bd.SaveChangesAsync();

        usuario = (await usuarios.CargarAsync(id))!;
        if (!await usuarios.ReflejarEnLdapAsync(usuario)) Response.Headers["X-Advertencia"] = "Permisos guardados, pero no se pudieron reflejar en LDAP.";
        return ServicioUsuarios.ALista(usuario);
    }

    [HttpPost("{id:int}/contrasena")]
    public async Task<IActionResult> RestablecerContrasena(int id, DatosNuevaContrasena datos)
    {
        var usuario = await usuarios.CargarAsync(id);
        if (usuario is null) return NotFound();
        if (Contrasenas.Problema(datos.Contrasena) is { } problema) throw new ErrorDeNegocio(problema);

        if (usuario.Origen == OrigenCuenta.Ldap) await ldap.CambiarContrasenaAsync(usuario.NombreUsuario, datos.Contrasena);
        else usuario.HashContrasena = Contrasenas.Cifrar(datos.Contrasena);
        usuario.SelloSesion = Guid.NewGuid();
        await auditoria.RegistrarAsync("restablecer-contraseña", "usuario", usuario.NombreUsuario);
        await bd.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Vuelve a escribir sus grupos en LDAP (útil si el directorio estuvo caído).</summary>
    [HttpPost("{id:int}/sincronizar-ldap")]
    public async Task<IActionResult> SincronizarLdap(int id)
    {
        var usuario = await usuarios.CargarAsync(id);
        if (usuario is null) return NotFound();
        if (usuario.Origen != OrigenCuenta.Ldap || !ldap.Habilitado) throw new ErrorDeNegocio("La cuenta no es de origen LDAP o LDAP está deshabilitado.");
        if (!await usuarios.ReflejarEnLdapAsync(usuario)) throw new ErrorDeNegocio("No se pudo conectar con el directorio LDAP.", StatusCodes.Status503ServiceUnavailable);
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Eliminar(int id)
    {
        var usuario = await bd.Usuarios.FindAsync(id);
        if (usuario is null) return NotFound();
        if (usuario.EsSuperadmin) throw new ErrorDeNegocio("La cuenta del superadministrador no se puede eliminar.");

        bd.Usuarios.Remove(usuario);
        await auditoria.RegistrarAsync("eliminar", "usuario", usuario.NombreUsuario);
        await bd.SaveChangesAsync();
        if (usuario.Origen == OrigenCuenta.Ldap) await ldap.EliminarUsuarioAsync(usuario.NombreUsuario);
        return NoContent();
    }
}
