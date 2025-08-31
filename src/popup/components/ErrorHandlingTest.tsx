import React from 'react';
import { 
  errorHandler, 
  createConnectionError, 
  createValidationError, 
  createDataError, 
  createNetworkError 
} from '../../shared/errorHandling';
import { ErrorCategory } from '../../shared/errorTypes';
import { useNotifications } from '../contexts/NotificationContext';
import { 
  colors, 
  spacing, 
  typography 
} from '../../shared/design-tokens';
import { 
  cardStyles, 
  textStyles, 
  buttonStyles, 
  mergeStyles 
} from '../../shared/styled-utils';

interface ErrorHandlingTestProps {
  className?: string;
  style?: React.CSSProperties;
}

export const ErrorHandlingTest: React.FC<ErrorHandlingTestProps> = ({ className, style }) => {
  const { addNotification } = useNotifications();

  const testConnectionError = () => {
    const error = createConnectionError({
      component: 'test',
      action: 'testConnectionError',
      url: window.location.href
    });
    
    addNotification({
      type: 'error',
      title: 'Connection Error Test',
      message: error.userMessage,
      autoHide: true,
      duration: 5000,
      errorId: error.id
    });
  };

  const testValidationError = () => {
    const error = createValidationError('Test validation failed', {
      component: 'test',
      action: 'testValidationError'
    });
    
    addNotification({
      type: 'error',
      title: 'Validation Error Test',
      message: error.userMessage,
      autoHide: true,
      duration: 5000,
      errorId: error.id
    });
  };

  const testDataError = () => {
    const error = createDataError({
      component: 'test',
      action: 'testDataError'
    });
    
    addNotification({
      type: 'error',
      title: 'Data Error Test',
      message: error.userMessage,
      autoHide: true,
      duration: 5000,
      errorId: error.id
    });
  };

  const testNetworkError = () => {
    const error = createNetworkError({
      component: 'test',
      action: 'testNetworkError'
    });
    
    addNotification({
      type: 'error',
      title: 'Network Error Test',
      message: error.userMessage,
      autoHide: true,
      duration: 5000,
      errorId: error.id
    });
  };

  const testExceptionError = () => {
    try {
      // Simulate a JavaScript error
      throw new Error('Test exception for error handling');
    } catch (exception) {
      const error = errorHandler.createErrorFromException(
        exception as Error,
        ErrorCategory.SYSTEM,
        {
          component: 'test',
          action: 'testExceptionError'
        }
      );
      
      addNotification({
        type: 'error',
        title: 'Exception Error Test',
        message: error.userMessage,
        autoHide: true,
        duration: 5000,
        errorId: error.id
      });
    }
  };

  const testCustomError = () => {
    const error = errorHandler.createError('SYS_001', {
      component: 'test',
      action: 'testCustomError'
    });
    
    addNotification({
      type: 'error',
      title: 'Custom Error Test',
      message: error.userMessage,
      autoHide: true,
      duration: 5000,
      errorId: error.id
    });
  };

  const getErrorStats = () => {
    const stats = errorHandler.getErrorStats();
    
    addNotification({
      type: 'info',
      title: 'Error Statistics',
      message: `Total: ${stats.total}, Unresolved: ${stats.unresolved}, Recent: ${stats.recentErrors}`,
      autoHide: true,
      duration: 5000
    });
  };

  const clearOldErrors = () => {
    const removedCount = errorHandler.clearOldErrors(0); // Clear all resolved errors
    
    addNotification({
      type: 'success',
      title: 'Errors Cleared',
      message: `Removed ${removedCount} old errors`,
      autoHide: true,
      duration: 3000
    });
  };

  return (
    <div className={className} style={{ padding: spacing[4], ...style }}>
      <h3 style={mergeStyles(textStyles.heading1, { marginBottom: spacing[4] })}>
        Error Handling Test
      </h3>

      <div style={mergeStyles(cardStyles.base, { marginBottom: spacing[4] })}>
        <h4 style={mergeStyles(textStyles.heading2, { marginBottom: spacing[3] })}>
          Test Error Types
        </h4>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
          gap: spacing[2] 
        }}>
          <button
            onClick={testConnectionError}
            style={mergeStyles(buttonStyles.base, buttonStyles.danger, {
              fontSize: typography.fontSize.xs,
              padding: `${spacing[2]} ${spacing[3]}`
            })}
          >
            Connection Error
          </button>
          
          <button
            onClick={testValidationError}
            style={mergeStyles(buttonStyles.base, {
              fontSize: typography.fontSize.xs,
              padding: `${spacing[2]} ${spacing[3]}`,
              backgroundColor: colors.warning[600],
              color: colors.neutral[50]
            })}
          >
            Validation Error
          </button>
          
          <button
            onClick={testDataError}
            style={mergeStyles(buttonStyles.base, buttonStyles.secondary, {
              fontSize: typography.fontSize.xs,
              padding: `${spacing[2]} ${spacing[3]}`
            })}
          >
            Data Error
          </button>
          
          <button
            onClick={testNetworkError}
            style={mergeStyles(buttonStyles.base, buttonStyles.primary, {
              fontSize: typography.fontSize.xs,
              padding: `${spacing[2]} ${spacing[3]}`
            })}
          >
            Network Error
          </button>
          
          <button
            onClick={testExceptionError}
            style={mergeStyles(buttonStyles.base, {
              fontSize: typography.fontSize.xs,
              padding: `${spacing[2]} ${spacing[3]}`,
              backgroundColor: colors.error[700],
              color: colors.neutral[50]
            })}
          >
            Exception Error
          </button>
          
          <button
            onClick={testCustomError}
            style={mergeStyles(buttonStyles.base, {
              fontSize: typography.fontSize.xs,
              padding: `${spacing[2]} ${spacing[3]}`,
              backgroundColor: colors.neutral[600],
              color: colors.neutral[50]
            })}
          >
            Custom Error
          </button>
        </div>
      </div>

      <div style={cardStyles.base}>
        <h4 style={mergeStyles(textStyles.heading2, { marginBottom: spacing[3] })}>
          Error Management
        </h4>
        
        <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap' }}>
          <button
            onClick={getErrorStats}
            style={mergeStyles(buttonStyles.base, buttonStyles.secondary, {
              fontSize: typography.fontSize.xs,
              padding: `${spacing[2]} ${spacing[3]}`
            })}
          >
            Get Stats
          </button>
          
          <button
            onClick={clearOldErrors}
            style={mergeStyles(buttonStyles.base, {
              fontSize: typography.fontSize.xs,
              padding: `${spacing[2]} ${spacing[3]}`,
              backgroundColor: colors.success[600],
              color: colors.neutral[50]
            })}
          >
            Clear Errors
          </button>
        </div>
      </div>
    </div>
  );
};