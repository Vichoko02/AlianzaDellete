using System.ComponentModel.DataAnnotations;
using Alianza.Servidor.Datos;
using Alianza.Servidor.Seguridad;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace Alianza.Servidor.Modulos;

// Inicio de sesión del panel, perfil propio y cambio de contraseña.

public record DatosInicioSesion([Required, MaxLength(64)] string NombreUsuario, [Required, MaxLength(200)] string Contrasena);

public record DatosCambioContrasena([Required] string ContrasenaActual, [Required] string ContrasenaNueva);

public record SesionIniciada(string Token, DateTime Expira, PerfilUsuario Usuario);

[ApiController]
[Route("api/sesion")]
public class RutasSesion(BaseDeDatos bd, Sesiones sesiones, DirectorioLdap ldap, UsuarioActual actual, Auditoria auditoria,
    ServicioProteccion proteccion, ILogger<RutasSesion> registro) : ControllerBase
{
    [HttpPost("iniciar")]
    [EnableRateLimiting("inicio-sesion")]
    public async Task<ActionResult<SesionIniciada>> Iniciar(DatosInicioSesion datos)
    {
        var nombre = ServicioUsuarios.Normalizar(datos.NombreUsuario);
        var ip = ServicioProteccion.IpDe(HttpContext);
        var correcta = false;
        Usuario? usuario;
        string token;
        DateTime expira;

        // 0. Tras varios intentos fallidos la cuenta queda bloqueada 15 minutos (vale para cualquier nombre, exista o no).
        if (proteccion.CuentaBloqueada(nombre))
            return Problem("Demasiados intentos fallidos. Espera 15 minutos e inténtalo de nuevo.", statusCode: StatusCodes.Status429TooManyRequests);
        usuario = await bd.Usuarios.Include(u => u.Permisos).ThenInclude(p => p.Serie).FirstOrDefaultAsync(u => u.NombreUsuarioNormalizado == nombre);

        // 1. Comprobar la contraseña: en LDAP si la cuenta es de ese origen; si no, contra el hash guardado.
        if (usuario is { Activo: true, Origen: OrigenCuenta.Ldap })
        {
            try { correcta = await ldap.ContrasenaCorrectaAsync(usuario.NombreUsuario, datos.Contrasena); }
            catch (Exception e)
            {
                registro.LogError(e, "LDAP no disponible al iniciar sesión de {Usuario}", usuario.NombreUsuario);
                return Problem("El directorio LDAP no está disponible. Intenta más tarde.", statusCode: StatusCodes.Status503ServiceUnavailable);
            }
        }
        else
        {
            // Se comprueba siempre, exista o no el usuario, para no revelar qué usuarios existen.
            correcta = Contrasenas.Coincide(datos.Contrasena, usuario?.Activo == true ? usuario.HashContrasena : null);
        }
        if (!correcta || usuario is null)
        {
            registro.LogWarning("Inicio de sesión fallido para {Usuario} desde {Ip}", datos.NombreUsuario, ip);
            proteccion.InicioFallido(nombre, ip, Request.Path);
            return Problem("Usuario o contraseña incorrectos.", statusCode: StatusCodes.Status401Unauthorized);
        }

        // 2. Registrar el acceso (avisando si viene de una IP distinta a la anterior) y entregar la sesión.
        proteccion.InicioExitoso(nombre);
        if (usuario.UltimaIp is not null && usuario.UltimaIp != ip)
            proteccion.Registrar(TipoEvento.InicioDesdeIpNueva, ip, Request.Path, $"Entró desde una IP distinta (antes: {usuario.UltimaIp})", usuario.NombreUsuario);
        usuario.UltimaIp = ip;
        usuario.UltimoAcceso = DateTime.UtcNow;
        await bd.SaveChangesAsync();
        (token, expira) = sesiones.Crear(usuario);
        return new SesionIniciada(token, expira, ServicioUsuarios.APerfil(usuario));
    }

    [Authorize]
    [HttpGet("perfil")]
    public async Task<PerfilUsuario> Perfil()
    {
        var usuario = await actual.ObligatorioAsync();
        await bd.Entry(usuario).Collection(u => u.Permisos).Query().Include(p => p.Serie).LoadAsync();
        return ServicioUsuarios.APerfil(usuario);
    }

    [Authorize]
    [HttpPost("cambiar-contrasena")]
    [EnableRateLimiting("inicio-sesion")]
    public async Task<ActionResult<SesionIniciada>> CambiarContrasena(DatosCambioContrasena datos)
    {
        var usuario = await actual.ObligatorioAsync();
        string token;
        DateTime expira;

        // 1. La nueva debe ser aceptable y la actual, correcta.
        if (Contrasenas.Problema(datos.ContrasenaNueva) is { } problema) throw new ErrorDeNegocio(problema);
        if (usuario.Origen == OrigenCuenta.Ldap)
        {
            if (!await ldap.ContrasenaCorrectaAsync(usuario.NombreUsuario, datos.ContrasenaActual)) throw new ErrorDeNegocio("La contraseña actual no es correcta.");
            await ldap.CambiarContrasenaAsync(usuario.NombreUsuario, datos.ContrasenaNueva);
        }
        else
        {
            if (!Contrasenas.Coincide(datos.ContrasenaActual, usuario.HashContrasena))
            {
                proteccion.InicioFallido(usuario.NombreUsuarioNormalizado, ServicioProteccion.IpDe(HttpContext), Request.Path);
                throw new ErrorDeNegocio("La contraseña actual no es correcta.");
            }
            usuario.HashContrasena = Contrasenas.Cifrar(datos.ContrasenaNueva);
        }

        // 2. Cerrar las demás sesiones abiertas y entregar una sesión nueva para esta.
        usuario.SelloSesion = Guid.NewGuid();
        await auditoria.RegistrarAsync("cambiar-contraseña", "usuario", usuario.NombreUsuario);
        await bd.SaveChangesAsync();
        (token, expira) = sesiones.Crear(usuario);
        await bd.Entry(usuario).Collection(u => u.Permisos).Query().Include(p => p.Serie).LoadAsync();
        return new SesionIniciada(token, expira, ServicioUsuarios.APerfil(usuario));
    }
}
