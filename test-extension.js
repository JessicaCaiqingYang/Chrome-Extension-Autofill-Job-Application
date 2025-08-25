// Test script to verify extension integration
// This script can be run in the browser console to test the extension

console.log('🧪 Testing Job Application Autofill Extension Integration');

// Test 1: Check if content script is loaded
function testContentScriptLoaded() {
  console.log('\n📋 Test 1: Content Script Loading');
  
  if (window.formDetector) {
    console.log('✅ Content script loaded successfully');
    console.log('📊 Detected fields:', window.formDetector.getDetectedFields().length);
    console.log('🎯 Field mappings:', window.formDetector.getFieldMappings().length);
    return true;
  } else {
    console.log('❌ Content script not loaded or not available');
    return false;
  }
}

// Test 2: Check extension messaging
async function testExtensionMessaging() {
  console.log('\n📡 Test 2: Extension Messaging');
  
  try {
    // Test getting user profile
    const profileResponse = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'GET_USER_PROFILE' },
        (response) => resolve(response)
      );
    });
    
    if (profileResponse && profileResponse.success) {
      console.log('✅ Service worker communication working');
      console.log('👤 Profile data available:', !!profileResponse.data);
    } else {
      console.log('⚠️ Service worker responded but no profile data');
    }
    
    return true;
  } catch (error) {
    console.log('❌ Extension messaging failed:', error);
    return false;
  }
}

// Test 3: Test form field detection
function testFormFieldDetection() {
  console.log('\n🔍 Test 3: Form Field Detection');
  
  const formFields = document.querySelectorAll('input, textarea, select');
  console.log('📝 Total form fields on page:', formFields.length);
  
  if (window.formDetector) {
    const detectedFields = window.formDetector.getDetectedFields();
    console.log('🎯 Fields detected by extension:', detectedFields.length);
    
    if (detectedFields.length > 0) {
      console.log('✅ Form field detection working');
      
      // Log some details about detected fields
      detectedFields.slice(0, 5).forEach((field, index) => {
        console.log(`  ${index + 1}. ${field.tagName} - name: "${field.name}" id: "${field.id}"`);
      });
      
      return true;
    } else {
      console.log('⚠️ No fields detected by extension');
      return false;
    }
  } else {
    console.log('❌ Form detector not available');
    return false;
  }
}

// Test 4: Test autofill trigger
async function testAutofillTrigger() {
  console.log('\n🚀 Test 4: Autofill Trigger');
  
  try {
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'TRIGGER_AUTOFILL' },
        (response) => resolve(response)
      );
    });
    
    if (response && response.success) {
      console.log('✅ Autofill trigger successful');
      if (response.filled !== undefined) {
        console.log('📊 Fields filled:', response.filled);
        console.log('⚠️ Errors:', response.errors?.length || 0);
      }
      return true;
    } else {
      console.log('❌ Autofill trigger failed:', response?.error || 'Unknown error');
      return false;
    }
  } catch (error) {
    console.log('❌ Autofill trigger error:', error);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🎯 Starting Extension Integration Tests...\n');
  
  const results = {
    contentScript: testContentScriptLoaded(),
    messaging: await testExtensionMessaging(),
    fieldDetection: testFormFieldDetection(),
    autofillTrigger: await testAutofillTrigger()
  };
  
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All integration tests passed! Extension is working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Check the extension setup and try again.');
  }
  
  return results;
}

// Auto-run tests if this script is executed
if (typeof window !== 'undefined') {
  // Wait a bit for the page to load completely
  setTimeout(runAllTests, 1000);
}

// Export for manual testing
window.testExtension = {
  runAllTests,
  testContentScriptLoaded,
  testExtensionMessaging,
  testFormFieldDetection,
  testAutofillTrigger
};

console.log('🔧 Test functions available at window.testExtension');