import iconoInstagram from "../assets/instagram-color.svg";
import iconoTwitter from "../assets/twitter.svg";
import iconoYoutube from "../assets/youtube-color2.svg";
import iconoFacebook from "../assets/facebook-color.svg";
import { useEnlaces, useTextos } from "../textos";

// Los íconos del pie son fijos; qué redes aparecen y a dónde llevan se edita en el panel.
const ICONOS_PIE: Record<string, string> = {
  instagram: iconoInstagram,
  twitter: iconoTwitter,
  youtube: iconoYoutube,
  facebook: iconoFacebook,
};

export default function Pie() {
  const t = useTextos();
  const redes = useEnlaces("pie").filter((red) => ICONOS_PIE[red.plataforma]);

  return (
    <footer>
      <div className="socials">
        {redes.map((red) => (
          <a key={`${red.plataforma}-${red.url}`} href={red.url} target="_blank" rel="noopener noreferrer">
            <img src={ICONOS_PIE[red.plataforma]} alt={red.etiqueta || red.plataforma} />
          </a>
        ))}
      </div>
      <p>{t("pie.texto")}</p>
    </footer>
  );
}
