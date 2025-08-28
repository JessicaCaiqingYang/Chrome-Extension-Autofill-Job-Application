# Design Document

## Overview

The Job Application Autofill Chrome extension will be built using Manifest V3 architecture with React, Vite, and TypeScript. The extension consists of three main components: a popup interface for user data management, a content script for form detection and filling, and a service worker for background processing and data management.

The extension will use Chrome's local storage APIs for data persistence, ensuring user privacy by keeping all data local to the browser. The architecture follows Chrome's Manifest V3 security model with proper content security policies and permissions.

## Architecture

### Extension Structure
```
src/
├── popup/           # React popup interface
├── content/         # Content scripts for form interaction
├── background/      # Service worker for background tasks
├── shared/          # Shared utilities and types
└── assets/          # Static assets and icons
```

### Component Communication
- **Popup ↔ Service Worker**: Chrome runtime messaging for data operations
- **Content Script ↔ Service Worker**: Chrome runtime messaging for autofill triggers
- **Popup ↔ Content Script**: Indirect communication through service worker

### Data Flow
1. User enters profile data in popup → Service worker stores in Chrome storage
2. User uploads CV in popup → Service worker processes and stores file
3. User toggles autofill → Service worker updates state and notifies content scripts
4. Content script detects forms → Requests user data from service worker
5. Service worker provides data → Content script fills forms

## Components and Interfaces

### Popup Component (React)
**Purpose**: User interface for profile management and extension control

**Key Features**:
- Profile form with validation
- CV upload with file processing
- Autofill toggle switch
- Status indicators and feedback

**React Components**:
- `ProfileForm`: Handles user data input and validation
- `CVUploader`: Manages file upload and display
- `AutofillToggle`: Controls extension state
- `StatusIndicator`: Shows current extension status

### Content Script
**Purpose**: Detects and fills form fields on job application pages, including automatic file uploads

**Key Features**:
- Form field detection using multiple strategies
- Intelligent field mapping based on attributes and context
- File upload field detection and automatic CV upload
- Visual feedback for filled fields and uploaded files
- Error handling for edge cases and upload failures

**Detection Strategies**:
- HTML attribute matching (name, id, placeholder, aria-label)
- Label text analysis
- Field type inference
- Context-based mapping
- File input detection with accept attribute analysis

**File Upload Implementation**:
- File input field identification using keywords and context
- MIME type validation against field accept attributes
- File size validation against field constraints
- Programmatic file upload using File API and DataTransfer
- Upload progress monitoring and error handling

### Service Worker (Background Script)
**Purpose**: Manages data storage, file processing, and inter-component communication

**Key Features**:
- Chrome storage API integration
- PDF/Word document text extraction and blob storage
- Message routing between components
- State management
- File blob conversion and MIME type handling for uploads

### Shared Utilities
**Purpose**: Common functionality used across components

**Modules**:
- `types.ts`: TypeScript interfaces and types
- `storage.ts`: Chrome storage API wrappers
- `messaging.ts`: Chrome runtime messaging utilities
- `fieldMapping.ts`: Form field detection and mapping logic

## Data Models

### UserProfile Interface
```typescript
interface UserProfile {
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: {
      street: string;
      city: string;
      state: string;
      postCode: string;
      country: string;
    };
  };
  workInfo: {
    currentTitle?: string;
    experience?: string;
    skills?: string[];
    linkedinUrl?: string;
    portfolioUrl?: string;
  };
  preferences: {
    autofillEnabled: boolean;
    lastUpdated: number;
  };
}
```

### CVData Interface
```typescript
interface CVData {
  fileName: string;
  fileSize: number;
  uploadDate: number;
  extractedText: string;
  fileType: 'pdf' | 'docx';
  fileBlob: Blob; // Raw file data for upload
  mimeType: string; // MIME type for proper upload
}
```

### FieldMapping Interface
```typescript
interface FieldMapping {
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  fieldType: FieldType;
  confidence: number;
  value: string;
}

interface FileUploadMapping {
  element: HTMLInputElement;
  fieldType: FileUploadType;
  confidence: number;
  acceptedTypes: string[];
  maxSize?: number;
}

enum FieldType {
  FIRST_NAME = 'firstName',
  LAST_NAME = 'lastName',
  EMAIL = 'email',
  PHONE = 'phone',
  ADDRESS = 'address',
  CITY = 'city',
  STATE = 'state',
  POSTCODE = 'postCode',
  COVER_LETTER = 'coverLetter',
  RESUME_TEXT = 'resumeText'
}

enum FileUploadType {
  CV_RESUME = 'cvResume',
  COVER_LETTER_FILE = 'coverLetterFile',
  PORTFOLIO = 'portfolio',
  OTHER = 'other'
}
```

## Error Handling

### Storage Errors
- Handle Chrome storage quota exceeded
- Graceful degradation when storage is unavailable
- Data corruption recovery mechanisms

### File Processing Errors
- Invalid file format handling
- File size limit enforcement
- Text extraction failure fallbacks
- File upload validation errors (MIME type, size restrictions)
- Upload failure handling with retry mechanisms

### Form Filling Errors
- Element not found or not fillable
- Security restrictions (CSP violations)
- Dynamic form changes during filling
- File upload security restrictions
- File input element access denied

### Network and Permission Errors
- Missing extension permissions
- Content script injection failures
- Cross-origin restrictions

## Testing Strategy

### Unit Testing
- **Popup Components**: React Testing Library for component behavior
- **Utility Functions**: Jest for field mapping and data processing logic
- **Storage Operations**: Mock Chrome APIs for storage testing

### Integration Testing
- **Message Passing**: Test communication between extension components
- **File Processing**: Test CV upload and text extraction workflows
- **Form Detection**: Test field mapping accuracy across different form structures

### End-to-End Testing
- **Extension Installation**: Test manifest and permissions
- **User Workflows**: Test complete user journeys from data entry to form filling
- **Cross-Site Compatibility**: Test on multiple job sites and form types

### Manual Testing
- **Browser Compatibility**: Test across Chrome versions
- **Performance Testing**: Memory usage and processing speed
- **Security Testing**: Verify data isolation and CSP compliance

## Technical Implementation Details

### File Upload Implementation Strategy
**File Detection**:
- Scan for `<input type="file">` elements
- Analyze `accept` attributes for document types (.pdf, .doc, .docx, application/pdf, etc.)
- Use label text and field names to identify CV/resume uploads
- Context analysis of surrounding text for upload purpose identification

**File Upload Process**:
1. Create File object from stored blob data
2. Create DataTransfer object and add file
3. Set input.files property programmatically
4. Trigger change and input events to notify form handlers
5. Monitor for upload progress and completion

**Validation**:
- Check file type against input accept attribute
- Validate file size against any specified limits
- Ensure file format matches stored CV format

### Manifest V3 Configuration
- Service worker instead of background pages
- Content scripts with proper host permissions
- Storage and activeTab permissions
- Content Security Policy for React/Vite build

### Build System (Vite)
- TypeScript compilation
- React JSX transformation
- Asset bundling and optimization
- Development hot reload for popup
- Production build optimization

### Chrome APIs Usage
- `chrome.storage.local` for user data and file blob persistence
- `chrome.runtime.sendMessage` for component communication
- `chrome.tabs.query` for active tab detection
- `chrome.scripting.executeScript` for content script injection

### Security Considerations
- Content Security Policy compliance
- Input sanitization for form data
- Secure file processing without external services
- File upload security validation
- Minimal permissions principle

### Performance Optimizations
- Lazy loading of CV processing libraries
- Debounced form field detection
- Efficient storage operations with blob handling
- Minimal DOM manipulation impact
- Optimized file upload with progress tracking