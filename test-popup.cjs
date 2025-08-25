#!/usr/bin/env node

console.log('🧪 Testing popup functionality...');

const fs = require('fs');
const path = require('path');

// Check if all required files exist
const requiredFiles = [
    'dist/manifest.json',
    'dist/popup/index.html',
    'dist/popup/popup.js',
    'dist/background/background.js',
    'dist/content/content.js'
];

let allFilesExist = true;

console.log('\n📁 Checking required files:');
requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file}`);
    } else {
        console.log(`❌ ${file} - MISSING`);
        allFilesExist = false;
    }
});

if (!allFilesExist) {
    console.log('\n❌ Some required files are missing. Run npm run build first.');
    process.exit(1);
}

// Check popup HTML structure
console.log('\n🔍 Checking popup HTML structure:');
const htmlContent = fs.readFileSync('dist/popup/index.html', 'utf8');

if (htmlContent.includes('<div id="root"></div>')) {
    console.log('✅ Root div found');
} else {
    console.log('❌ Root div missing');
}

if (htmlContent.includes('<script src="popup.js"></script>')) {
    console.log('✅ Script tag found');
} else {
    console.log('❌ Script tag missing or incorrect');
}

// Check popup JS for ES6 imports
console.log('\n🔍 Checking popup JS for ES6 imports:');
const jsContent = fs.readFileSync('dist/popup/popup.js', 'utf8');

if (jsContent.includes('import ') || jsContent.includes('export ')) {
    console.log('❌ ES6 imports/exports found - this will cause issues in Chrome extension');
} else {
    console.log('✅ No ES6 imports/exports found');
}

if (jsContent.includes('Combined popup file for Chrome extension compatibility')) {
    console.log('✅ Combined popup file detected');
} else {
    console.log('⚠️  Popup file may not be properly combined');
}

// Check manifest popup path
console.log('\n🔍 Checking manifest popup configuration:');
const manifestContent = JSON.parse(fs.readFileSync('dist/manifest.json', 'utf8'));

if (manifestContent.action && manifestContent.action.default_popup === 'popup/index.html') {
    console.log('✅ Manifest popup path is correct');
} else {
    console.log('❌ Manifest popup path is incorrect');
    console.log('Expected: popup/index.html');
    console.log('Found:', manifestContent.action?.default_popup);
}

console.log('\n🎯 Extension loading instructions:');
console.log('1. Open Chrome and go to chrome://extensions/');
console.log('2. Enable "Developer mode" in the top right');
console.log('3. Click "Load unpacked" and select the "dist" folder');
console.log('4. The extension should appear in your extensions list');
console.log('5. Click the extension icon to test the popup');

console.log('\n✅ Popup test completed!');