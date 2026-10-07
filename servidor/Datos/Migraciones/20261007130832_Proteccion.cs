using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Alianza.Servidor.Datos.Migraciones
{
    /// <inheritdoc />
    public partial class Proteccion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ultima_ip",
                table: "usuarios",
                type: "character varying(45)",
                maxLength: 45,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "bloqueos_ip",
                columns: table => new
                {
                    ip = table.Column<string>(type: "character varying(45)", maxLength: 45, nullable: false),
                    hasta = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    motivo = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    manual = table.Column<bool>(type: "boolean", nullable: false),
                    veces = table.Column<int>(type: "integer", nullable: false),
                    creado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_bloqueos_ip", x => x.ip);
                });

            migrationBuilder.CreateTable(
                name: "eventos_seguridad",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    fecha = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    tipo = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    gravedad = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    ip = table.Column<string>(type: "character varying(45)", maxLength: 45, nullable: false),
                    ruta = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    usuario = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    detalle = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    revisado = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_eventos_seguridad", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_eventos_seguridad_fecha",
                table: "eventos_seguridad",
                column: "fecha");

            migrationBuilder.CreateIndex(
                name: "ix_eventos_seguridad_gravedad_revisado",
                table: "eventos_seguridad",
                columns: new[] { "gravedad", "revisado" });

            migrationBuilder.CreateIndex(
                name: "ix_eventos_seguridad_ip",
                table: "eventos_seguridad",
                column: "ip");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "bloqueos_ip");

            migrationBuilder.DropTable(
                name: "eventos_seguridad");

            migrationBuilder.DropColumn(
                name: "ultima_ip",
                table: "usuarios");
        }
    }
}
