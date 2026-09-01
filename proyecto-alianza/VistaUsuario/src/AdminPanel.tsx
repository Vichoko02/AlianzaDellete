import { useState } from "react";

export default function AdminPanel() {
  const [nuevoProyecto, setNuevoProyecto] = useState({ nombre: "", imagenUrl: "", enlace: "" });

  const manejarEnvio = (e: React.FormEvent) => {
    e.preventDefault();
    // Aquí es donde en el futuro enviarías los datos a una base de datos real
    console.log("Simulando guardado de proyecto:", nuevoProyecto);
    alert("Prototipo: El proyecto se registraría en la base de datos aquí.");
    setNuevoProyecto({ nombre: "", imagenUrl: "", enlace: "" });
  };

  return (
    <div style={{ padding: "4rem 2rem", maxWidth: "600px", margin: "0 auto", color: "var(--text-h)" }}>
      <h2 style={{ fontFamily: "Black Ops One", textAlign: "center", marginBottom: "2rem" }}>PANEL DE CONTROL</h2>
      
      <form onSubmit={manejarEnvio} style={{ display: "flex", flexDirection: "column", gap: "1.5rem", background: "var(--social-bg)", padding: "2rem", border: "1px solid var(--border)" }}>
        <div>
          <label style={{ fontFamily: "Oswald", display: "block", marginBottom: "0.5rem" }}>Nombre del Proyecto</label>
          <input 
            type="text" 
            value={nuevoProyecto.nombre}
            onChange={(e) => setNuevoProyecto({...nuevoProyecto, nombre: e.target.value})}
            style={{ width: "100%", padding: "10px", fontFamily: "Oswald" }} 
            required 
          />
        </div>

        <div>
          <label style={{ fontFamily: "Oswald", display: "block", marginBottom: "0.5rem" }}>URL de la Imagen (Link externo temporal)</label>
          <input 
            type="text" 
            value={nuevoProyecto.imagenUrl}
            onChange={(e) => setNuevoProyecto({...nuevoProyecto, imagenUrl: e.target.value})}
            style={{ width: "100%", padding: "10px", fontFamily: "Oswald" }} 
            required 
          />
        </div>

        <button type="submit" style={{ padding: "15px", background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer", fontFamily: "Black Ops One" }}>
          AÑADIR A LA GRILLA
        </button>
      </form>
    </div>
  );
}