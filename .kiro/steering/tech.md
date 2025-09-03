---
inclusion: always
---

# Technology Stack & Development Guidelines

## Core Technologies
- **React 18 + TypeScript**: Popup UI with strict typing
- **Vite 4.5+**: Multi-entry build system for extension contexts
- **Chrome Manifest V3**: Service worker architecture, no persistent background
- **npm**: Package management and script execution

## Critical Dependencies
- **Document Processing**: `mammoth` (DOCX), `pdf-parse` (PDF) - handle large files efficiently
- **Chrome APIs**: `@types/chrome` for extension messaging and storage
- **Buffer Polyfill**: Required for file processing in browser context

## Development Workflow

### Setup & Testing
```bash
npm install && npm run build    # Initial setup
npm run dev                     # Development with hot reload
npm run type-check             # Validate TypeScript before commits
npm run build:verify           # Production build + verification
```

### Extension Testing
1. Build: `npm run build`
2. Load `dist/` as unpacked extension in chrome://extensions/
3. Test across contexts: popup, background, content injection

## Code Quality Standards

### TypeScript Rules
- **Strict mode**: All files must pass strict type checking
- **No any types**: Use proper interfaces and type guards
- **Chrome API types**: Always import from `@types/chrome`
- **Error handling**: Wrap Chrome API calls in try-catch blocks

### File Processing Patterns
- Use `mammoth` for DOCX: `mammoth.extractRawText(arrayBuffer)`
- Use `pdf-parse` for PDF: Handle parsing errors gracefully
- Always validate file size before processing (max 10MB recommended)
- Process files in chunks to avoid blocking UI

### Build System Specifics
- **Multi-entry**: Vite builds popup, background, content separately
- **Output structure**: Must match Chrome extension requirements
- **Asset handling**: Icons and manifest copied to dist/
- **TypeScript compilation**: Separate configs for different contexts

### Performance Requirements
- Content scripts: Minimize DOM queries and event listeners
- Background worker: Use chrome.storage efficiently, avoid memory leaks
- File processing: Stream large files, show progress feedback
- Build size: Keep bundle sizes minimal for faster loading