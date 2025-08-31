#!/usr/bin/env node

import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

function testExtensionBuild() {
  console.log('Testing Chrome extension build...')
  
  const distPath = resolve('dist')
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
  ]
  
  let allFilesExist = true
  
  for (const file of requiredFiles) {
    const filePath = resolve(distPath, file)
    if (existsSync(filePath)) {
      console.log(`✓ ${file}`)
    } else {
      console.log(`✗ ${file} - MISSING`)
      allFilesExist = false
    }
  }
  
  // Check manifest.json content
  try {
    const manifestPath = resolve(distPath, 'manifest.json')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    
    console.log('\nManifest validation:')
    console.log(`✓ Manifest version: ${manifest.manifest_version}`)
    console.log(`✓ Extension name: ${manifest.name}`)
    console.log(`✓ Background service worker: ${manifest.background?.service_worker}`)
    console.log(`✓ Popup HTML: ${manifest.action?.default_popup}`)
    console.log(`✓ Content scripts: ${manifest.content_scripts?.[0]?.js?.[0]}`)
    
    // Verify file references exist
    const bgFile = resolve(distPath, manifest.background?.service_worker || '')
    const popupFile = resolve(distPath, manifest.action?.default_popup || '')
    const contentFile = resolve(distPath, manifest.content_scripts?.[0]?.js?.[0] || '')
    
    if (existsSync(bgFile)) {
      console.log('✓ Background service worker file exists')
    } else {
      console.log('✗ Background service worker file missing')
      allFilesExist = false
    }
    
    if (existsSync(popupFile)) {
      console.log('✓ Popup HTML file exists')
    } else {
      console.log('✗ Popup HTML file missing')
      allFilesExist = false
    }
    
    if (existsSync(contentFile)) {
      console.log('✓ Content script file exists')
    } else {
      console.log('✗ Content script file missing')
      allFilesExist = false
    }
    
  } catch (error) {
    console.error('✗ Error reading manifest.json:', error.message)
    allFilesExist = false
  }
  
  console.log('\n' + '='.repeat(50))
  if (allFilesExist) {
    console.log('✅ Extension build is ready for Chrome!')
    console.log('\nTo load the extension:')
    console.log('1. Open Chrome and go to chrome://extensions/')
    console.log('2. Enable "Developer mode"')
    console.log('3. Click "Load unpacked"')
    console.log('4. Select the "dist" folder')
  } else {
    console.log('❌ Extension build has issues that need to be fixed')
    process.exit(1)
  }
}

testExtensionBuild()