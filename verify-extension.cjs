#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Chrome Extension Structure...\n');

const distPath = './dist';
const requiredFiles = [
  'manifest.json',
  'popup/index.html',
  'popup/popup.js',
  'background/background.js',
  'content/content.js',
  'icons/icon-16.png',
  'icons/icon-32.png',
  'icons/icon-48.png',
  'icons/icon-128.png'
];

let allFilesExist = true;

// Check if dist directory exists
if (!fs.existsSync(distPath)) {
  console.error('❌ dist directory not found!');
  process.exit(1);
}

// Check required files
console.log('📁 Checking required files:');
requiredFiles.forEach(file => {
  const filePath = path.join(distPath, file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`✅ ${file} (${(stats.size / 1024).toFixed(1)}KB)`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

// Check manifest.json content
console.log('\n📋 Checking manifest.json:');
try {
  const manifestPath = path.join(distPath, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  
  console.log(`✅ Manifest version: ${manifest.manifest_version}`);
  console.log(`✅ Extension name: ${manifest.name}`);
  console.log(`✅ Popup path: ${manifest.action.default_popup}`);
  console.log(`✅ Service worker: ${manifest.background.service_worker}`);
  
  // Verify paths exist
  const popupPath = path.join(distPath, manifest.action.default_popup);
  const swPath = path.join(distPath, manifest.background.service_worker);
  
  if (!fs.existsSync(popupPath)) {
    console.log(`❌ Popup file not found: ${manifest.action.default_popup}`);
    allFilesExist = false;
  }
  
  if (!fs.existsSync(swPath)) {
    console.log(`❌ Service worker not found: ${manifest.background.service_worker}`);
    allFilesExist = false;
  }
  
} catch (error) {
  console.log(`❌ Error reading manifest.json: ${error.message}`);
  allFilesExist = false;
}

// Check popup HTML
console.log('\n🖼️  Checking popup HTML:');
try {
  const popupHtmlPath = path.join(distPath, 'popup/index.html');
  const popupHtml = fs.readFileSync(popupHtmlPath, 'utf8');
  
  if (popupHtml.includes('src="popup.js"')) {
    console.log('✅ Popup JS reference is correct (relative path)');
  } else if (popupHtml.includes('src="/popup/popup.js"')) {
    console.log('⚠️  Popup JS reference uses absolute path (may cause issues)');
  } else {
    console.log('❌ Popup JS reference not found or incorrect');
    allFilesExist = false;
  }
  
  if (popupHtml.includes('<div id="root">')) {
    console.log('✅ React root element found');
  } else {
    console.log('❌ React root element not found');
    allFilesExist = false;
  }
  
} catch (error) {
  console.log(`❌ Error reading popup HTML: ${error.message}`);
  allFilesExist = false;
}

// Check service worker
console.log('\n⚙️  Checking service worker:');
try {
  const swPath = path.join(distPath, 'background/background.js');
  const swContent = fs.readFileSync(swPath, 'utf8');
  
  // Check for actual import statements (not just the word "import" in strings)
  const importRegex = /^import\s+.*from\s+['"`]/m;
  const dynamicImportRegex = /import\s*\(/;
  
  if (importRegex.test(swContent) || dynamicImportRegex.test(swContent)) {
    console.log('❌ Service worker contains ES6 imports (will cause errors)');
    allFilesExist = false;
  } else {
    console.log('✅ Service worker is properly bundled (no imports)');
  }
  
  if (swContent.includes('chrome.runtime.onMessage.addListener')) {
    console.log('✅ Message listener found');
  } else {
    console.log('❌ Message listener not found');
    allFilesExist = false;
  }
  
  if (swContent.includes('chrome.storage.local')) {
    console.log('✅ Storage API usage found');
  } else {
    console.log('❌ Storage API usage not found');
    allFilesExist = false;
  }
  
} catch (error) {
  console.log(`❌ Error reading service worker: ${error.message}`);
  allFilesExist = false;
}

// Final result
console.log('\n' + '='.repeat(50));
if (allFilesExist) {
  console.log('🎉 Extension verification PASSED!');
  console.log('📦 Ready to load as unpacked extension in Chrome');
  console.log('\n📋 Instructions:');
  console.log('1. Open Chrome and go to chrome://extensions/');
  console.log('2. Enable "Developer mode" (top right toggle)');
  console.log('3. Click "Load unpacked" and select the dist/ folder');
  console.log('4. The extension should load without errors');
} else {
  console.log('❌ Extension verification FAILED!');
  console.log('🔧 Please fix the issues above before loading the extension');
  process.exit(1);
}