import bannerCrunch from "../assets/Banner/CrunchBanner.webp";
import bannerMetrecalia from "../assets/Banner/MetrecaliaBanner.webp";
import bannerPclub from "../assets/Banner/pclubBanner.webp";
import bannerTBTF from "../assets/Banner/TBTFBanner.webp";
import bannerArmados from "../assets/Banner/ArmadosBanner.webp";

export default function Carousel() {
  const imagenes = [
    bannerTBTF,
    bannerPclub,
    bannerMetrecalia,
    bannerCrunch,
    bannerArmados
  ];

  const imagenesDobles = [...imagenes, ...imagenes];

  return (
    <div className="header-carousel-container">
      <div className="carousel-track">
        {imagenesDobles.map((src, index) => (
          <img
            key={index}
            src={src}
            alt={`Banner alianza ${index}`}
          />
        ))}
      </div>
    </div>
  );
}