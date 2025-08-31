// CV Processing Error Handler
// Provides centralized error handling and user-friendly error messages for CV processing

import { CVProcessingError, CVProcessingErrorCode } from './types';

export class CVErrorHandler {
  /**
   * Creates a standardized CV processing error with user-friendly messages
   */
  static createError(
    errorCode: CVProcessingErrorCode,
    technicalError?: string,
    details?: string
  ): CVProcessingError {
    const errorMessages = this.getErrorMessages();
    const errorInfo = errorMessages[errorCode];

    return {
      success: false,
      error: technicalError || errorInfo.technical,
      errorCode,
      details,
      userMessage: errorInfo.userFriendly
    };
  }

  /**
   * Analyzes an error and returns the appropriate error code and message
   */
  static analyzeError(error: Error, fileType: 'pdf' | 'docx'): CVProcessingError {
    const errorMessage = error.message.toLowerCase();

    // Check for timeout errors first (applies to both file types)
    if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
      return this.createError(CVProcessingErrorCode.TIMEOUT_ERROR, error.message);
    }

    // PDF-specific errors
    if (fileType === 'pdf') {
      if (errorMessage.includes('invalid pdf') || errorMessage.includes('pdf structure')) {
        return this.createError(CVProcessingErrorCode.CORRUPTED_FILE, error.message);
      }
      if (errorMessage.includes('password') || errorMessage.includes('encrypted')) {
        return this.createError(CVProcessingErrorCode.PASSWORD_PROTECTED, error.message);
      }
    }

    // DOCX-specific errors
    if (fileType === 'docx') {
      if (errorMessage.includes('not a valid zip') || errorMessage.includes('invalid signature')) {
        return this.createError(CVProcessingErrorCode.CORRUPTED_FILE, error.message);
      }
      if (errorMessage.includes('password') || errorMessage.includes('encrypted')) {
        return this.createError(CVProcessingErrorCode.PASSWORD_PROTECTED, error.message);
      }
    }

    // Content validation errors
    if (errorMessage.includes('too short') || errorMessage.includes('insufficient')) {
      return this.createError(CVProcessingErrorCode.INSUFFICIENT_CONTENT, error.message);
    }
    if (errorMessage.includes('empty') || errorMessage.includes('no readable text')) {
      return this.createError(CVProcessingErrorCode.EMPTY_CONTENT, error.message);
    }

    // Generic extraction failure
    return this.createError(CVProcessingErrorCode.EXTRACTION_FAILED, error.message);
  }

  /**
   * Validates file before processing
   */
  static validateFile(file: File): CVProcessingError | null {
    // Check file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return this.createError(
        CVProcessingErrorCode.SIZE_LIMIT_EXCEEDED,
        `File size ${sizeMB}MB exceeds 5MB limit`,
        `File size: ${sizeMB}MB`
      );
    }

    // Check file type
    const fileType = this.getFileType(file.name);
    if (!fileType) {
      return this.createError(
        CVProcessingErrorCode.UNSUPPORTED_FORMAT,
        `Unsupported file type: ${file.name}`,
        `File extension: ${file.name.split('.').pop()}`
      );
    }

    return null; // No validation errors
  }

  /**
   * Validates extracted content
   */
  static validateContent(text: string, wordCount: number): CVProcessingError | null {
    const minTextLength = 50;
    const minWordCount = 10;

    if (!text || text.trim().length === 0) {
      return this.createError(CVProcessingErrorCode.EMPTY_CONTENT);
    }

    if (text.trim().length < minTextLength) {
      return this.createError(
        CVProcessingErrorCode.INSUFFICIENT_CONTENT,
        `Text too short: ${text.length} characters`,
        `Minimum required: ${minTextLength} characters`
      );
    }

    if (wordCount < minWordCount) {
      return this.createError(
        CVProcessingErrorCode.INSUFFICIENT_CONTENT,
        `Too few words: ${wordCount}`,
        `Minimum required: ${minWordCount} words`
      );
    }

    return null; // Content is valid
  }

  /**
   * Creates a timeout error
   */
  static createTimeoutError(processingTime: number, maxTime: number): CVProcessingError {
    return this.createError(
      CVProcessingErrorCode.TIMEOUT_ERROR,
      `Processing timeout: ${processingTime}ms exceeded ${maxTime}ms limit`,
      `Processing time: ${(processingTime / 1000).toFixed(1)}s`
    );
  }

  /**
   * Gets file type from filename
   */
  private static getFileType(fileName: string): 'pdf' | 'docx' | null {
    const extension = fileName.toLowerCase().split('.').pop();
    switch (extension) {
      case 'pdf':
        return 'pdf';
      case 'docx':
      case 'doc':
        return 'docx';
      default:
        return null;
    }
  }

  /**
   * Error message mappings for different error codes
   */
  private static getErrorMessages(): Record<CVProcessingErrorCode, { technical: string; userFriendly: string }> {
    return {
      [CVProcessingErrorCode.UNSUPPORTED_FORMAT]: {
        technical: 'Unsupported file format',
        userFriendly: 'Please upload a PDF or Word document (.pdf, .docx, .doc files only).'
      },
      [CVProcessingErrorCode.CORRUPTED_FILE]: {
        technical: 'File appears to be corrupted',
        userFriendly: 'The file appears to be corrupted or damaged. Please try uploading a different version of your CV.'
      },
      [CVProcessingErrorCode.PASSWORD_PROTECTED]: {
        technical: 'Password-protected files not supported',
        userFriendly: 'Password-protected files are not supported. Please upload an unprotected version of your CV.'
      },
      [CVProcessingErrorCode.EXTRACTION_FAILED]: {
        technical: 'Text extraction failed',
        userFriendly: 'Unable to extract text from your CV. Please ensure the file is not corrupted and try again.'
      },
      [CVProcessingErrorCode.EMPTY_CONTENT]: {
        technical: 'No readable text found',
        userFriendly: 'No readable text was found in your CV. Please ensure the document contains text content and is not image-only.'
      },
      [CVProcessingErrorCode.SIZE_LIMIT_EXCEEDED]: {
        technical: 'File size exceeds limit',
        userFriendly: 'Your CV file is too large. Please upload a file smaller than 5MB.'
      },
      [CVProcessingErrorCode.TIMEOUT_ERROR]: {
        technical: 'Processing timeout',
        userFriendly: 'Your CV is taking too long to process. Please try uploading a smaller or simpler document.'
      },
      [CVProcessingErrorCode.INSUFFICIENT_CONTENT]: {
        technical: 'Insufficient text content',
        userFriendly: 'Your CV appears to contain very little text. Please ensure it includes your complete resume information.'
      },
      [CVProcessingErrorCode.INVALID_FILE_STRUCTURE]: {
        technical: 'Invalid file structure',
        userFriendly: 'The file structure is invalid or unrecognized. Please try saving your CV in a different format and uploading again.'
      }
    };
  }
}