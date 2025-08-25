// Application constants
export const STORAGE_LIMITS = {
  MAX_CV_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_PROFILE_TEXT_LENGTH: 10000,
  MAX_ERROR_LOG_SIZE: 50
} as const;

export const TIMING = {
  FORM_SCAN_INTERVAL: 3000,
  FIELD_FILL_DELAY: 50,
  CACHE_TTL_DEFAULT: 5 * 60 * 1000, // 5 minutes
  CACHE_TTL_SETTINGS: 2.5 * 60 * 1000, // 2.5 minutes
  CACHE_TTL_CV: 10 * 60 * 1000, // 10 minutes
  CLEANUP_INTERVAL: 60000 // 1 minute
} as const;

export const CONFIDENCE_THRESHOLDS = {
  MIN_FIELD_MAPPING: 0.3,
  MIN_AUTOFILL: 0.4,
  HIGH_CONFIDENCE: 0.5
} as const;

export const SUPPORTED_FILE_TYPES = {
  PDF: 'pdf',
  DOCX: 'docx',
  DOC: 'doc'
} as const;

export const CSS_CLASSES = {
  AUTOFILL_SUCCESS: 'autofill-success',
  AUTOFILL_ERROR: 'autofill-error',
  AUTOFILL_HIGHLIGHT: 'autofill-highlight'
} as const;