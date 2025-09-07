# ApplyNinja Chrome Extension

A Chrome extension built with React, TypeScript, and Vite that automatically fills job application forms with stored user profile data and uploads CV/resume files to file upload fields.

## Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

4. Type checking:
   ```bash
   npm run type-check
   ```

## Loading the Extension

1. Build the extension: `npm run build`
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `dist` folder

## Project Structure

```
src/
├── popup/           # React popup interface
├── content/         # Content scripts for form interaction
├── background/      # Service worker for background tasks
├── shared/          # Shared utilities and types
└── assets/          # Static assets and icons
```

## Features

### Form Autofill
- Automatically detects and fills job application form fields
- Maps form fields to user profile data using intelligent pattern matching
- Supports various field types: name, email, phone, address, experience, skills
- Works across different job sites and application forms

### CV Auto-Upload
- Automatically uploads stored CV/resume to file upload fields
- Detects fields labeled as "upload resume", "upload cv", "resume file", etc.
- Supports PDF, DOC, and DOCX file formats
- Validates file compatibility with upload field constraints
- Provides visual feedback for successful uploads

### User Profile Management
- Store and manage personal information
- Upload and manage CV/resume files
- Toggle autofill functionality on/off
- Manual trigger for form filling

## Testing

### CV Auto-Upload Testing
1. Open `tests/test-cv-upload.html` in your browser
2. Upload a CV file in the extension popup
3. Click "Fill Current Page" in the extension popup
4. Watch for visual feedback on file upload fields
5. Check browser console for detailed upload logs

The test page includes various file upload fields with different labels to test the auto-upload functionality:
- "Upload Resume"
- "Upload CV" 
- "Resume File"
- "CV File"
- "Upload Cover Letter"
- "Upload Portfolio"

## Technologies

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Extension API**: Chrome Manifest V3
- **Storage**: Chrome Storage API
- **Styling**: CSS (ready for styling framework integration)