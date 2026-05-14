import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import 'dotenv/config';

const r2Client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

async function subirVideo() {
    console.log("🎬 Iniciando proceso para Upfunne Academy...");
    const nombre = "test.mp4";
    const rutaLocal = path.join(process.cwd(), nombre);

    if (!fs.existsSync(rutaLocal)) {
        console.error(`❌ Error: No encontré el archivo "${nombre}" en la carpeta raíz.`);
        return;
    }

    const params = {
        Bucket: "upfunne-academy",
        Key: `videos/${nombre}`,
        Body: fs.createReadStream(rutaLocal),
        ContentType: "video/mp4",
    };

    try {
        console.log("🚀 Subiendo video a Cloudflare R2...");
        await r2Client.send(new PutObjectCommand(params));
        console.log("✅ ¡Éxito! Video guardado.");
        console.log(`🔗 Link: https://rough-silence-cf74.arvilladigital12.workers.dev/?key=videos/${nombre}`);
    } catch (e) {
        console.error("❌ Fallo en la subida:", e.message);
    }
}

subirVideo();