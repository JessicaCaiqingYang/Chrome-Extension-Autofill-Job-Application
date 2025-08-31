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
  AUTOFILL_PROGRESS = 'AUTOFILL_PROGRESS',
  FIELDS_DETECTED = 'FIELDS_DETECTED',
  ERROR = 'ERROR'
}

// Storage keys for Chrome storage
export enum StorageKey {
  USER_PROFILE = 'userProfile',
  CV_DATA = 'cvData',
  AUTOFILL_ENABLED = 'autofillEnabled'
}

// Enhanced Status Tracking Types
export interface ExtensionStatus {
  isReady: boolean;
  hasProfile: boolean;
  hasCV: boolean;
  autofillEnabled: boolean;
  lastActivity?: string;
  currentPage?: string;
  errors: string[];
  warnings: string[];
  // Enhanced tracking fields
  sessionStats: SessionStats;
  recentActivity: ActivityLogEntry[];
  healthStatus: 'healthy' | 'warning' | 'error';
}

export interface SessionStats {
  formsDetected: number;
  fieldsFilled: number;
  successRate: number;
  lastSession: number;
  totalSessions: number;
  averageFieldsPerForm: number;
}

export interface ActivityLogEntry {
  id: string;
  timestamp: number;
  action: 'form_detected' | 'autofill_started' | 'autofill_completed' | 'error_occurred' | 'profile_updated' | 'cv_uploaded';
  details: string;
  url?: string;
  fieldsCount?: number;
  success?: boolean;
  errorMessage?: string;
}

export interface HealthIndicator {
  status: 'healthy' | 'warning' | 'error';
  message: string;
  lastCheck: number;
}

// Notification system types
export interface NotificationItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  timestamp: number;
  autoHide: boolean;
  duration?: number; // Duration in milliseconds for auto-hide
  action?: {
    label: string;
    onClick: () => void;
  };
  errorId?: string; // Link to ExtensionError if this notification is for an error
}

export interface NotificationContextType {
  notifications: NotificationItem[];
  addNotification: (notification: Omit<NotificationItem, 'id' | 'timestamp'>) => string;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

// Autofill progress tracking types
export interface AutofillProgress {
  stage: 'detecting' | 'filling' | 'uploading' | 'complete' | 'error';
  currentField?: number;
  totalFields?: number;
  fieldsDetected?: number;
  fileFieldsDetected?: number;
  fieldsFilled?: number;
  filesUploaded?: number;
  errors?: string[];
  currentFieldType?: string;
  currentFieldValue?: string;
}

export interface FieldDetectionResult {
  fieldsDetected: number;
  fileFieldsDetected: number;
  fieldMappings: FieldMapping[];
  fileUploadMappings: FileUploadMapping[];
}