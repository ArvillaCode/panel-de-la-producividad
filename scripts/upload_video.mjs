import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import 'dotenv/config';

// Configuración del cliente S3 para Cloudflare R2
const r2Client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

async function subirVideo() {
    console.log("\n🎬 --- UPFUNNEL ACADEMY - SUBIDA DE VIDEOS GRANDES ---");
    
    // Obtener el nombre del archivo de los argumentos de la terminal
    const args = process.argv.slice(2);
    let nombreArchivo = args[0];
    
    if (!nombreArchivo) {
        // Si no se pasa argumento, buscar "test.mp4" por defecto
        nombreArchivo = "test.mp4";
    }
    
    const rutaLocal = path.isAbsolute(nombreArchivo) 
        ? nombreArchivo 
        : path.join(process.cwd(), nombreArchivo);

    if (!fs.existsSync(rutaLocal)) {
        console.error(`\n❌ Error: No se encontró el archivo "${nombreArchivo}".`);
        console.log(`\n💡 Instrucciones de uso:`);
        console.log(`   1. Coloca tu video en la carpeta raíz de este proyecto.`);
        console.log(`   2. Ejecuta el script especificando el nombre del archivo.`);
        console.log(`   👉 Ejemplo: node scripts/upload_video.mjs tu_video.mp4\n`);
        return;
    }

    const fileStats = fs.statSync(rutaLocal);
    const fileSizeInMB = (fileStats.size / (1024 * 1024)).toFixed(2);
    const basename = path.basename(rutaLocal);
    
    // Crear un nombre de archivo único para evitar sobreescrituras, manteniendo la consistencia con el panel
    const sanitizedName = basename.replace(/\s+/g, '_');
    const uniqueKey = `academy/videos/${Date.now()}-${sanitizedName}`;

    console.log(`📦 Archivo detectado: ${basename} (${fileSizeInMB} MB)`);
    console.log(`🔑 Clave de almacenamiento R2: ${uniqueKey}`);
    
    const params = {
        Bucket: "upfunnel-academy",
        Key: uniqueKey,
        Body: fs.createReadStream(rutaLocal),
        ContentType: "video/mp4",
    };

    try {
        console.log("\n🚀 Subiendo video a Cloudflare R2 de forma directa (Streaming)...");
        console.log("⏳ Esto puede tomar unos minutos dependiendo del tamaño del archivo y tu velocidad de internet. Por favor espera...");
        
        await r2Client.send(new PutObjectCommand(params));
        
        console.log("\n✅ ¡ÉXITO TOTAL! Video subido correctamente.");
        console.log("--------------------------------------------------------------------------------");
        console.log("📋 COPIA ESTE TEXTO Y PÉGALO EN EL PANEL ADMIN EN 'Ruta de archivo (Opcional / Debug)':");
        console.log(`👉 \x1b[36m${uniqueKey}\x1b[0m`);
        console.log("--------------------------------------------------------------------------------");
    console.log(`🔗 URL de reproducción pública:`);
    console.log(`   Usa VITE_ACADEMY_MEDIA_URL en tu .env.local para configurar la URL base\n`);
    } catch (e) {
        console.error("\n❌ Fallo en la subida:", e.message);
        console.log("\n💡 Sugerencia: Verifica tus credenciales R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY y R2_ENDPOINT en tu archivo .env\n");
    }
}

subirVideo();