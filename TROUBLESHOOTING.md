# Chrome Extension Troubleshooting Guide

## Issue: Popup Shows "Loading..." Indefinitely

If the popup is stuck showing "Loading..." this indicates a communication issue between the popup and the service worker.

### Quick Fixes

1. **Reload the Extension**
   - Go to `chrome://extensions/`
   - Find "Job Application Autofill"
   - Click the refresh/reload button (🔄)
   - Try opening the popup again

2. **Check Browser Console**
   - Open the popup
   - Right-click in the popup and select "Inspect"
   - Check the Console tab for error messages
   - Look for messages starting with "🔄 StatusIndicator:"

3. **Check Service Worker Console**
   - Go to `chrome://extensions/`
   - Find "Job Application Autofill"
   - Click "service worker" link (if available)
   - Check for error messages in the service worker console

### Debugging Steps

1. **Verify Extension Context**
   - In the popup console, check if `chrome.runtime.id` returns a value
   - If it returns `undefined`, the extension context is invalidated

2. **Test Service Worker Communication**
   - In the popup console, run:
     ```javascript
     chrome.runtime.sendMessage({type: 'PING'}, (response) => {
       console.log('Service worker response:', response);
     });
     ```
   - Should return: `{success: true, status: 'ready', timestamp: ...}`

3. **Check Content Script**
   - Open a webpage (like test-form.html)
   - Open browser console (F12)
   - Look for: "Job Application Autofill content script loaded"
   - Test content script: 
     ```javascript
     chrome.runtime.sendMessage({type: 'CHECK_PAGE_RELEVANCE'}, console.log);
     ```

### Common Issues and Solutions

#### 1. Service Worker Not Responding
**Symptoms**: Popup stuck on loading, no response to PING
**Solution**: 
- Reload the extension
- Check if service worker is running in chrome://extensions/
- Look for JavaScript errors in service worker console

#### 2. Content Script Not Loading
**Symptoms**: No console message about content script loading
**Solution**:
- Check if content script is injected: look for "content.js" in page sources
- Verify manifest.json has correct content_scripts configuration
- Try refreshing the webpage

#### 3. Extension Context Invalidated
**Symptoms**: "Extension context invalidated" error
**Solution**:
- This happens when extension is reloaded while popup is open
- Close popup and reopen it
- Reload the extension if problem persists

#### 4. Timeout Errors
**Symptoms**: "Service worker communication timeout" or "fetch timeout"
**Solution**:
- Service worker may be slow to respond
- Check if there are many extensions running (can slow down Chrome)
- Try restarting Chrome

### Debug Information

The popup now includes a "Debug Info" section when there are issues:
- **Loading**: Shows if still loading
- **Extension ID**: Should show a valid extension ID
- **Last update**: When status was last updated

### Manual Testing Commands

Run these in the popup console to test functionality:

```javascript
// Test service worker ping
chrome.runtime.sendMessage({type: 'PING'}, console.log);

// Test profile retrieval
chrome.runtime.sendMessage({type: 'GET_USER_PROFILE'}, console.log);

// Test CV data retrieval  
chrome.runtime.sendMessage({type: 'GET_CV_DATA'}, console.log);

// Check current tab
chrome.tabs.query({active: true, currentWindow: true}, console.log);
```

### Expected Console Output

When working correctly, you should see:
```
🔄 StatusIndicator: Starting loadStatus...
🔄 StatusIndicator: Testing service worker connectivity...
🔄 StatusIndicator: Service worker is responsive
🔄 StatusIndicator: Fetching profile and CV data...
🔄 StatusIndicator: Profile data: Found/Not found
🔄 StatusIndicator: CV data: Found/Not found
🔄 StatusIndicator: Checking current page...
🔄 StatusIndicator: Current page: example.com
🔄 StatusIndicator: Checking page relevance...
🔄 StatusIndicator: Page relevance result: {isRelevant: true, ...}
🔄 StatusIndicator: Final status: {...}
🔄 StatusIndicator: Setting isLoading to false
```

### If All Else Fails

1. **Complete Extension Reload**
   - Remove the extension completely
   - Restart Chrome
   - Load the extension again

2. **Check Chrome Version**
   - Extension requires Chrome with Manifest V3 support
   - Update Chrome if using an old version

3. **Try Different Page**
   - Test on the included `test-form.html`
   - Try on a simple webpage like google.com

4. **Check File Permissions**
   - Ensure the `dist/` folder has proper read permissions
   - Try rebuilding: `npm run build`

### Getting Help

If issues persist, provide this information:
- Chrome version
- Operating system
- Console error messages (both popup and service worker)
- Steps to reproduce the issue
- Whether it works on some pages but not others