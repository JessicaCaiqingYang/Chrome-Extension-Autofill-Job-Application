# Testing the Job Application Autofill Extension

## Setup Instructions

1. **Load the Extension**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right corner)
   - Click "Load unpacked" and select the `dist/` folder from your project
   - The extension should now appear in your extensions list

2. **Set Up Your Profile**
   - Click the extension icon in the Chrome toolbar
   - Go to the "Profile" tab
   - Fill in your personal information (name, email, phone, address, etc.)
   - Click "Save Profile"

## Testing Steps

### Test 1: Using the Test Page
1. Open the `test-messaging.html` file in a new Chrome tab
2. Click the extension icon and go to the "Autofill" tab
3. Click "Fill Current Page"
4. The form should be automatically filled with your profile data

### Test 2: Real Job Application Sites
1. Navigate to a job application website (e.g., LinkedIn Jobs, Indeed, company career pages)
2. Find a job application form
3. Click the extension icon and go to the "Autofill" tab
4. Click "Fill Current Page"
5. The extension should detect and fill the form fields

## What Should Happen

✅ **Success Indicators:**
- Extension detects form fields on the page
- Fields are filled with your profile data
- Green highlighting appears on filled fields
- Success notification appears in top-right corner
- Console shows "Autofill completed" messages

❌ **Common Issues and Solutions:**

1. **"No web page tabs found"**
   - Make sure you have a regular website open (not chrome:// or extension pages)
   - Try opening a new tab with a job site first

2. **"Cannot autofill on this page"**
   - You're trying to autofill from the extension popup itself
   - Navigate to a job application website first

3. **"No user profile found"**
   - Go to the Profile tab and complete your information
   - Make sure to click "Save Profile"

4. **No fields detected**
   - The page might not have standard form fields
   - Try a different job application site
   - Check the browser console for debugging info

## Debugging

Open Chrome DevTools (F12) and check:
- **Console tab**: Look for extension messages and errors
- **Network tab**: Check if the extension files are loading
- **Extensions tab**: Verify the extension is active and has permissions

## Test Sites

Good sites to test with:
- `test-messaging.html` (included test page)
- LinkedIn job applications
- Indeed job applications
- Company career pages with application forms
- Any website with contact forms

## Expected Behavior

The extension should:
1. Automatically detect form fields on job application pages
2. Fill fields with confidence > 40%
3. Show visual feedback (green highlighting)
4. Display completion notification
5. Work across different job sites and form layouts

## Troubleshooting

If the extension isn't working:
1. Refresh the webpage and try again
2. Check that the extension has the necessary permissions
3. Verify your profile is saved in the Profile tab
4. Try the test page first to confirm basic functionality
5. Check the browser console for error messages