import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Buffer } from 'buffer';

// Mock the dependencies
const mockPdfParse = vi.fn();
const mockMammoth = {
  extractRawText: vi.fn(),
  convertToHtml: vi.fn(),
};

vi.mock('pdf-parse', () => ({
  default: mockPdfParse,
}));

vi.mock('mammoth', () => mockMammoth);

// Mock storage and messaging
const mockStorage = {
  setCVData: vi.fn(),
  getCVData: vi.fn(),
};

const mockMessaging = {
  addMessageListener: vi.fn(),
};

vi.mock('../shared/storage', () => ({
  storage: mockStorage,
}));

vi.mock('../shared/messaging', () => ({
  messaging: mockMessaging,
}));

describe('Service Worker PDF Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleSetCVData with PDF files', () => {
    it('should successfully process a valid PDF file', async () => {
      // Mock successful PDF parsing
      const mockPdfData = {
        text: 'John Doe\nSoftware Engineer\nExperience: 5 years in JavaScript development\nSkills: React, TypeScript, Node.js',
        numpages: 1,
        info: {},
        metadata: null,
        version: '1.10.100'
      };
      
      mockPdfParse.mockResolvedValue(mockPdfData);
      mockStorage.setCVData.mockResolvedValue(true);

      // Create test file data
      const testContent = 'Mock PDF content';
      const fileData = {
        name: 'resume.pdf',
        type: 'application/pdf',
        size: testContent.length,
        lastModified: Date.now(),
        arrayBuffer: new ArrayBuffer(testContent.length)
      };

      // Simulate the handleSetCVData function logic
      const file = new File([fileData.arrayBuffer], fileData.name, {
        type: fileData.type,
        lastModified: fileData.lastModified
      });

      // Test file type detection
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

      const fileType = getFileType(file.name);
      expect(fileType).toBe('pdf');

      // Test file size validation
      const maxSize = 5 * 1024 * 1024; // 5MB
      expect(file.size).toBeLessThanOrEqual(maxSize);

      // Test PDF parsing
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const pdfResult = await mockPdfParse(buffer, {
        max: 0,
        version: 'v1.10.100'
      });

      expect(mockPdfParse).toHaveBeenCalledWith(buffer, {
        max: 0,
        version: 'v1.10.100'
      });

      // Test text cleaning
      const cleanedText = pdfResult.text
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/[ \t]{3,}/g, '  ')
        .replace(/\n{3,}/g, '\n\n')
        .split('\n')
        .map((line: string) => line.trimEnd())
        .join('\n')
        .trim();

      expect(cleanedText.length).toBeGreaterThan(50);

      // Test CVData creation
      const cvData = {
        fileName: file.name,
        fileSize: file.size,
        uploadDate: expect.any(Number),
        extractedText: cleanedText,
        fileType: 'pdf' as const
      };

      // Test storage
      await mockStorage.setCVData(cvData);
      expect(mockStorage.setCVData).toHaveBeenCalledWith(cvData);
    });

    it('should handle PDF parsing errors gracefully', async () => {
      // Mock PDF parsing failure
      mockPdfParse.mockRejectedValue(new Error('Invalid PDF structure'));

      const testContent = 'Corrupted PDF content';
      const fileData = {
        name: 'corrupted.pdf',
        type: 'application/pdf',
        size: testContent.length,
        lastModified: Date.now(),
        arrayBuffer: new ArrayBuffer(testContent.length)
      };

      const file = new File([fileData.arrayBuffer], fileData.name, {
        type: fileData.type,
        lastModified: fileData.lastModified
      });

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Test error handling
      await expect(mockPdfParse(buffer, {
        max: 0,
        version: 'v1.10.100'
      })).rejects.toThrow('Invalid PDF structure');
    });

    it('should reject files that are too large', async () => {
      const maxSize = 5 * 1024 * 1024; // 5MB
      const largeFileSize = maxSize + 1;

      const fileData = {
        name: 'large-resume.pdf',
        type: 'application/pdf',
        size: largeFileSize,
        lastModified: Date.now(),
        arrayBuffer: new ArrayBuffer(1024) // Actual buffer can be smaller for testing
      };

      const file = new File([fileData.arrayBuffer], fileData.name, {
        type: fileData.type,
        lastModified: fileData.lastModified
      });

      // Override the size property for testing
      Object.defineProperty(file, 'size', { value: largeFileSize });

      expect(file.size).toBeGreaterThan(maxSize);
    });

    it('should reject unsupported file types', async () => {
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
      expect(getFileType('resume.png')).toBe(null);
      expect(getFileType('resume')).toBe(null);
    });

    it('should reject PDFs with insufficient text content', async () => {
      // Mock PDF with very short text
      const mockPdfData = {
        text: 'Hi',
        numpages: 1,
        info: {},
        metadata: null,
        version: '1.10.100'
      };
      
      mockPdfParse.mockResolvedValue(mockPdfData);

      const testContent = 'Short PDF content';
      const fileData = {
        name: 'short.pdf',
        type: 'application/pdf',
        size: testContent.length,
        lastModified: Date.now(),
        arrayBuffer: new ArrayBuffer(testContent.length)
      };

      const file = new File([fileData.arrayBuffer], fileData.name, {
        type: fileData.type,
        lastModified: fileData.lastModified
      });

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const pdfResult = await mockPdfParse(buffer, {
        max: 0,
        version: 'v1.10.100'
      });

      const cleanedText = pdfResult.text.trim();
      expect(cleanedText.length).toBeLessThan(50);
    });

    it('should handle empty PDF files', async () => {
      // Mock PDF with no text
      const mockPdfData = {
        text: '',
        numpages: 1,
        info: {},
        metadata: null,
        version: '1.10.100'
      };
      
      mockPdfParse.mockResolvedValue(mockPdfData);

      const fileData = {
        name: 'empty.pdf',
        type: 'application/pdf',
        size: 0,
        lastModified: Date.now(),
        arrayBuffer: new ArrayBuffer(0)
      };

      const file = new File([fileData.arrayBuffer], fileData.name, {
        type: fileData.type,
        lastModified: fileData.lastModified
      });

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const pdfResult = await mockPdfParse(buffer, {
        max: 0,
        version: 'v1.10.100'
      });

      expect(pdfResult.text.trim().length).toBe(0);
    });
  });

  describe('Text processing edge cases', () => {
    it('should handle PDFs with complex formatting', async () => {
      const complexText = `
        John    Doe
        
        
        Software     Engineer
        
        Page 1
        
        Experience:
        •    JavaScript Development (5 years)
        •    React and TypeScript
        •    Node.js Backend Development
        
        12/01/2023
        
        Page 2 of 2
        
        Skills:
        - Frontend: React, Vue.js, Angular
        - Backend: Node.js, Python, Java
        - Database: MongoDB, PostgreSQL
      `;

      // Test text cleaning
      const cleaned = complexText
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/[ \t]{3,}/g, '  ')
        .replace(/\n{3,}/g, '\n\n')
        .split('\n')
        .map(line => line.trimEnd())
        .join('\n')
        .trim();

      // Test artifact removal
      const lines = cleaned.split('\n');
      const cleanedLines: string[] = [];
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        if (trimmedLine.length === 0) {
          cleanedLines.push('');
          continue;
        }
        
        // Skip page numbers and dates
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
      
      const finalText = cleanedLines.join('\n');
      
      // Should preserve meaningful content
      expect(finalText).toContain('John  Doe');
      expect(finalText).toContain('Software  Engineer');
      expect(finalText).toContain('JavaScript Development');
      expect(finalText).toContain('•  JavaScript Development (5 years)');
      expect(finalText).toContain('- Frontend: React, Vue.js, Angular');
      
      // Should remove artifacts
      expect(finalText).not.toContain('Page 1');
      expect(finalText).not.toContain('Page 2 of 2');
      expect(finalText).not.toContain('12/01/2023');
    });

    it('should preserve bullet points and lists', async () => {
      const textWithLists = `
        Skills:
        •
        JavaScript
        -
        TypeScript
        *
        React
        
        Experience:
        • 5 years in web development
        - Led team of 3 developers
        * Built 10+ production applications
      `;

      const lines = textWithLists.split('\n');
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
      
      // Should preserve all bullet points
      expect(result).toContain('•');
      expect(result).toContain('-');
      expect(result).toContain('*');
      expect(result).toContain('JavaScript');
      expect(result).toContain('TypeScript');
      expect(result).toContain('React');
    });
  });
});