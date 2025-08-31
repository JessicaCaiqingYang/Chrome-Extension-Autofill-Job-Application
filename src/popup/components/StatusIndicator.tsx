import React, { useState, useEffect, useCallback } from 'react';
import { messaging } from '../../shared/messaging';
import { MessageType, ExtensionStatus, ActivityLogEntry, SessionStats } from '../../shared/types';
import { useNotificationHelpers } from '../hooks/useNotificationHelpers';
import { 
  colors, 
  spacing, 
  borderRadius, 
  typography 
} from '../../shared/design-tokens';
import { 
  cardStyles, 
  textStyles, 
  buttonStyles, 
  layoutStyles, 
  mergeStyles 
} from '../../shared/styled-utils';

interface StatusIndicatorProps {
  className?: string;
  style?: React.CSSProperties;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ className, style }) => {
  const [status, setStatus] = useState<ExtensionStatus>({
    isReady: false,
    hasProfile: false,
    hasCV: false,
    autofillEnabled: true,
    errors: [],
    warnings: [],
    sessionStats: {
      formsDetected: 0,
      fieldsFilled: 0,
      successRate: 0,
      lastSession: 0,
      totalSessions: 0,
      averageFieldsPerForm: 0
    },
    recentActivity: [],
    healthStatus: 'healthy'
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  
  // Notification helpers
  const {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showAutofillSuccess
  } = useNotificationHelpers();

  // Load initial status
  useEffect(() => {
    loadStatus();

    // Set up message listener for real-time updates
    const messageListener = (message: any, _sender: any, sendResponse: any) => {
      if (message.type === MessageType.AUTOFILL_COMPLETE) {
        handleAutofillComplete(message.payload);
        sendResponse({ success: true });
      } else if (message.type === MessageType.ERROR) {
        handleError(message.payload);
        sendResponse({ success: true });
      }
      return true; // Keep message channel open
    };

    // Add message listener
    chrome.runtime.onMessage.addListener(messageListener);

    // Refresh status every 15 seconds for real-time updates
    const interval = setInterval(loadStatus, 15000);

    return () => {
      clearInterval(interval);
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  const loadStatus = useCallback(async () => {
    if (isRefreshing) return;
    
    try {
      setIsRefreshing(true);
      
      const [profile, cvData, sessionData, activityData] = await Promise.all([
        messaging.getUserProfile().catch(() => null),
        messaging.getCVData().catch(() => null),
        getSessionStats().catch(() => getDefaultSessionStats()),
        getRecentActivity().catch(() => [])
      ]);

      const defaultProfile = {
        personalInfo: { firstName: '', lastName: '', email: '', phone: '', address: {} },
        workInfo: {},
        preferences: {}
      };
      const mergedProfile = profile
        ? { ...defaultProfile, ...profile, personalInfo: { ...defaultProfile.personalInfo, ...(profile.personalInfo || {}) } }
        : null;

      const hasCompleteProfile = !!(mergedProfile && mergedProfile.personalInfo && mergedProfile.personalInfo.firstName && mergedProfile.personalInfo.email);
      const hasCVData = !!(cvData && cvData.fileName);
      const isAutofillEnabled = mergedProfile?.preferences?.autofillEnabled ?? true;

      const newStatus: ExtensionStatus = {
        isReady: true,
        hasProfile: hasCompleteProfile,
        hasCV: hasCVData,
        autofillEnabled: isAutofillEnabled,
        lastActivity: mergedProfile?.preferences?.lastUpdated ? new Date(mergedProfile.preferences.lastUpdated).toLocaleTimeString() : undefined,
        errors: [],
        warnings: [],
        sessionStats: sessionData,
        recentActivity: activityData,
        healthStatus: determineHealthStatus(hasCompleteProfile, isAutofillEnabled, sessionData)
      };

      // Add warnings based on status
      if (!newStatus.hasProfile) {
        newStatus.warnings.push('Profile information is incomplete');
      }

      if (!newStatus.hasCV) {
        newStatus.warnings.push('No CV uploaded');
      }

      if (!newStatus.autofillEnabled) {
        newStatus.warnings.push('Autofill is disabled');
      }

      // Check current page context
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]?.url) {
          const url = new URL(tabs[0].url);
          newStatus.currentPage = url.hostname;
        }
      } catch (error) {
        // Ignore tab query errors
      }

      setStatus(newStatus);
      setLastUpdate(Date.now());
    } catch (error) {
      console.error('Error loading status:', error);
      setStatus(prev => ({
        ...prev,
        isReady: false,
        errors: ['Error loading extension status'],
        healthStatus: 'error'
      }));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  // Helper functions for enhanced tracking
  const getDefaultSessionStats = (): SessionStats => ({
    formsDetected: 0,
    fieldsFilled: 0,
    successRate: 0,
    lastSession: 0,
    totalSessions: 0,
    averageFieldsPerForm: 0
  });

  const getSessionStats = async (): Promise<SessionStats> => {
    try {
      const result = await chrome.storage.local.get('sessionStats');
      return result.sessionStats || getDefaultSessionStats();
    } catch (error) {
      console.error('Error getting session stats:', error);
      return getDefaultSessionStats();
    }
  };

  const updateSessionStats = async (update: Partial<SessionStats>): Promise<void> => {
    try {
      const current = await getSessionStats();
      const updated = { ...current, ...update };
      await chrome.storage.local.set({ sessionStats: updated });
    } catch (error) {
      console.error('Error updating session stats:', error);
    }
  };

  const getRecentActivity = async (): Promise<ActivityLogEntry[]> => {
    try {
      const result = await chrome.storage.local.get('recentActivity');
      const activities = result.recentActivity || [];
      // Return only the last 10 activities
      return activities.slice(-10);
    } catch (error) {
      console.error('Error getting recent activity:', error);
      return [];
    }
  };

  const addActivityEntry = async (entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>): Promise<void> => {
    try {
      const activities = await getRecentActivity();
      const newEntry: ActivityLogEntry = {
        ...entry,
        id: Date.now().toString(),
        timestamp: Date.now()
      };
      
      const updatedActivities = [...activities, newEntry].slice(-20); // Keep last 20 entries
      await chrome.storage.local.set({ recentActivity: updatedActivities });
    } catch (error) {
      console.error('Error adding activity entry:', error);
    }
  };

  const determineHealthStatus = (hasProfile: boolean, autofillEnabled: boolean, sessionStats: SessionStats): 'healthy' | 'warning' | 'error' => {
    if (!hasProfile) return 'error';
    if (!autofillEnabled || sessionStats.successRate < 0.5) return 'warning';
    return 'healthy';
  };

  const handleAutofillComplete = async (payload: any) => {
    const fieldsCount = payload.fieldsCount || 0;
    const success = !payload.errors || payload.errors.length === 0;
    
    // Update session stats
    const currentStats = await getSessionStats();
    await updateSessionStats({
      fieldsFilled: currentStats.fieldsFilled + fieldsCount,
      totalSessions: currentStats.totalSessions + 1,
      successRate: success ? Math.min(1, currentStats.successRate + 0.1) : Math.max(0, currentStats.successRate - 0.1),
      lastSession: Date.now(),
      averageFieldsPerForm: (currentStats.fieldsFilled + fieldsCount) / (currentStats.totalSessions + 1)
    });

    // Add activity entry
    await addActivityEntry({
      action: 'autofill_completed',
      details: `Filled ${fieldsCount} fields`,
      fieldsCount,
      success,
      url: status.currentPage
    });

    setStatus(prev => ({
      ...prev,
      lastActivity: new Date().toLocaleTimeString(),
      errors: payload.errors || [],
      warnings: payload.warnings || []
    }));
    setLastUpdate(Date.now());
    
    // Show notification for autofill completion
    if (payload.fieldsCount) {
      showAutofillSuccess(payload.fieldsCount);
    } else {
      showSuccess('Autofill Complete', 'Form fields have been filled successfully');
    }
    
    // Reload status to get updated stats
    setTimeout(loadStatus, 1000);
  };

  const handleError = async (payload: any) => {
    const errorMessage = payload.error || 'Unknown error occurred';
    
    // Add activity entry for error
    await addActivityEntry({
      action: 'error_occurred',
      details: errorMessage,
      success: false,
      errorMessage,
      url: status.currentPage
    });
    
    setStatus(prev => ({
      ...prev,
      errors: [...prev.errors, errorMessage],
      healthStatus: 'error'
    }));
    setLastUpdate(Date.now());
    
    // Show notification for errors
    showError('Extension Error', errorMessage);
    
    // Reload status to get updated activity
    setTimeout(loadStatus, 1000);
  };

  const clearErrors = () => {
    setStatus(prev => ({
      ...prev,
      errors: []
    }));
  };

  const clearWarnings = () => {
    setStatus(prev => ({
      ...prev,
      warnings: []
    }));
  };

  const getHealthStatusColor = (healthStatus: 'healthy' | 'warning' | 'error'): string => {
    switch (healthStatus) {
      case 'healthy': return colors.success[600];
      case 'warning': return colors.warning[600];
      case 'error': return colors.error[600];
      default: return colors.neutral[400];
    }
  };

  const getHealthStatusIcon = (healthStatus: 'healthy' | 'warning' | 'error'): string => {
    switch (healthStatus) {
      case 'healthy': return '●';
      case 'warning': return '●';
      case 'error': return '●';
      default: return '●';
    }
  };

  const getOverallStatus = (): { text: string; color: string; icon: string } => {
    if (isLoading) {
      return { text: 'Loading...', color: colors.neutral[400], icon: '⏳' };
    }

    if (!status.isReady) {
      return { text: 'Not Ready', color: colors.error[600], icon: '❌' };
    }

    if (status.errors.length > 0) {
      return { text: 'Error', color: colors.error[600], icon: '⚠️' };
    }

    if (!status.hasProfile || !status.autofillEnabled) {
      return { text: 'Setup Required', color: colors.warning[600], icon: '⚙️' };
    }

    if (status.warnings.length > 0) {
      return { text: 'Ready (with warnings)', color: colors.warning[600], icon: '⚠️' };
    }

    return { text: 'Ready', color: colors.success[600], icon: '✅' };
  };

  const formatTimestamp = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const getActionIcon = (action: string): string => {
    switch (action) {
      case 'form_detected': return '🔍';
      case 'autofill_started': return '▶️';
      case 'autofill_completed': return '✅';
      case 'error_occurred': return '❌';
      case 'profile_updated': return '👤';
      case 'cv_uploaded': return '📄';
      default: return '📝';
    }
  };

  const overallStatus = getOverallStatus();

  return (
    <div className={className} style={{ padding: spacing[4], ...style }}>
      <h3 style={mergeStyles(textStyles.heading1, { marginBottom: spacing[4] })}>
        Extension Status
      </h3>

      {/* Health Status Card */}
      <div style={mergeStyles(cardStyles.base, { marginBottom: spacing[4] })}>
        <div style={layoutStyles.flexBetween}>
          <div style={layoutStyles.flexRow}>
            <div style={{ 
              fontSize: '20px', 
              marginRight: spacing[3],
              color: getHealthStatusColor(status.healthStatus)
            }}>
              {getHealthStatusIcon(status.healthStatus)}
            </div>
            <div>
              <div style={mergeStyles(textStyles.body, { 
                color: overallStatus.color,
                fontWeight: typography.fontWeight.semibold,
                marginBottom: spacing[1]
              })}>
                {overallStatus.text}
              </div>
              <div style={textStyles.caption}>
                Last updated: {new Date(lastUpdate).toLocaleTimeString()}
              </div>
            </div>
          </div>
          <button
            onClick={loadStatus}
            disabled={isRefreshing}
            style={mergeStyles(buttonStyles.base, buttonStyles.secondary, {
              padding: `${spacing[1]} ${spacing[3]}`,
              fontSize: typography.fontSize.xs,
              opacity: isRefreshing ? 0.6 : 1
            })}
          >
            {isRefreshing ? '⏳' : '🔄'}
          </button>
        </div>
      </div>

      {/* Session Statistics Card */}
      <div style={mergeStyles(cardStyles.base, { marginBottom: spacing[4] })}>
        <h4 style={mergeStyles(textStyles.heading2, { marginBottom: spacing[3] })}>
          Session Statistics
        </h4>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: spacing[3] 
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={mergeStyles(textStyles.heading1, { 
              color: colors.primary[600],
              fontSize: typography.fontSize.lg 
            })}>
              {status.sessionStats.fieldsFilled}
            </div>
            <div style={textStyles.caption}>Fields Filled</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={mergeStyles(textStyles.heading1, { 
              color: colors.success[600],
              fontSize: typography.fontSize.lg 
            })}>
              {Math.round(status.sessionStats.successRate * 100)}%
            </div>
            <div style={textStyles.caption}>Success Rate</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={mergeStyles(textStyles.heading1, { 
              color: colors.warning[600],
              fontSize: typography.fontSize.lg 
            })}>
              {status.sessionStats.totalSessions}
            </div>
            <div style={textStyles.caption}>Total Sessions</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={mergeStyles(textStyles.heading1, { 
              color: colors.neutral[600],
              fontSize: typography.fontSize.lg 
            })}>
              {Math.round(status.sessionStats.averageFieldsPerForm)}
            </div>
            <div style={textStyles.caption}>Avg Fields/Form</div>
          </div>
        </div>
      </div>

      {/* Component Status Card */}
      <div style={mergeStyles(cardStyles.base, { marginBottom: spacing[4] })}>
        <h4 style={mergeStyles(textStyles.heading2, { marginBottom: spacing[3] })}>
          Component Status
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
          <div style={layoutStyles.flexRow}>
            <span style={{ 
              marginRight: spacing[2],
              fontSize: typography.fontSize.sm,
              color: status.hasProfile ? colors.success[600] : colors.error[600]
            }}>
              {status.hasProfile ? '●' : '●'}
            </span>
            <span style={textStyles.body}>
              Profile Data: {status.hasProfile ? 'Complete' : 'Missing or incomplete'}
            </span>
          </div>

          <div style={layoutStyles.flexRow}>
            <span style={{ 
              marginRight: spacing[2],
              fontSize: typography.fontSize.sm,
              color: status.hasCV ? colors.success[600] : colors.warning[600]
            }}>
              {status.hasCV ? '●' : '●'}
            </span>
            <span style={textStyles.body}>
              CV Upload: {status.hasCV ? 'Uploaded' : 'Not uploaded'}
            </span>
          </div>

          <div style={layoutStyles.flexRow}>
            <span style={{ 
              marginRight: spacing[2],
              fontSize: typography.fontSize.sm,
              color: status.autofillEnabled ? colors.success[600] : colors.neutral[400]
            }}>
              {status.autofillEnabled ? '●' : '●'}
            </span>
            <span style={textStyles.body}>
              Autofill: {status.autofillEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>

          {status.currentPage && (
            <div style={layoutStyles.flexRow}>
              <span style={{ marginRight: spacing[2] }}>🌐</span>
              <span style={textStyles.body}>Current page: {status.currentPage}</span>
            </div>
          )}

          {status.lastActivity && (
            <div style={layoutStyles.flexRow}>
              <span style={{ marginRight: spacing[2] }}>🕒</span>
              <span style={textStyles.body}>Last activity: {status.lastActivity}</span>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity Card */}
      <div style={mergeStyles(cardStyles.base, { marginBottom: spacing[4] })}>
        <h4 style={mergeStyles(textStyles.heading2, { marginBottom: spacing[3] })}>
          Recent Activity
        </h4>
        {status.recentActivity.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
            {status.recentActivity.slice(-5).reverse().map((activity) => (
              <div key={activity.id} style={layoutStyles.flexRow}>
                <span style={{ marginRight: spacing[2] }}>
                  {getActionIcon(activity.action)}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={textStyles.body}>{activity.details}</div>
                  <div style={textStyles.caption}>
                    {formatTimestamp(activity.timestamp)}
                    {activity.url && ` • ${activity.url}`}
                  </div>
                </div>
                {activity.success !== undefined && (
                  <span style={{ 
                    color: activity.success ? colors.success[600] : colors.error[600],
                    fontSize: typography.fontSize.xs
                  }}>
                    {activity.success ? '✓' : '✗'}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={mergeStyles(textStyles.caption, { 
            textAlign: 'center',
            padding: spacing[4],
            color: colors.neutral[400]
          })}>
            No recent activity
          </div>
        )}
      </div>

      {/* Errors */}
      {status.errors.length > 0 && (
        <div style={mergeStyles(cardStyles.base, { 
          marginBottom: spacing[4],
          borderColor: colors.error[300],
          backgroundColor: colors.error[50]
        })}>
          <div style={layoutStyles.flexBetween}>
            <h4 style={mergeStyles(textStyles.heading2, { 
              color: colors.error[700],
              marginBottom: spacing[3]
            })}>
              Errors ({status.errors.length})
            </h4>
            <button
              onClick={clearErrors}
              style={mergeStyles(buttonStyles.base, buttonStyles.danger, {
                padding: `${spacing[1]} ${spacing[2]}`,
                fontSize: typography.fontSize.xs
              })}
            >
              Clear
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
            {status.errors.map((error, index) => (
              <div key={index} style={mergeStyles(textStyles.body, {
                color: colors.error[700]
              })}>
                • {error}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {status.warnings.length > 0 && (
        <div style={mergeStyles(cardStyles.base, { 
          marginBottom: spacing[4],
          borderColor: colors.warning[300],
          backgroundColor: colors.warning[50]
        })}>
          <div style={layoutStyles.flexBetween}>
            <h4 style={mergeStyles(textStyles.heading2, { 
              color: colors.warning[700],
              marginBottom: spacing[3]
            })}>
              Warnings ({status.warnings.length})
            </h4>
            <button
              onClick={clearWarnings}
              style={mergeStyles(buttonStyles.base, {
                padding: `${spacing[1]} ${spacing[2]}`,
                fontSize: typography.fontSize.xs,
                backgroundColor: colors.warning[600],
                color: colors.neutral[50]
              })}
            >
              Clear
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
            {status.warnings.map((warning, index) => (
              <div key={index} style={mergeStyles(textStyles.body, {
                color: colors.warning[700]
              })}>
                • {warning}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {status.isReady && (
        <div style={mergeStyles(cardStyles.base, { marginBottom: spacing[4] })}>
          <h4 style={mergeStyles(textStyles.heading2, { marginBottom: spacing[3] })}>
            Quick Actions
          </h4>
          <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap' }}>
            {!status.hasProfile ? (
              <div style={mergeStyles(textStyles.caption, {
                padding: `${spacing[2]} ${spacing[3]}`,
                backgroundColor: colors.neutral[100],
                borderRadius: borderRadius.base,
                border: `1px solid ${colors.neutral[300]}`
              })}>
                Complete your profile first
              </div>
            ) : (
              <>
                {status.autofillEnabled && (
                  <button
                    onClick={async () => {
                      try {
                        setIsRefreshing(true);
                        const result = await messaging.triggerAutofill();
                        if (result && result.success) {
                          // Success is handled by the message listener
                        } else {
                          handleError({ error: result?.error || 'Failed to trigger autofill' });
                        }
                      } catch (error) {
                        handleError({ error: 'Failed to trigger autofill' });
                      } finally {
                        setIsRefreshing(false);
                      }
                    }}
                    disabled={isRefreshing}
                    style={mergeStyles(buttonStyles.base, buttonStyles.primary, {
                      fontSize: typography.fontSize.xs,
                      opacity: isRefreshing ? 0.6 : 1
                    })}
                  >
                    {isRefreshing ? '⏳ Filling...' : '🚀 Fill Current Page'}
                  </button>
                )}
                
                <button
                  onClick={loadStatus}
                  disabled={isRefreshing}
                  style={mergeStyles(buttonStyles.base, buttonStyles.secondary, {
                    fontSize: typography.fontSize.xs,
                    opacity: isRefreshing ? 0.6 : 1
                  })}
                >
                  🔄 Refresh Status
                </button>
                
                <button
                  onClick={() => {
                    clearErrors();
                    clearWarnings();
                  }}
                  style={mergeStyles(buttonStyles.base, buttonStyles.secondary, {
                    fontSize: typography.fontSize.xs
                  })}
                >
                  🧹 Clear Alerts
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Notification System Demo */}
      <div style={cardStyles.base}>
        <h4 style={mergeStyles(textStyles.heading2, { marginBottom: spacing[3] })}>
          Notification System
        </h4>
        <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap' }}>
          <button
            onClick={() => showSuccess('Success!', 'This is a success notification')}
            style={mergeStyles(buttonStyles.base, {
              fontSize: typography.fontSize.xs,
              backgroundColor: colors.success[600],
              color: colors.neutral[50]
            })}
          >
            Success
          </button>
          
          <button
            onClick={() => showError('Error!', 'This is an error notification')}
            style={mergeStyles(buttonStyles.base, buttonStyles.danger, {
              fontSize: typography.fontSize.xs
            })}
          >
            Error
          </button>
          
          <button
            onClick={() => showWarning('Warning!', 'This is a warning notification')}
            style={mergeStyles(buttonStyles.base, {
              fontSize: typography.fontSize.xs,
              backgroundColor: colors.warning[600],
              color: colors.neutral[50]
            })}
          >
            Warning
          </button>
          
          <button
            onClick={() => showInfo('Info', 'This is an info notification')}
            style={mergeStyles(buttonStyles.base, buttonStyles.primary, {
              fontSize: typography.fontSize.xs
            })}
          >
            Info
          </button>
          
          <button
            onClick={() => showAutofillSuccess(5)}
            style={mergeStyles(buttonStyles.base, {
              fontSize: typography.fontSize.xs,
              backgroundColor: colors.primary[700],
              color: colors.neutral[50]
            })}
          >
            Autofill Demo
          </button>
        </div>
      </div>
    </div>
  );
};