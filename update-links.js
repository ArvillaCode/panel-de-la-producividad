const fs = require('fs');
const path = require('path');

// Función para codificar URL
function encodePrompt(name, specialty, description) {
  const prompt = `Hola, soy ${name}. ${description}. ¿En qué puedo ayudarte hoy?`;
  return encodeURIComponent(prompt);
}

// Leer el archivo de agentes
const agentsPath = path.join(__dirname, 'src', 'data', 'agents.js');
let content = fs.readFileSync(agentsPath, 'utf8');

// Expresión regular para encontrar y reemplazar los chatLinks
const chatLinkRegex = /chatLink: "https:\/\/chat\.openai\.com\/g\/g-[^"]+"/g;

// Función para reemplazar cada chatLink
content = content.replace(/(\s+id: \d+,\s+name: "([^"]+)",\s+specialty: "([^"]+)",\s+description: "([^"]+)",[\s\S]*?)chatLink: "https:\/\/chat\.openai\.com\/g\/g-[^"]+"/g, (match, prefix, name, specialty, description) => {
  const encodedPrompt = encodePrompt(name, specialty, description);
  const newChatLink = `https://chatgpt.com/?q=${encodedPrompt}`;
  return match.replace(/chatLink: "https:\/\/chat\.openai\.com\/g\/g-[^"]+"/, `chatLink: "${newChatLink}"`);
});

// Escribir el archivo actualizado
fs.writeFileSync(agentsPath, content, 'utf8');

console.log('✅ Todos los enlaces de agentes han sido actualizados correctamente');
console.log('📝 Los enlaces ahora dirigen a ChatGPT con prompts personalizados para cada agente');