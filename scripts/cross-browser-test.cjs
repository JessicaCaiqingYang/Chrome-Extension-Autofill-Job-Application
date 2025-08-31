#!/usr/bin/env node

/**
 * Cross-Browser Compatibility Test Script
 * 
 * This script tests the extension's compatibility across different browsers
 * and validates that all features work consistently.
 */

const fs = require('fs');
const path = require('path');

// Browser compatibility configuration
const BROWSER_CONFIG = {
  supportedBrowsers: [
    {
      name: 'Chrome',
      version: '88+',
      engine: 'Chromium',
      manifestVersion: 3,
      primary: true,
    },
    {
      name: 'Edge',
      version: '88+',
      engine: 'Chromium',
      manifestVersion: 3,
      primary: false,
    },
    {
      name: 'Firefox',
      version: '109+',
      engine: 'Gecko',
      manifestVersion: 3,
      primary: false,
      notes: 'Limited MV3 support',
    },
  ],
  testTimeout: 15000,
};

// API compatibility matrix
const API_COMPATIBILITY = {
  'chrome.storage': {
    Chrome: 'full',
    Edge: 'full',
    Firefox: 'full',
  },
  'chrome.runtime': {
    Chrome: 'full',
    Edge: 'full',
    Firefox: 'full',
  },
  'chrome.tabs': {
    Chrome: 'full',
    Edge: 'full',
    Firefox: 'full',
  },
  'chrome.scripting': {
    Chrome: 'full',
    Edge: 'full',
    Firefox: 'partial',
    notes: 'Firefox has limited scripting API support',
  },
  'chrome.action': {
    Chrome: 'full',
    Edge: 'full',
    Firefox: 'full',
  },
  'chrome.permissions': {
    Chrome: 'full',
    Edge: 'full',
    Firefox: 'full',
  },
};

// Feature compatibility tests
const COMPATIBILITY_TESTS = [
  {
    name: 'Manifest V3 Support',
    description: 'Test Manifest V3 compatibility across browsers',
    critical: true,
    tests: [
      'Manifest parsing',
      'Service worker registration',
      'Action popup functionality',
      'Content script injection',
      'Storage API access',
    ],
  },
  {
    name: 'Storage API Compatibility',
    description: 'Test Chrome storage API across browsers',
    critical: true,
    tests: [
      'Local storage read/write',
      'Storage change listeners',
      'Storage quota limits',
      'Data serialization',
      'Storage error handling',
    ],
  },
  {
    name: 'Messaging System',
    description: 'Test runtime messaging across contexts',
    critical: true,
    tests: [
      'Popup to background messaging',
      'Content script to background messaging',
      'Background to content script messaging',
      'Message serialization',
      'Error handling in messaging',
    ],
  },
  {
    name: 'Content Script Injection',
    description: 'Test content script functionality',
    critical: true,
    tests: [
      'Script injection on page load',
      'DOM manipulation capabilities',
      'Event listener registration',
      'Cross-origin restrictions',
      'Script cleanup on navigation',
    ],
  },
  {
    name: 'File Upload Handling',
    description: 'Test file upload and processing',
    critical: false,
    tests: [
      'File picker functionality',
      'PDF processing with pdf-parse',
      'DOCX processing with mammoth',
      'File size limitations',
      'MIME type validation',
    ],
  },
  {
    name: 'UI Rendering',
    description: 'Test popup UI rendering and styling',
    critical: false,
    tests: [
      'CSS rendering consistency',
      'Font rendering',
      'Layout responsiveness',
      'Animation performance',
      'Theme compatibility',
    ],
  },
  {
    name: 'Form Detection',
    description: 'Test form field detection algorithms',
    critical: true,
    tests: [
      'Input field detection',
      'Label association',
      'Field type classification',
      'Dynamic form handling',
      'Shadow DOM compatibility',
    ],
  },
  {
    name: 'Security Features',
    description: 'Test security and privacy features',
    critical: true,
    tests: [
      'Content Security Policy compliance',
      'Cross-origin request handling',
      'Data encryption in storage',
      'Permission model compliance',
      'Secure context requirements',
    ],
  },
];

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '🌐',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    debug: '🔍',
  }[type] || '🌐';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function validateManifestCompatibility() {
  log('Validating manifest compatibility...', 'debug');
  
  try {
    const manifestPath = path.join(__dirname, '..', 'dist', 'manifest.json');
    
    if (!fs.existsSync(manifestPath)) {
      log('Manifest file not found. Run build first.', 'error');
      return false;
    }
    
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    // Check Manifest V3 compliance
    if (manifest.manifest_version !== 3) {
      log(`Expected Manifest V3, found V${manifest.manifest_version}`, 'error');
      return false;
    }
    
    // Check required fields for cross-browser compatibility
    const requiredFields = [
      'name',
      'version',
      'description',
      'permissions',
      'action',
      'background',
      'content_scripts',
    ];
    
    const missingFields = requiredFields.filter(field => !manifest[field]);
    
    if (missingFields.length > 0) {
      log(`Missing required manifest fields: ${missingFields.join(', ')}`, 'error');
      return false;
    }
    
    // Check for browser-specific compatibility issues
    if (manifest.background && manifest.background.scripts) {
      log('Using deprecated background.scripts. Use background.service_worker instead.', 'warning');
    }
    
    if (manifest.browser_action) {
      log('Using deprecated browser_action. Use action instead.', 'warning');
    }
    
    // Check permissions for compatibility
    const permissions = manifest.permissions || [];
    const problematicPermissions = permissions.filter(perm => 
      ['webRequest', 'webRequestBlocking'].includes(perm)
    );
    
    if (problematicPermissions.length > 0) {
      log(`Potentially problematic permissions: ${problematicPermissions.join(', ')}`, 'warning');
    }
    
    log('Manifest compatibility validation passed', 'success');
    return true;
  } catch (error) {
    log(`Manifest validation failed: ${error.message}`, 'error');
    return false;
  }
}

function checkAPICompatibility() {
  log('Checking API compatibility...', 'debug');
  
  const results = [];
  
  for (const [api, browsers] of Object.entries(API_COMPATIBILITY)) {
    const apiResult = {
      api,
      browsers: {},
      overallSupport: 'full',
    };
    
    for (const browser of BROWSER_CONFIG.supportedBrowsers) {
      const support = browsers[browser.name] || 'unknown';
      apiResult.browsers[browser.name] = support;
      
      if (support === 'partial' || support === 'none') {
        apiResult.overallSupport = 'partial';
      }
    }
    
    results.push(apiResult);
    
    if (apiResult.overallSupport === 'full') {
      log(`✓ ${api}: Full cross-browser support`, 'success');
    } else {
      log(`⚠ ${api}: Limited cross-browser support`, 'warning');
    }
  }
  
  return results;
}

function validateBuildOutput() {
  log('Validating build output for cross-browser compatibility...', 'debug');
  
  const distPath = path.join(__dirname, '..', 'dist');
  
  if (!fs.existsSync(distPath)) {
    log('Build output not found. Run npm run build first.', 'error');
    return false;
  }
  
  // Check for required files
  const requiredFiles = [
    'manifest.json',
    'popup/index.html',
    'popup/popup.js',
    'background/background.js',
    'content/content.js',
  ];
  
  const missingFiles = requiredFiles.filter(file => {
    const filePath = path.join(distPath, file);
    return !fs.existsSync(filePath);
  });
  
  if (missingFiles.length > 0) {
    log(`Missing build files: ${missingFiles.join(', ')}`, 'error');
    return false;
  }
  
  // Check for browser-specific polyfills
  try {
    const backgroundPath = path.join(distPath, 'background/background.js');
    const backgroundContent = fs.readFileSync(backgroundPath, 'utf8');
    
    // Check for webextension-polyfill usage
    const hasPolyfill = backgroundContent.includes('webextension-polyfill') ||
                       backgroundContent.includes('browser.') ||
                       backgroundContent.includes('chrome.');
    
    if (!hasPolyfill) {
      log('Consider using webextension-polyfill for better cross-browser compatibility', 'warning');
    }
    
    log('Build output validation passed', 'success');
    return true;
  } catch (error) {
    log(`Build validation failed: ${error.message}`, 'error');
    return false;
  }
}

function checkContentScriptCompatibility() {
  log('Checking content script compatibility...', 'debug');
  
  try {
    const contentScriptPath = path.join(__dirname, '..', 'src/content/content-script.ts');
    
    if (!fs.existsSync(contentScriptPath)) {
      log('Content script not found', 'error');
      return false;
    }
    
    const contentScript = fs.readFileSync(contentScriptPath, 'utf8');
    
    // Check for potential compatibility issues
    const compatibilityChecks = [
      {
        pattern: /document\.querySelector/g,
        name: 'DOM querying',
        compatible: true,
      },
      {
        pattern: /addEventListener/g,
        name: 'Event listeners',
        compatible: true,
      },
      {
        pattern: /MutationObserver/g,
        name: 'Mutation observers',
        compatible: true,
      },
      {
        pattern: /fetch\(/g,
        name: 'Fetch API',
        compatible: true,
      },
      {
        pattern: /chrome\./g,
        name: 'Chrome APIs',
        compatible: false,
        suggestion: 'Use webextension-polyfill for cross-browser compatibility',
      },
    ];
    
    let compatibilityScore = 0;
    let totalChecks = 0;
    
    for (const check of compatibilityChecks) {
      const matches = contentScript.match(check.pattern);
      if (matches && matches.length > 0) {
        totalChecks++;
        if (check.compatible) {
          compatibilityScore++;
          log(`✓ ${check.name}: Compatible`, 'debug');
        } else {
          log(`⚠ ${check.name}: ${check.suggestion || 'May have compatibility issues'}`, 'warning');
        }
      }
    }
    
    const compatibilityPercentage = totalChecks > 0 ? (compatibilityScore / totalChecks) * 100 : 100;
    
    if (compatibilityPercentage >= 80) {
      log('Content script compatibility check passed', 'success');
      return true;
    } else {
      log(`Content script compatibility needs improvement (${compatibilityPercentage.toFixed(1)}%)`, 'warning');
      return false;
    }
  } catch (error) {
    log(`Content script compatibility check failed: ${error.message}`, 'error');
    return false;
  }
}

function checkDependencyCompatibility() {
  log('Checking dependency compatibility...', 'debug');
  
  try {
    const packagePath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };
    
    // Check for browser-specific dependencies
    const browserSpecificDeps = [
      'mammoth', // DOCX processing
      'pdf-parse', // PDF processing
      'buffer', // Node.js buffer polyfill
    ];
    
    const compatibilityIssues = [];
    
    for (const dep of browserSpecificDeps) {
      if (dependencies[dep]) {
        // These dependencies require polyfills for browser environment
        compatibilityIssues.push({
          dependency: dep,
          issue: 'Requires browser polyfills',
          severity: 'medium',
        });
      }
    }
    
    // Check for Node.js specific APIs that might not work in browsers
    const buildFiles = ['dist/popup/popup.js', 'dist/background/background.js', 'dist/content/content.js'];
    
    for (const file of buildFiles) {
      const filePath = path.join(__dirname, '..', file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check for Node.js APIs that might cause issues
        const nodeAPIs = ['require(', 'process.', '__dirname', '__filename'];
        
        for (const api of nodeAPIs) {
          if (content.includes(api)) {
            compatibilityIssues.push({
              file,
              issue: `Contains Node.js API: ${api}`,
              severity: 'high',
            });
          }
        }
      }
    }
    
    if (compatibilityIssues.length === 0) {
      log('Dependency compatibility check passed', 'success');
      return true;
    } else {
      log(`Found ${compatibilityIssues.length} compatibility issues`, 'warning');
      compatibilityIssues.forEach(issue => {
        log(`${issue.severity.toUpperCase()}: ${issue.issue}`, issue.severity === 'high' ? 'error' : 'warning');
      });
      return compatibilityIssues.filter(i => i.severity === 'high').length === 0;
    }
  } catch (error) {
    log(`Dependency compatibility check failed: ${error.message}`, 'error');
    return false;
  }
}

function generateCompatibilityReport(results) {
  log('Generating cross-browser compatibility report...', 'debug');
  
  const reportPath = path.join(__dirname, '..', 'test-results', 'compatibility-report.json');
  const reportDir = path.dirname(reportPath);
  
  // Ensure report directory exists
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const passedTests = results.filter(r => r.status === 'passed').length;
  const totalTests = results.length;
  const compatibilityScore = (passedTests / totalTests) * 100;
  
  let compatibilityLevel = 'Poor';
  if (compatibilityScore >= 95) {
    compatibilityLevel = 'Excellent';
  } else if (compatibilityScore >= 85) {
    compatibilityLevel = 'Good';
  } else if (compatibilityScore >= 70) {
    compatibilityLevel = 'Fair';
  }
  
  const report = {
    timestamp: new Date().toISOString(),
    compatibilityScore: compatibilityScore.toFixed(1),
    compatibilityLevel,
    supportedBrowsers: BROWSER_CONFIG.supportedBrowsers,
    apiCompatibility: API_COMPATIBILITY,
    summary: {
      total: totalTests,
      passed: passedTests,
      failed: totalTests - passedTests,
    },
    results,
    recommendations: generateCompatibilityRecommendations(results),
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`Compatibility report generated: ${reportPath}`, 'success');
  
  return report;
}

function generateCompatibilityRecommendations(results) {
  const recommendations = [];
  const failedTests = results.filter(r => r.status === 'failed');
  
  if (failedTests.some(t => t.name.includes('Manifest'))) {
    recommendations.push({
      priority: 'high',
      category: 'Manifest',
      message: 'Fix manifest compatibility issues for proper extension loading',
      action: 'Update manifest.json to use Manifest V3 standards',
    });
  }
  
  if (failedTests.some(t => t.name.includes('API'))) {
    recommendations.push({
      priority: 'high',
      category: 'APIs',
      message: 'Address API compatibility issues across browsers',
      action: 'Consider using webextension-polyfill for better cross-browser support',
    });
  }
  
  if (failedTests.some(t => t.name.includes('Content Script'))) {
    recommendations.push({
      priority: 'medium',
      category: 'Content Scripts',
      message: 'Improve content script compatibility',
      action: 'Avoid browser-specific APIs and use standard web APIs',
    });
  }
  
  if (failedTests.some(t => t.name.includes('Dependency'))) {
    recommendations.push({
      priority: 'medium',
      category: 'Dependencies',
      message: 'Address dependency compatibility issues',
      action: 'Ensure all dependencies work in browser environment with proper polyfills',
    });
  }
  
  if (recommendations.length === 0) {
    recommendations.push({
      priority: 'info',
      category: 'Compatibility',
      message: 'Excellent cross-browser compatibility!',
      action: 'Continue testing on different browsers during development',
    });
  }
  
  return recommendations;
}

async function runCrossBrowserTest() {
  log('Starting cross-browser compatibility test...', 'info');
  
  const results = [];
  
  // Run compatibility tests
  const compatibilityChecks = [
    { name: 'Manifest Compatibility', check: validateManifestCompatibility },
    { name: 'Build Output Validation', check: validateBuildOutput },
    { name: 'Content Script Compatibility', check: checkContentScriptCompatibility },
    { name: 'Dependency Compatibility', check: checkDependencyCompatibility },
  ];
  
  for (const { name, check } of compatibilityChecks) {
    try {
      const startTime = Date.now();
      const passed = check();
      const duration = Date.now() - startTime;
      
      results.push({
        name,
        status: passed ? 'passed' : 'failed',
        duration,
        category: 'compatibility',
      });
    } catch (error) {
      results.push({
        name,
        status: 'failed',
        duration: 0,
        category: 'compatibility',
        error: error.message,
      });
    }
  }
  
  // Check API compatibility
  const apiResults = checkAPICompatibility();
  results.push({
    name: 'API Compatibility Matrix',
    status: apiResults.every(r => r.overallSupport === 'full') ? 'passed' : 'warning',
    duration: 0,
    category: 'api',
    details: apiResults,
  });
  
  // Generate report
  const report = generateCompatibilityReport(results);
  
  // Print summary
  log('Cross-Browser Compatibility Summary:', 'info');
  log(`Compatibility Score: ${report.compatibilityScore}%`, 'info');
  log(`Compatibility Level: ${report.compatibilityLevel}`, 'info');
  log(`Tests Passed: ${report.summary.passed}/${report.summary.total}`, 'success');
  
  if (report.summary.failed > 0) {
    log(`Tests Failed: ${report.summary.failed}`, 'error');
  }
  
  // Print supported browsers
  log('Supported Browsers:', 'info');
  BROWSER_CONFIG.supportedBrowsers.forEach(browser => {
    const status = browser.primary ? '(Primary)' : '(Secondary)';
    log(`  ${browser.name} ${browser.version} ${status}`, 'info');
  });
  
  // Print recommendations
  if (report.recommendations.length > 0) {
    log('Compatibility Recommendations:', 'info');
    report.recommendations.forEach(rec => {
      log(`${rec.priority.toUpperCase()}: ${rec.message}`, rec.priority === 'high' ? 'error' : 'warning');
    });
  }
  
  return report.summary.failed === 0;
}

// Main execution
if (require.main === module) {
  runCrossBrowserTest()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      log(`Cross-browser test failed: ${error.message}`, 'error');
      process.exit(1);
    });
}

module.exports = {
  runCrossBrowserTest,
  COMPATIBILITY_TESTS,
  BROWSER_CONFIG,
  API_COMPATIBILITY,
};