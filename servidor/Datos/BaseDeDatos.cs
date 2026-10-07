using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Alianza.Servidor.Datos;

/// <summary>Acceso a PostgreSQL: una propiedad por tabla y, abajo, las reglas de cada tabla.</summary>
public class BaseDeDatos(DbContextOptions<BaseDeDatos> opciones) : DbContext(opciones)
{
    public DbSet<EstadoSerie> Estados => Set<EstadoSerie>();
    public DbSet<Serie> Series => Set<Serie>();
    public DbSet<Enlace> Enlaces => Set<Enlace>();
    public DbSet<ImagenSerie> ImagenesSerie => Set<ImagenSerie>();
    public DbSet<Personaje> Personajes => Set<Personaje>();
    public DbSet<MiembroEquipo> MiembrosEquipo => Set<MiembroEquipo>();
    public DbSet<Socio> Socios => Set<Socio>();
    public DbSet<SocioSerie> SociosSeries => Set<SocioSerie>();
    public DbSet<Medio> Medios => Set<Medio>();
    public DbSet<ContenidoMedio> ContenidosMedio => Set<ContenidoMedio>();
    public DbSet<TextoSitio> TextosSitio => Set<TextoSitio>();
    public DbSet<EnlaceSitio> EnlacesSitio => Set<EnlaceSitio>();
    public DbSet<Pregunta> Preguntas => Set<Pregunta>();
    public DbSet<Postulacion> Postulaciones => Set<Postulacion>();
    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<Permiso> Permisos => Set<Permiso>();
    public DbSet<RegistroAuditoria> Auditoria => Set<RegistroAuditoria>();
    public DbSet<EventoSeguridad> EventosSeguridad => Set<EventoSeguridad>();
    public DbSet<BloqueoIp> BloqueosIp => Set<BloqueoIp>();
    public DbSet<IpPermitida> IpsPermitidas => Set<IpPermitida>();
    public DbSet<Ajuste> Ajustes => Set<Ajuste>();
    public DbSet<IdiomaOfrecido> IdiomasOfrecidos => Set<IdiomaOfrecido>();
    public DbSet<Traduccion> Traducciones => Set<Traduccion>();

    protected override void OnModelCreating(ModelBuilder modelo)
    {
        // 1. Contenido
        modelo.Entity<EstadoSerie>(t => t.HasIndex(x => x.Codigo).IsUnique());

        modelo.Entity<Serie>(t =>
        {
            t.HasIndex(x => x.Identificador).IsUnique();
            // Un estado en uso no se puede borrar.
            t.HasOne(x => x.Estado).WithMany().HasForeignKey(x => x.EstadoId).OnDelete(DeleteBehavior.Restrict);
            t.HasMany(x => x.Enlaces).WithOne().HasForeignKey(x => x.SerieId).OnDelete(DeleteBehavior.Cascade);
            t.HasMany(x => x.ObrasCreador).WithOne().HasForeignKey(x => x.SerieId).OnDelete(DeleteBehavior.Cascade);
            t.HasMany(x => x.Imagenes).WithOne().HasForeignKey(x => x.SerieId).OnDelete(DeleteBehavior.Cascade);
            t.HasMany(x => x.Personajes).WithOne().HasForeignKey(x => x.SerieId).OnDelete(DeleteBehavior.Cascade);
            t.HasMany(x => x.Equipo).WithOne().HasForeignKey(x => x.SerieId).OnDelete(DeleteBehavior.Cascade);
            ApuntaAMedio(t, x => x.PortadaId);
            ApuntaAMedio(t, x => x.CabeceraId);
            ApuntaAMedio(t, x => x.LogoId);
            ApuntaAMedio(t, x => x.VideoPropioId);
            ApuntaAMedio(t, x => x.CreadorImagenId);
        });

        modelo.Entity<Enlace>(t => t.ToTable(x => x.HasCheckConstraint("ck_enlace_un_dueno",
            "(serie_id IS NOT NULL AND socio_id IS NULL) OR (serie_id IS NULL AND socio_id IS NOT NULL)")));
        modelo.Entity<ImagenSerie>(t => ApuntaAMedio(t, x => x.MedioId, obligatorio: true));
        modelo.Entity<Personaje>(t =>
        {
            ApuntaAMedio(t, x => x.ImagenId);
            ApuntaAMedio(t, x => x.ImagenActorVozId);
        });
        modelo.Entity<GrupoEquipo>(t => t.HasMany(x => x.Miembros).WithOne().HasForeignKey(x => x.GrupoId).OnDelete(DeleteBehavior.Cascade));
        modelo.Entity<MiembroEquipo>(t =>
        {
            ApuntaAMedio(t, x => x.ImagenId);
            ApuntaAMedio(t, x => x.ImagenAlternativaId);
            // Si el socio se elimina, el miembro queda en el equipo, solo que ya no figura como socio.
            t.HasOne(x => x.Socio).WithMany().HasForeignKey(x => x.SocioId).OnDelete(DeleteBehavior.SetNull);
        });

        modelo.Entity<Socio>(t =>
        {
            t.HasIndex(x => x.Identificador).IsUnique();
            t.HasMany(x => x.Enlaces).WithOne().HasForeignKey(x => x.SocioId).OnDelete(DeleteBehavior.Cascade);
            ApuntaAMedio(t, x => x.ImagenId);
        });
        modelo.Entity<SocioSerie>(t =>
        {
            t.HasKey(x => new { x.SocioId, x.SerieId });
            t.HasOne(x => x.Socio).WithMany(x => x.Series).HasForeignKey(x => x.SocioId).OnDelete(DeleteBehavior.Cascade);
            t.HasOne(x => x.Serie).WithMany(x => x.Socios).HasForeignKey(x => x.SerieId).OnDelete(DeleteBehavior.Cascade);
        });

        modelo.Entity<Medio>(t =>
        {
            t.HasIndex(x => x.Huella).IsUnique();
            t.HasOne(x => x.Contenido).WithOne().HasForeignKey<ContenidoMedio>(x => x.MedioId).OnDelete(DeleteBehavior.Cascade);
        });
        modelo.Entity<ContenidoMedio>(t => t.HasKey(x => x.MedioId));

        // 2. Textos del sitio y formulario
        modelo.Entity<TextoSitio>(t => t.HasKey(x => x.Clave));
        modelo.Entity<Postulacion>(t =>
        {
            t.HasIndex(x => new { x.Estado, x.RecibidaEn });
            t.HasMany(x => x.Respuestas).WithOne().HasForeignKey(x => x.PostulacionId).OnDelete(DeleteBehavior.Cascade);
        });

        // 3. Cuentas y permisos
        modelo.Entity<Usuario>(t =>
        {
            t.HasIndex(x => x.NombreUsuarioNormalizado).IsUnique();
            t.HasMany(x => x.Permisos).WithOne().HasForeignKey(x => x.UsuarioId).OnDelete(DeleteBehavior.Cascade);
            // La base de datos garantiza que exista como máximo un superadmin.
            t.HasIndex(x => x.EsSuperadmin).IsUnique().HasFilter("es_superadmin").HasDatabaseName("ux_usuarios_un_superadmin");
        });
        modelo.Entity<Permiso>(t =>
        {
            t.HasOne(x => x.Serie).WithMany().HasForeignKey(x => x.SerieId).OnDelete(DeleteBehavior.Cascade);
            t.HasIndex(x => new { x.UsuarioId, x.Area, x.SerieId }).IsUnique().AreNullsDistinct(false);
        });
        modelo.Entity<RegistroAuditoria>(t => t.HasIndex(x => x.Fecha));
        modelo.Entity<IdiomaOfrecido>(t =>
        {
            t.HasOne(x => x.Serie).WithMany().HasForeignKey(x => x.SerieId).OnDelete(DeleteBehavior.Cascade);
            t.HasIndex(x => new { x.SerieId, x.Codigo }).IsUnique().AreNullsDistinct(false);
        });
        modelo.Entity<Traduccion>(t => t.HasKey(x => new { x.Idioma, x.Huella }));
        modelo.Entity<EventoSeguridad>(t =>
        {
            t.Property(x => x.Tipo).HasConversion<string>().HasMaxLength(30);
            t.Property(x => x.Gravedad).HasConversion<string>().HasMaxLength(10);
            t.HasIndex(x => x.Fecha);
            t.HasIndex(x => x.Ip);
            t.HasIndex(x => new { x.Gravedad, x.Revisado });
        });
    }

    /// <summary>Columna que apunta a un medio; si el medio se borra, queda en null (o lo impide si es obligatoria).</summary>
    private static void ApuntaAMedio<T>(EntityTypeBuilder<T> tabla, System.Linq.Expressions.Expression<Func<T, object?>> columna,
        bool obligatorio = false) where T : class
    {
        tabla.HasOne<Medio>().WithMany().HasForeignKey(columna)
            .IsRequired(obligatorio)
            .OnDelete(obligatorio ? DeleteBehavior.Restrict : DeleteBehavior.SetNull);
    }
}

/// <summary>Solo para "dotnet ef migrations": crea la base de datos sin arrancar el servidor.</summary>
public class BaseDeDatosParaMigraciones : IDesignTimeDbContextFactory<BaseDeDatos>
{
    public BaseDeDatos CreateDbContext(string[] args)
    {
        var conexion = Environment.GetEnvironmentVariable("BaseDeDatos") ?? "Host=localhost;Database=alianza_migraciones";
        return new BaseDeDatos(new DbContextOptionsBuilder<BaseDeDatos>().UseNpgsql(conexion).UseSnakeCaseNamingConvention().Options);
    }
}
