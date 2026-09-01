import Carousel from "./Carousel";
import Navbar from "./Navbar";
import logoAlianza from "../assets/ALIANZA_VECTORIZADO.svg";

export default function Header({ onToggleTheme }: { onToggleTheme: () => void }) {
  return (
    <header>
      <div className="header-main-container">
        <Carousel />
        <div className="header-logo-overlay">
          <img
            src={logoAlianza}
            alt="Alianza Logo"
            onClick={onToggleTheme}
            style={{ cursor: "pointer" }}
          />
        </div>
        <div className="carousel-gradient-overlay"></div>
      </div>
      
      <Navbar />
    </header>
  );
}