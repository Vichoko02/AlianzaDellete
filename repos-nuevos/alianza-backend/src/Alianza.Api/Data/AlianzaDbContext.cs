using Alianza.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Alianza.Api.Data;

public class AlianzaDbContext(DbContextOptions<AlianzaDbContext> options) : DbContext(options)
{
    public DbSet<EstadoSerie> Estados => Set<EstadoSerie>();
    public DbSet<Serie> Series => Set<Serie>();
    public DbSet<EnlaceRed> Enlaces => Set<EnlaceRed>();
    public DbSet<ObraCreador> Obras => Set<ObraCreador>();
    public DbSet<SerieImagen> SerieImagenes => Set<SerieImagen>();
    public DbSet<Personaje> Personajes => Set<Personaje>();
    public DbSet<GrupoEquipo> GruposEquipo => Set<GrupoEquipo>();
    public DbSet<MiembroEquipo> MiembrosEquipo => Set<MiembroEquipo>();
    public DbSet<Socio> Socios => Set<Socio>();
    public DbSet<SocioSerie> SociosSeries => Set<SocioSerie>();
    public DbSet<Medio> Medios => Set<Medio>();
    public DbSet<MedioContenido> MediosContenido => Set<MedioContenido>();
    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<PermisoUsuario> Permisos => Set<PermisoUsuario>();
    public DbSet<RegistroAuditoria> Auditoria => Set<RegistroAuditoria>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<EstadoSerie>(e =>
        {
            e.HasIndex(x => x.Codigo).IsUnique();
            e.Property(x => x.Codigo).HasMaxLength(50);
            e.Property(x => x.Nombre).HasMaxLength(80);
            e.Property(x => x.Color).HasMaxLength(7);
        });

        b.Entity<Serie>(e =>
        {
            e.HasIndex(x => x.Slug).IsUnique();
            e.Property(x => x.Slug).HasMaxLength(80);
            e.Property(x => x.Nombre).HasMaxLength(150);
            e.Property(x => x.CreadorNombre).HasMaxLength(150);
            e.Property(x => x.VideoUrl).HasMaxLength(500);
            // Un estado en uso no se puede borrar.
            e.HasOne(x => x.Estado).WithMany().HasForeignKey(x => x.EstadoId).OnDelete(DeleteBehavior.Restrict);
            e.HasMany(x => x.Enlaces).WithOne().HasForeignKey(x => x.SerieId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.ObrasCreador).WithOne().HasForeignKey(x => x.SerieId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.Imagenes).WithOne().HasForeignKey(x => x.SerieId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.Personajes).WithOne().HasForeignKey(x => x.SerieId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.Equipo).WithOne().HasForeignKey(x => x.SerieId).OnDelete(DeleteBehavior.Cascade);
            ReferenciaMedio(e, x => x.PortadaId);
            ReferenciaMedio(e, x => x.BannerId);
            ReferenciaMedio(e, x => x.LogoId);
            ReferenciaMedio(e, x => x.VideoLocalId);
            ReferenciaMedio(e, x => x.CreadorImagenId);
        });

        b.Entity<EnlaceRed>(e =>
        {
            e.Property(x => x.Plataforma).HasMaxLength(40);
            e.Property(x => x.Url).HasMaxLength(500);
            e.ToTable(t => t.HasCheckConstraint("ck_enlace_un_propietario",
                "(serie_id IS NOT NULL AND socio_id IS NULL) OR (serie_id IS NULL AND socio_id IS NOT NULL)"));
        });

        b.Entity<ObraCreador>(e => e.Property(x => x.Titulo).HasMaxLength(200));
        b.Entity<SerieImagen>(e => ReferenciaMedio(e, x => x.MedioId, requerido: true));
        b.Entity<Personaje>(e =>
        {
            ReferenciaMedio(e, x => x.ImagenId);
            ReferenciaMedio(e, x => x.ImagenActorVozId);
        });
        b.Entity<GrupoEquipo>(e =>
            e.HasMany(x => x.Miembros).WithOne().HasForeignKey(x => x.GrupoId).OnDelete(DeleteBehavior.Cascade));
        b.Entity<MiembroEquipo>(e => ReferenciaMedio(e, x => x.ImagenId));

        b.Entity<Socio>(e =>
        {
            e.HasIndex(x => x.Slug).IsUnique();
            e.Property(x => x.Slug).HasMaxLength(80);
            e.Property(x => x.Nombre).HasMaxLength(150);
            e.HasMany(x => x.Enlaces).WithOne().HasForeignKey(x => x.SocioId).OnDelete(DeleteBehavior.Cascade);
            ReferenciaMedio(e, x => x.ImagenId);
        });

        b.Entity<SocioSerie>(e =>
        {
            e.HasKey(x => new { x.SocioId, x.SerieId });
            e.HasOne(x => x.Socio).WithMany(x => x.Series).HasForeignKey(x => x.SocioId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Serie).WithMany(x => x.Socios).HasForeignKey(x => x.SerieId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<Medio>(e =>
        {
            e.HasIndex(x => x.Sha256).IsUnique();
            e.Property(x => x.NombreArchivo).HasMaxLength(255);
            e.Property(x => x.TipoContenido).HasMaxLength(100);
            e.Property(x => x.Sha256).HasMaxLength(64);
            e.HasOne(x => x.Contenido).WithOne().HasForeignKey<MedioContenido>(x => x.MedioId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne<Usuario>().WithMany().HasForeignKey(x => x.SubidoPorId).OnDelete(DeleteBehavior.SetNull);
        });
        b.Entity<MedioContenido>(e => e.HasKey(x => x.MedioId));

        b.Entity<Usuario>(e =>
        {
            e.Property(x => x.Username).HasMaxLength(64);
            e.Property(x => x.NombreVisible).HasMaxLength(150);
            e.Property(x => x.Email).HasMaxLength(255);
            // Nombres de usuario únicos sin distinguir mayúsculas.
            e.Property(x => x.UsernameNormalizado).HasMaxLength(64);
            e.HasIndex(x => x.UsernameNormalizado).IsUnique();
            e.HasMany(x => x.Permisos).WithOne().HasForeignKey(x => x.UsuarioId).OnDelete(DeleteBehavior.Cascade);
            // Garantiza a nivel de BD que exista como máximo un superadmin.
            e.HasIndex(x => x.EsSuperAdmin).IsUnique().HasFilter("es_super_admin").HasDatabaseName("ux_usuarios_un_superadmin");
        });

        b.Entity<PermisoUsuario>(e =>
        {
            e.HasOne(x => x.Serie).WithMany().HasForeignKey(x => x.SerieId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => new { x.UsuarioId, x.Ambito, x.SerieId }).IsUnique().AreNullsDistinct(false);
        });

        b.Entity<RegistroAuditoria>(e =>
        {
            e.HasIndex(x => x.Fecha);
            e.Property(x => x.Accion).HasMaxLength(60);
            e.Property(x => x.Entidad).HasMaxLength(60);
            e.Property(x => x.Username).HasMaxLength(64);
        });
    }

    /// <summary>FK hacia Medio sin propiedad de navegación; al borrar el medio la referencia queda en null.</summary>
    private static void ReferenciaMedio<T>(Microsoft.EntityFrameworkCore.Metadata.Builders.EntityTypeBuilder<T> e,
        System.Linq.Expressions.Expression<Func<T, object?>> fk, bool requerido = false) where T : class
    {
        e.HasOne<Medio>().WithMany().HasForeignKey(fk)
            .IsRequired(requerido)
            .OnDelete(requerido ? DeleteBehavior.Restrict : DeleteBehavior.SetNull);
    }
}
