import { useCallback } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { NotificationItem } from '../../shared/types';

export const useNotificationHelpers = () => {
  const { addNotification, removeNotification, clearAllNotifications } = useNotifications();

  const showSuccess = useCallback((
    title: string,
    message?: string,
    options?: Partial<Pick<NotificationItem, 'autoHide' | 'duration' | 'action'>>
  ) => {
    return addNotification({
      type: 'success',
      title,
      message,
      autoHide: options?.autoHide ?? true,
      duration: options?.duration ?? 4000,
      action: options?.action,
    });
  }, [addNotification]);

  const showError = useCallback((
    title: string,
    message?: string,
    options?: Partial<Pick<NotificationItem, 'autoHide' | 'duration' | 'action'>>
  ) => {
    return addNotification({
      type: 'error',
      title,
      message,
      autoHide: options?.autoHide ?? false, // Errors don't auto-hide by default
      duration: options?.duration ?? 0,
      action: options?.action,
    });
  }, [addNotification]);

  const showWarning = useCallback((
    title: string,
    message?: string,
    options?: Partial<Pick<NotificationItem, 'autoHide' | 'duration' | 'action'>>
  ) => {
    return addNotification({
      type: 'warning',
      title,
      message,
      autoHide: options?.autoHide ?? true,
      duration: options?.duration ?? 6000,
      action: options?.action,
    });
  }, [addNotification]);

  const showInfo = useCallback((
    title: string,
    message?: string,
    options?: Partial<Pick<NotificationItem, 'autoHide' | 'duration' | 'action'>>
  ) => {
    return addNotification({
      type: 'info',
      title,
      message,
      autoHide: options?.autoHide ?? true,
      duration: options?.duration ?? 5000,
      action: options?.action,
    });
  }, [addNotification]);

  // Convenience methods for common autofill scenarios
  const showAutofillSuccess = useCallback((fieldsCount: number) => {
    return showSuccess(
      'Autofill Complete',
      `Successfully filled ${fieldsCount} field${fieldsCount !== 1 ? 's' : ''}`,
      { duration: 3000 }
    );
  }, [showSuccess]);

  const showAutofillError = useCallback((error: string) => {
    return showError(
      'Autofill Failed',
      error,
      {
        action: {
          label: 'Retry',
          onClick: () => {
            // This would trigger autofill retry - implementation depends on autofill system
            console.log('Retry autofill requested');
          }
        }
      }
    );
  }, [showError]);

  const showProfileSaved = useCallback(() => {
    return showSuccess(
      'Profile Saved',
      'Your profile information has been updated',
      { duration: 2000 }
    );
  }, [showSuccess]);

  const showCVUploaded = useCallback((fileName: string) => {
    return showSuccess(
      'CV Uploaded',
      `${fileName} has been processed successfully`,
      { duration: 3000 }
    );
  }, [showSuccess]);

  const showCVUploadError = useCallback((error: string) => {
    return showError(
      'CV Upload Failed',
      error,
      {
        action: {
          label: 'Try Again',
          onClick: () => {
            // This would trigger file picker - implementation depends on CV upload system
            console.log('Retry CV upload requested');
          }
        }
      }
    );
  }, [showError]);

  return {
    // Basic notification methods
    showSuccess,
    showError,
    showWarning,
    showInfo,
    
    // Convenience methods for common scenarios
    showAutofillSuccess,
    showAutofillError,
    showProfileSaved,
    showCVUploaded,
    showCVUploadError,
    
    // Direct access to context methods
    removeNotification,
    clearAllNotifications,
  };
};