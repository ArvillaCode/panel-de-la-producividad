const fs = require('fs');
const path = require('path');

const appJsxPath = path.join(__dirname, '../src/App.jsx');
const appJsxContent = fs.readFileSync(appJsxPath, 'utf8');

const updatedContent = appJsxContent.replace(
  /const assistantConfig = {[^}]*}/,
  `const assistantConfig = {
    listenMode: true, // Activar modo escucha
    autoSuggest: false // Desactivar sugerencias automáticas
  };`
);

fs.writeFileSync(appJsxPath, updatedContent);
console.log('Configuración del asistente actualizada.');