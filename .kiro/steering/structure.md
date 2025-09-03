---
inclusion: always
---

# Project Structure & Architecture Guidelines

## Chrome Extension Architecture
This is a Manifest V3 Chrome extension with three main contexts:
- **Popup**: React app (`src/popup/`) - user interface
- **Background**: Service worker (`src/background/`) - persistent logic
- **Content**: Injected scripts (`src/content/`) - page interaction

## File Organization Rules

### Component Placement
- React components → `src/popup/components/`
- Shared utilities → `src/shared/`
- Extension-specific logic → respective context folders
- Types and interfaces → `src/shared/types.ts`

### Import Patterns
- Always import from `src/shared/` for cross-context utilities
- Use relative imports within the same context
- Import Chrome APIs only in background and content scripts
- React imports only in popup context

## Code Style Conventions

### File Naming
- React components: `PascalCase.tsx` (e.g., `CVUploader.tsx`)
- Utilities/hooks: `camelCase.ts` (e.g., `fieldMapping.ts`)
- Chrome extension files: `kebab-case.ts` (e.g., `service-worker.ts`)
- Test files: `ComponentName.test.tsx`

### Component Structure
- Export components as default exports
- Use TypeScript interfaces for props
- Place component-specific types in the same file
- Use functional components with hooks

### Messaging Architecture
- All cross-context communication via Chrome runtime messaging
- Message types defined in `src/shared/types.ts`
- Use helper functions from `src/shared/messaging.ts`
- Always handle message errors gracefully

## Development Guidelines

### When Adding Features
1. Define types in `src/shared/types.ts` first
2. Add shared utilities to `src/shared/`
3. Implement UI components in `src/popup/components/`
4. Update messaging if cross-context communication needed

### Storage Patterns
- Use Chrome storage API wrappers from `src/shared/storage.ts`
- Store user data in `chrome.storage.local`
- Use consistent key naming (camelCase)
- Always validate data when reading from storage

### Error Handling
- Import error utilities from `src/shared/errorHandling.ts`
- Log errors but never break page functionality
- Provide user feedback for critical errors
- Use type guards for runtime validation