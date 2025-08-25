#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, '..', 'dist');
const requiredFiles = [
    'manifest.json',
    'background/background.js',
    'content/content.js',
    'popup/popup.js',
    'src/popup/index.html'
];

console.log('Verifying build output...');

let allFilesExist = true;

requiredFiles.forEach(file => {
    const filePath = path.join(distDir, file);
    if (fs.existsSync(filePath)) {
        console.log(`✓ ${file}`);
    } else {
        console.log(`✗ ${file} - MISSING`);
        allFilesExist = false;
    }
});

if (allFilesExist) {
    console.log('\n✅ Build verification successful! All required files are present.');
    process.exit(0);
} else {
    console.log('\n❌ Build verification failed! Some required files are missing.');
    process.exit(1);
}