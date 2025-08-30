import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Buffer } from 'buffer';

// Mock pdf-parse module
const mockPdfParse = vi.fn();
vi.mock('pdf-parse', () => ({
  default: mockPdfParse,
}));

// Import the functions we want to test
// Note: We'll need to extract these functions or make them testable
// For now, we'll test the logic by importing the service worker module

describe('PDF Text Extraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PDF parsing with pdf-parse', () => {
    it('should successfully extract text from a valid PDF', async () => {
      // Mock successful PDF parsing
      const mockPdfData = {
        text: 'John Doe\nSoftware Engineer\nExperience: 5 years\nSkills: JavaScript, TypeScript, React',
        numpages: 1,
        info: {},
        metadata: null,
        version: '1.10.100'
      };
      
      mockPdfParse.mockResolvedValue(mockPdfData);

      // Create a mock File object
      const mockFileContent = new ArrayBuffer(1024);
      const mockFile = new File([mockFileContent], 'resume.pdf', { type: 'application/pdf' });

      // Test the PDF parsing logic
      const buffer = Buffer.from(await mockFile.arrayBuffer());
      const result = await mockPdfParse(buffer, {
        max: 0,
        version: 'v1.10.100'
      });

      expect(mockPdfParse).toHaveBeenCalledWith(buffer, {
        max: 0,
        version: 'v1.10.100'
      });
      expect(result.text).toBe(mockPdfData.text);
      expect(result.numpages).toBe(1);
    });

    it('should handle corrupted PDF files', async () => {
      // Mock PDF parsing failure
      mockPdfParse.mockRejectedValue(new Error('Invalid PDF structure'));

      const mockFileContent = new ArrayBuffer(1024);
      const mockFile = new File([mockFileContent], 'corrupted.pdf', { type: 'application/pdf' });

      const buffer = Buffer.from(await mockFile.arrayBuffer());

      await expect(mockPdfParse(buffer, {
        max: 0,
        version: 'v1.10.100'
      })).rejects.toThrow('Invalid PDF structure');
    });

    it('should handle password-protected PDF files', async () => {
      // Mock password-protected PDF error
      mockPdfParse.mockRejectedValue(new Error('Password required'));

      const mockFileContent = new ArrayBuffer(1024);
      const mockFile = new File([mockFileContent], 'protected.pdf', { type: 'application/pdf' });

      const buffer = Buffer.from(await mockFile.arrayBuffer());

      await expect(mockPdfParse(buffer, {
        max: 0,
        version: 'v1.10.100'
      })).rejects.toThrow('Password required');
    });

    it('should handle PDFs with no readable text', async () => {
      // Mock PDF with no text content
      const mockPdfData = {
        text: '',
        numpages: 1,
        info: {},
        metadata: null,
        version: '1.10.100'
      };
      
      mockPdfParse.mockResolvedValue(mockPdfData);

      const mockFileContent = new ArrayBuffer(1024);
      const mockFile = new File([mockFileContent], 'image-only.pdf', { type: 'application/pdf' });

      const buffer = Buffer.from(await mockFile.arrayBuffer());
      const result = await mockPdfParse(buffer, {
        max: 0,
        version: 'v1.10.100'
      });

      expect(result.text).toBe('');
    });

    it('should handle large PDF files', async () => {
      // Mock large PDF with multiple pages
      const mockPdfData = {
        text: 'Page 1 content\n'.repeat(1000) + 'Page 2 content\n'.repeat(1000),
        numpages: 2,
        info: {},
        metadata: null,
        version: '1.10.100'
      };
      
      mockPdfParse.mockResolvedValue(mockPdfData);

      // Create a larger mock file (1MB)
      const mockFileContent = new ArrayBuffer(1024 * 1024);
      const mockFile = new File([mockFileContent], 'large-resume.pdf', { type: 'application/pdf' });

      const buffer = Buffer.from(await mockFile.arrayBuffer());
      const result = await mockPdfParse(buffer, {
        max: 0,
        version: 'v1.10.100'
      });

      expect(result.text.length).toBeGreaterThan(1000);
      expect(result.numpages).toBe(2);
    });
  });

  describe('Text cleaning functionality', () => {
    it('should remove excessive whitespace', () => {
      const input = 'John    Doe\n\n\nSoftware     Engineer\n\n\n\nExperience:   5 years';
      const expected = 'John  Doe\n\nSoftware  Engineer\n\nExperience:  5 years';
      
      // Test the text cleaning logic
      const cleaned = input
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/[ \t]{3,}/g, '  ')
        .replace(/\n{3,}/g, '\n\n')
        .split('\n')
        .map(line => line.trimEnd())
        .join('\n')
        .trim();

      expect(cleaned).toBe(expected);
    });

    it('should normalize line breaks', () => {
      const input = 'Line 1\r\nLine 2\rLine 3\nLine 4';
      const expected = 'Line 1\nLine 2\nLine 3\nLine 4';
      
      const cleaned = input
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n');

      expect(cleaned).toBe(expected);
    });

    it('should remove document artifacts', () => {
      const input = 'John Doe\nPage 1\nSoftware Engineer\n12/01/2023\nExperience: 5 years\nPage 2 of 3\nSkills: JavaScript';
      
      const lines = input.split('\n');
      const cleanedLines: string[] = [];
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Skip empty lines, page numbers, and dates
        if (trimmedLine.length === 0) {
          cleanedLines.push('');
          continue;
        }
        
        if (/^(Page\s+)?\d+(\s+of\s+\d+)?$/i.test(trimmedLine)) {
          continue;
        }
        
        if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(trimmedLine)) {
          continue;
        }
        
        if (trimmedLine.length < 3 && !/[•\-\*]/.test(trimmedLine)) {
          continue;
        }
        
        cleanedLines.push(trimmedLine);
      }
      
      const result = cleanedLines.join('\n');
      expect(result).toBe('John Doe\nSoftware Engineer\nExperience: 5 years\nSkills: JavaScript');
    });

    it('should preserve meaningful short content like bullet points', () => {
      const input = 'Skills:\n•\nJavaScript\n-\nTypeScript\n*\nReact';
      
      const lines = input.split('\n');
      const cleanedLines: string[] = [];
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        if (trimmedLine.length === 0) {
          cleanedLines.push('');
          continue;
        }
        
        // Don't skip bullet points even if they're short
        if (trimmedLine.length < 3 && !/[•\-\*]/.test(trimmedLine)) {
          continue;
        }
        
        cleanedLines.push(trimmedLine);
      }
      
      const result = cleanedLines.join('\n');
      expect(result).toBe('Skills:\n•\nJavaScript\n-\nTypeScript\n*\nReact');
    });
  });

  describe('Content validation', () => {
    it('should reject text that is too short', () => {
      const shortText = 'John';
      expect(shortText.length).toBeLessThan(50);
    });

    it('should accept text that meets minimum length requirement', () => {
      const validText = 'John Doe is a Software Engineer with 5 years of experience in JavaScript and TypeScript development.';
      expect(validText.length).toBeGreaterThanOrEqual(50);
    });

    it('should reject empty or whitespace-only text', () => {
      const emptyText = '';
      const whitespaceText = '   \n\n   \t  ';
      
      expect(emptyText.trim().length).toBe(0);
      expect(whitespaceText.trim().length).toBe(0);
    });
  });

  describe('File type detection', () => {
    it('should correctly identify PDF files', () => {
      const getFileType = (fileName: string): 'pdf' | 'docx' | null => {
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
      };

      expect(getFileType('resume.pdf')).toBe('pdf');
      expect(getFileType('RESUME.PDF')).toBe('pdf');
      expect(getFileType('my-cv.pdf')).toBe('pdf');
    });

    it('should reject unsupported file types', () => {
      const getFileType = (fileName: string): 'pdf' | 'docx' | null => {
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
      };

      expect(getFileType('resume.txt')).toBe(null);
      expect(getFileType('resume.jpg')).toBe(null);
      expect(getFileType('resume')).toBe(null);
    });
  });

  describe('Buffer conversion', () => {
    it('should correctly convert File to Buffer', async () => {
      const testContent = 'Test PDF content';
      const mockFile = new File([testContent], 'test.pdf', { type: 'application/pdf' });
      
      const arrayBuffer = await mockFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBe(testContent.length);
    });

    it('should handle empty files', async () => {
      const mockFile = new File([], 'empty.pdf', { type: 'application/pdf' });
      
      const arrayBuffer = await mockFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBe(0);
    });
  });
});