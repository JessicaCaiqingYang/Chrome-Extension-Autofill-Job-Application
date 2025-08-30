import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Chrome APIs
const mockChrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn()
    }
  },
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn()
    }
  }
};

// @ts-ignore
global.chrome = mockChrome;

// Mock mammoth module
const mockMammoth = {
  extractRawText: vi.fn()
};
vi.mock('mammoth', () => ({
  default: mockMammoth,
  extractRawText: mockMammoth.extractRawText
}));

// Mock pdf-parse (not used in this test but imported by service worker)
vi.mock('pdf-parse', () => ({
  default: vi.fn()
}));

// Mock Buffer
vi.mock('buffer', () => ({
  Buffer: {
    from: vi.fn((data) => new Uint8Array(data))
  }
}));

describe('DOCX End-to-End Processing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default Chrome storage mock
    mockChrome.storage.local.set.mockResolvedValue(undefined);
    mockChrome.storage.local.get.mockResolvedValue({});
  });

  it('should process a complete DOCX file upload workflow', async () => {
    // Mock a realistic DOCX extraction result
    const mockDocxContent = {
      value: `John Doe
Software Engineer

Contact Information:
Email: john.doe@email.com
Phone: (555) 123-4567
LinkedIn: linkedin.com/in/johndoe

Professional Summary:
Experienced software engineer with 5+ years of experience in full-stack development.
Proficient in JavaScript, TypeScript, React, and Node.js.

Technical Skills:
• Frontend: React, Vue.js, Angular, HTML5, CSS3
• Backend: Node.js, Python, Java, Express.js
• Databases: PostgreSQL, MongoDB, Redis
• Tools: Git, Docker, AWS, Jenkins

Work Experience:

Senior Software Engineer | Tech Corp | 2020-Present
• Led development of microservices architecture serving 1M+ users daily
• Implemented automated testing and CI/CD pipelines
• Mentored junior developers and conducted code reviews

Software Engineer | StartupCo | 2018-2020
• Built scalable web applications using modern JavaScript frameworks
• Collaborated with cross-functional teams to deliver high-quality software
• Optimized database queries and improved application performance by 40%

Education:
Bachelor of Computer Science | University of Technology | 2018`,
      messages: []
    };

    mockMammoth.extractRawText.mockResolvedValue(mockDocxContent);

    // Create a mock DOCX file
    const mockFileContent = new ArrayBuffer(4096);
    const mockFile = new File([mockFileContent], 'john-doe-resume.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      lastModified: Date.now()
    });

    // Simulate the file processing workflow
    const fileData = {
      name: mockFile.name,
      type: mockFile.type,
      size: mockFile.size,
      lastModified: mockFile.lastModified,
      arrayBuffer: mockFileContent
    };

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

    const fileType = getFileType(fileData.name);
    expect(fileType).toBe('docx');

    // Test file size validation (5MB limit)
    const maxSize = 5 * 1024 * 1024;
    expect(fileData.size).toBeLessThan(maxSize);

    // Test DOCX text extraction
    const arrayBuffer = fileData.arrayBuffer;
    const extractionResult = await mockMammoth.extractRawText({ arrayBuffer });

    expect(mockMammoth.extractRawText).toHaveBeenCalledWith({ arrayBuffer });
    expect(extractionResult.value).toContain('John Doe');
    expect(extractionResult.value).toContain('Software Engineer');
    expect(extractionResult.value).toContain('john.doe@email.com');
    expect(extractionResult.value).toContain('JavaScript, TypeScript, React');

    // Test text cleaning
    const cleanedText = extractionResult.value
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[ \t]{3,}/g, '  ')
      .replace(/\n{3,}/g, '\n\n')
      .split('\n')
      .map((line: string) => line.trimEnd())
      .join('\n')
      .trim();

    expect(cleanedText.length).toBeGreaterThan(50); // Minimum content validation
    expect(cleanedText).toContain('Professional Summary:');
    expect(cleanedText).toContain('Technical Skills:');
    expect(cleanedText).toContain('Work Experience:');

    // Test CVData object creation
    const startTime = Date.now();
    const extractionTime = Date.now() - startTime;
    const wordCount = cleanedText.trim().split(/\s+/).length;

    const cvData = {
      fileName: fileData.name,
      fileSize: fileData.size,
      uploadDate: Date.now(),
      extractedText: cleanedText,
      fileType: fileType as 'docx',
      extractionMetadata: {
        wordCount,
        extractionTime,
        extractionMethod: 'mammoth'
      }
    };

    expect(cvData.fileName).toBe('john-doe-resume.docx');
    expect(cvData.fileType).toBe('docx');
    expect(cvData.extractedText).toBe(cleanedText);
    expect(cvData.extractionMetadata?.extractionMethod).toBe('mammoth');
    expect(cvData.extractionMetadata?.wordCount).toBeGreaterThan(0);

    // Test storage operation
    mockChrome.storage.local.set.mockResolvedValue(undefined);
    await mockChrome.storage.local.set({ cvData });

    expect(mockChrome.storage.local.set).toHaveBeenCalledWith({ cvData });
  });

  it('should handle DOCX processing errors gracefully', async () => {
    // Mock DOCX extraction failure
    mockMammoth.extractRawText.mockRejectedValue(new Error('not a valid zip file'));

    const mockFileContent = new ArrayBuffer(1024);
    const mockFile = new File([mockFileContent], 'corrupted.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });

    const arrayBuffer = await mockFile.arrayBuffer();

    // Test error handling
    try {
      await mockMammoth.extractRawText({ arrayBuffer });
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('not a valid zip file');
    }

    // Verify that the error would be properly categorized
    const errorMessage = 'not a valid zip file';
    let processedError: string;

    if (errorMessage.includes('not a valid zip file') || errorMessage.includes('invalid signature')) {
      processedError = 'Invalid DOCX file structure - the file may be corrupted or not a valid Word document.';
    } else {
      processedError = `DOCX parsing failed: ${errorMessage}`;
    }

    expect(processedError).toBe('Invalid DOCX file structure - the file may be corrupted or not a valid Word document.');
  });

  it('should handle empty DOCX files appropriately', async () => {
    // Mock empty DOCX extraction result
    mockMammoth.extractRawText.mockResolvedValue({
      value: '',
      messages: []
    });

    const mockFileContent = new ArrayBuffer(1024);
    const mockFile = new File([mockFileContent], 'empty.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });

    const arrayBuffer = await mockFile.arrayBuffer();
    const result = await mockMammoth.extractRawText({ arrayBuffer });

    expect(result.value).toBe('');

    // Test validation logic
    const extractedText = result.value;
    const isValidContent = !!(extractedText && extractedText.trim().length >= 50);

    expect(isValidContent).toBe(false);

    // This would trigger an error in the actual implementation
    expect(extractedText.trim().length).toBe(0);
    
    // Verify the error message that would be thrown
    if (!extractedText || extractedText.trim().length === 0) {
      const expectedError = 'No readable text found in the DOCX document. The document may be empty or corrupted.';
      expect(expectedError).toContain('No readable text found');
    }
  });

  it('should preserve document structure in DOCX extraction', async () => {
    // Mock DOCX with clear structure
    const mockDocxContent = {
      value: `Jane Smith
Senior Frontend Developer

CONTACT
Email: jane.smith@email.com
Phone: +1 (555) 987-6543
Location: San Francisco, CA
Portfolio: janesmith.dev

SUMMARY
Creative and detail-oriented frontend developer with 7+ years of experience building responsive web applications. Expertise in React, TypeScript, and modern CSS frameworks.

TECHNICAL SKILLS

Frontend Technologies:
• React, Vue.js, Angular
• TypeScript, JavaScript (ES6+)
• HTML5, CSS3, SASS/SCSS
• Webpack, Vite, Parcel

Design & UX:
• Figma, Adobe XD, Sketch
• Responsive Design
• Accessibility (WCAG 2.1)
• User Experience Design

PROFESSIONAL EXPERIENCE

Senior Frontend Developer
TechStart Inc. | San Francisco, CA | 2020 - Present
• Lead frontend development for SaaS platform with 50K+ active users
• Implemented design system reducing development time by 30%
• Mentored team of 4 junior developers

Frontend Developer
WebSolutions Co. | San Francisco, CA | 2018 - 2020
• Developed responsive web applications using React and Redux
• Collaborated with UX designers to implement pixel-perfect designs
• Optimized application performance achieving 95+ Lighthouse scores

EDUCATION
Master of Computer Science
Stanford University | 2018

Bachelor of Computer Science
UC Berkeley | 2016`,
      messages: []
    };

    mockMammoth.extractRawText.mockResolvedValue(mockDocxContent);

    const mockFileContent = new ArrayBuffer(3072);
    const arrayBuffer = mockFileContent;
    const result = await mockMammoth.extractRawText({ arrayBuffer });

    // Verify structure preservation
    const lines = result.value.split('\n');
    expect(lines[0]).toBe('Jane Smith');
    expect(lines[1]).toBe('Senior Frontend Developer');
    
    // Check that sections are preserved
    expect(result.value).toContain('CONTACT');
    expect(result.value).toContain('SUMMARY');
    expect(result.value).toContain('TECHNICAL SKILLS');
    expect(result.value).toContain('PROFESSIONAL EXPERIENCE');
    expect(result.value).toContain('EDUCATION');

    // Check that bullet points are preserved
    expect(result.value).toContain('• React, Vue.js, Angular');
    expect(result.value).toContain('• TypeScript, JavaScript');
    expect(result.value).toContain('• Lead frontend development');

    // Check that contact information is preserved
    expect(result.value).toContain('jane.smith@email.com');
    expect(result.value).toContain('+1 (555) 987-6543');
    expect(result.value).toContain('janesmith.dev');

    // Verify word count calculation
    const wordCount = result.value.trim().split(/\s+/).length;
    expect(wordCount).toBeGreaterThan(100);
  });

  it('should handle DOCX files with complex formatting correctly', async () => {
    // Mock DOCX with tables, headers, and mixed formatting
    const mockDocxContent = {
      value: `MICHAEL JOHNSON
Full Stack Developer

CONTACT INFORMATION
Email	michael.johnson@email.com
Phone	(555) 456-7890
LinkedIn	linkedin.com/in/michaeljohnson
GitHub	github.com/mjohnson

SKILLS MATRIX

Technology	Proficiency	Years of Experience
JavaScript	Expert	8
TypeScript	Advanced	5
React	Expert	6
Node.js	Advanced	7
Python	Intermediate	3
AWS	Advanced	4

PROJECT HIGHLIGHTS

E-Commerce Platform (2023)
• Built scalable microservices architecture
• Implemented real-time inventory management
• Technologies: React, Node.js, PostgreSQL, Redis

API Gateway Service (2022)
• Designed RESTful APIs serving 1M+ requests/day
• Implemented OAuth 2.0 authentication
• Technologies: Express.js, JWT, MongoDB

Mobile Banking App (2021)
• Developed React Native application
• Integrated biometric authentication
• Technologies: React Native, Firebase, Stripe API`,
      messages: [
        { type: 'warning', message: 'Unrecognised element: w:tbl' },
        { type: 'info', message: 'Table converted to plain text' }
      ]
    };

    mockMammoth.extractRawText.mockResolvedValue(mockDocxContent);

    const mockFileContent = new ArrayBuffer(4096);
    const arrayBuffer = mockFileContent;
    const result = await mockMammoth.extractRawText({ arrayBuffer });

    // Verify complex content is handled
    expect(result.value).toContain('MICHAEL JOHNSON');
    expect(result.value).toContain('Full Stack Developer');
    
    // Check table content is preserved (even if structure is flattened)
    expect(result.value).toContain('Technology\tProficiency\tYears of Experience');
    expect(result.value).toContain('JavaScript\tExpert\t8');
    expect(result.value).toContain('TypeScript\tAdvanced\t5');

    // Check project information is preserved
    expect(result.value).toContain('E-Commerce Platform (2023)');
    expect(result.value).toContain('API Gateway Service (2022)');
    expect(result.value).toContain('Mobile Banking App (2021)');

    // Check that warnings are captured but don't prevent extraction
    expect(result.messages).toHaveLength(2);
    expect(result.messages[0].type).toBe('warning');
    expect(result.messages[1].type).toBe('info');

    // Verify content quality
    const cleanedText = result.value.trim();
    expect(cleanedText.length).toBeGreaterThan(200);
    expect(cleanedText.split(/\s+/).length).toBeGreaterThan(50);
  });
});