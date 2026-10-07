using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Alianza.Servidor.Datos.Migraciones
{
    /// <inheritdoc />
    public partial class EquipoConSocioEImagenAlternativa : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "imagen_alternativa_id",
                table: "miembros_equipo",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "socio_id",
                table: "miembros_equipo",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_miembros_equipo_imagen_alternativa_id",
                table: "miembros_equipo",
                column: "imagen_alternativa_id");

            migrationBuilder.CreateIndex(
                name: "ix_miembros_equipo_socio_id",
                table: "miembros_equipo",
                column: "socio_id");

            migrationBuilder.AddForeignKey(
                name: "fk_miembros_equipo_medios_imagen_alternativa_id",
                table: "miembros_equipo",
                column: "imagen_alternativa_id",
                principalTable: "medios",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "fk_miembros_equipo_socios_socio_id",
                table: "miembros_equipo",
                column: "socio_id",
                principalTable: "socios",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_miembros_equipo_medios_imagen_alternativa_id",
                table: "miembros_equipo");

            migrationBuilder.DropForeignKey(
                name: "fk_miembros_equipo_socios_socio_id",
                table: "miembros_equipo");

            migrationBuilder.DropIndex(
                name: "ix_miembros_equipo_imagen_alternativa_id",
                table: "miembros_equipo");

            migrationBuilder.DropIndex(
                name: "ix_miembros_equipo_socio_id",
                table: "miembros_equipo");

            migrationBuilder.DropColumn(
                name: "imagen_alternativa_id",
                table: "miembros_equipo");

            migrationBuilder.DropColumn(
                name: "socio_id",
                table: "miembros_equipo");
        }
    }
}
