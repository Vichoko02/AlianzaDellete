using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Alianza.Api.Domain;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Alianza.Api.Auth;

public static class Claims
{
    public const string Sello = "sello";
    public const string SuperAdmin = "superadmin";
}

public class ServicioTokens(IOptions<JwtOpciones> opciones)
{
    private readonly JwtOpciones _op = opciones.Value;

    public static SymmetricSecurityKey Clave(JwtOpciones op) => new(Encoding.UTF8.GetBytes(op.Clave));

    public (string Token, DateTime Expira) Emitir(Usuario u)
    {
        var expira = DateTime.UtcNow.AddHours(_op.DuracionHoras);
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, u.Id.ToString()),
            new(JwtRegisteredClaimNames.UniqueName, u.Username),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(Claims.Sello, u.SelloSeguridad.ToString()),
        };
        if (u.EsSuperAdmin) claims.Add(new Claim(Claims.SuperAdmin, "true"));

        var token = new JwtSecurityToken(
            issuer: _op.Emisor,
            audience: _op.Audiencia,
            claims: claims,
            expires: expira,
            signingCredentials: new SigningCredentials(Clave(_op), SecurityAlgorithms.HmacSha256));
        return (new JwtSecurityTokenHandler().WriteToken(token), expira);
    }
}

public static class Contrasenas
{
    private const int Coste = 12;
    // Hash fijo para gastar el mismo tiempo cuando el usuario no existe (evita enumerar usuarios por tiempo de respuesta).
    private static readonly string HashFicticio = BCrypt.Net.BCrypt.HashPassword("no-existe", Coste);

    public static string Hashear(string password) => BCrypt.Net.BCrypt.HashPassword(password, Coste);

    public static bool Verificar(string password, string? hash) =>
        BCrypt.Net.BCrypt.Verify(password, hash ?? HashFicticio) && hash is not null;

    /// <summary>Devuelve un mensaje de error o null si la contraseña es aceptable.</summary>
    public static string? Validar(string? password)
    {
        if (string.IsNullOrEmpty(password) || password.Length < 10)
            return "La contraseña debe tener al menos 10 caracteres.";
        if (password.Length > 72)
            return "La contraseña no puede superar 72 caracteres.";
        if (!password.Any(char.IsLetter) || !password.Any(char.IsDigit))
            return "La contraseña debe combinar letras y números.";
        return null;
    }
}
