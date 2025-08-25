#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Combining popup files to remove ES module imports...');

try {
  // Read the types file
  const typesPath = path.join(__dirname, 'dist/assets/types-238746ba.js');
  const typesContent = fs.readFileSync(typesPath, 'utf8');
  
  // Read the popup file
  const popupPath = path.join(__dirname, 'dist/popup/popup.js');
  const popupContent = fs.readFileSync(popupPath, 'utf8');
  
  // Extract the types exports and convert to variables
  // The types file exports: export{_ as F,L as M};
  // We need to make these available as F and M
  const typesVars = typesContent.replace('export{_ as F,L as M};', 'const F=_,M=L;');
  
  // Remove the import statement from popup and replace Fe with M
  const popupWithoutImport = popupContent
    .replace(/^import\{M as Fe\}from"\.\.\/assets\/types-[^"]+\.js";/, '')
    .replace(/Fe/g, 'M');
  
  // Combine the files
  const combinedContent = `// Combined popup file for Chrome extension compatibility
${typesVars}
${popupWithoutImport}`;
  
  // Write the combined file
  fs.writeFileSync(popupPath, combinedContent);
  
  console.log('✅ Successfully combined popup files');
  console.log('📦 Popup is now ready for Chrome extension loading');
  
} catch (error) {
  console.error('❌ Error combining popup files:', error.message);
  process.exit(1);
}