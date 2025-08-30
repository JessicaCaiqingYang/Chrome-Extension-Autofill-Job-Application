# CV Upload Troubleshooting Guide

If the CV auto-upload feature isn't working, follow these steps to identify and fix the issue.

## 🔍 Step 1: Check Browser Console

1. Open the test page (`test-cv-upload.html`) in your browser
2. Open Developer Tools (F12 or right-click → Inspect)
3. Go to the Console tab
4. Look for any error messages or debug output

## 📋 Step 2: Verify CV Data Storage

The debug script will automatically check if CV data is stored correctly. Look for:

```
✅ CV data found: {
  fileName: "your-file.pdf",
  fileSize: 123456,
  mimeType: "application/pdf",
  uploadDate: "1/1/2024, 12:00:00 PM",
  hasFileBlob: true,
  blobLength: 123456
}
```

**If you see "❌ No CV data found in storage":**
- Make sure you've uploaded a CV in the extension popup
- Check if the CV upload was successful in the popup
- Try uploading the CV again

## 🔧 Step 3: Check File Upload Field Detection

The debug script will show:

```
Found 6 file input fields: [
  { id: "uploadResume", name: "uploadResume", accept: ".pdf,.doc,.docx" },
  { id: "uploadCV", name: "uploadCV", accept: ".pdf,.doc,.docx" },
  ...
]
```

**If no fields are detected:**
- Make sure you're on the test page
- Check if the page has loaded completely
- Verify the file input elements exist in the DOM

## 🧪 Step 4: Test Manual Upload

Run the manual upload test:

```javascript
debugCVUpload.testFileUpload()
```

This will attempt to upload your CV to the first file input field manually.

## 🚀 Step 5: Test Extension Autofill

1. Make sure the extension is loaded and enabled
2. Click "Fill Current Page" in the extension popup
3. Watch the console for detailed logs

Look for these log messages:

```
Detected 6 file upload fields
Mapped 4 file upload fields
Found 4 CV/Resume upload fields
Attempting to upload CV to 4 file upload fields
CV data: { fileName: "...", fileSize: ..., mimeType: "..." }
Processing upload field: cvResume (confidence: 0.85)
File upload compatibility check passed for cvResume
Created File object from CV data: { fileName: "...", fileSize: ..., mimeType: "..." }
File validation passed, proceeding with upload
File upload successful: filename.pdf (123.4KB) to cvResume field
```

## ❌ Common Issues and Solutions

### Issue 1: "No CV data available for file upload"
**Solution:** Upload a CV file in the extension popup first

### Issue 2: "No high-confidence file upload fields found"
**Solution:** The extension might not be detecting the fields correctly. Check the field labels match the expected patterns.

### Issue 3: "File upload compatibility check failed"
**Solution:** The CV file type or size doesn't match the field's requirements. Check the `accept` attribute and file size limits.

### Issue 4: "File upload verification failed"
**Solution:** The file upload process completed but the file wasn't properly set. This might be due to browser security restrictions.

### Issue 5: "Extension context invalidated"
**Solution:** Reload the extension and try again. This happens when the extension is reloaded while the page is open.

## 🔧 Manual Debugging Commands

You can run these commands in the browser console:

```javascript
// Check CV data
debugCVUpload.checkCVData()

// Check file upload fields
debugCVUpload.checkFileUploadFields()

// Test manual upload
debugCVUpload.testFileUpload()

// Run all checks
debugCVUpload.runAllChecks()
```

## 📊 Expected Console Output

When working correctly, you should see:

1. **Field Detection:**
   ```
   Raw file upload fields detected: [6 fields]
   Mapped 4 file upload fields
   Found 4 CV/Resume upload fields
   ```

2. **CV Data:**
   ```
   CV data: { fileName: "...", fileSize: ..., mimeType: "..." }
   ```

3. **Upload Process:**
   ```
   Processing upload field: cvResume (confidence: 0.85)
   File upload compatibility check passed for cvResume
   Created File object from CV data: { ... }
   File validation passed, proceeding with upload
   File upload successful: filename.pdf (123.4KB) to cvResume field
   ```

4. **Visual Feedback:**
   - Green borders around successfully uploaded fields
   - Success icons on file inputs
   - Notification showing upload results

## 🆘 Still Not Working?

If you're still having issues:

1. **Check the extension manifest** - Make sure it has the correct permissions
2. **Verify the extension is loaded** - Check `chrome://extensions/`
3. **Try a different browser** - Test in Chrome, Edge, or Brave
4. **Check for browser security restrictions** - Some sites may block file uploads
5. **Try with a different CV file** - Test with a smaller PDF file

## 📞 Getting Help

If you're still experiencing issues, please provide:

1. Browser console logs (copy all relevant messages)
2. Extension version and browser version
3. Steps you followed
4. Any error messages you see

This will help identify the specific issue and provide a targeted solution. 