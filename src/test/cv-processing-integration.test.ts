// Integration tests for CV processing with error handling
import { describe, it, expect } from 'vitest';
import { CVErrorHandler } from '../shared/cv-error-handler';
import { TimeoutHandler } from '../shared/timeout-handler';
import { CVProcessingErrorCode } from '../shared/types';

describe('CV Processing Integration', () => {
  describe('File validation workflow', () => {
    it('should validate file before processing', () => {
      // Test oversized file
      const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' });
      const error = CVErrorHandler.validateFile(largeFile);
      
      expect(error).not.toBeNull();
      expect(error?.errorCode).toBe(CVProcessingErrorCode.SIZE_LIMIT_EXCEEDED);
      expect(error?.userMessage).toContain('too large');
      expect(error?.details).toContain('6.0MB');
    });

    it('should provide user-friendly error messages', () => {
      const txtFile = new File(['content'], 'resume.txt', { type: 'text/plain' });
      const error = CVErrorHandler.validateFile(txtFile);
      
      expect(error?.userMessage).toBe('Please upload a PDF or Word document (.pdf, .docx, .doc files only).');
      expect(error?.error).toContain('Unsupported file type');
    });
  });

  describe('Content validation workflow', () => {
    it('should validate extracted content meets requirements', () => {
      const shortText = 'John Doe';
      const wordCount = shortText.split(/\s+/).length;
      const error = CVErrorHandler.validateContent(shortText, wordCount);
      
      expect(error).not.toBeNull();
      expect(error?.errorCode).toBe(CVProcessingErrorCode.INSUFFICIENT_CONTENT);
      expect(error?.userMessage).toContain('very little text');
    });

    it('should accept valid CV content', () => {
      const validCV = `
        John Doe
        Software Engineer
        Email: john.doe@example.com
        Phone: (555) 123-4567
        
        Experience:
        - Senior Software Engineer at Tech Corp (2020-2023)
        - Full-stack developer with expertise in React, Node.js, and Python
        - Led team of 5 developers on multiple successful projects
        
        Skills:
        JavaScript, TypeScript, React, Node.js, Python, AWS, Docker
        
        Education:
        Bachelor of Science in Computer Science
        University of Technology, 2018
      `;
      
      const wordCount = validCV.trim().split(/\s+/).filter(word => word.length > 0).length;
      const error = CVErrorHandler.validateContent(validCV.trim(), wordCount);
      
      expect(error).toBeNull();
    });
  });

  describe('Timeout handling workflow', () => {
    it('should handle timeout scenarios gracefully', async () => {
      const slowOperation = new Promise(resolve => setTimeout(() => resolve('done'), 200));
      
      await expect(
        TimeoutHandler.withTimeout(slowOperation, 100, 'CV processing timed out')
      ).rejects.toThrow('CV processing timed out');
    });

    it('should use appropriate timeouts for different file types', () => {
      expect(TimeoutHandler.DEFAULT_TIMEOUTS.PDF_PARSING).toBeGreaterThan(TimeoutHandler.DEFAULT_TIMEOUTS.DOCX_PARSING);
      expect(TimeoutHandler.DEFAULT_TIMEOUTS.DOCX_PARSING).toBeGreaterThan(TimeoutHandler.DEFAULT_TIMEOUTS.TEXT_CLEANING);
    });
  });

  describe('Error analysis workflow', () => {
    it('should provide specific error codes for different scenarios', () => {
      const scenarios = [
        { error: new Error('Invalid PDF structure'), fileType: 'pdf' as const, expectedCode: CVProcessingErrorCode.CORRUPTED_FILE },
        { error: new Error('Password required'), fileType: 'pdf' as const, expectedCode: CVProcessingErrorCode.PASSWORD_PROTECTED },
        { error: new Error('Not a valid zip file'), fileType: 'docx' as const, expectedCode: CVProcessingErrorCode.CORRUPTED_FILE },
        { error: new Error('Operation timed out'), fileType: 'pdf' as const, expectedCode: CVProcessingErrorCode.TIMEOUT_ERROR },
      ];

      scenarios.forEach(({ error, fileType, expectedCode }) => {
        const result = CVErrorHandler.analyzeError(error, fileType);
        expect(result.errorCode).toBe(expectedCode);
        expect(result.userMessage).toBeTruthy();
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Error message quality', () => {
    it('should provide actionable user messages', () => {
      const errorCodes = [
        CVProcessingErrorCode.UNSUPPORTED_FORMAT,
        CVProcessingErrorCode.CORRUPTED_FILE,
        CVProcessingErrorCode.PASSWORD_PROTECTED,
        CVProcessingErrorCode.SIZE_LIMIT_EXCEEDED,
        CVProcessingErrorCode.TIMEOUT_ERROR,
        CVProcessingErrorCode.INSUFFICIENT_CONTENT,
        CVProcessingErrorCode.EMPTY_CONTENT
      ];

      errorCodes.forEach(errorCode => {
        const error = CVErrorHandler.createError(errorCode);
        
        // User message should be helpful and actionable
        expect(error.userMessage).toBeTruthy();
        expect(error.userMessage.length).toBeGreaterThan(20);
        expect(error.userMessage).not.toContain('undefined');
        expect(error.userMessage).not.toContain('null');
        
        // Should provide guidance on what to do
        const hasActionableGuidance = 
          error.userMessage.includes('Please') ||
          error.userMessage.includes('try') ||
          error.userMessage.includes('ensure') ||
          error.userMessage.includes('upload');
        
        expect(hasActionableGuidance).toBe(true);
      });
    });
  });
});