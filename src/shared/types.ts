// TypeScript interfaces and types for the Job Application Autofill extension

export interface UserProfile {
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

export interface CVData {
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

export interface FieldMapping {
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  fieldType: FieldType;
  confidence: number;
  value: string;
}

export enum FieldType {
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

// CV Analysis interfaces for profile auto-filling
export interface ParsedCVData {
  personalInfo: Partial<UserProfile['personalInfo']>;
  workInfo: Partial<UserProfile['workInfo']>;
  confidence: {
    [key: string]: number; // Confidence score for each extracted field (0-1)
  };
  rawMatches: {
    [key: string]: string[]; // All potential matches found for each field
  };
}

export interface CVAnalysisResult {
  extractedFields: ParsedCVData;
  analysisMetadata: {
    processingTime: number;
    sectionsFound: string[];
    totalMatches: number;
    averageConfidence: number;
  };
  suggestions: {
    field: keyof UserProfile['personalInfo'] | keyof UserProfile['workInfo'];
    value: string;
    confidence: number;
    source: string; // Which part of the CV this came from
  }[];
}

// Message types for inter-component communication
export interface Message {
  type: MessageType;
  payload?: any;
}

export enum MessageType {
  GET_USER_PROFILE = 'GET_USER_PROFILE',
  SET_USER_PROFILE = 'SET_USER_PROFILE',
  GET_CV_DATA = 'GET_CV_DATA',
  SET_CV_DATA = 'SET_CV_DATA',
  TOGGLE_AUTOFILL = 'TOGGLE_AUTOFILL',
  TRIGGER_AUTOFILL = 'TRIGGER_AUTOFILL',
  AUTOFILL_COMPLETE = 'AUTOFILL_COMPLETE',
  ERROR = 'ERROR',
  PARSE_CV_FOR_PROFILE = 'PARSE_CV_FOR_PROFILE',
  CV_ANALYSIS_COMPLETE = 'CV_ANALYSIS_COMPLETE',
  AUTO_FILL_PROFILE = 'AUTO_FILL_PROFILE'
}

// Storage keys for Chrome storage
export enum StorageKey {
  USER_PROFILE = 'userProfile',
  CV_DATA = 'cvData',
  AUTOFILL_ENABLED = 'autofillEnabled'
}