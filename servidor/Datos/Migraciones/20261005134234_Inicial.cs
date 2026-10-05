using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Alianza.Servidor.Datos.Migraciones
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
                    nombre_usuario = table.Column<string>(type: "text", nullable: false),
                    accion = table.Column<string>(type: "text", nullable: false),
                    entidad = table.Column<string>(type: "text", nullable: false),
                    detalle = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_auditoria", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "enlaces_sitio",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    grupo = table.Column<string>(type: "text", nullable: false),
                    plataforma = table.Column<string>(type: "text", nullable: false),
                    url = table.Column<string>(type: "text", nullable: false),
                    etiqueta = table.Column<string>(type: "text", nullable: false),
                    descripcion = table.Column<string>(type: "text", nullable: false),
                    orden = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_enlaces_sitio", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "estados",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    codigo = table.Column<string>(type: "text", nullable: false),
                    nombre = table.Column<string>(type: "text", nullable: false),
                    color = table.Column<string>(type: "text", nullable: false),
                    orden = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_estados", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "medios",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    nombre_archivo = table.Column<string>(type: "text", nullable: false),
                    tipo_contenido = table.Column<string>(type: "text", nullable: false),
                    tamano = table.Column<long>(type: "bigint", nullable: false),
                    huella = table.Column<string>(type: "text", nullable: false),
                    texto_alternativo = table.Column<string>(type: "text", nullable: false),
                    subido_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_medios", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "postulaciones",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    recibida_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    nombre = table.Column<string>(type: "text", nullable: false),
                    correo = table.Column<string>(type: "text", nullable: false),
                    estado = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_postulaciones", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "preguntas",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    orden = table.Column<int>(type: "integer", nullable: false),
                    texto = table.Column<string>(type: "text", nullable: false),
                    ayuda = table.Column<string>(type: "text", nullable: false),
                    tipo = table.Column<int>(type: "integer", nullable: false),
                    opciones = table.Column<List<string>>(type: "text[]", nullable: false),
                    obligatoria = table.Column<bool>(type: "boolean", nullable: false),
                    activa = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_preguntas", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "textos_sitio",
                columns: table => new
                {
                    clave = table.Column<string>(type: "text", nullable: false),
                    grupo = table.Column<string>(type: "text", nullable: false),
                    etiqueta = table.Column<string>(type: "text", nullable: false),
                    tipo = table.Column<int>(type: "integer", nullable: false),
                    valor = table.Column<string>(type: "text", nullable: false),
                    orden = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_textos_sitio", x => x.clave);
                });

            migrationBuilder.CreateTable(
                name: "usuarios",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    nombre_usuario = table.Column<string>(type: "text", nullable: false),
                    nombre_usuario_normalizado = table.Column<string>(type: "text", nullable: false),
                    nombre_visible = table.Column<string>(type: "text", nullable: false),
                    correo = table.Column<string>(type: "text", nullable: true),
                    hash_contrasena = table.Column<string>(type: "text", nullable: true),
                    origen = table.Column<int>(type: "integer", nullable: false),
                    es_superadmin = table.Column<bool>(type: "boolean", nullable: false),
                    puede_crear_wikis = table.Column<bool>(type: "boolean", nullable: false),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    sello_sesion = table.Column<Guid>(type: "uuid", nullable: false),
                    creado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ultimo_acceso = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_usuarios", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "contenidos_medio",
                columns: table => new
                {
                    medio_id = table.Column<Guid>(type: "uuid", nullable: false),
                    bytes = table.Column<byte[]>(type: "bytea", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_contenidos_medio", x => x.medio_id);
                    table.ForeignKey(
                        name: "fk_contenidos_medio_medios_medio_id",
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
                    identificador = table.Column<string>(type: "text", nullable: false),
                    nombre = table.Column<string>(type: "text", nullable: false),
                    sinopsis = table.Column<string>(type: "text", nullable: false),
                    estado_id = table.Column<int>(type: "integer", nullable: false),
                    portada_id = table.Column<Guid>(type: "uuid", nullable: true),
                    cabecera_id = table.Column<Guid>(type: "uuid", nullable: true),
                    logo_id = table.Column<Guid>(type: "uuid", nullable: true),
                    url_video = table.Column<string>(type: "text", nullable: true),
                    video_propio_id = table.Column<Guid>(type: "uuid", nullable: true),
                    creador_nombre = table.Column<string>(type: "text", nullable: false),
                    creador_descripcion = table.Column<string>(type: "text", nullable: false),
                    creador_imagen_id = table.Column<Guid>(type: "uuid", nullable: true),
                    orden = table.Column<int>(type: "integer", nullable: false),
                    publicada = table.Column<bool>(type: "boolean", nullable: false),
                    creada_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    actualizada_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
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
                        name: "fk_series_medios_cabecera_id",
                        column: x => x.cabecera_id,
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
                        name: "fk_series_medios_video_propio_id",
                        column: x => x.video_propio_id,
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
                    identificador = table.Column<string>(type: "text", nullable: false),
                    nombre = table.Column<string>(type: "text", nullable: false),
                    descripcion = table.Column<string>(type: "text", nullable: false),
                    imagen_id = table.Column<Guid>(type: "uuid", nullable: true),
                    orden = table.Column<int>(type: "integer", nullable: false),
                    publicado = table.Column<bool>(type: "boolean", nullable: false),
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
                name: "respuesta",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    postulacion_id = table.Column<long>(type: "bigint", nullable: false),
                    orden = table.Column<int>(type: "integer", nullable: false),
                    pregunta = table.Column<string>(type: "text", nullable: false),
                    valor = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_respuesta", x => x.id);
                    table.ForeignKey(
                        name: "fk_respuesta_postulaciones_postulacion_id",
                        column: x => x.postulacion_id,
                        principalTable: "postulaciones",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "grupo_equipo",
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
                    table.PrimaryKey("pk_grupo_equipo", x => x.id);
                    table.ForeignKey(
                        name: "fk_grupo_equipo_series_serie_id",
                        column: x => x.serie_id,
                        principalTable: "series",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "imagenes_serie",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    serie_id = table.Column<int>(type: "integer", nullable: false),
                    tipo = table.Column<int>(type: "integer", nullable: false),
                    medio_id = table.Column<Guid>(type: "uuid", nullable: false),
                    texto_alternativo = table.Column<string>(type: "text", nullable: false),
                    orden = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_imagenes_serie", x => x.id);
                    table.ForeignKey(
                        name: "fk_imagenes_serie_medios_medio_id",
                        column: x => x.medio_id,
                        principalTable: "medios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_imagenes_serie_series_serie_id",
                        column: x => x.serie_id,
                        principalTable: "series",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "obra_creador",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    serie_id = table.Column<int>(type: "integer", nullable: false),
                    titulo = table.Column<string>(type: "text", nullable: false),
                    url = table.Column<string>(type: "text", nullable: true),
                    orden = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_obra_creador", x => x.id);
                    table.ForeignKey(
                        name: "fk_obra_creador_series_serie_id",
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
                    area = table.Column<int>(type: "integer", nullable: false),
                    serie_id = table.Column<int>(type: "integer", nullable: true)
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
                name: "enlaces",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    uso = table.Column<int>(type: "integer", nullable: false),
                    plataforma = table.Column<string>(type: "text", nullable: false),
                    url = table.Column<string>(type: "text", nullable: false),
                    orden = table.Column<int>(type: "integer", nullable: false),
                    serie_id = table.Column<int>(type: "integer", nullable: true),
                    socio_id = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_enlaces", x => x.id);
                    table.CheckConstraint("ck_enlace_un_dueno", "(serie_id IS NOT NULL AND socio_id IS NULL) OR (serie_id IS NULL AND socio_id IS NOT NULL)");
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
                        name: "fk_miembros_equipo_grupo_equipo_grupo_id",
                        column: x => x.grupo_id,
                        principalTable: "grupo_equipo",
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
                name: "ix_grupo_equipo_serie_id",
                table: "grupo_equipo",
                column: "serie_id");

            migrationBuilder.CreateIndex(
                name: "ix_imagenes_serie_medio_id",
                table: "imagenes_serie",
                column: "medio_id");

            migrationBuilder.CreateIndex(
                name: "ix_imagenes_serie_serie_id",
                table: "imagenes_serie",
                column: "serie_id");

            migrationBuilder.CreateIndex(
                name: "ix_medios_huella",
                table: "medios",
                column: "huella",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_miembros_equipo_grupo_id",
                table: "miembros_equipo",
                column: "grupo_id");

            migrationBuilder.CreateIndex(
                name: "ix_miembros_equipo_imagen_id",
                table: "miembros_equipo",
                column: "imagen_id");

            migrationBuilder.CreateIndex(
                name: "ix_obra_creador_serie_id",
                table: "obra_creador",
                column: "serie_id");

            migrationBuilder.CreateIndex(
                name: "ix_permisos_serie_id",
                table: "permisos",
                column: "serie_id");

            migrationBuilder.CreateIndex(
                name: "ix_permisos_usuario_id_area_serie_id",
                table: "permisos",
                columns: new[] { "usuario_id", "area", "serie_id" },
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
                name: "ix_postulaciones_estado_recibida_en",
                table: "postulaciones",
                columns: new[] { "estado", "recibida_en" });

            migrationBuilder.CreateIndex(
                name: "ix_respuesta_postulacion_id",
                table: "respuesta",
                column: "postulacion_id");

            migrationBuilder.CreateIndex(
                name: "ix_series_cabecera_id",
                table: "series",
                column: "cabecera_id");

            migrationBuilder.CreateIndex(
                name: "ix_series_creador_imagen_id",
                table: "series",
                column: "creador_imagen_id");

            migrationBuilder.CreateIndex(
                name: "ix_series_estado_id",
                table: "series",
                column: "estado_id");

            migrationBuilder.CreateIndex(
                name: "ix_series_identificador",
                table: "series",
                column: "identificador",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_series_logo_id",
                table: "series",
                column: "logo_id");

            migrationBuilder.CreateIndex(
                name: "ix_series_portada_id",
                table: "series",
                column: "portada_id");

            migrationBuilder.CreateIndex(
                name: "ix_series_video_propio_id",
                table: "series",
                column: "video_propio_id");

            migrationBuilder.CreateIndex(
                name: "ix_socios_identificador",
                table: "socios",
                column: "identificador",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_socios_imagen_id",
                table: "socios",
                column: "imagen_id");

            migrationBuilder.CreateIndex(
                name: "ix_socios_series_serie_id",
                table: "socios_series",
                column: "serie_id");

            migrationBuilder.CreateIndex(
                name: "ix_usuarios_nombre_usuario_normalizado",
                table: "usuarios",
                column: "nombre_usuario_normalizado",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ux_usuarios_un_superadmin",
                table: "usuarios",
                column: "es_superadmin",
                unique: true,
                filter: "es_superadmin");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "auditoria");

            migrationBuilder.DropTable(
                name: "contenidos_medio");

            migrationBuilder.DropTable(
                name: "enlaces");

            migrationBuilder.DropTable(
                name: "enlaces_sitio");

            migrationBuilder.DropTable(
                name: "imagenes_serie");

            migrationBuilder.DropTable(
                name: "miembros_equipo");

            migrationBuilder.DropTable(
                name: "obra_creador");

            migrationBuilder.DropTable(
                name: "permisos");

            migrationBuilder.DropTable(
                name: "personajes");

            migrationBuilder.DropTable(
                name: "preguntas");

            migrationBuilder.DropTable(
                name: "respuesta");

            migrationBuilder.DropTable(
                name: "socios_series");

            migrationBuilder.DropTable(
                name: "textos_sitio");

            migrationBuilder.DropTable(
                name: "grupo_equipo");

            migrationBuilder.DropTable(
                name: "usuarios");

            migrationBuilder.DropTable(
                name: "postulaciones");

            migrationBuilder.DropTable(
                name: "socios");

            migrationBuilder.DropTable(
                name: "series");

            migrationBuilder.DropTable(
                name: "estados");

            migrationBuilder.DropTable(
                name: "medios");
        }
    }
}
