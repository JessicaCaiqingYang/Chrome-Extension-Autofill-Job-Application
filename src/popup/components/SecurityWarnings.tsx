import React, { useState, useEffect } from 'react';
import { 
  colors, 
  spacing, 
  typography 
} from '../../shared/design-tokens';
import { 
  cardStyles, 
  textStyles, 
  buttonStyles, 
  layoutStyles, 
  mergeStyles 
} from '../../shared/styled-utils';

interface SecurityWarning {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  impact: string;
  resolution: {
    steps: string[];
    autoFixAvailable?: boolean;
    onAutoFix?: () => Promise<void>;
  };
  dismissed?: boolean;
  timestamp: number;
}

interface SecurityWarningsProps {
  className?: string;
  style?: React.CSSProperties;
}

export const SecurityWarnings: React.FC<SecurityWarningsProps> = ({ 
  className, 
  style 
}) => {
  const [warnings, setWarnings] = useState<SecurityWarning[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedWarning, setExpandedWarning] = useState<string | null>(null);

  useEffect(() => {
    checkSecurityStatus();
  }, []);

  const checkSecurityStatus = async () => {
    setIsLoading(true);
    const detectedWarnings: SecurityWarning[] = [];

    try {
      // Check permissions
      const permissions = await chrome.permissions.getAll();
      
      if (!permissions.permissions?.includes('storage')) {
        detectedWarnings.push({
          id: 'missing-storage-permission',
          type: 'critical',
          title: 'Storage Permission Missing',
          description: 'The extension cannot save your profile data without storage permission.',
          impact: 'Profile data and CV uploads will not be saved between sessions.',
          resolution: {
            steps: [
              'Click on the extension icon in the toolbar',
              'Select "Manage extensions"',
              'Find "Job Application Autofill" and click "Details"',
              'Ensure "Allow access to file URLs" is enabled if needed'
            ],
            autoFixAvailable: true,
            onAutoFix: async () => {
              try {
                await chrome.permissions.request({ permissions: ['storage'] });
                await checkSecurityStatus();
              } catch (error) {
                console.error('Failed to request storage permission:', error);
              }
            }
          },
          timestamp: Date.now()
        });
      }

      if (!permissions.permissions?.includes('activeTab')) {
        detectedWarnings.push({
          id: 'missing-activetab-permission',
          type: 'warning',
          title: 'Active Tab Permission Missing',
          description: 'The extension cannot detect forms on the current page.',
          impact: 'Autofill functionality will not work on job application websites.',
          resolution: {
            steps: [
              'Reload the extension by disabling and re-enabling it',
              'Accept all permission requests when prompted',
              'If issues persist, reinstall the extension'
            ]
          },
          timestamp: Date.now()
        });
      }

      // Check storage quota
      try {
        const storageInfo = await chrome.storage.local.getBytesInUse();
        const quota = chrome.storage.local.QUOTA_BYTES;
        const usagePercentage = (storageInfo / quota) * 100;

        if (usagePercentage > 90) {
          detectedWarnings.push({
            id: 'storage-quota-warning',
            type: 'warning',
            title: 'Storage Almost Full',
            description: `Extension storage is ${usagePercentage.toFixed(1)}% full.`,
            impact: 'New data may not be saved if storage becomes full.',
            resolution: {
              steps: [
                'Remove old CV files if you have multiple versions',
                'Clear unused profile data',
                'Consider removing the extension and reinstalling if needed'
              ],
              autoFixAvailable: true,
              onAutoFix: async () => {
                if (confirm('This will clear all stored data. Are you sure?')) {
                  await chrome.storage.local.clear();
                  await checkSecurityStatus();
                }
              }
            },
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.error('Error checking storage quota:', error);
      }

      // Check for insecure contexts
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const currentTab = tabs[0];
        
        if (currentTab?.url?.startsWith('http://')) {
          detectedWarnings.push({
            id: 'insecure-context',
            type: 'warning',
            title: 'Insecure Website Detected',
            description: 'The current website uses HTTP instead of HTTPS.',
            impact: 'Data transmission may not be secure. Consider using HTTPS versions of job sites.',
            resolution: {
              steps: [
                'Look for HTTPS version of the current website',
                'Check if the website URL starts with "https://"',
                'Avoid entering sensitive information on HTTP sites',
                'Use reputable job boards that support HTTPS'
              ]
            },
            timestamp: Date.now()
          });
        }
      } catch (error) {
        // Ignore tab query errors
      }

      // Check extension context
      if (!chrome.runtime?.id) {
        detectedWarnings.push({
          id: 'extension-context-invalid',
          type: 'critical',
          title: 'Extension Context Invalid',
          description: 'The extension context has been invalidated.',
          impact: 'Extension functionality is completely disabled.',
          resolution: {
            steps: [
              'Reload the extension page',
              'Disable and re-enable the extension',
              'Restart Chrome browser',
              'Reinstall the extension if problems persist'
            ]
          },
          timestamp: Date.now()
        });
      }

      // Load dismissed warnings from storage
      try {
        const result = await chrome.storage.local.get('dismissedWarnings');
        const dismissedIds = result.dismissedWarnings || [];
        
        // Filter out dismissed warnings
        const activeWarnings = detectedWarnings.filter(warning => 
          !dismissedIds.includes(warning.id)
        );
        
        setWarnings(activeWarnings);
      } catch (error) {
        setWarnings(detectedWarnings);
      }

    } catch (error) {
      console.error('Error checking security status:', error);
      
      // Add a generic error warning
      detectedWarnings.push({
        id: 'security-check-failed',
        type: 'warning',
        title: 'Security Check Failed',
        description: 'Unable to perform complete security assessment.',
        impact: 'Some security issues may not be detected.',
        resolution: {
          steps: [
            'Try refreshing the extension',
            'Check browser console for errors',
            'Restart the browser if issues persist'
          ]
        },
        timestamp: Date.now()
      });
      
      setWarnings(detectedWarnings);
    } finally {
      setIsLoading(false);
    }
  };

  const dismissWarning = async (warningId: string) => {
    try {
      const result = await chrome.storage.local.get('dismissedWarnings');
      const dismissedIds = result.dismissedWarnings || [];
      
      if (!dismissedIds.includes(warningId)) {
        dismissedIds.push(warningId);
        await chrome.storage.local.set({ dismissedWarnings: dismissedIds });
      }
      
      setWarnings(prev => prev.filter(w => w.id !== warningId));
    } catch (error) {
      console.error('Error dismissing warning:', error);
    }
  };

  const getWarningIcon = (type: string): string => {
    switch (type) {
      case 'critical': return '🚨';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '⚠️';
    }
  };

  const getWarningColor = (type: string): string => {
    switch (type) {
      case 'critical': return colors.error[600];
      case 'warning': return colors.warning[600];
      case 'info': return colors.primary[600];
      default: return colors.warning[600];
    }
  };

  const getWarningBgColor = (type: string): string => {
    switch (type) {
      case 'critical': return colors.error[50];
      case 'warning': return colors.warning[50];
      case 'info': return colors.primary[50];
      default: return colors.warning[50];
    }
  };

  const getWarningBorderColor = (type: string): string => {
    switch (type) {
      case 'critical': return colors.error[300];
      case 'warning': return colors.warning[300];
      case 'info': return colors.primary[300];
      default: return colors.warning[300];
    }
  };

  if (isLoading) {
    return (
      <div className={className} style={{ padding: spacing[4], ...style }}>
        <div style={mergeStyles(textStyles.body, { textAlign: 'center' })}>
          Checking security status...
        </div>
      </div>
    );
  }

  if (warnings.length === 0) {
    return (
      <div className={className} style={{ padding: spacing[4], ...style }}>
        <div style={mergeStyles(cardStyles.base, { 
          backgroundColor: colors.success[50],
          borderColor: colors.success[300],
          textAlign: 'center'
        })}>
          <div style={layoutStyles.flexRow}>
            <span style={{ 
              marginRight: spacing[2],
              color: colors.success[600]
            }}>
              ✅
            </span>
            <div>
              <div style={mergeStyles(textStyles.body, { 
                color: colors.success[700],
                marginBottom: spacing[1]
              })}>
                No Security Issues Detected
              </div>
              <div style={mergeStyles(textStyles.caption, { color: colors.success[600] })}>
                Your extension is properly configured and secure
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={{ padding: spacing[4], ...style }}>
      <div style={layoutStyles.flexBetween}>
        <h3 style={mergeStyles(textStyles.heading1, { marginBottom: spacing[4] })}>
          Security Warnings ({warnings.length})
        </h3>
        <button
          onClick={checkSecurityStatus}
          style={mergeStyles(buttonStyles.base, buttonStyles.secondary, {
            padding: `${spacing[1]} ${spacing[3]}`,
            fontSize: typography.fontSize.xs
          })}
        >
          🔄 Refresh
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
        {warnings.map((warning) => (
          <div
            key={warning.id}
            style={mergeStyles(cardStyles.base, {
              backgroundColor: getWarningBgColor(warning.type),
              borderColor: getWarningBorderColor(warning.type)
            })}
          >
            {/* Warning Header */}
            <div style={layoutStyles.flexBetween}>
              <div style={layoutStyles.flexRow}>
                <span style={{ 
                  marginRight: spacing[2],
                  color: getWarningColor(warning.type)
                }}>
                  {getWarningIcon(warning.type)}
                </span>
                <div>
                  <div style={mergeStyles(textStyles.body, { 
                    color: getWarningColor(warning.type),
                    fontWeight: typography.fontWeight.semibold,
                    marginBottom: spacing[1]
                  })}>
                    {warning.title}
                  </div>
                  <div style={mergeStyles(textStyles.caption, { 
                    color: getWarningColor(warning.type)
                  })}>
                    {warning.description}
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: spacing[1] }}>
                <button
                  onClick={() => setExpandedWarning(
                    expandedWarning === warning.id ? null : warning.id
                  )}
                  style={{
                    padding: spacing[1],
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: typography.fontSize.xs,
                    color: getWarningColor(warning.type)
                  }}
                >
                  {expandedWarning === warning.id ? '▼' : '▶'}
                </button>
                
                <button
                  onClick={() => dismissWarning(warning.id)}
                  style={{
                    padding: spacing[1],
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: typography.fontSize.xs,
                    color: getWarningColor(warning.type)
                  }}
                  title="Dismiss warning"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Expanded Details */}
            {expandedWarning === warning.id && (
              <div style={{ marginTop: spacing[3] }}>
                {/* Impact */}
                <div style={{ marginBottom: spacing[3] }}>
                  <div style={mergeStyles(textStyles.caption, { 
                    fontWeight: typography.fontWeight.semibold,
                    marginBottom: spacing[1],
                    color: getWarningColor(warning.type)
                  })}>
                    Impact:
                  </div>
                  <div style={mergeStyles(textStyles.caption, { 
                    color: getWarningColor(warning.type)
                  })}>
                    {warning.impact}
                  </div>
                </div>

                {/* Resolution Steps */}
                <div style={{ marginBottom: spacing[3] }}>
                  <div style={mergeStyles(textStyles.caption, { 
                    fontWeight: typography.fontWeight.semibold,
                    marginBottom: spacing[2],
                    color: getWarningColor(warning.type)
                  })}>
                    Resolution Steps:
                  </div>
                  <ol style={{ 
                    margin: 0, 
                    paddingLeft: spacing[4],
                    fontSize: typography.fontSize.xs,
                    lineHeight: 1.5,
                    color: getWarningColor(warning.type)
                  }}>
                    {warning.resolution.steps.map((step, index) => (
                      <li key={index} style={{ marginBottom: spacing[1] }}>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Auto-fix Button */}
                {warning.resolution.autoFixAvailable && warning.resolution.onAutoFix && (
                  <button
                    onClick={warning.resolution.onAutoFix}
                    style={mergeStyles(buttonStyles.base, {
                      fontSize: typography.fontSize.xs,
                      backgroundColor: getWarningColor(warning.type),
                      color: colors.neutral[50],
                      padding: `${spacing[2]} ${spacing[3]}`
                    })}
                  >
                    🔧 Auto-fix Issue
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};