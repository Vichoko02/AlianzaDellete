import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const assetsDir = path.join(rootDir, 'src', 'assets');

// Carpetas de origen
const proyectosDir = path.join(assetsDir, 'proyectos');
const asociadosDir = path.join(assetsDir, 'asociados');

// Carpeta de salida (imágenes optimizadas)
const outputDir = path.join(assetsDir, 'optimized');

// Crear directorio de salida si no existe
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function processImage(inputPath, outputName) {
  const outputPath = path.join(outputDir, outputName);

  try {
    await sharp(inputPath)
      .resize(900, 900, {
        fit: 'cover',      // Recorta para llenar el cuadrado
        position: 'center', // Centra la imagen
        kernel: 'lanczos3'  // Alta calidad
      })
      .webp({
        quality: 85,
        effort: 6  // Compresión más eficiente (0-6)
      })
      .toFile(outputPath);

    console.log(`✅ ${path.basename(inputPath)} → ${outputName}`);
  } catch (error) {
    console.log(`❌ Error procesando ${path.basename(inputPath)}: ${error.message}`);
  }
}

async function processDirectory(dir, prefix) {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && /\.(webp|png|jpg|jpeg)$/i.test(entry.name)) {
      const inputPath = path.join(dir, entry.name);
      const outputName = `${prefix}-${path.parse(entry.name).name}.webp`;
      await processImage(inputPath, outputName);
    }
  }
}

async function main() {
  console.log('🚀 Optimizando imágenes a 900x900 webp...\n');
  console.log('📁 Carpeta de salida:', outputDir);
  console.log('');

  // Procesar proyectos
  console.log('📦 Proyectos:');
  await processDirectory(proyectosDir, 'proyecto');

  // Procesar asociados
  console.log('\n👥 Asociados:');
  await processDirectory(asociadosDir, 'asociado');

  console.log('\n✨ ¡Listo!');
}

main();
