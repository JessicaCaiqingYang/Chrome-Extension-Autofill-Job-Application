#!/usr/bin/env node

import { readFileSync } from 'fs'
import { resolve } from 'path'

function verifyExtensionFunctionality() {
  console.log('Verifying Chrome extension functionality...')
  
  try {
    // Check manifest permissions
    const manifest = JSON.parse(readFileSync(resolve('dist/manifest.json'), 'utf8'))
    
    console.log('\n📋 Manifest Verification:')
    console.log(`✓ Manifest V3: ${manifest.manifest_version === 3}`)
    console.log(`✓ Required permissions: ${JSON.stringify(manifest.permissions)}`)
    console.log(`✓ Host permissions: ${JSON.stringify(manifest.host_permissions)}`)
    console.log(`✓ Content Security Policy: ${manifest.content_security_policy ? 'Present' : 'Default'}`)
    
    // Check file sizes (ensure they're reasonable)
    const files = [
      { name: 'background/background.js', maxSize: 50 * 1024 }, // 50KB
      { name: 'content/content.js', maxSize: 100 * 1024 }, // 100KB
      { name: 'popup/popup.js', maxSize: 500 * 1024 }, // 500KB (React bundle)
      { name: 'popup/index.html', maxSize: 5 * 1024 } // 5KB
    ]
    
    console.log('\n📦 File Size Verification:')
    files.forEach(file => {
      try {
        const content = readFileSync(resolve('dist', file.name))
        const size = content.length
        const sizeKB = Math.round(size / 1024)
        const maxSizeKB = Math.round(file.maxSize / 1024)
        const withinLimit = size <= file.maxSize
        
        console.log(`${withinLimit ? '✓' : '⚠️'} ${file.name}: ${sizeKB}KB ${withinLimit ? '' : `(exceeds ${maxSizeKB}KB limit)`}`)
      } catch (error) {
        console.log(`✗ ${file.name}: File not found`)
      }
    })
    
    // Check for required Chrome APIs usage
    const backgroundContent = readFileSync(resolve('dist/background/background.js'), 'utf8')
    const contentContent = readFileSync(resolve('dist/content/content.js'), 'utf8')
    
    console.log('\n🔧 Chrome API Usage Verification:')
    const requiredAPIs = [
      { api: 'chrome.storage', files: ['background'] },
      { api: 'chrome.runtime', files: ['background', 'content'] },
      { api: 'chrome.tabs', files: ['background'] }
    ]
    
    requiredAPIs.forEach(({ api, files }) => {
      files.forEach(file => {
        const content = file === 'background' ? backgroundContent : contentContent
        const hasAPI = content.includes(api)
        console.log(`${hasAPI ? '✓' : '✗'} ${api} in ${file}.js: ${hasAPI ? 'Present' : 'Missing'}`)
      })
    })
    
    // Check for potential issues
    console.log('\n🔍 Potential Issues Check:')
    
    // Check for external dependencies that might not work in extension context
    const externalDeps = ['http://', 'https://', 'fetch(', 'XMLHttpRequest']
    let hasExternalDeps = false
    
    externalDeps.forEach(dep => {
      if (backgroundContent.includes(dep) || contentContent.includes(dep)) {
        console.log(`⚠️ Found potential external dependency: ${dep}`)
        hasExternalDeps = true
      }
    })
    
    if (!hasExternalDeps) {
      console.log('✓ No external dependencies detected')
    }
    
    // Check for console.log statements (should be minimal in production)
    const backgroundLogs = (backgroundContent.match(/console\.log/g) || []).length
    const contentLogs = (contentContent.match(/console\.log/g) || []).length
    
    console.log(`${backgroundLogs < 5 ? '✓' : '⚠️'} Background console.log statements: ${backgroundLogs}`)
    console.log(`${contentLogs < 10 ? '✓' : '⚠️'} Content script console.log statements: ${contentLogs}`)
    
    console.log('\n' + '='.repeat(60))
    console.log('🎉 Extension functionality verification complete!')
    console.log('\n📝 Next Steps:')
    console.log('1. Load the extension in Chrome (chrome://extensions/)')
    console.log('2. Test the popup interface')
    console.log('3. Test autofill functionality on job sites')
    console.log('4. Check browser console for any runtime errors')
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message)
    process.exit(1)
  }
}

verifyExtensionFunctionality()