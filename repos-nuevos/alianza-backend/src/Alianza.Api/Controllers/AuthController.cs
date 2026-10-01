using Alianza.Api.Auth;
using Alianza.Api.Data;
using Alianza.Api.Domain;
using Alianza.Api.Dtos;
using Alianza.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace Alianza.Api.Controllers;

/// <summary>Inicio de sesión del panel. Solo existen cuentas administrativas: los visitantes del sitio no inician sesión.</summary>
[ApiController]
[Route("api/auth")]
public class AuthController(
    AlianzaDbContext db, ServicioTokens tokens, IDirectorioLdap ldap, UsuarioActual actual,
    ServicioAuditoria auditoria, ILogger<AuthController> log) : ControllerBase
{
    [HttpPost("login")]
    [EnableRateLimiting("login")]
    public async Task<ActionResult<SesionDto>> Login(LoginDto dto)
    {
        var u = await db.Usuarios.Include(x => x.Permisos).ThenInclude(p => p.Serie)
            .FirstOrDefaultAsync(x => x.UsernameNormalizado == ServicioUsuarios.Normalizar(dto.Username));

        var valido = false;
        if (u is { Activo: true, Origen: OrigenAuth.Ldap })
        {
            try { valido = await ldap.AutenticarAsync(u.Username, dto.Password); }
            catch (Exception e)
            {
                log.LogError(e, "LDAP no disponible al autenticar a {Username}", u.Username);
                return Problem("El directorio LDAP no está disponible. Intenta más tarde.", statusCode: StatusCodes.Status503ServiceUnavailable);
            }
        }
        else
        {
            // Se verifica siempre (incluso si el usuario no existe) para no revelar qué usuarios existen.
            valido = Contrasenas.Verificar(dto.Password, u?.Activo == true ? u.PasswordHash : null);
        }

        if (!valido || u is null)
        {
            log.LogWarning("Login fallido para {Username} desde {Ip}", dto.Username, HttpContext.Connection.RemoteIpAddress);
            return Problem("Usuario o contraseña incorrectos.", statusCode: StatusCodes.Status401Unauthorized);
        }

        u.UltimoAcceso = DateTime.UtcNow;
        await db.SaveChangesAsync();
        var (token, expira) = tokens.Emitir(u);
        return new SesionDto(token, expira, ServicioUsuarios.APerfil(u));
    }

    [Authorize]
    [HttpGet("yo")]
    public async Task<PerfilDto> Yo()
    {
        var u = await actual.RequeridoAsync();
        await db.Entry(u).Collection(x => x.Permisos).Query().Include(p => p.Serie).LoadAsync();
        return ServicioUsuarios.APerfil(u);
    }

    [Authorize]
    [HttpPost("cambiar-password")]
    [EnableRateLimiting("login")]
    public async Task<ActionResult<SesionDto>> CambiarPassword(CambiarPasswordDto dto)
    {
        var u = await actual.RequeridoAsync();
        if (Contrasenas.Validar(dto.PasswordNueva) is { } error) throw new ErrorNegocio(error);

        if (u.Origen == OrigenAuth.Ldap)
        {
            if (!await ldap.AutenticarAsync(u.Username, dto.PasswordActual)) throw new ErrorNegocio("La contraseña actual no es correcta.");
            await ldap.CambiarPasswordAsync(u.Username, dto.PasswordNueva);
        }
        else
        {
            if (!Contrasenas.Verificar(dto.PasswordActual, u.PasswordHash)) throw new ErrorNegocio("La contraseña actual no es correcta.");
            u.PasswordHash = Contrasenas.Hashear(dto.PasswordNueva);
        }

        // Invalida las demás sesiones abiertas y entrega un token nuevo para esta.
        u.SelloSeguridad = Guid.NewGuid();
        await auditoria.RegistrarAsync("cambiar-password", "usuario", u.Id);
        await db.SaveChangesAsync();
        var (token, expira) = tokens.Emitir(u);
        await db.Entry(u).Collection(x => x.Permisos).Query().Include(p => p.Serie).LoadAsync();
        return new SesionDto(token, expira, ServicioUsuarios.APerfil(u));
    }
}
