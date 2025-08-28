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
  fileBlob: string; // Base64 encoded blob data for Chrome storage compatibility
  mimeType: string; // MIME type for proper file upload
}

export interface FieldMapping {
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  fieldType: FieldType;
  confidence: number;
  value: string;
}

export interface FileUploadMapping {
  element: HTMLInputElement;
  fieldType: FileUploadType;
  confidence: number;
  acceptedTypes: string[];
  maxSize?: number;
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

export enum FileUploadType {
  CV_RESUME = 'cvResume',
  COVER_LETTER_FILE = 'coverLetterFile',
  PORTFOLIO = 'portfolio',
  OTHER = 'other'
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
  ERROR = 'ERROR'
}

// Storage keys for Chrome storage
export enum StorageKey {
  USER_PROFILE = 'userProfile',
  CV_DATA = 'cvData',
  AUTOFILL_ENABLED = 'autofillEnabled'
}