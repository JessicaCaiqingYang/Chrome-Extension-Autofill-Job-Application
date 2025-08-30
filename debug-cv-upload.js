// Debug script for CV upload functionality
// Run this in the browser console on the test page to check CV data

console.log('🔍 CV Upload Debug Script Loaded');

// Function to check if CV data exists
async function checkCVData() {
  try {
    console.log('📋 Checking CV data...');
    
    // Try to get CV data through extension messaging
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
      try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_CV_DATA' });
        if (response && response.success && response.data) {
          const cvData = response.data;
          console.log('✅ CV data found via extension:', {
            fileName: cvData.fileName,
            fileSize: cvData.fileSize,
            mimeType: cvData.mimeType,
            uploadDate: new Date(cvData.uploadDate).toLocaleString(),
            hasFileBlob: !!cvData.fileBlob,
            blobLength: cvData.fileBlob ? cvData.fileBlob.length : 0
          });
          
          // Test blob conversion
          if (cvData.fileBlob) {
            try {
              const byteCharacters = atob(cvData.fileBlob);
              console.log('✅ Blob conversion successful, size:', byteCharacters.length, 'bytes');
              return true;
            } catch (error) {
              console.error('❌ Blob conversion failed:', error);
              return false;
            }
          } else {
            console.log('⚠️ CV data found but no blob data available');
            return false;
          }
        } else {
          console.log('❌ No CV data found via extension messaging');
          return false;
        }
      } catch (error) {
        console.error('❌ Error accessing extension messaging:', error);
        console.log('💡 This might be because the debug script is running on a web page, not in the extension context');
        return false;
      }
    } else {
      console.log('❌ Chrome extension API not available');
      console.log('💡 This script needs to run in the extension context or on a page with extension access');
      return false;
    }
  } catch (error) {
    console.error('❌ Error checking CV data:', error);
    return false;
  }
}

// Function to check file upload fields on the page
function checkFileUploadFields() {
  console.log('📋 Checking file upload fields...');
  
  const fileInputs = document.querySelectorAll('input[type="file"]');
  console.log(`Found ${fileInputs.length} file input fields:`, 
    Array.from(fileInputs).map(input => ({
      id: input.id,
      name: input.name,
      accept: input.accept,
      className: input.className
    }))
  );
  
  // Check for CV/resume related fields
  const cvRelatedFields = Array.from(fileInputs).filter(input => {
    const identifiers = [
      input.id, input.name, input.className, input.placeholder,
      input.getAttribute('aria-label'), input.getAttribute('data-field')
    ].filter(Boolean).join(' ').toLowerCase();
    
    return identifiers.includes('resume') || identifiers.includes('cv') || 
           identifiers.includes('curriculum');
  });
  
  console.log(`Found ${cvRelatedFields.length} CV/resume related fields:`,
    cvRelatedFields.map(input => ({
      id: input.id,
      name: input.name,
      accept: input.accept
    }))
  );
  
  return fileInputs.length > 0;
}

// Function to test file upload manually
async function testFileUpload() {
  console.log('🧪 Testing file upload manually...');
  
  const cvData = await checkCVData();
  if (!cvData) {
    console.log('❌ Cannot test upload - no CV data available');
    return;
  }
  
  const fileInputs = document.querySelectorAll('input[type="file"]');
  if (fileInputs.length === 0) {
    console.log('❌ No file input fields found');
    return;
  }
  
  // Try to upload to the first file input
  const firstInput = fileInputs[0];
  console.log('📤 Attempting upload to:', firstInput.id || firstInput.name);
  
  try {
    // Get CV data through extension messaging
    const response = await chrome.runtime.sendMessage({ type: 'GET_CV_DATA' });
    if (!response || !response.success || !response.data) {
      console.log('❌ Could not retrieve CV data for manual upload');
      return;
    }
    
    const cvData = response.data;
    
    // Convert base64 to blob
    const byteCharacters = atob(cvData.fileBlob);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: cvData.mimeType });
    
    // Create File object
    const file = new File([blob], cvData.fileName, {
      type: cvData.mimeType,
      lastModified: cvData.uploadDate
    });
    
    console.log('📄 Created file object:', {
      name: file.name,
      size: file.size,
      type: file.type
    });
    
    // Create DataTransfer and set files
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    firstInput.files = dataTransfer.files;
    
    // Trigger events
    firstInput.dispatchEvent(new Event('change', { bubbles: true }));
    firstInput.dispatchEvent(new Event('input', { bubbles: true }));
    
    console.log('✅ Manual upload completed');
    console.log('Files in input:', firstInput.files.length);
    
  } catch (error) {
    console.error('❌ Manual upload failed:', error);
  }
}

// Function to run all checks
async function runAllChecks() {
  console.log('🚀 Running all CV upload checks...');
  
  const cvDataExists = await checkCVData();
  const fieldsExist = checkFileUploadFields();
  
  console.log('📊 Summary:');
  console.log(`- CV data available: ${cvDataExists ? '✅' : '❌'}`);
  console.log(`- File upload fields found: ${fieldsExist ? '✅' : '❌'}`);
  
  if (cvDataExists && fieldsExist) {
    console.log('🎯 Ready to test upload! Run testFileUpload() to test manually.');
  } else {
    console.log('⚠️  Some requirements not met. Please check the issues above.');
  }
}

// Make functions available globally
window.debugCVUpload = {
  checkCVData,
  checkFileUploadFields,
  testFileUpload,
  runAllChecks
};

console.log('🔧 Debug functions available:');
console.log('- debugCVUpload.checkCVData() - Check if CV data exists');
console.log('- debugCVUpload.checkFileUploadFields() - Check file upload fields');
console.log('- debugCVUpload.testFileUpload() - Test manual file upload');
console.log('- debugCVUpload.runAllChecks() - Run all checks');

// Auto-run checks when script loads
runAllChecks(); 