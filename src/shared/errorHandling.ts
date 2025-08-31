// Enhanced error handling utilities for the Job Application Autofill extension

import { 
  ExtensionError, 
  ErrorCategory, 
  ErrorSeverity, 
  DiagnosticInfo,
  ERROR_DEFINITIONS 
} from './errorTypes';

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: ExtensionError[] = [];
  private maxLogSize = 100;
  private errorListeners: ((error: ExtensionError) => void)[] = [];

  private constructor() {
    this.loadErrorLog();
  }

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Create and log a new error
   */
  public createError(
    code: string,
    context?: ExtensionError['context'],
    overrides?: Partial<ExtensionError>
  ): ExtensionError {
    const errorDef = ERROR_DEFINITIONS[code];
    if (!errorDef) {
      // Create a generic error if code is not found
      return this.createGenericError(code, context, overrides);
    }

    const error: ExtensionError = {
      id: this.generateErrorId(),
      timestamp: Date.now(),
      context: {
        ...this.getDefaultContext(),
        ...context
      },
      diagnosticInfo: this.collectDiagnosticInfo(),
      isResolved: false,
      ...errorDef,
      ...overrides
    };

    this.logError(error);
    this.notifyListeners(error);

    return error;
  }

  /**
   * Create a generic error for unknown error codes
   */
  private createGenericError(
    code: string,
    context?: ExtensionError['context'],
    overrides?: Partial<ExtensionError>
  ): ExtensionError {
    const error: ExtensionError = {
      id: this.generateErrorId(),
      code,
      category: ErrorCategory.SYSTEM,
      severity: ErrorSeverity.MEDIUM,
      message: `Unknown error: ${code}`,
      userMessage: 'An unexpected error occurred. Please try again.',
      timestamp: Date.now(),
      context: {
        ...this.getDefaultContext(),
        ...context
      },
      diagnosticInfo: this.collectDiagnosticInfo(),
      recoveryActions: [
        {
          id: 'retry_action',
          label: 'Try Again',
          description: 'Retry the action that caused this error',
          type: 'button',
          priority: 1
        },
        {
          id: 'refresh_extension',
          label: 'Refresh Extension',
          description: 'Close and reopen the extension popup',
          type: 'instruction',
          priority: 2
        }
      ],
      isResolved: false,
      ...overrides
    };

    this.logError(error);
    this.notifyListeners(error);

    return error;
  }

  /**
   * Create error from JavaScript Error object
   */
  public createErrorFromException(
    exception: Error,
    category: ErrorCategory = ErrorCategory.SYSTEM,
    context?: ExtensionError['context']
  ): ExtensionError {
    // Try to map common error messages to known error codes
    const errorCode = this.mapExceptionToErrorCode(exception);
    
    if (errorCode && ERROR_DEFINITIONS[errorCode]) {
      return this.createError(errorCode, context, {
        technicalDetails: `${exception.name}: ${exception.message}\n${exception.stack}`
      });
    }

    // Create a generic error from the exception
    return this.createGenericError(`EXCEPTION_${category.toUpperCase()}`, context, {
      category,
      severity: this.determineSeverityFromException(exception),
      message: exception.message,
      userMessage: this.createUserFriendlyMessage(exception, category),
      technicalDetails: `${exception.name}: ${exception.message}\n${exception.stack}`
    });
  }

  /**
   * Map common JavaScript exceptions to known error codes
   */
  private mapExceptionToErrorCode(exception: Error): string | null {
    const message = exception.message.toLowerCase();

    if (message.includes('extension context invalidated') || 
        message.includes('receiving end does not exist')) {
      return 'CONN_001';
    }

    if (message.includes('quota exceeded') || message.includes('storage')) {
      return 'STOR_001';
    }

    if (message.includes('permission') || message.includes('access denied')) {
      return 'PERM_001';
    }

    if (message.includes('network') || message.includes('fetch')) {
      return 'NET_001';
    }

    return null;
  }

  /**
   * Determine error severity from exception characteristics
   */
  private determineSeverityFromException(exception: Error): ErrorSeverity {
    const _message = exception.message.toLowerCase();

    if (_message.includes('context invalidated') || 
        _message.includes('critical') || 
        _message.includes('fatal')) {
      return ErrorSeverity.CRITICAL;
    }

    if (_message.includes('permission') || 
        _message.includes('access denied') || 
        _message.includes('quota exceeded')) {
      return ErrorSeverity.HIGH;
    }

    if (_message.includes('network') || 
        _message.includes('timeout') || 
        _message.includes('validation')) {
      return ErrorSeverity.MEDIUM;
    }

    return ErrorSeverity.LOW;
  }

  /**
   * Create user-friendly message from exception
   */
  private createUserFriendlyMessage(_exception: Error, category: ErrorCategory): string {
    switch (category) {
      case ErrorCategory.CONNECTION:
        return 'Connection to the extension was lost. Please refresh the page.';
      case ErrorCategory.PERMISSION:
        return 'Permission denied. Please check your browser settings.';
      case ErrorCategory.STORAGE:
        return 'Unable to save data. Storage may be full.';
      case ErrorCategory.NETWORK:
        return 'Network error occurred. Please check your internet connection.';
      case ErrorCategory.VALIDATION:
        return 'Invalid data provided. Please check your input.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  /**
   * Mark an error as resolved
   */
  public resolveError(errorId: string): void {
    const error = this.errorLog.find(e => e.id === errorId);
    if (error && !error.isResolved) {
      error.isResolved = true;
      error.resolvedAt = Date.now();
      this.saveErrorLog();
    }
  }

  /**
   * Get all errors, optionally filtered
   */
  public getErrors(filters?: {
    category?: ErrorCategory;
    severity?: ErrorSeverity;
    resolved?: boolean;
    since?: number;
  }): ExtensionError[] {
    let errors = [...this.errorLog];

    if (filters) {
      if (filters.category) {
        errors = errors.filter(e => e.category === filters.category);
      }
      if (filters.severity) {
        errors = errors.filter(e => e.severity === filters.severity);
      }
      if (filters.resolved !== undefined) {
        errors = errors.filter(e => e.isResolved === filters.resolved);
      }
      if (filters.since !== undefined) {
        errors = errors.filter(e => e.timestamp >= filters.since!);
      }
    }

    return errors.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get error statistics
   */
  public getErrorStats(): {
    total: number;
    byCategory: Record<ErrorCategory, number>;
    bySeverity: Record<ErrorSeverity, number>;
    resolved: number;
    unresolved: number;
    recentErrors: number; // Last 24 hours
  } {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    const stats = {
      total: this.errorLog.length,
      byCategory: {} as Record<ErrorCategory, number>,
      bySeverity: {} as Record<ErrorSeverity, number>,
      resolved: 0,
      unresolved: 0,
      recentErrors: 0
    };

    // Initialize counters
    Object.values(ErrorCategory).forEach(category => {
      stats.byCategory[category] = 0;
    });
    Object.values(ErrorSeverity).forEach(severity => {
      stats.bySeverity[severity] = 0;
    });

    // Count errors
    this.errorLog.forEach(error => {
      stats.byCategory[error.category]++;
      stats.bySeverity[error.severity]++;
      
      if (error.isResolved) {
        stats.resolved++;
      } else {
        stats.unresolved++;
      }

      if (error.timestamp >= oneDayAgo) {
        stats.recentErrors++;
      }
    });

    return stats;
  }

  /**
   * Clear resolved errors older than specified days
   */
  public clearOldErrors(daysOld: number = 7): number {
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    const initialCount = this.errorLog.length;
    
    this.errorLog = this.errorLog.filter(error => {
      // Keep unresolved errors regardless of age
      if (!error.isResolved) return true;
      // Keep resolved errors that are newer than cutoff
      return error.timestamp > cutoffTime;
    });

    const removedCount = initialCount - this.errorLog.length;
    if (removedCount > 0) {
      this.saveErrorLog();
    }

    return removedCount;
  }

  /**
   * Add error listener
   */
  public addErrorListener(listener: (error: ExtensionError) => void): void {
    this.errorListeners.push(listener);
  }

  /**
   * Remove error listener
   */
  public removeErrorListener(listener: (error: ExtensionError) => void): void {
    const index = this.errorListeners.indexOf(listener);
    if (index > -1) {
      this.errorListeners.splice(index, 1);
    }
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get default context information
   */
  private getDefaultContext(): ExtensionError['context'] {
    const context: ExtensionError['context'] = {
      userAgent: navigator.userAgent,
      component: 'unknown'
    };

    // Try to get current tab information
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          context.url = tabs[0].url;
          context.tabId = tabs[0].id;
        }
      });
    } catch (error) {
      // Ignore errors when getting tab info
    }

    return context;
  }

  /**
   * Collect diagnostic information
   */
  private collectDiagnosticInfo(): DiagnosticInfo {
    const diagnosticInfo: DiagnosticInfo = {
      extensionVersion: chrome.runtime.getManifest().version,
      browserVersion: navigator.userAgent,
      systemInfo: {
        platform: navigator.platform,
        userAgent: navigator.userAgent,
        language: navigator.language
      }
    };

    // Try to get permissions
    try {
      chrome.permissions.getAll((permissions) => {
        diagnosticInfo.permissions = permissions.permissions;
      });
    } catch (error) {
      // Ignore permission errors
    }

    // Try to get storage usage
    try {
      chrome.storage.local.getBytesInUse(null, (bytesInUse) => {
        diagnosticInfo.storageUsage = bytesInUse;
      });
    } catch (error) {
      // Ignore storage errors
    }

    return diagnosticInfo;
  }

  /**
   * Log error to internal storage
   */
  private logError(error: ExtensionError): void {
    this.errorLog.push(error);

    // Maintain log size limit
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize);
    }

    this.saveErrorLog();
  }

  /**
   * Notify all error listeners
   */
  private notifyListeners(error: ExtensionError): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (error) {
        console.error('Error in error listener:', error);
      }
    });
  }

  /**
   * Load error log from storage
   */
  private async loadErrorLog(): Promise<void> {
    try {
      const result = await chrome.storage.local.get('errorLog');
      if (result.errorLog && Array.isArray(result.errorLog)) {
        this.errorLog = result.errorLog;
      }
    } catch (error) {
      console.error('Failed to load error log:', error);
      this.errorLog = [];
    }
  }

  /**
   * Save error log to storage
   */
  private async saveErrorLog(): Promise<void> {
    try {
      await chrome.storage.local.set({ errorLog: this.errorLog });
    } catch (error) {
      console.error('Failed to save error log:', error);
    }
  }
}

// Convenience functions for common error scenarios
export const errorHandler = ErrorHandler.getInstance();

export function createConnectionError(context?: ExtensionError['context']): ExtensionError {
  return errorHandler.createError('CONN_001', context);
}

export function createValidationError(message?: string, context?: ExtensionError['context']): ExtensionError {
  return errorHandler.createError('VAL_001', context, {
    userMessage: message || 'Please check your input and try again.'
  });
}

export function createPermissionError(context?: ExtensionError['context']): ExtensionError {
  return errorHandler.createError('PERM_001', context);
}

export function createDataError(context?: ExtensionError['context']): ExtensionError {
  return errorHandler.createError('DATA_001', context);
}

export function createNetworkError(context?: ExtensionError['context']): ExtensionError {
  return errorHandler.createError('NET_001', context);
}

export function createContentScriptError(context?: ExtensionError['context']): ExtensionError {
  return errorHandler.createError('CS_001', context);
}

export function createStorageError(context?: ExtensionError['context']): ExtensionError {
  return errorHandler.createError('STOR_001', context);
}

// Helper function to handle promise rejections
export function handleAsyncError<T>(
  promise: Promise<T>,
  category: ErrorCategory = ErrorCategory.SYSTEM,
  context?: ExtensionError['context']
): Promise<T> {
  return promise.catch((error) => {
    const extensionError = errorHandler.createErrorFromException(error, category, context);
    throw extensionError;
  });
}

// Decorator for automatic error handling
export function withErrorHandling(
  category: ErrorCategory = ErrorCategory.SYSTEM,
  context?: ExtensionError['context']
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        return await method.apply(this, args);
      } catch (error) {
        if (error instanceof Error) {
          throw errorHandler.createErrorFromException(error, category, {
            ...context,
            component: target.constructor.name,
            action: propertyName
          });
        }
        throw error;
      }
    };

    return descriptor;
  };
}