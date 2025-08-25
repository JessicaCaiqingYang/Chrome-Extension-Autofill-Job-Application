# Project Structure

## Root Directory
- `package.json` - Dependencies and npm scripts
- `vite.config.ts` - Multi-entry build configuration for extension components
- `tsconfig.json` - TypeScript configuration with Chrome types
- `public/` - Static assets and manifest
- `src/` - Source code organized by extension component
- `dist/` - Built extension (generated)

## Source Organization (`src/`)

### `/popup/` - React Popup Interface
- `index.html` - Popup entry point
- `main.tsx` - React app bootstrap
- `App.tsx` - Main popup component
- `components/` - Reusable React components
  - `AutofillToggle.tsx` - Toggle autofill on/off
  - `CVUploader.tsx` - File upload for CV/resume
  - `ProfileForm.tsx` - User profile editing
  - `StatusIndicator.tsx` - Extension status display

### `/background/` - Service Worker
- `service-worker.ts` - Background script for Chrome extension
- Handles storage, messaging, and cross-tab coordination

### `/content/` - Content Scripts
- `content-script.ts` - Injected into web pages
- Form detection and autofill logic

### `/shared/` - Common Utilities
- `types.ts` - TypeScript interfaces and enums
- `messaging.ts` - Chrome runtime messaging utilities
- `storage.ts` - Chrome storage API wrappers
- `fieldMapping.ts` - Form field detection logic

## Public Assets (`public/`)
- `manifest.json` - Chrome extension manifest (V3)
- `icons/` - Extension icons (16, 32, 48, 128px)

## Architecture Patterns
- **Component-based**: React components in popup
- **Message passing**: Chrome runtime messaging between contexts
- **Shared utilities**: Common code in `/shared/` folder
- **Type safety**: Comprehensive TypeScript interfaces
- **Storage abstraction**: Wrapper functions for Chrome storage API

## File Naming Conventions
- React components: PascalCase (e.g., `AutofillToggle.tsx`)
- Utilities: camelCase (e.g., `fieldMapping.ts`)
- Constants/types: camelCase files with PascalCase exports
- Chrome extension files: kebab-case (e.g., `service-worker.ts`, `content-script.ts`)