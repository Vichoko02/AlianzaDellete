using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Alianza.Api.Data.Migraciones
{
    /// <inheritdoc />
    public partial class Inicial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "auditoria",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    fecha = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    usuario_id = table.Column<int>(type: "integer", nullable: true),
                    username = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    accion = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    entidad = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    entidad_id = table.Column<string>(type: "text", nullable: true),
                    detalle = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_auditoria", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "estados",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    codigo = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    nombre = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    color = table.Column<string>(type: "character varying(7)", maxLength: 7, nullable: false),
                    orden = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_estados", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "usuarios",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    username = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    username_normalizado = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    nombre_visible = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    password_hash = table.Column<string>(type: "text", nullable: true),
                    origen = table.Column<int>(type: "integer", nullable: false),
                    es_super_admin = table.Column<bool>(type: "boolean", nullable: false),
                    puede_crear_wikis = table.Column<bool>(type: "boolean", nullable: false),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    sello_seguridad = table.Column<Guid>(type: "uuid", nullable: false),
                    creado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ultimo_acceso = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_usuarios", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "medios",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    nombre_archivo = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    tipo_contenido = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    tamano = table.Column<long>(type: "bigint", nullable: false),
                    sha256 = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    alt = table.Column<string>(type: "text", nullable: false),
                    creado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    subido_por_id = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_medios", x => x.id);
                    table.ForeignKey(
                        name: "fk_medios_usuarios_subido_por_id",
                        column: x => x.subido_por_id,
                        principalTable: "usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "medios_contenido",
                columns: table => new
                {
                    medio_id = table.Column<Guid>(type: "uuid", nullable: false),
                    datos = table.Column<byte[]>(type: "bytea", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_medios_contenido", x => x.medio_id);
                    table.ForeignKey(
                        name: "fk_medios_contenido_medios_medio_id",
                        column: x => x.medio_id,
                        principalTable: "medios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "series",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    slug = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    nombre = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    sinopsis = table.Column<string>(type: "text", nullable: false),
                    estado_id = table.Column<int>(type: "integer", nullable: false),
                    portada_id = table.Column<Guid>(type: "uuid", nullable: true),
                    banner_id = table.Column<Guid>(type: "uuid", nullable: true),
                    logo_id = table.Column<Guid>(type: "uuid", nullable: true),
                    video_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    video_local_id = table.Column<Guid>(type: "uuid", nullable: true),
                    creador_nombre = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    creador_descripcion = table.Column<string>(type: "text", nullable: false),
                    creador_imagen_id = table.Column<Guid>(type: "uuid", nullable: true),
                    orden = table.Column<int>(type: "integer", nullable: false),
                    publicada = table.Column<bool>(type: "boolean", nullable: false),
                    creado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    actualizado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_series", x => x.id);
                    table.ForeignKey(
                        name: "fk_series_estados_estado_id",
                        column: x => x.estado_id,
                        principalTable: "estados",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_series_medios_banner_id",
                        column: x => x.banner_id,
                        principalTable: "medios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_series_medios_creador_imagen_id",
                        column: x => x.creador_imagen_id,
                        principalTable: "medios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_series_medios_logo_id",
                        column: x => x.logo_id,
                        principalTable: "medios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_series_medios_portada_id",
                        column: x => x.portada_id,
                        principalTable: "medios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_series_medios_video_local_id",
                        column: x => x.video_local_id,
                        principalTable: "medios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "socios",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    slug = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    nombre = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    descripcion = table.Column<string>(type: "text", nullable: false),
                    imagen_id = table.Column<Guid>(type: "uuid", nullable: true),
                    orden = table.Column<int>(type: "integer", nullable: false),
                    publicado = table.Column<bool>(type: "boolean", nullable: false),
                    creado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    actualizado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_socios", x => x.id);
                    table.ForeignKey(
                        name: "fk_socios_medios_imagen_id",
                        column: x => x.imagen_id,
                        principalTable: "medios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "grupos_equipo",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    serie_id = table.Column<int>(type: "integer", nullable: false),
                    categoria = table.Column<string>(type: "text", nullable: false),
                    orden = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_grupos_equipo", x => x.id);
                    table.ForeignKey(
                        name: "fk_grupos_equipo_series_serie_id",
                        column: x => x.serie_id,
                        principalTable: "series",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "obras",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    serie_id = table.Column<int>(type: "integer", nullable: false),
                    titulo = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    url = table.Column<string>(type: "text", nullable: true),
                    orden = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_obras", x => x.id);
                    table.ForeignKey(
                        name: "fk_obras_series_serie_id",
                        column: x => x.serie_id,
                        principalTable: "series",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "permisos",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    usuario_id = table.Column<int>(type: "integer", nullable: false),
                    ambito = table.Column<int>(type: "integer", nullable: false),
                    serie_id = table.Column<int>(type: "integer", nullable: true),
                    otorgado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    otorgado_por_id = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_permisos", x => x.id);
                    table.ForeignKey(
                        name: "fk_permisos_series_serie_id",
                        column: x => x.serie_id,
                        principalTable: "series",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_permisos_usuarios_usuario_id",
                        column: x => x.usuario_id,
                        principalTable: "usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "personajes",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    serie_id = table.Column<int>(type: "integer", nullable: false),
                    nombre = table.Column<string>(type: "text", nullable: false),
                    rol = table.Column<string>(type: "text", nullable: false),
                    descripcion = table.Column<string>(type: "text", nullable: false),
                    imagen_id = table.Column<Guid>(type: "uuid", nullable: true),
                    actor_voz = table.Column<string>(type: "text", nullable: true),
                    imagen_actor_voz_id = table.Column<Guid>(type: "uuid", nullable: true),
                    orden = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_personajes", x => x.id);
                    table.ForeignKey(
                        name: "fk_personajes_medios_imagen_actor_voz_id",
                        column: x => x.imagen_actor_voz_id,
                        principalTable: "medios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_personajes_medios_imagen_id",
                        column: x => x.imagen_id,
                        principalTable: "medios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_personajes_series_serie_id",
                        column: x => x.serie_id,
                        principalTable: "series",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "serie_imagenes",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    serie_id = table.Column<int>(type: "integer", nullable: false),
                    tipo = table.Column<int>(type: "integer", nullable: false),
                    medio_id = table.Column<Guid>(type: "uuid", nullable: false),
                    alt = table.Column<string>(type: "text", nullable: false),
                    orden = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_serie_imagenes", x => x.id);
                    table.ForeignKey(
                        name: "fk_serie_imagenes_medios_medio_id",
                        column: x => x.medio_id,
                        principalTable: "medios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_serie_imagenes_series_serie_id",
                        column: x => x.serie_id,
                        principalTable: "series",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "enlaces",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ambito = table.Column<int>(type: "integer", nullable: false),
                    plataforma = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    orden = table.Column<int>(type: "integer", nullable: false),
                    serie_id = table.Column<int>(type: "integer", nullable: true),
                    socio_id = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_enlaces", x => x.id);
                    table.CheckConstraint("ck_enlace_un_propietario", "(serie_id IS NOT NULL AND socio_id IS NULL) OR (serie_id IS NULL AND socio_id IS NOT NULL)");
                    table.ForeignKey(
                        name: "fk_enlaces_series_serie_id",
                        column: x => x.serie_id,
                        principalTable: "series",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_enlaces_socios_socio_id",
                        column: x => x.socio_id,
                        principalTable: "socios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "socios_series",
                columns: table => new
                {
                    socio_id = table.Column<int>(type: "integer", nullable: false),
                    serie_id = table.Column<int>(type: "integer", nullable: false),
                    orden = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_socios_series", x => new { x.socio_id, x.serie_id });
                    table.ForeignKey(
                        name: "fk_socios_series_series_serie_id",
                        column: x => x.serie_id,
                        principalTable: "series",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_socios_series_socios_socio_id",
                        column: x => x.socio_id,
                        principalTable: "socios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "miembros_equipo",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    grupo_id = table.Column<int>(type: "integer", nullable: false),
                    nombre = table.Column<string>(type: "text", nullable: false),
                    rol = table.Column<string>(type: "text", nullable: false),
                    imagen_id = table.Column<Guid>(type: "uuid", nullable: true),
                    orden = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_miembros_equipo", x => x.id);
                    table.ForeignKey(
                        name: "fk_miembros_equipo_grupos_equipo_grupo_id",
                        column: x => x.grupo_id,
                        principalTable: "grupos_equipo",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_miembros_equipo_medios_imagen_id",
                        column: x => x.imagen_id,
                        principalTable: "medios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "ix_auditoria_fecha",
                table: "auditoria",
                column: "fecha");

            migrationBuilder.CreateIndex(
                name: "ix_enlaces_serie_id",
                table: "enlaces",
                column: "serie_id");

            migrationBuilder.CreateIndex(
                name: "ix_enlaces_socio_id",
                table: "enlaces",
                column: "socio_id");

            migrationBuilder.CreateIndex(
                name: "ix_estados_codigo",
                table: "estados",
                column: "codigo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_grupos_equipo_serie_id",
                table: "grupos_equipo",
                column: "serie_id");

            migrationBuilder.CreateIndex(
                name: "ix_medios_sha256",
                table: "medios",
                column: "sha256",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_medios_subido_por_id",
                table: "medios",
                column: "subido_por_id");

            migrationBuilder.CreateIndex(
                name: "ix_miembros_equipo_grupo_id",
                table: "miembros_equipo",
                column: "grupo_id");

            migrationBuilder.CreateIndex(
                name: "ix_miembros_equipo_imagen_id",
                table: "miembros_equipo",
                column: "imagen_id");

            migrationBuilder.CreateIndex(
                name: "ix_obras_serie_id",
                table: "obras",
                column: "serie_id");

            migrationBuilder.CreateIndex(
                name: "ix_permisos_serie_id",
                table: "permisos",
                column: "serie_id");

            migrationBuilder.CreateIndex(
                name: "ix_permisos_usuario_id_ambito_serie_id",
                table: "permisos",
                columns: new[] { "usuario_id", "ambito", "serie_id" },
                unique: true)
                .Annotation("Npgsql:NullsDistinct", false);

            migrationBuilder.CreateIndex(
                name: "ix_personajes_imagen_actor_voz_id",
                table: "personajes",
                column: "imagen_actor_voz_id");

            migrationBuilder.CreateIndex(
                name: "ix_personajes_imagen_id",
                table: "personajes",
                column: "imagen_id");

            migrationBuilder.CreateIndex(
                name: "ix_personajes_serie_id",
                table: "personajes",
                column: "serie_id");

            migrationBuilder.CreateIndex(
                name: "ix_serie_imagenes_medio_id",
                table: "serie_imagenes",
                column: "medio_id");

            migrationBuilder.CreateIndex(
                name: "ix_serie_imagenes_serie_id",
                table: "serie_imagenes",
                column: "serie_id");

            migrationBuilder.CreateIndex(
                name: "ix_series_banner_id",
                table: "series",
                column: "banner_id");

            migrationBuilder.CreateIndex(
                name: "ix_series_creador_imagen_id",
                table: "series",
                column: "creador_imagen_id");

            migrationBuilder.CreateIndex(
                name: "ix_series_estado_id",
                table: "series",
                column: "estado_id");

            migrationBuilder.CreateIndex(
                name: "ix_series_logo_id",
                table: "series",
                column: "logo_id");

            migrationBuilder.CreateIndex(
                name: "ix_series_portada_id",
                table: "series",
                column: "portada_id");

            migrationBuilder.CreateIndex(
                name: "ix_series_slug",
                table: "series",
                column: "slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_series_video_local_id",
                table: "series",
                column: "video_local_id");

            migrationBuilder.CreateIndex(
                name: "ix_socios_imagen_id",
                table: "socios",
                column: "imagen_id");

            migrationBuilder.CreateIndex(
                name: "ix_socios_slug",
                table: "socios",
                column: "slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_socios_series_serie_id",
                table: "socios_series",
                column: "serie_id");

            migrationBuilder.CreateIndex(
                name: "ix_usuarios_username_normalizado",
                table: "usuarios",
                column: "username_normalizado",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ux_usuarios_un_superadmin",
                table: "usuarios",
                column: "es_super_admin",
                unique: true,
                filter: "es_super_admin");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "auditoria");

            migrationBuilder.DropTable(
                name: "enlaces");

            migrationBuilder.DropTable(
                name: "medios_contenido");

            migrationBuilder.DropTable(
                name: "miembros_equipo");

            migrationBuilder.DropTable(
                name: "obras");

            migrationBuilder.DropTable(
                name: "permisos");

            migrationBuilder.DropTable(
                name: "personajes");

            migrationBuilder.DropTable(
                name: "serie_imagenes");

            migrationBuilder.DropTable(
                name: "socios_series");

            migrationBuilder.DropTable(
                name: "grupos_equipo");

            migrationBuilder.DropTable(
                name: "socios");

            migrationBuilder.DropTable(
                name: "series");

            migrationBuilder.DropTable(
                name: "estados");

            migrationBuilder.DropTable(
                name: "medios");

            migrationBuilder.DropTable(
                name: "usuarios");
        }
    }
}
