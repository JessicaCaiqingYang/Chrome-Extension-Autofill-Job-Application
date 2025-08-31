import { NotificationItem } from './types';

/**
 * Utility functions for creating common notification patterns
 */

export const createNotificationDefaults = {
  success: {
    autoHide: true,
    duration: 4000,
  },
  error: {
    autoHide: false,
    duration: 0,
  },
  warning: {
    autoHide: true,
    duration: 6000,
  },
  info: {
    autoHide: true,
    duration: 5000,
  },
} as const;

export const createAutofillNotifications = {
  success: (fieldsCount: number, fileUploads?: number): Omit<NotificationItem, 'id' | 'timestamp'> => {
    let message = `Successfully filled ${fieldsCount} field${fieldsCount !== 1 ? 's' : ''}`;
    if (fileUploads && fileUploads > 0) {
      message += ` and uploaded ${fileUploads} file${fileUploads !== 1 ? 's' : ''}`;
    }
    
    return {
      type: 'success',
      title: 'Autofill Complete',
      message,
      autoHide: true,
      duration: 4000,
    };
  },

  error: (error: string): Omit<NotificationItem, 'id' | 'timestamp'> => ({
    type: 'error',
    title: 'Autofill Failed',
    message: error,
    autoHide: false,
    action: {
      label: 'Retry',
      onClick: () => {
        // This would be implemented by the component using this utility
        console.log('Retry autofill requested');
      }
    }
  }),

  progress: (currentField: number, totalFields: number): Omit<NotificationItem, 'id' | 'timestamp'> => ({
    type: 'info',
    title: 'Filling Form',
    message: `Processing field ${currentField} of ${totalFields}`,
    autoHide: false,
  }),

  fieldsDetected: (fieldsCount: number, fileFieldsCount: number): Omit<NotificationItem, 'id' | 'timestamp'> => {
    let message = `Found ${fieldsCount} fillable field${fieldsCount !== 1 ? 's' : ''}`;
    if (fileFieldsCount > 0) {
      message += ` and ${fileFieldsCount} file upload field${fileFieldsCount !== 1 ? 's' : ''}`;
    }
    
    return {
      type: 'info',
      title: 'Fields Detected',
      message,
      autoHide: true,
      duration: 3000,
    };
  },

  partialSuccess: (filled: number, total: number, errors: string[]): Omit<NotificationItem, 'id' | 'timestamp'> => ({
    type: 'warning',
    title: 'Autofill Partially Complete',
    message: `Filled ${filled} of ${total} fields. ${errors.length} error${errors.length !== 1 ? 's' : ''} occurred.`,
    autoHide: true,
    duration: 6000,
    action: {
      label: 'View Errors',
      onClick: () => {
        console.log('View autofill errors:', errors);
      }
    }
  }),

  starting: (): Omit<NotificationItem, 'id' | 'timestamp'> => ({
    type: 'info',
    title: 'Starting Autofill',
    message: 'Detecting form fields and preparing to fill...',
    autoHide: true,
    duration: 2000,
  }),
};

export const createProfileNotifications = {
  saved: (): Omit<NotificationItem, 'id' | 'timestamp'> => ({
    type: 'success',
    title: 'Profile Saved',
    message: 'Your profile information has been updated',
    autoHide: true,
    duration: 2000,
  }),

  validationError: (field: string): Omit<NotificationItem, 'id' | 'timestamp'> => ({
    type: 'error',
    title: 'Validation Error',
    message: `Please check the ${field} field`,
    autoHide: true,
    duration: 5000,
  }),

  incomplete: (): Omit<NotificationItem, 'id' | 'timestamp'> => ({
    type: 'warning',
    title: 'Profile Incomplete',
    message: 'Some required fields are missing. Complete your profile for better autofill results.',
    autoHide: true,
    duration: 6000,
  }),
};

export const createCVNotifications = {
  uploaded: (fileName: string): Omit<NotificationItem, 'id' | 'timestamp'> => ({
    type: 'success',
    title: 'CV Uploaded',
    message: `${fileName} has been processed successfully`,
    autoHide: true,
    duration: 3000,
  }),

  uploadError: (error: string): Omit<NotificationItem, 'id' | 'timestamp'> => ({
    type: 'error',
    title: 'CV Upload Failed',
    message: error,
    autoHide: false,
    action: {
      label: 'Try Again',
      onClick: () => {
        // This would be implemented by the component using this utility
        console.log('Retry CV upload requested');
      }
    }
  }),

  processing: (): Omit<NotificationItem, 'id' | 'timestamp'> => ({
    type: 'info',
    title: 'Processing CV',
    message: 'Extracting text from your document...',
    autoHide: false,
  }),

  parseError: (): Omit<NotificationItem, 'id' | 'timestamp'> => ({
    type: 'warning',
    title: 'CV Parse Warning',
    message: 'Some text could not be extracted. You may need to manually enter some information.',
    autoHide: true,
    duration: 8000,
  }),
};

export const createSystemNotifications = {
  extensionReady: (): Omit<NotificationItem, 'id' | 'timestamp'> => ({
    type: 'success',
    title: 'Extension Ready',
    message: 'Job Application Autofill is ready to use',
    autoHide: true,
    duration: 2000,
  }),

  permissionRequired: (permission: string): Omit<NotificationItem, 'id' | 'timestamp'> => ({
    type: 'warning',
    title: 'Permission Required',
    message: `The extension needs ${permission} permission to work properly`,
    autoHide: false,
    action: {
      label: 'Grant Permission',
      onClick: () => {
        // This would be implemented by the component using this utility
        console.log('Grant permission requested');
      }
    }
  }),

  updateAvailable: (): Omit<NotificationItem, 'id' | 'timestamp'> => ({
    type: 'info',
    title: 'Update Available',
    message: 'A new version of the extension is available',
    autoHide: false,
    action: {
      label: 'Update Now',
      onClick: () => {
        // This would be implemented by the component using this utility
        console.log('Update extension requested');
      }
    }
  }),
};