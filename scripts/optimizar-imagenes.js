// Reduce el peso de las imágenes de src/assets, en el mismo lugar. Se ejecuta a mano: node scripts/optimizar-imagenes.js
// 1) busca imágenes de más de 300 KB  2) las achica a 1920 px de ancho como máximo  3) las guarda en WebP
//    (los GIF animados pasan a WebP animado)  4) solo reemplaza el archivo si el resultado pesa menos.
// Si un archivo cambia de extensión (.gif → .webp), avisa para actualizar carga-inicial/contenido.json del servidor.
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const CARPETA = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "assets");
const PESO_MINIMO = 300 * 1024;
const ANCHO_MAXIMO = 1920;

function imagenes(carpeta) {
  return fs.readdirSync(carpeta, { withFileTypes: true }).flatMap((e) => {
    const ruta = path.join(carpeta, e.name);
    if (e.isDirectory()) return e.name === "fuentes" ? [] : imagenes(ruta);
    return /\.(webp|png|jpe?g|gif)$/i.test(e.name) && fs.statSync(ruta).size > PESO_MINIMO ? [ruta] : [];
  });
}

let ahorro = 0;
for (const ruta of imagenes(CARPETA)) {
  const antes = fs.statSync(ruta).size;
  const animada = /\.gif$/i.test(ruta) || ((await sharp(ruta).metadata()).pages ?? 1) > 1;
  const destino = ruta.replace(/\.(png|jpe?g|gif)$/i, ".webp");
  const resultado = await sharp(ruta, { animated: animada })
    .resize({ width: ANCHO_MAXIMO, withoutEnlargement: true })
    .webp({ quality: animada ? 70 : 80, effort: 5 })
    .toBuffer();

  if (resultado.length >= antes) continue;
  fs.writeFileSync(destino, resultado);
  if (destino !== ruta) { fs.unlinkSync(ruta); console.log(`  cambió de nombre: ${path.relative(CARPETA, ruta)} → ${path.relative(CARPETA, destino)}`); }
  ahorro += antes - resultado.length;
  console.log(`${path.relative(CARPETA, destino)}: ${(antes / 1048576).toFixed(1)} MB → ${(resultado.length / 1048576).toFixed(1)} MB`);
}
console.log(`Ahorro total: ${(ahorro / 1048576).toFixed(1)} MB`);
