import logoAlianza from "../assets/ALIANZA_VECTORIZADO.svg";

/** Lo que ve quien no está en la lista mientras el sitio está en modo privado. */
export default function PaginaPrivada() {
  return (
    <main className="pagina-estado">
      <img src={logoAlianza} alt="Alianza" className="pagina-estado-logo" />
      <h1>Sitio en preparación</h1>
      <p>Estamos preparando algo nuevo. Vuelve pronto.</p>
      <p className="pagina-estado-otro" lang="en">Site under construction — please come back soon.</p>
    </main>
  );
}
