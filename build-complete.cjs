#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building complete Chrome extension...');

try {
  // Step 1: Run the standard build
  console.log('\n📦 Step 1: Running Vite build...');
  execSync('npm run build', { stdio: 'inherit' });

  // Step 2: Ensure popup HTML exists in the right location
  console.log('\n📄 Step 2: Ensuring popup HTML is in correct location...');
  const popupHtmlPath = path.join(__dirname, 'dist/popup/index.html');
  const srcPopupHtmlPath = path.join(__dirname, 'dist/src/popup/index.html');
  
  if (!fs.existsSync(popupHtmlPath)) {
    if (fs.existsSync(srcPopupHtmlPath)) {
      // Copy from src location to popup location
      const htmlContent = fs.readFileSync(srcPopupHtmlPath, 'utf8');
      const fixedHtml = htmlContent.replace(
        /<script[^>]*src="[^"]*"[^>]*><\/script>/g,
        '<script src="popup.js"></script>'
      );
      fs.writeFileSync(popupHtmlPath, fixedHtml);
      console.log('✅ Copied and fixed popup HTML');
    } else {
      // Create popup HTML from scratch
      const htmlContent = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Job Application Autofill</title>
    <style>
      body {
        width: 350px;
        min-height: 400px;
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script src="popup.js"></script>
  </body>
</html>`;
      fs.writeFileSync(popupHtmlPath, htmlContent);
      console.log('✅ Created popup HTML');
    }
  } else {
    console.log('✅ Popup HTML already exists');
  }

  // Step 3: Combine popup files to remove ES6 imports
  console.log('\n🔧 Step 3: Combining popup files...');
  execSync('node combine-popup.cjs', { stdio: 'inherit' });

  // Step 4: Verify the build
  console.log('\n✅ Step 4: Verifying build...');
  execSync('node scripts/verify-build.js', { stdio: 'inherit' });

  console.log('\n🎉 Extension build completed successfully!');
  console.log('\n📋 Next steps:');
  console.log('1. Open Chrome and go to chrome://extensions/');
  console.log('2. Enable "Developer mode" in the top right');
  console.log('3. Click "Load unpacked" and select the "dist" folder');
  console.log('4. Test the extension by clicking its icon');

} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  process.exit(1);
}