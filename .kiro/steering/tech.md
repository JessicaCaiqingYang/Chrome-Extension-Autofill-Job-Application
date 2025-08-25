# Technology Stack

## Core Technologies
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 4.5+ with React plugin
- **Extension Platform**: Chrome Manifest V3
- **Package Manager**: npm

## Key Dependencies
- **React**: UI framework for popup interface
- **TypeScript**: Type safety and development experience
- **Chrome Types**: `@types/chrome` for extension API types
- **Document Parsing**: 
  - `mammoth` for DOCX file processing
  - `pdf-parse` for PDF file extraction
- **Buffer**: Node.js buffer polyfill for browser environment

## Build System
Vite handles multi-entry builds for different extension components:
- Popup (React app)
- Background service worker
- Content script
- Proper output structure for Chrome extension format

## Common Commands

### Development
```bash
npm install          # Install dependencies
npm run dev          # Start development server
npm run type-check   # TypeScript type checking
```

### Building
```bash
npm run build        # Production build
npm run build:verify # Build + verification script
npm run preview      # Preview built extension
```

### Extension Loading
1. Run `npm run build`
2. Load `dist/` folder as unpacked extension in Chrome
3. Enable Developer mode in chrome://extensions/

## TypeScript Configuration
- Target: ES2020
- Strict mode enabled
- Chrome extension types included
- React JSX transform
- No unused locals/parameters enforcement