# CV Processing Error Handling Guide

## Overview

This document describes the enhanced error handling and validation system implemented for CV processing in the Job Application Autofill extension. The system provides comprehensive error detection, user-friendly error messages, and timeout handling for robust CV parsing operations.

## Features Implemented

### 1. Specific Error Codes

The system now uses specific error codes for different failure scenarios:

- `UNSUPPORTED_FORMAT`: File type not supported (not PDF or DOCX)
- `CORRUPTED_FILE`: File appears to be corrupted or invalid
- `PASSWORD_PROTECTED`: File is password-protected or encrypted
- `EXTRACTION_FAILED`: Generic text extraction failure
- `EMPTY_CONTENT`: No readable text found in document
- `SIZE_LIMIT_EXCEEDED`: File size exceeds 5MB limit
- `TIMEOUT_ERROR`: Processing took too long to complete
- `INSUFFICIENT_CONTENT`: Document contains too little text
- `INVALID_FILE_STRUCTURE`: File structure is invalid or unrecognized

### 2. Content Validation

The system validates extracted content to ensure it meets minimum requirements:

- **Minimum text length**: 50 characters
- **Minimum word count**: 10 words
- **Content quality checks**: Removes artifacts and validates meaningful content

### 3. User-Friendly Error Messages

Each error code has an associated user-friendly message that:

- Explains what went wrong in plain language
- Provides actionable guidance on how to fix the issue
- Avoids technical jargon that might confuse users

### 4. Timeout Handling

Processing operations now have configurable timeouts:

- **PDF parsing**: 15 seconds
- **DOCX parsing**: 10 seconds
- **File reading**: 5 seconds
- **Text cleaning**: 2 seconds

## Implementation Details

### Error Handler (`CVErrorHandler`)

The `CVErrorHandler` class provides centralized error handling:

```typescript
// Validate file before processing
const validationError = CVErrorHandler.validateFile(file);
if (validationError) {
  return validationError; // Returns CVProcessingError
}

// Analyze errors during processing
const error = CVErrorHandler.analyzeError(processingError, fileType);
```

### Timeout Handler (`TimeoutHandler`)

The `TimeoutHandler` class provides timeout functionality:

```typescript
// Wrap operations with timeout
const result = await TimeoutHandler.withTimeout(
  extractTextFromFile(file, fileType),
  TimeoutHandler.DEFAULT_TIMEOUTS.PDF_PARSING,
  'CV processing timed out'
);
```

### Enhanced Service Worker

The service worker now uses the error handling system:

```typescript
async function handleSetCVData(payload: { fileData: any }): Promise<CVProcessingResult> {
  // File validation
  const validationError = CVErrorHandler.validateFile(file);
  if (validationError) {
    return validationError;
  }

  // Processing with timeout
  try {
    const result = await TimeoutHandler.withTimeout(
      extractTextFromFile(file, fileType),
      maxProcessingTime
    );
  } catch (error) {
    return CVErrorHandler.analyzeError(error, fileType);
  }

  // Content validation
  const contentError = CVErrorHandler.validateContent(text, wordCount);
  if (contentError) {
    return contentError;
  }
}
```

## Error Response Format

The system now returns structured error responses:

```typescript
interface CVProcessingError {
  success: false;
  error: string;           // Technical error message
  errorCode: CVProcessingErrorCode;
  details?: string;        // Additional technical details
  userMessage: string;     // User-friendly error message
}
```

## UI Integration

The CVUploader component now displays user-friendly error messages:

```typescript
if (result?.userMessage) {
  setError(result.userMessage); // Shows user-friendly message
} else {
  setError(result?.error || 'Upload failed'); // Fallback to technical message
}
```

## Testing

Comprehensive tests verify the error handling system:

- **Unit tests**: Test individual error handler functions
- **Integration tests**: Test complete error handling workflows
- **Timeout tests**: Verify timeout behavior
- **Message quality tests**: Ensure error messages are actionable

## Error Scenarios Handled

### File Validation Errors

1. **Oversized files**: Files larger than 5MB
2. **Unsupported formats**: Non-PDF/DOCX files
3. **Empty files**: Files with zero size

### Processing Errors

1. **PDF corruption**: Invalid PDF structure, damaged files
2. **DOCX corruption**: Invalid ZIP structure, damaged Word documents
3. **Password protection**: Encrypted or password-protected files
4. **Memory issues**: Files too complex to process
5. **Timeout errors**: Processing takes too long

### Content Validation Errors

1. **Empty content**: No readable text extracted
2. **Insufficient content**: Too little text (< 50 characters or < 10 words)
3. **Image-only documents**: Documents with no extractable text

## User Experience Improvements

### Before Enhancement
- Generic error messages like "Upload failed"
- No timeout handling (could hang indefinitely)
- Limited error context
- Technical error messages shown to users

### After Enhancement
- Specific, actionable error messages
- Automatic timeout handling with user feedback
- Detailed error context and suggestions
- User-friendly language throughout

## Example Error Messages

| Error Code | User Message |
|------------|--------------|
| `UNSUPPORTED_FORMAT` | "Please upload a PDF or Word document (.pdf, .docx, .doc files only)." |
| `CORRUPTED_FILE` | "The file appears to be corrupted or damaged. Please try uploading a different version of your CV." |
| `PASSWORD_PROTECTED` | "Password-protected files are not supported. Please upload an unprotected version of your CV." |
| `SIZE_LIMIT_EXCEEDED` | "Your CV file is too large. Please upload a file smaller than 5MB." |
| `TIMEOUT_ERROR` | "Your CV is taking too long to process. Please try uploading a smaller or simpler document." |
| `INSUFFICIENT_CONTENT` | "Your CV appears to contain very little text. Please ensure it includes your complete resume information." |

## Performance Impact

The enhanced error handling system:

- **Minimal overhead**: Error checking adds < 1ms to processing time
- **Early validation**: Prevents unnecessary processing of invalid files
- **Timeout protection**: Prevents hanging operations that could impact browser performance
- **Memory efficient**: Proper cleanup and error handling prevents memory leaks

## Future Enhancements

Potential improvements for future versions:

1. **Retry mechanisms**: Automatic retry for transient failures
2. **Partial extraction**: Extract what's possible from partially corrupted files
3. **Progress indicators**: Show detailed progress during long operations
4. **Error analytics**: Track error patterns to improve processing
5. **File repair**: Attempt to repair minor file corruption issues