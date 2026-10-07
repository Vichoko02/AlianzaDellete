import { useState } from "react";
import Cabecera from "../componentes/Cabecera";
import Eslogan from "../componentes/Eslogan";
import SobreNosotros from "../componentes/SobreNosotros";
import SeccionTarjetas from "../componentes/SeccionTarjetas";
import Unete from "../componentes/Unete";
import Pie from "../componentes/Pie";
import VentanaSocio from "../componentes/VentanaSocio";
import { urlMedio, type Socio } from "../api";
import { useContenidoInicio, useTextos } from "../textos";

/** Portada: cabecera, eslogan, sobre nosotros, asociados, proyectos, únete y pie. */
export default function PaginaInicio({ alCambiarTema }: { alCambiarTema: () => void }) {
  const t = useTextos();
  const { series, socios } = useContenidoInicio();
  const [socioAbierto, setSocioAbierto] = useState<Socio | null>(null);
  const tarjetasSocios = socios.map((socio) => ({ nombre: socio.nombre, imagen: urlMedio(socio.imagen), alHacerClic: () => setSocioAbierto(socio) }));
  const tarjetasSeries = series.map((serie) => ({ nombre: serie.nombre, imagen: urlMedio(serie.imagen), enlace: serie.enlace }));

  return (
    <>
      <Cabecera alCambiarTema={alCambiarTema} />
      <main>
        <Eslogan />
        <SobreNosotros />
        <SeccionTarjetas titulo={t("inicio.asociados.titulo")} idSeccion="asociados" tarjetas={tarjetasSocios} />
        <SeccionTarjetas titulo={t("inicio.proyectos.titulo")} idSeccion="proyectos" tarjetas={tarjetasSeries} />
        <Unete />
      </main>
      <Pie />

      {socioAbierto && <VentanaSocio socio={socioAbierto} alCerrar={() => setSocioAbierto(null)} />}
    </>
  );
}
