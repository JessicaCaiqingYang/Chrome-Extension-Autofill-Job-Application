#!/usr/bin/env node

import { resolve } from 'path'
import { copyFileSync, existsSync, rmSync, readFileSync, writeFileSync } from 'fs'

async function postBuildCleanup() {
  console.log('Post-build cleanup...')
  
  try {
    // Copy HTML file to correct location and fix paths
    const srcHtml = resolve('dist/src/popup/index.html')
    const destHtml = resolve('dist/popup/index.html')
    
    if (existsSync(srcHtml)) {
      // Read the HTML content
      let htmlContent = readFileSync(srcHtml, 'utf8')
      
      // Fix the relative paths for Chrome extension
      htmlContent = htmlContent
        .replace(/src="\.\.\/\.\.\/popup\/popup\.js"/g, 'src="./popup.js"')
        .replace(/href="\.\.\/\.\.\/assets\//g, 'href="../assets/')
        
      // Write the corrected HTML to the destination
      writeFileSync(destHtml, htmlContent)
      console.log('✓ Moved popup HTML to correct location and fixed paths')
      
      // Clean up the temporary src directory
      rmSync(resolve('dist/src'), { recursive: true, force: true })
      console.log('✓ Cleaned up temporary build files')
    }
    
    console.log('✓ Extension build complete!')
    
  } catch (error) {
    console.error('Post-build cleanup failed:', error)
    process.exit(1)
  }
}

postBuildCleanup()