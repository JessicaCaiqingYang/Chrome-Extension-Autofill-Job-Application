// Enhanced error types and categorization for the Job Application Autofill extension

export enum ErrorCategory {
  CONNECTION = 'connection',
  VALIDATION = 'validation',
  PERMISSION = 'permission',
  DATA = 'data',
  NETWORK = 'network',
  SYSTEM = 'system',
  USER_INPUT = 'user_input',
  CONTENT_SCRIPT = 'content_script',
  STORAGE = 'storage'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ExtensionError {
  id: string;
  code: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  technicalDetails?: string;
  timestamp: number;
  context?: {
    url?: string;
    tabId?: number;
    component?: string;
    action?: string;
    userAgent?: string;
  };
  recoveryActions?: RecoveryAction[];
  diagnosticInfo?: DiagnosticInfo;
  isResolved?: boolean;
  resolvedAt?: number;
}

export interface RecoveryAction {
  id: string;
  label: string;
  description: string;
  type: 'button' | 'link' | 'instruction';
  action?: () => void | Promise<void>;
  url?: string;
  priority: number; // Lower number = higher priority
}

export interface DiagnosticInfo {
  extensionVersion?: string;
  browserVersion?: string;
  permissions?: string[];
  storageUsage?: number;
  lastSuccessfulAction?: string;
  relatedErrors?: string[];
  systemInfo?: {
    platform?: string;
    userAgent?: string;
    language?: string;
  };
}

// Predefined error codes with user-friendly messages and recovery actions
export const ERROR_DEFINITIONS: Record<string, Omit<ExtensionError, 'id' | 'timestamp' | 'context'>> = {
  // Connection Errors
  'CONN_001': {
    code: 'CONN_001',
    category: ErrorCategory.CONNECTION,
    severity: ErrorSeverity.HIGH,
    message: 'Extension context invalidated',
    userMessage: 'The extension lost connection to the browser. This usually happens after an extension update.',
    technicalDetails: 'Chrome runtime context was invalidated, likely due to extension reload or update',
    recoveryActions: [
      {
        id: 'refresh_page',
        label: 'Refresh Page',
        description: 'Refresh the current page to restore connection',
        type: 'button',
        priority: 1
      },
      {
        id: 'reload_extension',
        label: 'Reload Extension',
        description: 'Go to chrome://extensions and reload the extension',
        type: 'instruction',
        priority: 2
      }
    ]
  },

  'CONN_002': {
    code: 'CONN_002',
    category: ErrorCategory.CONNECTION,
    severity: ErrorSeverity.MEDIUM,
    message: 'Service worker not responding',
    userMessage: 'The extension background service is not responding. This may be temporary.',
    technicalDetails: 'Service worker failed to respond to message within timeout period',
    recoveryActions: [
      {
        id: 'retry_action',
        label: 'Try Again',
        description: 'Retry the action that failed',
        type: 'button',
        priority: 1
      },
      {
        id: 'wait_and_retry',
        label: 'Wait and Retry',
        description: 'Wait a few seconds and try again',
        type: 'instruction',
        priority: 2
      }
    ]
  },

  'CONN_003': {
    code: 'CONN_003',
    category: ErrorCategory.CONNECTION,
    severity: ErrorSeverity.MEDIUM,
    message: 'Content script communication failed',
    userMessage: 'Cannot communicate with the webpage. The page may need to be refreshed.',
    technicalDetails: 'Failed to establish communication with content script on target tab',
    recoveryActions: [
      {
        id: 'refresh_page',
        label: 'Refresh Page',
        description: 'Refresh the webpage and try again',
        type: 'button',
        priority: 1
      },
      {
        id: 'check_page_type',
        label: 'Check Page Type',
        description: 'Make sure you are on a regular webpage (not chrome:// or extension pages)',
        type: 'instruction',
        priority: 2
      }
    ]
  },

  // Validation Errors
  'VAL_001': {
    code: 'VAL_001',
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.MEDIUM,
    message: 'Invalid profile data',
    userMessage: 'Some profile information is missing or invalid. Please check your profile.',
    technicalDetails: 'Profile validation failed - required fields missing or invalid format',
    recoveryActions: [
      {
        id: 'edit_profile',
        label: 'Edit Profile',
        description: 'Go to the Profile tab and complete missing information',
        type: 'button',
        priority: 1
      },
      {
        id: 'validate_email',
        label: 'Check Email Format',
        description: 'Make sure your email address is in the correct format',
        type: 'instruction',
        priority: 2
      }
    ]
  },

  'VAL_002': {
    code: 'VAL_002',
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.LOW,
    message: 'File validation failed',
    userMessage: 'The uploaded file is not supported or is corrupted.',
    technicalDetails: 'File type validation failed or file size exceeds limits',
    recoveryActions: [
      {
        id: 'check_file_type',
        label: 'Check File Type',
        description: 'Make sure your file is a PDF or Word document (.pdf, .doc, .docx)',
        type: 'instruction',
        priority: 1
      },
      {
        id: 'check_file_size',
        label: 'Check File Size',
        description: 'Make sure your file is smaller than 5MB',
        type: 'instruction',
        priority: 2
      },
      {
        id: 'try_different_file',
        label: 'Try Different File',
        description: 'Try uploading a different version of your CV',
        type: 'instruction',
        priority: 3
      }
    ]
  },

  // Permission Errors
  'PERM_001': {
    code: 'PERM_001',
    category: ErrorCategory.PERMISSION,
    severity: ErrorSeverity.HIGH,
    message: 'Insufficient permissions',
    userMessage: 'The extension needs additional permissions to work on this website.',
    technicalDetails: 'Extension lacks required permissions for current domain or action',
    recoveryActions: [
      {
        id: 'grant_permissions',
        label: 'Grant Permissions',
        description: 'Click on the extension icon and grant the requested permissions',
        type: 'instruction',
        priority: 1
      },
      {
        id: 'check_site_permissions',
        label: 'Check Site Permissions',
        description: 'Go to chrome://extensions and check site access settings',
        type: 'instruction',
        priority: 2
      }
    ]
  },

  'PERM_002': {
    code: 'PERM_002',
    category: ErrorCategory.PERMISSION,
    severity: ErrorSeverity.MEDIUM,
    message: 'Storage access denied',
    userMessage: 'Cannot save data. Please check your browser storage settings.',
    technicalDetails: 'Chrome storage API access was denied or quota exceeded',
    recoveryActions: [
      {
        id: 'clear_storage',
        label: 'Clear Extension Data',
        description: 'Clear extension storage and try again',
        type: 'button',
        priority: 1
      },
      {
        id: 'check_storage_quota',
        label: 'Check Storage Space',
        description: 'Make sure your browser has enough storage space available',
        type: 'instruction',
        priority: 2
      }
    ]
  },

  // Data Errors
  'DATA_001': {
    code: 'DATA_001',
    category: ErrorCategory.DATA,
    severity: ErrorSeverity.MEDIUM,
    message: 'Profile data not found',
    userMessage: 'No profile information found. Please set up your profile first.',
    technicalDetails: 'User profile data is missing from storage',
    recoveryActions: [
      {
        id: 'setup_profile',
        label: 'Set Up Profile',
        description: 'Go to the Profile tab and enter your information',
        type: 'button',
        priority: 1
      }
    ]
  },

  'DATA_002': {
    code: 'DATA_002',
    category: ErrorCategory.DATA,
    severity: ErrorSeverity.LOW,
    message: 'CV data corrupted',
    userMessage: 'Your uploaded CV appears to be corrupted. Please upload it again.',
    technicalDetails: 'CV file data in storage is corrupted or incomplete',
    recoveryActions: [
      {
        id: 'reupload_cv',
        label: 'Re-upload CV',
        description: 'Go to the CV Upload section and upload your CV again',
        type: 'button',
        priority: 1
      },
      {
        id: 'clear_cv_data',
        label: 'Clear CV Data',
        description: 'Remove the corrupted CV and start fresh',
        type: 'button',
        priority: 2
      }
    ]
  },

  // Network Errors
  'NET_001': {
    code: 'NET_001',
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.MEDIUM,
    message: 'Network request failed',
    userMessage: 'Network connection failed. Please check your internet connection.',
    technicalDetails: 'HTTP request failed due to network connectivity issues',
    recoveryActions: [
      {
        id: 'check_connection',
        label: 'Check Internet',
        description: 'Make sure you have a stable internet connection',
        type: 'instruction',
        priority: 1
      },
      {
        id: 'retry_request',
        label: 'Try Again',
        description: 'Retry the action that failed',
        type: 'button',
        priority: 2
      }
    ]
  },

  // System Errors
  'SYS_001': {
    code: 'SYS_001',
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.HIGH,
    message: 'Browser compatibility issue',
    userMessage: 'This feature is not supported in your current browser version.',
    technicalDetails: 'Browser API not available or incompatible version detected',
    recoveryActions: [
      {
        id: 'update_browser',
        label: 'Update Browser',
        description: 'Update Chrome to the latest version',
        type: 'instruction',
        priority: 1
      },
      {
        id: 'check_compatibility',
        label: 'Check Compatibility',
        description: 'Make sure you are using Chrome version 88 or later',
        type: 'instruction',
        priority: 2
      }
    ]
  },

  // Content Script Errors
  'CS_001': {
    code: 'CS_001',
    category: ErrorCategory.CONTENT_SCRIPT,
    severity: ErrorSeverity.MEDIUM,
    message: 'Form detection failed',
    userMessage: 'Could not find any form fields on this page to fill.',
    technicalDetails: 'Content script failed to detect fillable form fields on the current page',
    recoveryActions: [
      {
        id: 'check_page_type',
        label: 'Check Page Type',
        description: 'Make sure you are on a job application or form page',
        type: 'instruction',
        priority: 1
      },
      {
        id: 'wait_for_page_load',
        label: 'Wait for Page Load',
        description: 'Wait for the page to fully load and try again',
        type: 'instruction',
        priority: 2
      },
      {
        id: 'manual_fill',
        label: 'Fill Manually',
        description: 'You may need to fill this form manually',
        type: 'instruction',
        priority: 3
      }
    ]
  },

  'CS_002': {
    code: 'CS_002',
    category: ErrorCategory.CONTENT_SCRIPT,
    severity: ErrorSeverity.LOW,
    message: 'Field mapping failed',
    userMessage: 'Some form fields could not be automatically identified.',
    technicalDetails: 'Content script could not map detected fields to profile data',
    recoveryActions: [
      {
        id: 'try_different_approach',
        label: 'Try Manual Selection',
        description: 'You may need to fill some fields manually',
        type: 'instruction',
        priority: 1
      },
      {
        id: 'report_issue',
        label: 'Report Issue',
        description: 'Help us improve by reporting this website',
        type: 'button',
        priority: 2
      }
    ]
  },

  // Storage Errors
  'STOR_001': {
    code: 'STOR_001',
    category: ErrorCategory.STORAGE,
    severity: ErrorSeverity.HIGH,
    message: 'Storage quota exceeded',
    userMessage: 'Extension storage is full. Please clear some data or reduce file sizes.',
    technicalDetails: 'Chrome storage quota exceeded, cannot save additional data',
    recoveryActions: [
      {
        id: 'clear_old_data',
        label: 'Clear Old Data',
        description: 'Remove old activity logs and temporary data',
        type: 'button',
        priority: 1
      },
      {
        id: 'reduce_cv_size',
        label: 'Reduce CV Size',
        description: 'Upload a smaller CV file (under 2MB recommended)',
        type: 'instruction',
        priority: 2
      }
    ]
  }
};

// Error severity levels with visual indicators
export const SEVERITY_CONFIG = {
  [ErrorSeverity.LOW]: {
    color: '#f59e0b', // amber-500
    backgroundColor: '#fef3c7', // amber-100
    borderColor: '#f3e8ff', // amber-200
    icon: '⚠️',
    priority: 1
  },
  [ErrorSeverity.MEDIUM]: {
    color: '#ea580c', // orange-600
    backgroundColor: '#fed7aa', // orange-100
    borderColor: '#fdba74', // orange-300
    icon: '⚠️',
    priority: 2
  },
  [ErrorSeverity.HIGH]: {
    color: '#dc2626', // red-600
    backgroundColor: '#fecaca', // red-100
    borderColor: '#fca5a5', // red-300
    icon: '❌',
    priority: 3
  },
  [ErrorSeverity.CRITICAL]: {
    color: '#991b1b', // red-800
    backgroundColor: '#fee2e2', // red-100
    borderColor: '#f87171', // red-400
    icon: '🚨',
    priority: 4
  }
};

// Category-specific configurations
export const CATEGORY_CONFIG = {
  [ErrorCategory.CONNECTION]: {
    name: 'Connection',
    description: 'Issues with extension connectivity',
    icon: '🔌'
  },
  [ErrorCategory.VALIDATION]: {
    name: 'Validation',
    description: 'Data validation and format issues',
    icon: '✅'
  },
  [ErrorCategory.PERMISSION]: {
    name: 'Permissions',
    description: 'Browser permission and access issues',
    icon: '🔒'
  },
  [ErrorCategory.DATA]: {
    name: 'Data',
    description: 'Profile and CV data issues',
    icon: '📄'
  },
  [ErrorCategory.NETWORK]: {
    name: 'Network',
    description: 'Internet connectivity issues',
    icon: '🌐'
  },
  [ErrorCategory.SYSTEM]: {
    name: 'System',
    description: 'Browser and system compatibility',
    icon: '⚙️'
  },
  [ErrorCategory.USER_INPUT]: {
    name: 'User Input',
    description: 'Issues with user-provided data',
    icon: '👤'
  },
  [ErrorCategory.CONTENT_SCRIPT]: {
    name: 'Page Interaction',
    description: 'Issues interacting with web pages',
    icon: '🌍'
  },
  [ErrorCategory.STORAGE]: {
    name: 'Storage',
    description: 'Data storage and persistence issues',
    icon: '💾'
  }
};