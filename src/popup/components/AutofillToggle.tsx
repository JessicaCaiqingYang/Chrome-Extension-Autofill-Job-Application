import React, { useState, useEffect } from 'react';
import { messaging } from '../../shared/messaging';
import { CVData } from '../../shared/types';
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  transitions
} from '../../shared/design-system';
import { useNotificationHelpers } from '../hooks/useNotificationHelpers';
import { useNotifications } from '../contexts/NotificationContext';
import { createAutofillNotifications } from '../../shared/notificationUtils';

interface AutofillToggleProps {
  onToggleChange?: (enabled: boolean) => void;
}

export const AutofillToggle: React.FC<AutofillToggleProps> = ({ onToggleChange }) => {
  const [isEnabled, setIsEnabled] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [cvData, setCvData] = useState<CVData | null>(null);
  const [showHelp, setShowHelp] = useState<boolean>(false);

  const {
    showSuccess,
    showError
  } = useNotificationHelpers();

  const { addNotification, removeNotification } = useNotifications();

  // Load current autofill status on component mount
  useEffect(() => {
    loadAutofillStatus();
    loadCVData();
  }, []);

  const loadAutofillStatus = async () => {
    setIsLoading(true);

    try {
      // Get current user profile to check autofill preference
      const profile = await messaging.getUserProfile();
      if (profile) {
        // safe access with fallback
        const mergedPref = { ...(profile.preferences || {}) };
        setIsEnabled(Boolean(mergedPref.autofillEnabled ?? true));
      }
    } catch (error) {
      console.error('Error loading autofill status:', error);
      showError('Failed to load autofill status', 'Using default settings');
      // Default to enabled on error
      setIsEnabled(true);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCVData = async () => {
    try {
      const cvData = await messaging.getCVData();
      setCvData(cvData);
    } catch (error) {
      console.error('Error loading CV data:', error);
    }
  };

  const handleToggle = async () => {
    if (isUpdating) return;

    const newState = !isEnabled;
    setIsUpdating(true);

    try {
      // Update autofill status through service worker
      const result = await messaging.toggleAutofill(newState);

      if (result && result.success) {
        setIsEnabled(newState);

        // Show success notification with visual feedback
        showSuccess(
          newState ? 'Autofill Enabled' : 'Autofill Disabled',
          newState
            ? 'Extension will now automatically fill job application forms'
            : 'Extension will not fill forms automatically'
        );

        if (onToggleChange) {
          onToggleChange(newState);
        }
      } else {
        throw new Error(result?.error || 'Failed to update autofill status');
      }
    } catch (error) {
      console.error('Error toggling autofill:', error);
      showError(
        'Toggle Failed',
        'Could not update autofill status. Please try again.'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  // Enhanced style utilities
  const getToggleStyles = () => {
    const baseStyles = {
      position: 'relative' as const,
      width: '64px', // Larger, more accessible size
      height: '36px',
      borderRadius: borderRadius.full,
      cursor: (isLoading || isUpdating) ? 'not-allowed' : 'pointer',
      transition: transitions.normal,
      border: '2px solid transparent',
      outline: 'none',
    };

    if (isLoading || isUpdating) {
      return {
        ...baseStyles,
        backgroundColor: colors.neutral[300],
        cursor: 'not-allowed',
      };
    }

    return {
      ...baseStyles,
      backgroundColor: isEnabled ? colors.success[500] : colors.neutral[400],
      '&:hover': {
        backgroundColor: isEnabled ? colors.success[600] : colors.neutral[500],
        transform: 'scale(1.02)',
      },
      '&:focus': {
        borderColor: colors.primary[600],
        boxShadow: `0 0 0 3px ${colors.primary[200]}`,
      },
    };
  };

  const getKnobStyles = () => ({
    position: 'absolute' as const,
    top: '2px',
    left: isEnabled ? '30px' : '2px', // Adjusted for larger toggle
    width: '30px', // Larger knob
    height: '30px',
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.full,
    transition: transitions.normal,
    boxShadow: shadows.md,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  });

  const getStatusIndicatorStyles = () => {
    const baseStyles = {
      padding: `${spacing[3]} ${spacing[4]}`,
      borderRadius: borderRadius.lg,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      display: 'flex',
      alignItems: 'center',
      gap: spacing[2],
      border: '1px solid',
      transition: transitions.normal,
    };

    if (isLoading || isUpdating) {
      return {
        ...baseStyles,
        backgroundColor: colors.neutral[100],
        borderColor: colors.neutral[300],
        color: colors.neutral[600],
      };
    }

    if (isEnabled) {
      return {
        ...baseStyles,
        backgroundColor: colors.success[50],
        borderColor: colors.success[200],
        color: colors.success[800],
      };
    }

    return {
      ...baseStyles,
      backgroundColor: colors.neutral[100],
      borderColor: colors.neutral[300],
      color: colors.neutral[600],
    };
  };

  if (isLoading) {
    return (
      <div style={{
        padding: spacing[4],
        textAlign: 'center',
        fontFamily: typography.fontFamily.system
      }}>
        <div style={{
          fontSize: typography.fontSize.sm,
          color: colors.neutral[500],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing[2]
        }}>
          <div style={{
            width: '16px',
            height: '16px',
            border: `2px solid ${colors.neutral[300]}`,
            borderTop: `2px solid ${colors.primary[600]}`,
            borderRadius: borderRadius.full,
            animation: 'spin 1s linear infinite'
          }} />
          Loading autofill status...
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: spacing[4],
      fontFamily: typography.fontFamily.system
    }}>
      {/* Header with help toggle */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing[4]
      }}>
        <h3 style={{
          margin: 0,
          fontSize: typography.fontSize.base,
          fontWeight: typography.fontWeight.semibold,
          color: colors.neutral[900]
        }}>
          Autofill Control
        </h3>

        <button
          onClick={() => setShowHelp(!showHelp)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: spacing[1],
            borderRadius: borderRadius.base,
            color: colors.neutral[500],
            fontSize: typography.fontSize.sm,
            transition: transitions.fast,
          }}
          title="Toggle help information"
        >
          {showHelp ? '✕' : '?'}
        </button>
      </div>

      {/* Main Toggle Card */}
      <div style={{
        backgroundColor: colors.neutral[50],
        border: `1px solid ${colors.neutral[200]}`,
        borderRadius: borderRadius.lg,
        padding: spacing[4],
        boxShadow: shadows.sm,
        transition: transitions.normal,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: spacing[3]
        }}>
          <div style={{ flex: 1 }}>
            {/* Status Text */}
            <div style={{
              fontSize: typography.fontSize.base,
              fontWeight: typography.fontWeight.semibold,
              color: isLoading || isUpdating
                ? colors.neutral[600]
                : isEnabled
                  ? colors.success[700]
                  : colors.neutral[700],
              marginBottom: spacing[1],
              display: 'flex',
              alignItems: 'center',
              gap: spacing[2]
            }}>
              {isLoading && (
                <div style={{
                  width: '14px',
                  height: '14px',
                  border: `2px solid ${colors.neutral[300]}`,
                  borderTop: `2px solid ${colors.primary[600]}`,
                  borderRadius: borderRadius.full,
                  animation: 'spin 1s linear infinite'
                }} />
              )}
              {isUpdating && (
                <div style={{
                  width: '14px',
                  height: '14px',
                  border: `2px solid ${colors.neutral[300]}`,
                  borderTop: `2px solid ${colors.warning[600]}`,
                  borderRadius: borderRadius.full,
                  animation: 'spin 1s linear infinite'
                }} />
              )}
              {isLoading
                ? 'Loading...'
                : isUpdating
                  ? 'Updating...'
                  : isEnabled
                    ? 'Autofill is ON'
                    : 'Autofill is OFF'
              }
            </div>

            {/* Description */}
            <div style={{
              fontSize: typography.fontSize.sm,
              color: colors.neutral[600],
              lineHeight: typography.lineHeight.normal
            }}>
              {isEnabled
                ? 'Extension will automatically fill job application forms'
                : 'Extension will not fill forms automatically'
              }
            </div>

            {/* CV Upload Status */}
            {isEnabled && (
              <div style={{
                fontSize: typography.fontSize.xs,
                color: colors.neutral[500],
                marginTop: spacing[2],
                display: 'flex',
                alignItems: 'center',
                gap: spacing[1]
              }}>
                {cvData ? (
                  <>
                    <span style={{ color: colors.success[600] }}>📄</span>
                    <span style={{ color: colors.success[700] }}>
                      CV auto-upload enabled ({cvData.fileName})
                    </span>
                  </>
                ) : (
                  <>
                    <span style={{ color: colors.warning[600] }}>⚠️</span>
                    <span style={{ color: colors.warning[700] }}>
                      CV auto-upload disabled (no CV uploaded)
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Enhanced Toggle Switch */}
          <div
            onClick={handleToggle}
            style={getToggleStyles()}
            role="switch"
            aria-checked={isEnabled}
            aria-label={`Autofill is ${isEnabled ? 'enabled' : 'disabled'}`}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleToggle();
              }
            }}
          >
            {/* Toggle Knob with Icon */}
            <div style={getKnobStyles()}>
              {isLoading || isUpdating ? (
                <div style={{
                  width: '12px',
                  height: '12px',
                  border: `1px solid ${colors.neutral[400]}`,
                  borderTop: `1px solid ${colors.primary[600]}`,
                  borderRadius: borderRadius.full,
                  animation: 'spin 1s linear infinite'
                }} />
              ) : (
                <span style={{
                  fontSize: '12px',
                  color: isEnabled ? colors.success[600] : colors.neutral[400]
                }}>
                  {isEnabled ? '✓' : '✕'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Indicator */}
      <div style={{
        ...getStatusIndicatorStyles(),
        marginTop: spacing[3]
      }}>
        <span>
          {isLoading || isUpdating
            ? '⏳'
            : isEnabled
              ? '✅'
              : '⏸️'
          }
        </span>
        <span>
          {isLoading
            ? 'Loading autofill status...'
            : isUpdating
              ? 'Updating settings...'
              : isEnabled
                ? 'Ready to autofill forms on job sites'
                : 'Autofill is paused - forms will not be filled'
          }
        </span>
      </div>

      {/* Contextual Help Text */}
      {showHelp && (
        <div style={{
          marginTop: spacing[4],
          padding: spacing[4],
          backgroundColor: colors.primary[50],
          border: `1px solid ${colors.primary[200]}`,
          borderRadius: borderRadius.lg,
          fontSize: typography.fontSize.sm,
          color: colors.primary[800],
          lineHeight: typography.lineHeight.relaxed
        }}>
          <div style={{
            fontWeight: typography.fontWeight.semibold,
            marginBottom: spacing[2],
            display: 'flex',
            alignItems: 'center',
            gap: spacing[2]
          }}>
            <span>💡</span>
            How Autofill Works
          </div>
          <ul style={{
            margin: 0,
            paddingLeft: spacing[4],
            listStyle: 'disc'
          }}>
            <li>Scans job application pages for form fields</li>
            <li>Automatically fills detected fields with your profile data</li>
            <li>Uploads your CV to file upload fields when available</li>
            <li>Works across different job sites and application forms</li>
            <li>Can be toggled on/off anytime for full control</li>
          </ul>

          <div style={{
            marginTop: spacing[3],
            padding: spacing[2],
            backgroundColor: colors.primary[100],
            borderRadius: borderRadius.base,
            fontSize: typography.fontSize.xs,
            color: colors.primary[700]
          }}>
            <strong>Tip:</strong> Make sure your profile is complete and CV is uploaded for best results.
          </div>
        </div>
      )}

      {/* Manual Trigger Button */}
      {isEnabled && !isLoading && (
        <div style={{ marginTop: spacing[4] }}>
          <button
            onClick={async () => {
              setIsUpdating(true);
              
              // Show starting notification
              const startingNotificationId = addNotification(createAutofillNotifications.starting());
              
              try {
                const result = await messaging.triggerAutofill();
                
                // Remove starting notification
                removeNotification(startingNotificationId);
                
                if (result && result.success) {
                  const filledFields = result.data?.filled || 0;
                  const fileUploads = result.data?.fileUploadsCompleted || 0;
                  const fieldsDetected = result.data?.fieldsDetected || 0;
                  const fileFieldsDetected = result.data?.fileUploadsDetected || 0;
                  const errors = result.data?.errors || [];

                  // Show field detection notification first
                  if (fieldsDetected > 0 || fileFieldsDetected > 0) {
                    addNotification(createAutofillNotifications.fieldsDetected(fieldsDetected, fileFieldsDetected));
                  }

                  // Show completion notification
                  if (errors.length === 0) {
                    addNotification(createAutofillNotifications.success(filledFields, fileUploads));
                  } else if (filledFields > 0) {
                    addNotification(createAutofillNotifications.partialSuccess(filledFields, fieldsDetected + fileFieldsDetected, errors));
                  } else {
                    addNotification(createAutofillNotifications.error(errors.join(', ')));
                  }
                } else {
                  throw new Error(result?.error || 'Autofill failed');
                }
              } catch (error) {
                // Remove starting notification
                removeNotification(startingNotificationId);
                
                console.error('Error triggering autofill:', error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

                let userFriendlyMessage = '';
                if (errorMessage.includes('No web page tabs found')) {
                  userFriendlyMessage = 'Please open a job application website in a new tab and try again.';
                } else if (errorMessage.includes('Cannot autofill on this page')) {
                  userFriendlyMessage = 'Cannot autofill on this page. Please navigate to a job application website.';
                } else if (errorMessage.includes('No user profile found')) {
                  userFriendlyMessage = 'Please complete your profile first in the Profile tab.';
                } else {
                  userFriendlyMessage = 'Make sure you are on a job application page and try again.';
                }

                addNotification(createAutofillNotifications.error(userFriendlyMessage));
              } finally {
                setIsUpdating(false);
              }
            }}
            disabled={isUpdating}
            style={{
              width: '100%',
              padding: `${spacing[3]} ${spacing[4]}`,
              backgroundColor: isUpdating ? colors.neutral[400] : colors.primary[600],
              color: colors.neutral[50],
              border: 'none',
              borderRadius: borderRadius.lg,
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              cursor: isUpdating ? 'not-allowed' : 'pointer',
              transition: transitions.normal,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing[2],
              boxShadow: shadows.sm,
            }}
          >
            {isUpdating ? (
              <>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: `2px solid ${colors.neutral[300]}`,
                  borderTop: `2px solid ${colors.neutral[50]}`,
                  borderRadius: borderRadius.full,
                  animation: 'spin 1s linear infinite'
                }} />
                Filling Forms...
              </>
            ) : (
              <>
                🚀 Fill Current Page
              </>
            )}
          </button>

          <div style={{
            fontSize: typography.fontSize.xs,
            color: colors.neutral[500],
            textAlign: 'center',
            marginTop: spacing[2],
            lineHeight: typography.lineHeight.normal
          }}>
            Fills forms and uploads CV on the active web page tab
          </div>
        </div>
      )}
    </div>
  );
};