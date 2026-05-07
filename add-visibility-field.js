import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Leer el archivo de agentes
const agentsPath = path.join(__dirname, 'src', 'data', 'agents.js');
let content = fs.readFileSync(agentsPath, 'utf8');

// Agregar visible: true a todos los agentes que no lo tengan
// Buscar todos los chatLink y agregar visible después
content = content.replace(
  /chatLink: "([^"]+)"/g,
  'chatLink: "$1",\n    visible: true'
);

// Remover duplicados si ya existen
content = content.replace(
  /chatLink: "([^"]+)",\s*visible: true,\s*visible: true/g,
  'chatLink: "$1",\n    visible: true'
);

// Escribir el archivo actualizado
fs.writeFileSync(agentsPath, content);

console.log('✅ Campo de visibilidad agregado a todos los agentes');