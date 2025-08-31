#!/usr/bin/env node

import { resolve } from 'path'
import { copyFileSync, existsSync, rmSync } from 'fs'

async function postBuildCleanup() {
  console.log('Post-build cleanup...')
  
  try {
    // Copy HTML file to correct location
    const srcHtml = resolve('dist/src/popup/index.html')
    const destHtml = resolve('dist/popup/index.html')
    
    if (existsSync(srcHtml)) {
      copyFileSync(srcHtml, destHtml)
      console.log('✓ Moved popup HTML to correct location')
      
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