# Test Suite

This directory contains all test files and testing utilities for the Job Application Autofill Chrome Extension.

## 📁 Directory Structure

```
tests/
├── scripts/              # Test automation scripts
│   ├── test-extension.js         # Extension build verification
│   ├── verify-build.js           # Build output validation
│   └── verify-extension-functionality.js  # Functionality checks
├── test-results/         # Generated test reports
│   ├── accessibility-report.json
│   ├── compatibility-report.json
│   ├── integration-report.json
│   └── master-integration-report.json
├── test-*.html          # Interactive test pages
└── *.js, *.cjs         # Test utilities and scripts
```

## 🧪 Test Pages

Interactive HTML pages for manual testing:

- **test-integration.html** - Comprehensive form testing page
- **test-cv-upload.html** - CV/resume upload functionality
- **test-messaging.html** - Extension messaging system
- **test-autofill-toggle.html** - Autofill toggle component
- **test-profile-form.html** - Profile form component
- **test-privacy-security.html** - Privacy and security features
- **test-visual-feedback.html** - Visual feedback system
- **test-file-upload.html** - File upload functionality
- **test-context-invalidation.html** - Context invalidation handling
- **test-cv-upload-fix.html** - CV upload bug fixes

## 🔧 Test Scripts

Automated testing and verification scripts:

### Build Verification
```bash
node tests/scripts/test-extension.js
```
Verifies that the extension build contains all required files and has proper structure.

### Functionality Verification
```bash
node tests/scripts/verify-extension-functionality.js
```
Checks Chrome API usage, file sizes, and potential issues.

### Build Validation
```bash
node tests/scripts/verify-build.js
```
Validates the build output and ensures compatibility.

## 📊 Test Reports

Generated reports are stored in `test-results/`:

- **accessibility-report.json** - WCAG compliance and accessibility audit
- **compatibility-report.json** - Cross-browser compatibility results
- **integration-report.json** - Component integration test results
- **master-integration-report.json** - Comprehensive test summary

## 🚀 Running Tests

### Quick Test Suite
```bash
npm run build:verify
```
Builds the extension and runs basic verification tests.

### Manual Testing
1. Build the extension: `npm run build`
2. Load the extension in Chrome (Developer mode)
3. Open any test page in `tests/test-*.html`
4. Follow the instructions on each test page

### Automated Testing
```bash
# Run all integration tests
node scripts/run-integration-tests.cjs

# Run accessibility audit
node scripts/accessibility-audit.cjs

# Run cross-browser compatibility tests
node scripts/cross-browser-test.cjs
```

## 📝 Test Documentation

- **verify-integration.md** - Integration testing verification guide
- **README.md** - This file

## 🎯 Test Coverage

The test suite covers:

- ✅ Extension build verification
- ✅ Component integration testing
- ✅ Form field detection and autofill
- ✅ CV/resume upload and parsing
- ✅ Cross-component messaging
- ✅ Error handling and edge cases
- ✅ Accessibility compliance
- ✅ Cross-browser compatibility
- ✅ Performance validation
- ✅ Security and privacy features

## 🔍 Debugging

For debugging test issues:

1. Check browser console for errors
2. Use the debug script: `debug-cv-upload.js`
3. Review test reports in `test-results/`
4. Follow troubleshooting guides in `docs/`

## 📋 Test Checklist

Before releasing:

- [ ] All test pages load without errors
- [ ] Extension builds successfully
- [ ] All automated tests pass
- [ ] Accessibility score > 80%
- [ ] Cross-browser compatibility verified
- [ ] Manual testing on real job sites completed