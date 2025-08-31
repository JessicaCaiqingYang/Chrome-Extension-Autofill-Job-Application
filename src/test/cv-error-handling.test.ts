// Tests for CV Error Handling and Validation
import { describe, it, expect } from 'vitest';
import { CVErrorHandler } from '../shared/cv-error-handler';
import { CVProcessingErrorCode } from '../shared/types';

describe('CVErrorHandler', () => {
  describe('validateFile', () => {
    it('should reject files that are too large', () => {
      const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' });
      const error = CVErrorHandler.validateFile(largeFile);
      
      expect(error).not.toBeNull();
      expect(error?.errorCode).toBe(CVProcessingErrorCode.SIZE_LIMIT_EXCEEDED);
      expect(error?.userMessage).toContain('too large');
    });

    it('should reject unsupported file types', () => {
      const txtFile = new File(['content'], 'document.txt', { type: 'text/plain' });
      const error = CVErrorHandler.validateFile(txtFile);
      
      expect(error).not.toBeNull();
      expect(error?.errorCode).toBe(CVProcessingErrorCode.UNSUPPORTED_FORMAT);
      expect(error?.userMessage).toContain('PDF or Word document');
    });

    it('should accept valid PDF files', () => {
      const pdfFile = new File(['pdf content'], 'resume.pdf', { type: 'application/pdf' });
      const error = CVErrorHandler.validateFile(pdfFile);
      
      expect(error).toBeNull();
    });

    it('should accept valid DOCX files', () => {
      const docxFile = new File(['docx content'], 'resume.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      const error = CVErrorHandler.validateFile(docxFile);
      
      expect(error).toBeNull();
    });
  });

  describe('validateContent', () => {
    it('should reject empty content', () => {
      const error = CVErrorHandler.validateContent('', 0);
      
      expect(error).not.toBeNull();
      expect(error?.errorCode).toBe(CVProcessingErrorCode.EMPTY_CONTENT);
    });

    it('should reject content that is too short', () => {
      const shortText = 'Hi';
      const error = CVErrorHandler.validateContent(shortText, 1);
      
      expect(error).not.toBeNull();
      expect(error?.errorCode).toBe(CVProcessingErrorCode.INSUFFICIENT_CONTENT);
    });

    it('should reject content with too few words', () => {
      const fewWords = 'John Doe Email Phone'; // 4 words, less than minimum 10
      const error = CVErrorHandler.validateContent(fewWords, 4);
      
      expect(error).not.toBeNull();
      expect(error?.errorCode).toBe(CVProcessingErrorCode.INSUFFICIENT_CONTENT);
    });

    it('should accept valid content', () => {
      const validText = 'John Doe is a software engineer with experience in JavaScript, Python, and React. He has worked at several companies and has strong problem-solving skills.';
      const wordCount = validText.split(/\s+/).length;
      const error = CVErrorHandler.validateContent(validText, wordCount);
      
      expect(error).toBeNull();
    });
  });

  describe('analyzeError', () => {
    it('should identify PDF corruption errors', () => {
      const error = new Error('Invalid PDF structure detected');
      const result = CVErrorHandler.analyzeError(error, 'pdf');
      
      expect(result.errorCode).toBe(CVProcessingErrorCode.CORRUPTED_FILE);
      expect(result.userMessage).toContain('corrupted');
    });

    it('should identify password-protected PDF errors', () => {
      const error = new Error('Password required for this PDF');
      const result = CVErrorHandler.analyzeError(error, 'pdf');
      
      expect(result.errorCode).toBe(CVProcessingErrorCode.PASSWORD_PROTECTED);
      expect(result.userMessage).toContain('Password-protected');
    });

    it('should identify DOCX corruption errors', () => {
      const error = new Error('Not a valid zip file');
      const result = CVErrorHandler.analyzeError(error, 'docx');
      
      expect(result.errorCode).toBe(CVProcessingErrorCode.CORRUPTED_FILE);
      expect(result.userMessage).toContain('corrupted');
    });

    it('should identify timeout errors', () => {
      const error = new Error('Operation timed out after 15000ms');
      const result = CVErrorHandler.analyzeError(error, 'pdf');
      
      expect(result.errorCode).toBe(CVProcessingErrorCode.TIMEOUT_ERROR);
      expect(result.userMessage).toContain('too long to process');
    });

    it('should handle generic extraction failures', () => {
      const error = new Error('Unknown parsing error');
      const result = CVErrorHandler.analyzeError(error, 'pdf');
      
      expect(result.errorCode).toBe(CVProcessingErrorCode.EXTRACTION_FAILED);
      expect(result.userMessage).toContain('Unable to extract text');
    });
  });

  describe('createTimeoutError', () => {
    it('should create timeout error with processing time details', () => {
      const error = CVErrorHandler.createTimeoutError(16000, 15000);
      
      expect(error.errorCode).toBe(CVProcessingErrorCode.TIMEOUT_ERROR);
      expect(error.userMessage).toContain('too long to process');
      expect(error.details).toContain('16.0s');
    });
  });

  describe('createError', () => {
    it('should create error with user-friendly message', () => {
      const error = CVErrorHandler.createError(
        CVProcessingErrorCode.UNSUPPORTED_FORMAT,
        'Technical error message',
        'Additional details'
      );
      
      expect(error.success).toBe(false);
      expect(error.errorCode).toBe(CVProcessingErrorCode.UNSUPPORTED_FORMAT);
      expect(error.error).toBe('Technical error message');
      expect(error.details).toBe('Additional details');
      expect(error.userMessage).toContain('PDF or Word document');
    });
  });
});