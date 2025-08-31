#!/usr/bin/env node

/**
 * Master Integration Test Runner
 * 
 * This script orchestrates all integration tests including:
 * - Complete workflow testing
 * - Accessibility auditing
 * - Cross-browser compatibility
 * - Component integration validation
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Import test modules
const { runIntegrationTests } = require('./test-complete-workflow.cjs');
const { runAccessibilityAudit } = require('./accessibility-audit.cjs');
const { runCrossBrowserTest } = require('./cross-browser-test.cjs');

// Test suite configuration
const TEST_SUITE_CONFIG = {
  timeout: 120000, // 2 minutes total timeout
  parallel: false, // Run tests sequentially for now
  generateReport: true,
  exitOnFailure: false, // Continue running all tests even if some fail
};

// Test suites to run
const TEST_SUITES = [
  {
    name: 'Build Verification',
    description: 'Verify the extension builds correctly',
    runner: runBuildVerification,
    critical: true,
    timeout: 30000,
  },
  {
    name: 'Component Integration',
    description: 'Test integration between all components',
    runner: runIntegrationTests,
    critical: true,
    timeout: 45000,
  },
  {
    name: 'Accessibility Audit',
    description: 'Comprehensive accessibility testing',
    runner: runAccessibilityAudit,
    critical: false,
    timeout: 20000,
  },
  {
    name: 'Cross-Browser Compatibility',
    description: 'Test compatibility across different browsers',
    runner: runCrossBrowserTest,
    critical: false,
    timeout: 25000,
  },
  {
    name: 'Performance Validation',
    description: 'Validate extension performance metrics',
    runner: runPerformanceValidation,
    critical: false,
    timeout: 15000,
  },
];

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '🧪',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    debug: '🔍',
    start: '🚀',
    finish: '🏁',
  }[type] || '🧪';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
}

async function runBuildVerification() {
  log('Running build verification...', 'debug');
  
  try {
    // Check if dist directory exists
    const distPath = path.join(__dirname, '..', 'dist');
    if (!fs.existsSync(distPath)) {
      log('Building extension...', 'info');
      execSync('npm run build', { 
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit' 
      });
    }
    
    // Verify build output
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
      throw new Error(`Missing build files: ${missingFiles.join(', ')}`);
    }
    
    // Verify manifest
    const manifestPath = path.join(distPath, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    if (manifest.manifest_version !== 3) {
      throw new Error(`Expected Manifest V3, got V${manifest.manifest_version}`);
    }
    
    log('Build verification passed', 'success');
    return true;
  } catch (error) {
    log(`Build verification failed: ${error.message}`, 'error');
    return false;
  }
}

async function runPerformanceValidation() {
  log('Running performance validation...', 'debug');
  
  try {
    const distPath = path.join(__dirname, '..', 'dist');
    
    // Check bundle sizes
    const bundleSizes = {};
    const bundleFiles = ['popup/popup.js', 'background/background.js', 'content/content.js'];
    
    for (const file of bundleFiles) {
      const filePath = path.join(distPath, file);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        bundleSizes[file] = stats.size;
      }
    }
    
    // Define size limits (in bytes)
    const sizeLimits = {
      'popup/popup.js': 500 * 1024, // 500KB
      'background/background.js': 200 * 1024, // 200KB
      'content/content.js': 100 * 1024, // 100KB
    };
    
    const oversizedBundles = [];
    
    for (const [file, size] of Object.entries(bundleSizes)) {
      const limit = sizeLimits[file];
      if (limit && size > limit) {
        oversizedBundles.push({
          file,
          size: Math.round(size / 1024),
          limit: Math.round(limit / 1024),
        });
      }
    }
    
    if (oversizedBundles.length > 0) {
      log('Bundle size warnings:', 'warning');
      oversizedBundles.forEach(bundle => {
        log(`  ${bundle.file}: ${bundle.size}KB (limit: ${bundle.limit}KB)`, 'warning');
      });
    }
    
    // Check for performance anti-patterns in source code
    const sourceFiles = [
      'src/popup/App.tsx',
      'src/popup/components/StatusIndicator.tsx',
      'src/background/service-worker.ts',
      'src/content/content-script.ts',
    ];
    
    const performanceIssues = [];
    
    for (const file of sourceFiles) {
      const filePath = path.join(__dirname, '..', file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check for potential performance issues
        const antiPatterns = [
          { pattern: /setInterval\(/g, issue: 'setInterval usage' },
          { pattern: /while\s*\(true\)/g, issue: 'Infinite loops' },
          { pattern: /document\.querySelector.*\)/g, issue: 'Frequent DOM queries' },
        ];
        
        for (const antiPattern of antiPatterns) {
          const matches = content.match(antiPattern.pattern);
          if (matches && matches.length > 5) { // More than 5 occurrences
            performanceIssues.push({
              file,
              issue: antiPattern.issue,
              count: matches.length,
            });
          }
        }
      }
    }
    
    if (performanceIssues.length > 0) {
      log('Performance issues found:', 'warning');
      performanceIssues.forEach(issue => {
        log(`  ${issue.file}: ${issue.issue} (${issue.count} occurrences)`, 'warning');
      });
    }
    
    log('Performance validation completed', 'success');
    return oversizedBundles.length === 0 && performanceIssues.length === 0;
  } catch (error) {
    log(`Performance validation failed: ${error.message}`, 'error');
    return false;
  }
}

function generateMasterReport(suiteResults) {
  log('Generating master integration report...', 'debug');
  
  const reportPath = path.join(__dirname, '..', 'tests', 'test-results', 'master-integration-report.json');
  const reportDir = path.dirname(reportPath);
  
  // Ensure report directory exists
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const totalSuites = suiteResults.length;
  const passedSuites = suiteResults.filter(r => r.status === 'passed').length;
  const failedSuites = suiteResults.filter(r => r.status === 'failed').length;
  const skippedSuites = suiteResults.filter(r => r.status === 'skipped').length;
  
  const overallScore = (passedSuites / totalSuites) * 100;
  
  let readinessLevel = 'Not Ready';
  if (overallScore >= 95) {
    readinessLevel = 'Production Ready';
  } else if (overallScore >= 85) {
    readinessLevel = 'Nearly Ready';
  } else if (overallScore >= 70) {
    readinessLevel = 'Development Ready';
  }
  
  const criticalFailures = suiteResults.filter(r => r.critical && r.status === 'failed');
  
  const report = {
    timestamp: new Date().toISOString(),
    overallScore: overallScore.toFixed(1),
    readinessLevel,
    hasCriticalFailures: criticalFailures.length > 0,
    summary: {
      total: totalSuites,
      passed: passedSuites,
      failed: failedSuites,
      skipped: skippedSuites,
      criticalFailures: criticalFailures.length,
    },
    suiteResults,
    recommendations: generateMasterRecommendations(suiteResults),
    nextSteps: generateNextSteps(suiteResults),
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`Master integration report generated: ${reportPath}`, 'success');
  
  return report;
}

function generateMasterRecommendations(suiteResults) {
  const recommendations = [];
  
  const failedSuites = suiteResults.filter(r => r.status === 'failed');
  const criticalFailures = failedSuites.filter(r => r.critical);
  
  if (criticalFailures.length > 0) {
    recommendations.push({
      priority: 'critical',
      category: 'Blocking Issues',
      message: `${criticalFailures.length} critical test suite(s) failed. These must be fixed before deployment.`,
      suites: criticalFailures.map(s => s.name),
    });
  }
  
  const nonCriticalFailures = failedSuites.filter(r => !r.critical);
  if (nonCriticalFailures.length > 0) {
    recommendations.push({
      priority: 'high',
      category: 'Quality Issues',
      message: `${nonCriticalFailures.length} non-critical test suite(s) failed. Consider fixing these for better quality.`,
      suites: nonCriticalFailures.map(s => s.name),
    });
  }
  
  const skippedSuites = suiteResults.filter(r => r.status === 'skipped');
  if (skippedSuites.length > 0) {
    recommendations.push({
      priority: 'medium',
      category: 'Test Coverage',
      message: `${skippedSuites.length} test suite(s) were skipped. Consider implementing these tests.`,
      suites: skippedSuites.map(s => s.name),
    });
  }
  
  if (recommendations.length === 0) {
    recommendations.push({
      priority: 'info',
      category: 'Success',
      message: 'All integration tests passed! Extension is ready for deployment.',
    });
  }
  
  return recommendations;
}

function generateNextSteps(suiteResults) {
  const nextSteps = [];
  
  const criticalFailures = suiteResults.filter(r => r.critical && r.status === 'failed');
  
  if (criticalFailures.length > 0) {
    nextSteps.push({
      step: 1,
      action: 'Fix Critical Issues',
      description: 'Address all critical test failures before proceeding',
      priority: 'immediate',
    });
    
    nextSteps.push({
      step: 2,
      action: 'Re-run Integration Tests',
      description: 'Run the full test suite again after fixes',
      priority: 'immediate',
    });
  } else {
    const nonCriticalFailures = suiteResults.filter(r => r.status === 'failed');
    
    if (nonCriticalFailures.length > 0) {
      nextSteps.push({
        step: 1,
        action: 'Address Quality Issues',
        description: 'Fix non-critical test failures for better quality',
        priority: 'high',
      });
    }
    
    nextSteps.push({
      step: nextSteps.length + 1,
      action: 'Manual Testing',
      description: 'Perform manual testing on different browsers and scenarios',
      priority: 'medium',
    });
    
    nextSteps.push({
      step: nextSteps.length + 1,
      action: 'User Acceptance Testing',
      description: 'Test with real users and job application websites',
      priority: 'medium',
    });
    
    nextSteps.push({
      step: nextSteps.length + 1,
      action: 'Deployment Preparation',
      description: 'Prepare for Chrome Web Store submission',
      priority: 'low',
    });
  }
  
  return nextSteps;
}

async function runTestSuite(suite) {
  log(`Starting ${suite.name}...`, 'start');
  
  const startTime = Date.now();
  
  try {
    // Set up timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Test suite timeout')), suite.timeout);
    });
    
    // Run the test suite
    const testPromise = suite.runner();
    
    const result = await Promise.race([testPromise, timeoutPromise]);
    const duration = Date.now() - startTime;
    
    if (result) {
      log(`✓ ${suite.name} passed (${duration}ms)`, 'success');
      return {
        name: suite.name,
        description: suite.description,
        status: 'passed',
        duration,
        critical: suite.critical,
      };
    } else {
      log(`✗ ${suite.name} failed (${duration}ms)`, 'error');
      return {
        name: suite.name,
        description: suite.description,
        status: 'failed',
        duration,
        critical: suite.critical,
        error: 'Test suite returned false',
      };
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    log(`✗ ${suite.name} failed: ${error.message} (${duration}ms)`, 'error');
    
    return {
      name: suite.name,
      description: suite.description,
      status: 'failed',
      duration,
      critical: suite.critical,
      error: error.message,
    };
  }
}

async function runAllIntegrationTests() {
  log('Starting master integration test suite...', 'start');
  log(`Running ${TEST_SUITES.length} test suites...`, 'info');
  
  const suiteResults = [];
  let criticalFailureOccurred = false;
  
  for (const suite of TEST_SUITES) {
    // Skip non-critical tests if a critical failure occurred and exitOnFailure is true
    if (criticalFailureOccurred && TEST_SUITE_CONFIG.exitOnFailure && !suite.critical) {
      log(`Skipping ${suite.name} due to critical failure`, 'warning');
      suiteResults.push({
        name: suite.name,
        description: suite.description,
        status: 'skipped',
        duration: 0,
        critical: suite.critical,
        error: 'Skipped due to critical failure',
      });
      continue;
    }
    
    const result = await runTestSuite(suite);
    suiteResults.push(result);
    
    if (result.status === 'failed' && result.critical) {
      criticalFailureOccurred = true;
    }
  }
  
  // Generate master report
  const report = generateMasterReport(suiteResults);
  
  // Print final summary
  log('Integration Test Suite Complete!', 'finish');
  log(`Overall Score: ${report.overallScore}%`, 'info');
  log(`Readiness Level: ${report.readinessLevel}`, 'info');
  log(`Suites Passed: ${report.summary.passed}/${report.summary.total}`, 'success');
  
  if (report.summary.failed > 0) {
    log(`Suites Failed: ${report.summary.failed}`, 'error');
  }
  
  if (report.summary.criticalFailures > 0) {
    log(`Critical Failures: ${report.summary.criticalFailures}`, 'error');
  }
  
  // Print recommendations
  if (report.recommendations.length > 0) {
    log('Recommendations:', 'info');
    report.recommendations.forEach(rec => {
      const logType = rec.priority === 'critical' ? 'error' : rec.priority === 'high' ? 'warning' : 'info';
      log(`${rec.priority.toUpperCase()}: ${rec.message}`, logType);
    });
  }
  
  // Print next steps
  if (report.nextSteps.length > 0) {
    log('Next Steps:', 'info');
    report.nextSteps.forEach(step => {
      log(`${step.step}. ${step.action}: ${step.description}`, 'info');
    });
  }
  
  return report.summary.criticalFailures === 0;
}

// Main execution
if (require.main === module) {
  runAllIntegrationTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      log(`Integration test suite failed: ${error.message}`, 'error');
      process.exit(1);
    });
}

module.exports = {
  runAllIntegrationTests,
  TEST_SUITES,
  TEST_SUITE_CONFIG,
};