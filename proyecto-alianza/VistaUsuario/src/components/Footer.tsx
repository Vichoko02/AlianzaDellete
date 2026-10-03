import iconInstagram from "../assets/instagram-color.svg";
import iconTwitter from "../assets/twitter.svg";
import iconYoutube from "../assets/youtube-color2.svg";
import iconFacebook from "../assets/facebook-color.svg";
import { useEnlaces, useTextos } from "../textos";

// Los íconos son parte del diseño (fijos); qué redes aparecen y sus enlaces se editan en el panel.
const iconos: Record<string, string> = {
  instagram: iconInstagram,
  twitter: iconTwitter,
  youtube: iconYoutube,
  facebook: iconFacebook,
};

export default function Footer() {
  const t = useTextos();
  const redes = useEnlaces("footer").filter((r) => iconos[r.plataforma]);
  return (
    <footer>
      <div className="socials">
        {redes.map((r) => (
          <a key={`${r.plataforma}-${r.url}`} href={r.url} target="_blank" rel="noopener noreferrer">
            <img src={iconos[r.plataforma]} alt={r.etiqueta || r.plataforma} />
          </a>
        ))}
      </div>
      <p>{t("footer.texto")}</p>
    </footer>
  );
}
