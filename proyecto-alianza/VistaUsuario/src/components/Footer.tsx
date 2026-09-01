import iconInstagram from "../assets/instagram-color.svg";
import iconTwitter from "../assets/twitter.svg";
import iconYoutube from "../assets/youtube-color2.svg";

export default function Footer() {
  return (
    <footer>
      <div className="socials">
        <a href="https://www.instagram.com/somos_laalianza/" target="_blank" rel="noopener noreferrer">
          <img src={iconInstagram} alt="Instagram" />
        </a>
        <a href="https://x.com/Somos_LaAlianza" target="_blank" rel="noopener noreferrer">
          <img src={iconTwitter} alt="Twitter" />
        </a>
        <a href="https://www.youtube.com/@Somos_LaAlianza" target="_blank" rel="noopener noreferrer">
          <img src={iconYoutube} alt="YouTube" />
        </a>
      </div>
      <p>2026 Alianza</p>
    </footer>
  );
}