using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Alianza.Servidor.Datos.Migraciones
{
    /// <inheritdoc />
    public partial class IdiomasYModoPrivado : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ajustes",
                columns: table => new
                {
                    clave = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    valor = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_ajustes", x => x.clave);
                });

            migrationBuilder.CreateTable(
                name: "idiomas_ofrecidos",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    serie_id = table.Column<int>(type: "integer", nullable: true),
                    codigo = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    automatica = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_idiomas_ofrecidos", x => x.id);
                    table.ForeignKey(
                        name: "fk_idiomas_ofrecidos_series_serie_id",
                        column: x => x.serie_id,
                        principalTable: "series",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ips_permitidas",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    red = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    nota = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    creada_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_ips_permitidas", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "traducciones",
                columns: table => new
                {
                    idioma = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    huella = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    original = table.Column<string>(type: "text", nullable: false),
                    texto = table.Column<string>(type: "text", nullable: false),
                    manual = table.Column<bool>(type: "boolean", nullable: false),
                    actualizada_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_traducciones", x => new { x.idioma, x.huella });
                });

            migrationBuilder.CreateIndex(
                name: "ix_idiomas_ofrecidos_serie_id_codigo",
                table: "idiomas_ofrecidos",
                columns: new[] { "serie_id", "codigo" },
                unique: true)
                .Annotation("Npgsql:NullsDistinct", false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ajustes");

            migrationBuilder.DropTable(
                name: "idiomas_ofrecidos");

            migrationBuilder.DropTable(
                name: "ips_permitidas");

            migrationBuilder.DropTable(
                name: "traducciones");
        }
    }
}
