// Nombre y color de cada red o plataforma de apoyo. El dibujo de cada una está en src/assets/iconos/<plataforma>.svg.

export interface Plataforma { nombre: string; color: string }

export const PLATAFORMAS: Record<string, Plataforma> = {
  instagram: { nombre: "Instagram", color: "#E1306C" },
  facebook: { nombre: "Facebook", color: "#1877F2" },
  twitter: { nombre: "Twitter / X", color: "#ffffff" },
  youtube: { nombre: "YouTube", color: "#FF0000" },
  tiktok: { nombre: "TikTok", color: "#ffffff" },
  discord: { nombre: "Discord", color: "#5865F2" },
  twitch: { nombre: "Twitch", color: "#9146FF" },
  kick: { nombre: "Kick", color: "#53FC18" },
  doblaje: { nombre: "Doblaje Wiki", color: "#f8c300" },
  patreon: { nombre: "Patreon", color: "#FF424D" },
  kofi: { nombre: "Ko-fi", color: "#29ABE0" },
  buymeacoffee: { nombre: "Buy me a coffee", color: "#FFDD00" },
  vaquite: { nombre: "Vaquite", color: "#6C63FF" },
};

/** Datos de una plataforma; si no se conoce, uno genérico (con el ícono "enlace"). */
export const plataformaDe = (codigo: string): Plataforma => PLATAFORMAS[codigo] ?? { nombre: "Enlace", color: "#888888" };
