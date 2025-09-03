---
inclusion: always
---

# Job Application Autofill Extension - Product Guidelines

Chrome extension that automatically fills job application forms with stored user profile data. All data processing happens locally - no external servers or data transmission.

## Core Functionality Rules

### Data Storage Patterns
- Use `chrome.storage.local` exclusively - never external APIs
- Store profile data in structured format matching `src/shared/types.ts`
- Implement data validation before storage using type guards from `src/shared/type-guards.ts`
- Maximum file size for CV uploads: 10MB

### Form Detection & Autofill Logic
- Only fill forms on explicit user action (button click, toggle activation)
- Detect job application forms using field patterns in `src/shared/fieldMapping.ts`
- Match form fields by: name attributes, labels, placeholders, and semantic patterns
- Always validate field matches before filling - use fuzzy matching for flexibility
- Preserve existing form data - never overwrite user-entered content

### File Processing Requirements
- PDF parsing: Use `pdf-parse` with error handling for corrupted files
- DOCX parsing: Use `mammoth.extractRawText()` for text extraction
- Process files in chunks to prevent UI blocking
- Show progress feedback during file processing
- Handle parsing failures gracefully with user-friendly error messages

## User Experience Standards

### Privacy & Control
- Display clear indicators when autofill is active/inactive
- Allow users to review and edit data before form submission
- Provide toggle to disable autofill per session
- Never fill sensitive fields (SSN, passwords) automatically

### Accessibility Requirements
- All popup components must support keyboard navigation
- Use semantic HTML and ARIA labels
- Maintain focus management in modal dialogs
- Support screen readers with descriptive text

### Error Handling Patterns
- Log errors to console for debugging but never break page functionality
- Show user-friendly error messages in popup UI
- Implement fallback behavior when form detection fails
- Use notification system from `src/popup/components/notifications/`

## Implementation Guidelines

### Cross-Context Communication
- Use Chrome runtime messaging for popup ↔ content script communication
- Message types defined in `src/shared/types.ts`
- Always handle message timeouts and connection errors
- Implement retry logic for failed communications

### Performance Requirements
- Content scripts: Minimize DOM queries, use event delegation
- File processing: Stream large files, avoid memory leaks
- Storage operations: Batch reads/writes when possible
- Form detection: Debounce field scanning on dynamic pages

### Testing Priorities
- Test on major job sites: LinkedIn, Indeed, company career pages
- Verify functionality across different form layouts and field types
- Test file upload with various CV formats and sizes
- Validate cross-tab state synchronization