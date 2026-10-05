import { useEffect, useState } from "react";
import Cabecera from "../componentes/Cabecera";
import Eslogan from "../componentes/Eslogan";
import SobreNosotros from "../componentes/SobreNosotros";
import SeccionTarjetas from "../componentes/SeccionTarjetas";
import Unete from "../componentes/Unete";
import Pie from "../componentes/Pie";
import VentanaSocio from "../componentes/VentanaSocio";
import { pedirSeries, pedirSocios, urlMedio, type Socio, type TarjetaSerie } from "../api";
import { useTextos } from "../textos";

/** Portada: cabecera, eslogan, sobre nosotros, asociados, proyectos, únete y pie. */
export default function PaginaInicio({ alCambiarTema }: { alCambiarTema: () => void }) {
  const t = useTextos();
  const [socios, setSocios] = useState<Socio[]>([]);
  const [series, setSeries] = useState<TarjetaSerie[]>([]);
  const [socioAbierto, setSocioAbierto] = useState<Socio | null>(null);
  const tarjetasSocios = socios.map((socio) => ({ nombre: socio.nombre, imagen: urlMedio(socio.imagen), alHacerClic: () => setSocioAbierto(socio) }));
  const tarjetasSeries = series.map((serie) => ({ nombre: serie.nombre, imagen: urlMedio(serie.imagen), enlace: serie.enlace }));

  // Pedir socios y series una vez; si el servidor no responde, las secciones quedan vacías.
  useEffect(() => {
    pedirSocios().then(setSocios).catch(() => setSocios([]));
    pedirSeries().then(setSeries).catch(() => setSeries([]));
  }, []);

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
