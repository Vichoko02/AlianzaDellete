import { useTextos } from "../textos";

export default function Hero() {
  const t = useTextos();
  return (
    <section className="hero">
      <div className="hero-inner">
        <span className="hero-eyebrow">{t("inicio.hero.antetitulo")}</span>
        <h2 className="slogan">{t("inicio.hero.eslogan")}</h2>
        <div className="hero-line" />
      </div>
    </section>
  );
}
