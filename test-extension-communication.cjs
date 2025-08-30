#!/usr/bin/env node

/**
 * Test script to verify Chrome extension communication
 * This script helps verify that the popup can communicate with content scripts
 * and detect relevant tabs correctly.
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Chrome Extension Communication Test');
console.log('=====================================\n');

// Check if build exists
const distPath = path.join(__dirname, 'dist');
if (!fs.existsSync(distPath)) {
    console.error('❌ Build directory not found. Run "npm run build" first.');
    process.exit(1);
}

// Check required files
const requiredFiles = [
    'dist/popup/index.html',
    'dist/content/content.js',
    'dist/background/background.js',
    'dist/manifest.json'
];

console.log('📁 Checking build files...');
let allFilesExist = true;

requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        const stats = fs.statSync(file);
        console.log(`✅ ${file} (${(stats.size / 1024).toFixed(1)}KB)`);
    } else {
        console.log(`❌ ${file} - Missing!`);
        allFilesExist = false;
    }
});

if (!allFilesExist) {
    console.error('\n❌ Some required files are missing. Build may have failed.');
    process.exit(1);
}

// Check manifest.json structure
console.log('\n📋 Checking manifest.json...');
try {
    const manifest = JSON.parse(fs.readFileSync('dist/manifest.json', 'utf8'));
    
    console.log(`✅ Manifest version: ${manifest.manifest_version}`);
    console.log(`✅ Extension name: ${manifest.name}`);
    console.log(`✅ Extension version: ${manifest.version}`);
    
    // Check permissions
    if (manifest.permissions && manifest.permissions.length > 0) {
        console.log(`✅ Permissions: ${manifest.permissions.join(', ')}`);
    }
    
    // Check content scripts
    if (manifest.content_scripts && manifest.content_scripts.length > 0) {
        console.log(`✅ Content scripts configured for: ${manifest.content_scripts[0].matches.join(', ')}`);
    }
    
    // Check background script
    if (manifest.background && manifest.background.service_worker) {
        console.log(`✅ Background service worker: ${manifest.background.service_worker}`);
    }
    
} catch (error) {
    console.error('❌ Error reading manifest.json:', error.message);
    process.exit(1);
}

// Check content script for key functionality
console.log('\n🔍 Analyzing content script...');
try {
    const contentScript = fs.readFileSync('dist/content/content.js', 'utf8');
    
    const checks = [
        { name: 'Page relevance detection', pattern: /checkPageRelevance|isRelevant/ },
        { name: 'Form field detection', pattern: /scanForFormFields|detectBasicFormFields/ },
        { name: 'Message handling', pattern: /chrome\.runtime\.onMessage|MessageType/ },
        { name: 'Autofill functionality', pattern: /TRIGGER_AUTOFILL|fillDetectedFields/ },
        { name: 'Field mapping', pattern: /FieldType|fieldMapping/ }
    ];
    
    checks.forEach(check => {
        if (check.pattern.test(contentScript)) {
            console.log(`✅ ${check.name} - Found`);
        } else {
            console.log(`⚠️  ${check.name} - Not found or may be minified`);
        }
    });
    
} catch (error) {
    console.error('❌ Error analyzing content script:', error.message);
}

// Check popup files
console.log('\n🎨 Checking popup files...');
try {
    const popupHtml = fs.readFileSync('dist/popup/index.html', 'utf8');
    
    if (popupHtml.includes('StatusIndicator')) {
        console.log('✅ StatusIndicator component referenced');
    }
    
    if (popupHtml.includes('popup.js')) {
        console.log('✅ Popup JavaScript bundle referenced');
    }
    
    // Check if popup JS exists and has reasonable size
    const popupJsPath = 'dist/popup/popup.js';
    if (fs.existsSync(popupJsPath)) {
        const stats = fs.statSync(popupJsPath);
        console.log(`✅ Popup JavaScript bundle: ${(stats.size / 1024).toFixed(1)}KB`);
        
        if (stats.size < 10000) {
            console.log('⚠️  Popup bundle seems small - may be missing dependencies');
        }
    }
    
} catch (error) {
    console.error('❌ Error checking popup files:', error.message);
}

console.log('\n🚀 Installation Instructions:');
console.log('1. Open Chrome and go to chrome://extensions/');
console.log('2. Enable "Developer mode" in the top right');
console.log('3. Click "Load unpacked" and select the "dist" folder');
console.log('4. The extension should appear in your extensions list');
console.log('5. Open test-form.html in a new tab to test functionality');
console.log('6. Click the extension icon to open the popup');
console.log('7. Check the Status tab to see if the page is detected as relevant');

console.log('\n🧪 Testing Steps:');
console.log('1. Fill out your profile in the Profile tab');
console.log('2. Go to the Status tab and check page relevance');
console.log('3. If the page shows as relevant, try the "Fill Current Page" button');
console.log('4. Check browser console (F12) for any error messages');

console.log('\n✅ Extension build verification complete!');
console.log('If you encounter issues, check the browser console for error messages.');