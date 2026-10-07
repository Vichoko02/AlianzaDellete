using System.Text.Json;
using Alianza.Servidor.Modulos;
using Alianza.Servidor.Seguridad;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Alianza.Servidor.Datos;

/// <summary>
/// Prepara la base de datos al arrancar, en este orden:
/// 1) migraciones  2) estados  3) superadmin  4) textos del sitio  5) formulario  6) idiomas iniciales  7) contenido actual (opcional).
/// Cada paso solo agrega lo que falta: arrancar dos veces no duplica nada.
/// </summary>
public class CargaInicial(
    BaseDeDatos bd, ServicioMedios medios, ServicioSeries series, ServicioSocios socios, ServicioSitio sitio, ServicioPostulaciones postulaciones,
    IOptions<ConfiguracionCargaInicial> configuracion, IOptions<ConfiguracionSuperadmin> superadmin, ILogger<CargaInicial> registro)
{
    public static readonly EstadoSerie[] EstadosIniciales =
    [
        new() { Codigo = "en-produccion", Nombre = "En Producción", Color = "#E60000", Orden = 1 },
        new() { Codigo = "en-emision", Nombre = "En Emisión", Color = "#1A6FD4", Orden = 2 },
        new() { Codigo = "pausado", Nombre = "Pausado", Color = "#8A7A1A", Orden = 3 },
        new() { Codigo = "finalizado", Nombre = "Finalizado", Color = "#1A8A3A", Orden = 4 },
        new() { Codigo = "cancelado", Nombre = "Cancelado", Color = "#4A4A4A", Orden = 5 },
        new() { Codigo = "pronto", Nombre = "Muy Pronto", Color = "#6B3FA0", Orden = 6 },
    ];

    public async Task EjecutarAsync()
    {
        // 1. Migraciones.
        if (configuracion.Value.Migrar) await bd.Database.MigrateAsync();

        // 2. Estados de serie.
        if (!await bd.Estados.AnyAsync())
        {
            bd.Estados.AddRange(EstadosIniciales.Select(e => new EstadoSerie { Codigo = e.Codigo, Nombre = e.Nombre, Color = e.Color, Orden = e.Orden }));
            await bd.SaveChangesAsync();
        }

        // 3. Superadmin.
        await CrearSuperadminAsync();

        // 4 y 5. Textos del sitio y formulario de postulación.
        await sitio.SembrarAsync();
        await postulaciones.SembrarAsync();

        // 6. Idiomas iniciales (una sola vez: si después se quita alguno, no vuelve).
        await SembrarIdiomasAsync();

        // 7. Contenido que tenía el sitio escrito a mano, solo si la base de datos aún no tiene series.
        if (configuracion.Value.ImportarContenido && !await bd.Series.AnyAsync())
        {
            await using var transaccion = await bd.Database.BeginTransactionAsync(); // todo o nada
            await ImportarContenidoAsync();
            await transaccion.CommitAsync();
        }
    }

    /// <summary>
    /// El sitio está en español (el idioma principal y original). Además se ofrece, con traducción automática,
    /// en los idiomas más hablados de los países que pueden visitarlo: inglés, portugués (Brasil), francés y alemán.
    /// </summary>
    public static readonly string[] IdiomasIniciales = ["en", "pt-BR", "fr", "de"];

    private async Task SembrarIdiomasAsync()
    {
        if (await bd.Ajustes.AnyAsync(a => a.Clave == "idiomas-iniciales")) return;
        if (!await bd.IdiomasOfrecidos.AnyAsync(i => i.SerieId == null))
            bd.IdiomasOfrecidos.AddRange(IdiomasIniciales.Select(c => new IdiomaOfrecido { Codigo = c, Automatica = true }));
        bd.Ajustes.Add(new Ajuste { Clave = "idiomas-iniciales", Valor = string.Join(",", IdiomasIniciales) });
        await bd.SaveChangesAsync();
    }

    private async Task CrearSuperadminAsync()
    {
        var datos = superadmin.Value;
        if (await bd.Usuarios.AnyAsync(u => u.EsSuperadmin)) return;
        if (string.IsNullOrWhiteSpace(datos.Contrasena))
            throw new InvalidOperationException("No existe el superadministrador y falta su contraseña inicial. Define la variable Superadmin__Contrasena.");
        if (Contrasenas.Problema(datos.Contrasena) is { } problema)
            throw new InvalidOperationException($"Superadmin__Contrasena no es válida: {problema}");

        bd.Usuarios.Add(new Usuario
        {
            NombreUsuario = datos.NombreUsuario,
            NombreUsuarioNormalizado = ServicioUsuarios.Normalizar(datos.NombreUsuario),
            NombreVisible = datos.NombreVisible,
            Origen = OrigenCuenta.Local, // siempre local: si LDAP cae, el superadmin igual puede entrar
            HashContrasena = Contrasenas.Cifrar(datos.Contrasena),
            EsSuperadmin = true,
            PuedeCrearWikis = true,
        });
        await bd.SaveChangesAsync();
        registro.LogInformation("Superadministrador '{Usuario}' creado.", datos.NombreUsuario);
    }

    // ─── Importación del contenido (carga-inicial/contenido.json + imágenes de la carpeta del sitio) ───

    private record CreadorArchivo(string? Nombre, string? Imagen, string? Descripcion, Dictionary<string, string>? Redes, List<DatosObra>? Obras);
    private record PersonajeArchivo(string Nombre, string? Imagen, string? Rol, string? Descripcion, string? ActorVoz, string? ImagenActorVoz);
    private record MiembroArchivo(string Nombre, string? Rol, string? Imagen, string? ImagenAlternativa, string? Socio);
    private record GrupoArchivo(string Categoria, List<MiembroArchivo>? Miembros);
    private record ImagenArchivo(string Imagen, string? TextoAlternativo);
    private record SerieArchivo(
        string Identificador, string Nombre, string? Estado, int Orden, string? Portada, string? Cabecera, string? Logo, string? UrlVideo,
        string? Sinopsis, CreadorArchivo? Creador, Dictionary<string, string>? Redes, Dictionary<string, string>? Apoyo, List<string>? Carrusel,
        List<PersonajeArchivo>? Personajes, List<GrupoArchivo>? Equipo, List<ImagenArchivo>? Galeria);
    private record SocioArchivo(string Nombre, string? Imagen, string? Descripcion, Dictionary<string, string>? Redes, List<string>? Series);
    private record ContenidoArchivo(List<SerieArchivo> Series, List<SocioArchivo> Socios, List<string>? Carrusel);

    private async Task ImportarContenidoAsync()
    {
        var opciones = configuracion.Value;
        var leidas = new Dictionary<string, Guid>();
        ContenidoArchivo contenido;
        List<EstadoSerie> estados;
        Dictionary<string, int> idsSeries;

        // 1. Comprobar que están el archivo y la carpeta de imágenes, y leer el archivo.
        if (!File.Exists(opciones.ArchivoContenido)) { registro.LogWarning("No se encontró {Archivo}; se omite la importación.", opciones.ArchivoContenido); return; }
        if (string.IsNullOrWhiteSpace(opciones.CarpetaImagenes) || !Directory.Exists(opciones.CarpetaImagenes))
        {
            registro.LogWarning("CargaInicial__CarpetaImagenes no apunta a la carpeta de imágenes del sitio; se omite la importación.");
            return;
        }
        contenido = JsonSerializer.Deserialize<ContenidoArchivo>(await File.ReadAllTextAsync(opciones.ArchivoContenido),
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true })!;
        estados = await bd.Estados.ToListAsync();

        // Lee una imagen de la carpeta, la guarda en la base de datos y devuelve su id (una sola vez por archivo).
        async Task<Guid?> Imagen(string? ruta, string? textoAlternativo = null)
        {
            string completa;
            Medio medio;
            if (string.IsNullOrWhiteSpace(ruta) || ruta.StartsWith("http")) return null;
            if (leidas.TryGetValue(ruta, out var id)) return id;
            completa = Path.GetFullPath(Path.Combine(opciones.CarpetaImagenes!, ruta));
            if (!File.Exists(completa)) { registro.LogWarning("Imagen no encontrada: {Ruta}", ruta); return null; }
            medio = await medios.GuardarAsync(await File.ReadAllBytesAsync(completa), Path.GetFileName(completa), textoAlternativo);
            await bd.SaveChangesAsync();
            leidas[ruta] = medio.Id;
            return medio.Id;
        }
        static List<DatosEnlace> Redes(Dictionary<string, string>? redes) => (redes ?? [])
            .Where(r => Validacion.Plataformas.Contains(r.Key) && Validacion.EsUrlHttp(r.Value))
            .Select(r => new DatosEnlace(r.Key, r.Value.Trim())).ToList();

        // 2. Series.
        foreach (var s in contenido.Series)
        {
            var estado = estados.FirstOrDefault(e => string.Equals(e.Nombre, s.Estado?.Trim(), StringComparison.OrdinalIgnoreCase))
                         ?? estados.First(e => e.Codigo == "en-produccion");
            var carrusel = new List<DatosImagen>();
            var galeria = new List<DatosImagen>();
            var personajes = new List<DatosPersonaje>();
            var equipo = new List<DatosGrupoEquipo>();
            var serie = new Serie();

            foreach (var ruta in s.Carrusel ?? []) if (await Imagen(ruta) is { } id) carrusel.Add(new DatosImagen(id, ""));
            foreach (var g in s.Galeria ?? []) if (await Imagen(g.Imagen, g.TextoAlternativo) is { } id) galeria.Add(new DatosImagen(id, g.TextoAlternativo));
            foreach (var p in s.Personajes ?? [])
                personajes.Add(new DatosPersonaje(p.Nombre, p.Rol, p.Descripcion, await Imagen(p.Imagen), p.ActorVoz, await Imagen(p.ImagenActorVoz)));
            foreach (var g in s.Equipo ?? [])
            {
                var miembros = new List<DatosMiembro>();
                foreach (var m in g.Miembros ?? []) miembros.Add(new DatosMiembro(m.Nombre, m.Rol, await Imagen(m.Imagen), await Imagen(m.ImagenAlternativa)));
                equipo.Add(new DatosGrupoEquipo(g.Categoria, miembros));
            }

            await series.GuardarAsync(serie, new SerieEditable(
                null, s.Identificador, s.Nombre, s.Sinopsis, estado.Id,
                await Imagen(s.Portada), await Imagen(s.Cabecera), await Imagen(s.Logo), s.UrlVideo, null,
                new DatosCreador(s.Creador?.Nombre, s.Creador?.Descripcion, await Imagen(s.Creador?.Imagen), Redes(s.Creador?.Redes), s.Creador?.Obras),
                Redes(s.Redes), Redes(s.Apoyo), carrusel, galeria, personajes, equipo, s.Orden, Publicada: true));
            bd.Series.Add(serie);
            await bd.SaveChangesAsync();
        }

        // 3. Socios, vinculados a sus series por identificador.
        idsSeries = await bd.Series.ToDictionaryAsync(x => x.Identificador, x => x.Id);
        for (var i = 0; i < contenido.Socios.Count; i++)
        {
            var s = contenido.Socios[i];
            var socio = new Socio();
            var vinculadas = (s.Series ?? []).Where(idsSeries.ContainsKey).Select(x => idsSeries[x]).Distinct().ToList();
            await socios.GuardarAsync(socio, new SocioEditable(null, AIdentificador(s.Nombre), s.Nombre, s.Descripcion,
                await Imagen(s.Imagen), i, true, Redes(s.Redes), vinculadas));
            bd.Socios.Add(socio);
            await bd.SaveChangesAsync();
        }

        // 3b. Miembros de equipos que también son socios (se vinculan ahora que los socios existen).
        var idsSocios = await bd.Socios.ToDictionaryAsync(x => x.Identificador, x => x.Id);
        foreach (var s in contenido.Series)
            foreach (var m in (s.Equipo ?? []).SelectMany(g => g.Miembros ?? []).Where(m => m.Socio is not null))
            {
                if (!idsSocios.TryGetValue(m.Socio!, out var idSocio)) { registro.LogWarning("Socio {Socio} no encontrado para {Miembro}", m.Socio, m.Nombre); continue; }
                var miembro = await bd.MiembrosEquipo.FirstOrDefaultAsync(x => x.Nombre == m.Nombre
                    && bd.Set<GrupoEquipo>().Any(g => g.Id == x.GrupoId && bd.Series.Any(z => z.Id == g.SerieId && z.Identificador == s.Identificador)));
                if (miembro is not null) miembro.SocioId = idSocio;
            }
        await bd.SaveChangesAsync();

        // 4. Banners del carrusel de la portada.
        var banners = new List<Guid>();
        foreach (var ruta in contenido.Carrusel ?? []) if (await Imagen(ruta, "Banner") is { } id) banners.Add(id);
        var textoCarrusel = await bd.TextosSitio.FindAsync("inicio.carrusel");
        if (textoCarrusel is not null && textoCarrusel.Valor == "") textoCarrusel.Valor = string.Join(",", banners);
        await bd.SaveChangesAsync();

        registro.LogInformation("Contenido importado: {Series} series, {Socios} socios, {Imagenes} imágenes.",
            contenido.Series.Count, contenido.Socios.Count, leidas.Count);
    }

    /// <summary>"Julio di esto" → "julio-di-esto".</summary>
    public static string AIdentificador(string texto)
    {
        var sinTildes = new System.Text.StringBuilder();
        foreach (var letra in texto.Normalize(System.Text.NormalizationForm.FormD))
        {
            if (System.Globalization.CharUnicodeInfo.GetUnicodeCategory(letra) == System.Globalization.UnicodeCategory.NonSpacingMark) continue;
            sinTildes.Append(char.IsLetterOrDigit(letra) ? char.ToLowerInvariant(letra) : '-');
        }
        return System.Text.RegularExpressions.Regex.Replace(sinTildes.ToString(), "-+", "-").Trim('-');
    }
}
