# Job Application Autofill Chrome Extension

A Chrome extension built with React, TypeScript, and Vite that automatically fills job application forms with stored user profile data.

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

## Technologies

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Extension API**: Chrome Manifest V3
- **Storage**: Chrome Storage API
- **Styling**: CSS (ready for styling framework integration)