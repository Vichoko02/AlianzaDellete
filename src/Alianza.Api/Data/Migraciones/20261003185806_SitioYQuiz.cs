using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Alianza.Api.Data.Migraciones
{
    /// <inheritdoc />
    public partial class SitioYQuiz : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "enlaces_sitio",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    grupo = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    plataforma = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    etiqueta = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    descripcion = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    orden = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_enlaces_sitio", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "preguntas_quiz",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    orden = table.Column<int>(type: "integer", nullable: false),
                    texto = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    ayuda = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    tipo = table.Column<int>(type: "integer", nullable: false),
                    opciones = table.Column<List<string>>(type: "text[]", nullable: false),
                    requerida = table.Column<bool>(type: "boolean", nullable: false),
                    activa = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_preguntas_quiz", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "solicitudes",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    fecha = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    nombre = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    estado = table.Column<int>(type: "integer", nullable: false),
                    leida_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_solicitudes", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "textos_sitio",
                columns: table => new
                {
                    clave = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    grupo = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    etiqueta = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    tipo = table.Column<int>(type: "integer", nullable: false),
                    valor = table.Column<string>(type: "character varying(8000)", maxLength: 8000, nullable: false),
                    orden = table.Column<int>(type: "integer", nullable: false),
                    actualizado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_textos_sitio", x => x.clave);
                });

            migrationBuilder.CreateTable(
                name: "respuestas_solicitud",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    solicitud_id = table.Column<long>(type: "bigint", nullable: false),
                    orden = table.Column<int>(type: "integer", nullable: false),
                    pregunta = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    respuesta = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_respuestas_solicitud", x => x.id);
                    table.ForeignKey(
                        name: "fk_respuestas_solicitud_solicitudes_solicitud_id",
                        column: x => x.solicitud_id,
                        principalTable: "solicitudes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_enlaces_sitio_grupo_orden",
                table: "enlaces_sitio",
                columns: new[] { "grupo", "orden" });

            migrationBuilder.CreateIndex(
                name: "ix_respuestas_solicitud_solicitud_id",
                table: "respuestas_solicitud",
                column: "solicitud_id");

            migrationBuilder.CreateIndex(
                name: "ix_solicitudes_estado_fecha",
                table: "solicitudes",
                columns: new[] { "estado", "fecha" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "enlaces_sitio");

            migrationBuilder.DropTable(
                name: "preguntas_quiz");

            migrationBuilder.DropTable(
                name: "respuestas_solicitud");

            migrationBuilder.DropTable(
                name: "textos_sitio");

            migrationBuilder.DropTable(
                name: "solicitudes");
        }
    }
}
