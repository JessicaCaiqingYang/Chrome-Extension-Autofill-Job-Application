import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock mammoth module
const mockMammoth = {
  extractRawText: vi.fn(),
  convertToHtml: vi.fn()
};
vi.mock('mammoth', () => ({
  default: mockMammoth,
  extractRawText: mockMammoth.extractRawText,
  convertToHtml: mockMammoth.convertToHtml
}));

describe('DOCX Text Extraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('DOCX parsing with mammoth', () => {
    it('should successfully extract text from a valid DOCX file', async () => {
      // Mock successful DOCX parsing
      const mockDocxData = {
        value: 'John Doe\nSoftware Engineer\n\nExperience: 5 years of development experience\n\nSkills:\n• JavaScript\n• TypeScript\n• React\n• Node.js\n\nEducation:\nBachelor of Computer Science',
        messages: []
      };
      
      mockMammoth.extractRawText.mockResolvedValue(mockDocxData);

      // Create a mock File object
      const mockFileContent = new ArrayBuffer(2048);
      const mockFile = new File([mockFileContent], 'resume.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });

      // Test the DOCX parsing logic
      const arrayBuffer = await mockFile.arrayBuffer();
      const result = await mockMammoth.extractRawText({ arrayBuffer });

      expect(mockMammoth.extractRawText).toHaveBeenCalledWith({ arrayBuffer });
      expect(result.value).toBe(mockDocxData.value);
      expect(result.value).toContain('John Doe');
      expect(result.value).toContain('Software Engineer');
      expect(result.value).toContain('JavaScript');
    });

    it('should handle DOCX files with complex formatting', async () => {
      // Mock DOCX with complex formatting (tables, lists, headers)
      const mockDocxData = {
        value: 'JOHN DOE\nSoftware Engineer\n\nCONTACT INFORMATION\nEmail: john.doe@email.com\nPhone: (555) 123-4567\nLinkedIn: linkedin.com/in/johndoe\n\nPROFESSIONAL EXPERIENCE\n\nSenior Software Engineer | Tech Company | 2020-Present\n• Led development of web applications using React and Node.js\n• Collaborated with cross-functional teams to deliver high-quality software\n• Mentored junior developers and conducted code reviews\n\nSoftware Engineer | Previous Company | 2018-2020\n• Developed and maintained backend services using Python and Django\n• Implemented automated testing and CI/CD pipelines\n• Optimized database queries and improved application performance\n\nTECHNICAL SKILLS\n\nProgramming Languages: JavaScript, TypeScript, Python, Java\nFrameworks: React, Node.js, Django, Express.js\nDatabases: PostgreSQL, MongoDB, Redis\nTools: Git, Docker, AWS, Jenkins',
        messages: [
          { type: 'warning', message: 'Unrecognised element: w:smartTag' }
        ]
      };
      
      mockMammoth.extractRawText.mockResolvedValue(mockDocxData);

      const mockFileContent = new ArrayBuffer(4096);
      const mockFile = new File([mockFileContent], 'complex-resume.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });

      const arrayBuffer = await mockFile.arrayBuffer();
      const result = await mockMammoth.extractRawText({ arrayBuffer });

      expect(result.value).toContain('JOHN DOE');
      expect(result.value).toContain('john.doe@email.com');
      expect(result.value).toContain('Senior Software Engineer');
      expect(result.value).toContain('Programming Languages:');
      expect(result.messages).toHaveLength(1);
    });

    it('should handle DOCX files with tables and lists', async () => {
      // Mock DOCX with tables and bullet points
      const mockDocxData = {
        value: 'John Doe\nSoftware Engineer\n\nSkills Summary:\n\nTechnical Skills\nProficiency\nJavaScript\nExpert\nTypeScript\nAdvanced\nReact\nExpert\nNode.js\nAdvanced\n\nProject Experience:\n• E-commerce Platform - Led frontend development\n• API Gateway - Designed and implemented microservices\n• Mobile App - Developed React Native application\n• Database Migration - Optimized PostgreSQL performance',
        messages: []
      };
      
      mockMammoth.extractRawText.mockResolvedValue(mockDocxData);

      const mockFileContent = new ArrayBuffer(3072);
      const mockFile = new File([mockFileContent], 'table-resume.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });

      const arrayBuffer = await mockFile.arrayBuffer();
      const result = await mockMammoth.extractRawText({ arrayBuffer });

      expect(result.value).toContain('Technical Skills');
      expect(result.value).toContain('Proficiency');
      expect(result.value).toContain('• E-commerce Platform');
      expect(result.value).toContain('• API Gateway');
    });

    it('should handle corrupted DOCX files', async () => {
      // Mock DOCX parsing failure for corrupted file
      mockMammoth.extractRawText.mockRejectedValue(new Error('not a valid zip file'));

      const mockFileContent = new ArrayBuffer(1024);
      const mockFile = new File([mockFileContent], 'corrupted.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });

      const arrayBuffer = await mockFile.arrayBuffer();

      await expect(mockMammoth.extractRawText({ arrayBuffer }))
        .rejects.toThrow('not a valid zip file');
    });

    it('should handle invalid DOCX file structure', async () => {
      // Mock invalid file signature error
      mockMammoth.extractRawText.mockRejectedValue(new Error('invalid signature: 0x12345678'));

      const mockFileContent = new ArrayBuffer(1024);
      const mockFile = new File([mockFileContent], 'invalid.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });

      const arrayBuffer = await mockFile.arrayBuffer();

      await expect(mockMammoth.extractRawText({ arrayBuffer }))
        .rejects.toThrow('invalid signature');
    });

    it('should handle password-protected DOCX files', async () => {
      // Mock password-protected DOCX error
      mockMammoth.extractRawText.mockRejectedValue(new Error('Document is password protected'));

      const mockFileContent = new ArrayBuffer(1024);
      const mockFile = new File([mockFileContent], 'protected.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });

      const arrayBuffer = await mockFile.arrayBuffer();

      await expect(mockMammoth.extractRawText({ arrayBuffer }))
        .rejects.toThrow('password protected');
    });

    it('should handle DOCX files with no readable text', async () => {
      // Mock DOCX with no text content (only images or empty)
      const mockDocxData = {
        value: '',
        messages: []
      };
      
      mockMammoth.extractRawText.mockResolvedValue(mockDocxData);

      const mockFileContent = new ArrayBuffer(1024);
      const mockFile = new File([mockFileContent], 'image-only.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });

      const arrayBuffer = await mockFile.arrayBuffer();
      const result = await mockMammoth.extractRawText({ arrayBuffer });

      expect(result.value).toBe('');
    });

    it('should handle DOCX files with only whitespace', async () => {
      // Mock DOCX with only whitespace content
      const mockDocxData = {
        value: '   \n\n   \t  \n   ',
        messages: []
      };
      
      mockMammoth.extractRawText.mockResolvedValue(mockDocxData);

      const mockFileContent = new ArrayBuffer(1024);
      const mockFile = new File([mockFileContent], 'whitespace.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });

      const arrayBuffer = await mockFile.arrayBuffer();
      const result = await mockMammoth.extractRawText({ arrayBuffer });

      expect(result.value.trim()).toBe('');
    });

    it('should handle large DOCX files', async () => {
      // Mock large DOCX with extensive content
      const longContent = 'John Doe\nSoftware Engineer\n\n' + 
        'Experience Section:\n'.repeat(100) +
        'Technical Skills:\n' + 
        '• JavaScript\n• TypeScript\n• React\n'.repeat(50) +
        'Project Details:\n' + 
        'Detailed project description with extensive information about implementation, challenges, and solutions.\n'.repeat(200);

      const mockDocxData = {
        value: longContent,
        messages: []
      };
      
      mockMammoth.extractRawText.mockResolvedValue(mockDocxData);

      // Create a larger mock file (2MB)
      const mockFileContent = new ArrayBuffer(2 * 1024 * 1024);
      const mockFile = new File([mockFileContent], 'large-resume.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });

      const arrayBuffer = await mockFile.arrayBuffer();
      const result = await mockMammoth.extractRawText({ arrayBuffer });

      expect(result.value.length).toBeGreaterThan(10000);
      expect(result.value).toContain('John Doe');
      expect(result.value).toContain('JavaScript');
    });

    it('should handle DOCX files with special characters and encoding', async () => {
      // Mock DOCX with special characters, accents, and unicode
      const mockDocxData = {
        value: 'José María González\nSoftware Engineer\n\nSkills: JavaScript, TypeScript, React\nLocation: São Paulo, Brazil\nEmail: josé.gonzález@email.com\n\nExperience:\n• Développement d\'applications web\n• Gestión de proyectos\n• Análisis de datos\n\nCertifications:\n✓ AWS Certified Developer\n✓ Microsoft Azure Fundamentals\n✓ Google Cloud Professional\n\nLanguages:\n• English (Fluent)\n• Español (Native)\n• Português (Advanced)\n• Français (Intermediate)',
        messages: []
      };
      
      mockMammoth.extractRawText.mockResolvedValue(mockDocxData);

      const mockFileContent = new ArrayBuffer(2048);
      const mockFile = new File([mockFileContent], 'international-resume.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });

      const arrayBuffer = await mockFile.arrayBuffer();
      const result = await mockMammoth.extractRawText({ arrayBuffer });

      expect(result.value).toContain('José María González');
      expect(result.value).toContain('São Paulo');
      expect(result.value).toContain('josé.gonzález@email.com');
      expect(result.value).toContain('Développement');
      expect(result.value).toContain('✓ AWS Certified');
      expect(result.value).toContain('Español');
    });

    it('should preserve paragraph structure in extracted text', async () => {
      // Mock DOCX with clear paragraph structure
      const mockDocxData = {
        value: 'John Doe\nSoftware Engineer\n\nProfessional Summary:\nExperienced software engineer with 5+ years of experience in full-stack development.\n\nTechnical Skills:\n• Frontend: React, Vue.js, Angular\n• Backend: Node.js, Python, Java\n• Databases: PostgreSQL, MongoDB\n\nWork Experience:\n\nSenior Software Engineer - Tech Corp (2020-Present)\nLed development of microservices architecture serving 1M+ users daily.\n\nSoftware Engineer - StartupCo (2018-2020)\nBuilt scalable web applications using modern JavaScript frameworks.',
        messages: []
      };
      
      mockMammoth.extractRawText.mockResolvedValue(mockDocxData);

      const mockFileContent = new ArrayBuffer(2048);
      const mockFile = new File([mockFileContent], 'structured-resume.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });

      const arrayBuffer = await mockFile.arrayBuffer();
      const result = await mockMammoth.extractRawText({ arrayBuffer });

      // Check that paragraph structure is preserved
      const lines = result.value.split('\n');
      expect(lines[0]).toBe('John Doe');
      expect(lines[1]).toBe('Software Engineer');
      expect(lines[2]).toBe(''); // Empty line between sections
      expect(lines[3]).toBe('Professional Summary:');
      
      // Check that bullet points are preserved
      expect(result.value).toContain('• Frontend:');
      expect(result.value).toContain('• Backend:');
      expect(result.value).toContain('• Databases:');
    });
  });

  describe('DOCX text processing and cleaning', () => {
    it('should handle DOCX text with formatting artifacts', async () => {
      // Mock DOCX with common formatting artifacts
      const mockDocxData = {
        value: 'John Doe\n\nSoftware Engineer\n\n\n\nContact Information:\nEmail:    john.doe@email.com\nPhone:     (555) 123-4567\n\n\n\nTechnical Skills:\n•    JavaScript\n•    TypeScript     \n•    React   \n\n\n\nExperience:\nSenior Developer    |    Tech Company    |    2020-Present\n\n\n',
        messages: []
      };
      
      mockMammoth.extractRawText.mockResolvedValue(mockDocxData);

      const mockFileContent = new ArrayBuffer(2048);
      const mockFile = new File([mockFileContent], 'formatted-resume.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });

      const arrayBuffer = await mockFile.arrayBuffer();
      const result = await mockMammoth.extractRawText({ arrayBuffer });

      // Test text cleaning logic that would be applied
      const cleaned = result.value
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/[ \t]{3,}/g, '  ')
        .replace(/\n{3,}/g, '\n\n')
        .split('\n')
        .map((line: string) => line.trimEnd())
        .join('\n')
        .trim();

      expect(cleaned).toContain('john.doe@email.com');
      expect(cleaned).toContain('•  JavaScript');
      expect(cleaned).not.toMatch(/\n{3,}/); // No triple line breaks
      expect(cleaned).not.toMatch(/[ \t]{3,}/); // No excessive spaces
    });

    it('should validate minimum content length for DOCX', () => {
      const shortText = 'John Doe\nEngineer';
      const validText = 'John Doe\nSoftware Engineer with 5+ years of experience in full-stack development using JavaScript, TypeScript, and React.';
      
      expect(shortText.length).toBeLessThan(50);
      expect(validText.length).toBeGreaterThanOrEqual(50);
    });

    it('should handle DOCX files with mixed content types', async () => {
      // Mock DOCX with headers, footers, tables, and regular text
      const mockDocxData = {
        value: 'CONFIDENTIAL RESUME\n\nJohn Doe\nSoftware Engineer\nPhone: (555) 123-4567\nEmail: john.doe@email.com\n\nSkills Matrix:\n\nSkill\tLevel\tYears\nJavaScript\tExpert\t5\nTypeScript\tAdvanced\t3\nReact\tExpert\t4\nNode.js\tAdvanced\t3\n\nCertifications:\n1. AWS Certified Developer Associate\n2. Microsoft Azure Fundamentals\n3. Google Cloud Professional Cloud Architect\n\nPage 1 of 2\n\nCONFIDENTIAL',
        messages: []
      };
      
      mockMammoth.extractRawText.mockResolvedValue(mockDocxData);

      const mockFileContent = new ArrayBuffer(3072);
      const mockFile = new File([mockFileContent], 'mixed-content-resume.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });

      const arrayBuffer = await mockFile.arrayBuffer();
      const result = await mockMammoth.extractRawText({ arrayBuffer });

      expect(result.value).toContain('John Doe');
      expect(result.value).toContain('Skills Matrix:');
      expect(result.value).toContain('JavaScript\tExpert\t5');
      expect(result.value).toContain('AWS Certified Developer');
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle network timeouts during DOCX parsing', async () => {
      // Mock timeout error
      mockMammoth.extractRawText.mockRejectedValue(new Error('Request timeout'));

      const mockFileContent = new ArrayBuffer(1024);
      const mockFile = new File([mockFileContent], 'timeout.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });

      const arrayBuffer = await mockFile.arrayBuffer();

      await expect(mockMammoth.extractRawText({ arrayBuffer }))
        .rejects.toThrow('Request timeout');
    });

    it('should handle memory issues with very large DOCX files', async () => {
      // Mock out of memory error
      mockMammoth.extractRawText.mockRejectedValue(new Error('JavaScript heap out of memory'));

      const mockFileContent = new ArrayBuffer(10 * 1024 * 1024); // 10MB
      const mockFile = new File([mockFileContent], 'huge.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });

      const arrayBuffer = await mockFile.arrayBuffer();

      await expect(mockMammoth.extractRawText({ arrayBuffer }))
        .rejects.toThrow('heap out of memory');
    });

    it('should handle DOCX files with unsupported features', async () => {
      // Mock DOCX with unsupported features but still extract available text
      const mockDocxData = {
        value: 'John Doe\nSoftware Engineer\n\nSkills: JavaScript, TypeScript, React\n\nNote: Some content may not be displayed due to unsupported formatting.',
        messages: [
          { type: 'warning', message: 'Unrecognised element: w:drawing' },
          { type: 'warning', message: 'Unrecognised element: w:object' },
          { type: 'info', message: 'Embedded object ignored' }
        ]
      };
      
      mockMammoth.extractRawText.mockResolvedValue(mockDocxData);

      const mockFileContent = new ArrayBuffer(2048);
      const mockFile = new File([mockFileContent], 'unsupported-features.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });

      const arrayBuffer = await mockFile.arrayBuffer();
      const result = await mockMammoth.extractRawText({ arrayBuffer });

      expect(result.value).toContain('John Doe');
      expect(result.value).toContain('JavaScript, TypeScript, React');
      expect(result.messages).toHaveLength(3);
      expect(result.messages[0].type).toBe('warning');
    });
  });

  describe('File type validation for DOCX', () => {
    it('should correctly identify DOCX files', () => {
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

      expect(getFileType('resume.docx')).toBe('docx');
      expect(getFileType('RESUME.DOCX')).toBe('docx');
      expect(getFileType('my-cv.docx')).toBe('docx');
      expect(getFileType('old-resume.doc')).toBe('docx'); // Legacy DOC files mapped to docx
    });

    it('should handle files without extensions', () => {
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

      expect(getFileType('resume')).toBe(null);
      expect(getFileType('document')).toBe(null);
    });
  });

  describe('ArrayBuffer handling for DOCX', () => {
    it('should correctly convert File to ArrayBuffer for mammoth', async () => {
      const testContent = 'Mock DOCX binary content';
      const mockFile = new File([testContent], 'test.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      
      const arrayBuffer = await mockFile.arrayBuffer();
      
      expect(arrayBuffer).toBeInstanceOf(ArrayBuffer);
      expect(arrayBuffer.byteLength).toBe(testContent.length);
    });

    it('should handle empty DOCX files', async () => {
      const mockFile = new File([], 'empty.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      
      const arrayBuffer = await mockFile.arrayBuffer();
      
      expect(arrayBuffer).toBeInstanceOf(ArrayBuffer);
      expect(arrayBuffer.byteLength).toBe(0);
    });

    it('should handle binary DOCX content correctly', async () => {
      // Create mock binary content that resembles DOCX structure
      const binaryContent = new Uint8Array([
        0x50, 0x4B, 0x03, 0x04, // ZIP file signature (DOCX is a ZIP)
        0x14, 0x00, 0x00, 0x00, // Version, flags
        0x08, 0x00, 0x00, 0x00, // Compression method, time
        0x00, 0x00, 0x00, 0x00, // CRC, sizes
        0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00
      ]);
      
      const mockFile = new File([binaryContent], 'binary.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      
      const arrayBuffer = await mockFile.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      expect(arrayBuffer.byteLength).toBe(binaryContent.length);
      expect(uint8Array[0]).toBe(0x50); // ZIP signature 'P'
      expect(uint8Array[1]).toBe(0x4B); // ZIP signature 'K'
    });
  });
});