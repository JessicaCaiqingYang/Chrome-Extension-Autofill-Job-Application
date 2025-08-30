# Design Document

## Overview

This design implements text extraction functionality for PDF and DOCX files in the Job Application Autofill Chrome extension. The solution leverages existing dependencies (`pdf-parse` for PDF files and `mammoth` for DOCX files) that are already installed but currently commented out due to browser compatibility concerns. The design addresses these compatibility issues while maintaining the Chrome extension Manifest V3 requirements.

## Architecture

### High-Level Flow
1. User uploads CV file through the popup interface
2. File data is serialized and sent to the background service worker
3. Background service worker reconstructs the file and determines the file type
4. Appropriate parsing library is used to extract text content
5. Extracted text is cleaned and validated
6. CVData object is created with extracted text and stored
7. Success/failure response is sent back to the popup

### Component Interaction
```
Popup (CVUploader) → Background Service Worker → Storage
     ↑                        ↓
     └── Success/Error Response ←
```

## Components and Interfaces

### 1. Text Extraction Service

**Location:** `src/background/service-worker.ts`

**Core Function:**
```typescript
async function extractTextFromFile(file: File, fileType: 'pdf' | 'docx'): Promise<string>
```

**Responsibilities:**
- Route to appropriate parser based on file type
- Handle parsing errors gracefully
- Clean and validate extracted text
- Return standardized text output

### 2. PDF Parser Module

**Implementation Strategy:**
- Use `pdf-parse` library with proper buffer handling
- Convert File to ArrayBuffer, then to Buffer for pdf-parse compatibility
- Handle password-protected PDFs gracefully
- Extract text while preserving basic structure (line breaks)

**Key Considerations:**
- pdf-parse requires Node.js Buffer, which is polyfilled via the `buffer` package
- Chrome extension environment requires careful buffer handling
- Large PDFs may need streaming or chunked processing

### 3. DOCX Parser Module

**Implementation Strategy:**
- Use `mammoth` library for Word document processing
- Configure mammoth to extract plain text (not HTML)
- Handle various DOCX formatting elements
- Clean extracted text of formatting artifacts

**Key Considerations:**
- mammoth works well in browser environments
- Can extract text while maintaining paragraph structure
- Handles modern DOCX format (not legacy DOC)

### 4. Text Processing Pipeline

**Cleaning Operations:**
1. Remove excessive whitespace and normalize line breaks
2. Remove formatting artifacts (e.g., page numbers, headers/footers)
3. Preserve meaningful structure (paragraphs, sections)
4. Validate minimum content length
5. Detect and handle empty or corrupted extractions

## Data Models

### Enhanced CVData Interface
```typescript
interface CVData {
  fileName: string;
  fileSize: number;
  uploadDate: number;
  extractedText: string;
  fileType: 'pdf' | 'docx';
  extractionMetadata?: {
    pageCount?: number;        // For PDFs
    wordCount: number;
    extractionTime: number;    // Processing time in ms
    hasImages?: boolean;       // If document contains images
    extractionMethod: string;  // 'pdf-parse' | 'mammoth'
  };
}
```

### Error Response Structure
```typescript
interface CVProcessingError {
  success: false;
  error: string;
  errorCode: 'UNSUPPORTED_FORMAT' | 'CORRUPTED_FILE' | 'PASSWORD_PROTECTED' | 
            'EXTRACTION_FAILED' | 'EMPTY_CONTENT' | 'SIZE_LIMIT_EXCEEDED';
  details?: string;
}
```

## Error Handling

### Error Categories and Responses

1. **File Type Validation**
   - Unsupported formats → Clear error message with supported formats
   - Missing file extension → Attempt MIME type detection

2. **File Size Validation**
   - Files > 5MB → Size limit error with current file size
   - Empty files → Invalid file error

3. **Parsing Errors**
   - Corrupted PDFs → "File appears to be corrupted" message
   - Password-protected PDFs → "Password-protected files not supported" message
   - DOCX parsing failures → "Unable to read Word document" message

4. **Content Validation**
   - Empty extracted text → "No readable text found in document" message
   - Text too short (< 50 characters) → "Document appears to contain insufficient text" message

### Error Recovery Strategies
- Retry parsing with different options for PDFs
- Fallback to basic text extraction for complex DOCX files
- Graceful degradation with partial content extraction

## Testing Strategy

### Unit Tests
1. **PDF Parsing Tests**
   - Valid PDF with text content
   - PDF with images and text
   - Password-protected PDF (should fail gracefully)
   - Corrupted PDF file
   - Empty PDF file

2. **DOCX Parsing Tests**
   - Simple DOCX with plain text
   - DOCX with complex formatting
   - DOCX with tables and lists
   - Corrupted DOCX file
   - Empty DOCX file

3. **Text Processing Tests**
   - Text cleaning and normalization
   - Whitespace handling
   - Minimum content validation
   - Special character handling

### Integration Tests
1. **End-to-End Upload Flow**
   - Upload PDF → verify extracted text stored
   - Upload DOCX → verify extracted text stored
   - Upload invalid file → verify error handling

2. **Storage Integration**
   - Verify CVData object creation
   - Verify storage persistence
   - Verify retrieval of stored CV data

### Browser Compatibility Tests
1. **Chrome Extension Environment**
   - Test in actual Chrome extension context
   - Verify Manifest V3 compatibility
   - Test with various Chrome versions

2. **Performance Tests**
   - Large file processing (up to 5MB)
   - Processing time measurements
   - Memory usage monitoring

## Implementation Considerations

### Chrome Extension Compatibility
- All parsing operations occur in the background service worker
- Use proper buffer polyfills for Node.js dependencies
- Ensure libraries work with Manifest V3 restrictions
- Handle service worker lifecycle properly

### Performance Optimization
- Implement timeout for parsing operations (10 seconds max)
- Use streaming for large files where possible
- Cache parsing results to avoid re-processing
- Provide progress feedback for large files

### Security Considerations
- Validate file types before processing
- Sanitize extracted text content
- Limit file sizes to prevent DoS attacks
- Handle malicious files gracefully

### User Experience
- Show loading indicators during processing
- Provide clear error messages with actionable advice
- Allow users to preview extracted text
- Maintain upload progress feedback

## Migration Strategy

### Phase 1: Enable Basic Parsing
1. Uncomment existing library imports
2. Implement basic PDF and DOCX parsing
3. Add proper error handling
4. Test with common file formats

### Phase 2: Enhanced Processing
1. Add text cleaning and validation
2. Implement extraction metadata
3. Add progress indicators
4. Optimize performance

### Phase 3: Advanced Features
1. Add text preview functionality
2. Implement parsing options/preferences
3. Add support for additional formats if needed
4. Performance monitoring and optimization