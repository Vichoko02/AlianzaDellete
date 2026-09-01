interface ProjectProps {
  title: string;
  image: string; // Aquí llegará la variable importada desde assets
  url: string;
  alt?: string;
}

export default function ProjectCard({ title, image, url, alt }: ProjectProps) {
  return (
    <a 
      className="project-card" 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer"
    >
      <img src={image} alt={alt || title} />
      <h3>{title}</h3>
    </a>
  );
}