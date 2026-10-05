using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Alianza.Servidor.Datos;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Alianza.Servidor.Seguridad;

/// <summary>Contraseñas guardadas con BCrypt y reglas mínimas para aceptarlas.</summary>
public static class Contrasenas
{
    private const int Coste = 12;
    // Hash fijo para tardar lo mismo cuando el usuario no existe (no revela qué usuarios existen).
    private static readonly string HashDeRelleno = BCrypt.Net.BCrypt.HashPassword("no-existe", Coste);

    public static string Cifrar(string contrasena) => BCrypt.Net.BCrypt.HashPassword(contrasena, Coste);

    public static bool Coincide(string contrasena, string? hash)
    {
        var coincide = BCrypt.Net.BCrypt.Verify(contrasena, hash ?? HashDeRelleno);
        return coincide && hash is not null;
    }

    /// <summary>Devuelve el motivo del rechazo, o null si la contraseña es aceptable.</summary>
    public static string? Problema(string? contrasena)
    {
        if (string.IsNullOrEmpty(contrasena) || contrasena.Length < 10) return "La contraseña debe tener al menos 10 caracteres.";
        if (contrasena.Length > 72) return "La contraseña no puede superar 72 caracteres.";
        if (!contrasena.Any(char.IsLetter) || !contrasena.Any(char.IsDigit)) return "La contraseña debe combinar letras y números.";
        return null;
    }
}

/// <summary>Datos que viajan dentro de la sesión (token JWT).</summary>
public static class DatosSesion
{
    public const string Sello = "sello";
    public const string Superadmin = "superadmin";
}

/// <summary>Crea las sesiones (tokens JWT firmados) del panel.</summary>
public class Sesiones(IOptions<ConfiguracionSesiones> configuracion)
{
    private readonly ConfiguracionSesiones _configuracion = configuracion.Value;

    public static SymmetricSecurityKey Llave(ConfiguracionSesiones configuracion) => new(Encoding.UTF8.GetBytes(configuracion.Clave));

    public (string Token, DateTime Expira) Crear(Usuario usuario)
    {
        var expira = DateTime.UtcNow.AddHours(_configuracion.DuracionHoras);
        var datos = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, usuario.Id.ToString()),
            new(JwtRegisteredClaimNames.UniqueName, usuario.NombreUsuario),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(DatosSesion.Sello, usuario.SelloSesion.ToString()),
        };
        if (usuario.EsSuperadmin) datos.Add(new Claim(DatosSesion.Superadmin, "true"));

        var token = new JwtSecurityToken(
            issuer: _configuracion.Emisor,
            audience: _configuracion.Audiencia,
            claims: datos,
            expires: expira,
            signingCredentials: new SigningCredentials(Llave(_configuracion), SecurityAlgorithms.HmacSha256));
        return (new JwtSecurityTokenHandler().WriteToken(token), expira);
    }
}
