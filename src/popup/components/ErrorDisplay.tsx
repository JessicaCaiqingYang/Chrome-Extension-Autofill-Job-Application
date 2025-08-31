import React, { useState } from 'react';
import { ExtensionError, SEVERITY_CONFIG, CATEGORY_CONFIG } from '../../shared/errorTypes';
import { 
  colors, 
  spacing, 
  borderRadius, 
  typography, 
  transitions 
} from '../../shared/design-tokens';
import { 
  cardStyles, 
  textStyles, 
  buttonStyles, 
  layoutStyles, 
  mergeStyles 
} from '../../shared/styled-utils';

interface ErrorDisplayProps {
  error: ExtensionError;
  onResolve?: (errorId: string) => void;
  onExecuteRecovery?: (actionId: string, action?: () => void | Promise<void>) => void;
  showTechnicalDetails?: boolean;
  compact?: boolean;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onResolve,
  onExecuteRecovery,
  showTechnicalDetails = false,
  compact = false
}) => {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [isExecutingRecovery, setIsExecutingRecovery] = useState<string | null>(null);

  const severityConfig = SEVERITY_CONFIG[error.severity];
  const categoryConfig = CATEGORY_CONFIG[error.category];

  const handleRecoveryAction = async (actionId: string, action?: () => void | Promise<void>) => {
    if (isExecutingRecovery) return;

    setIsExecutingRecovery(actionId);
    
    try {
      if (action) {
        await action();
      }
      if (onExecuteRecovery) {
        await onExecuteRecovery(actionId, action);
      }
    } catch (error) {
      console.error('Recovery action failed:', error);
    } finally {
      setIsExecutingRecovery(null);
    }
  };

  const handleResolve = () => {
    if (onResolve) {
      onResolve(error.id);
    }
  };

  const formatTimestamp = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const containerStyle: React.CSSProperties = {
    ...cardStyles.base,
    borderColor: severityConfig.borderColor,
    backgroundColor: error.isResolved ? colors.neutral[50] : severityConfig.backgroundColor,
    marginBottom: spacing[3],
    opacity: error.isResolved ? 0.7 : 1,
    transition: transitions.normal
  };

  const headerStyle: React.CSSProperties = {
    ...layoutStyles.flexBetween,
    marginBottom: isExpanded ? spacing[3] : 0,
    cursor: compact ? 'pointer' : 'default'
  };

  const titleStyle: React.CSSProperties = {
    ...textStyles.body,
    fontWeight: typography.fontWeight.semibold,
    color: error.isResolved ? colors.neutral[600] : severityConfig.color,
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2]
  };

  const metaStyle: React.CSSProperties = {
    ...textStyles.caption,
    color: colors.neutral[500],
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2]
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div 
        style={headerStyle}
        onClick={compact ? () => setIsExpanded(!isExpanded) : undefined}
      >
        <div style={{ flex: 1 }}>
          <div style={titleStyle}>
            <span style={{ fontSize: '16px' }}>{severityConfig.icon}</span>
            <span>{error.userMessage}</span>
            {error.isResolved && (
              <span style={{ 
                fontSize: '14px', 
                color: colors.success[600],
                marginLeft: spacing[2]
              }}>
                ✓
              </span>
            )}
          </div>
          
          <div style={metaStyle}>
            <span>{categoryConfig.icon} {categoryConfig.name}</span>
            <span>•</span>
            <span>{formatTimestamp(error.timestamp)}</span>
            <span>•</span>
            <span style={{ 
              textTransform: 'capitalize',
              color: severityConfig.color,
              fontWeight: typography.fontWeight.medium
            }}>
              {error.severity}
            </span>
          </div>
        </div>

        {compact && (
          <button
            style={{
              background: 'none',
              border: 'none',
              color: colors.neutral[400],
              cursor: 'pointer',
              fontSize: '18px',
              padding: spacing[1],
              borderRadius: borderRadius.sm,
              transition: transitions.fast
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.neutral[100];
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            {isExpanded ? '−' : '+'}
          </button>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div>
          {/* Technical Details */}
          {showTechnicalDetails && error.technicalDetails && (
            <div style={{
              ...cardStyles.base,
              backgroundColor: colors.neutral[50],
              borderColor: colors.neutral[200],
              marginBottom: spacing[3],
              padding: spacing[3]
            }}>
              <div style={{
                ...textStyles.caption,
                fontWeight: typography.fontWeight.semibold,
                marginBottom: spacing[2],
                color: colors.neutral[700]
              }}>
                Technical Details:
              </div>
              <div style={{
                ...textStyles.caption,
                fontFamily: 'monospace',
                color: colors.neutral[600],
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {error.technicalDetails}
              </div>
            </div>
          )}

          {/* Context Information */}
          {error.context && (
            <div style={{
              ...cardStyles.base,
              backgroundColor: colors.neutral[50],
              borderColor: colors.neutral[100],
              marginBottom: spacing[3],
              padding: spacing[3]
            }}>
              <div style={{
                ...textStyles.caption,
                fontWeight: typography.fontWeight.semibold,
                marginBottom: spacing[2],
                color: colors.neutral[700]
              }}>
                Context:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
                {error.context.url && (
                  <div style={textStyles.caption}>
                    <strong>URL:</strong> {error.context.url}
                  </div>
                )}
                {error.context.component && (
                  <div style={textStyles.caption}>
                    <strong>Component:</strong> {error.context.component}
                  </div>
                )}
                {error.context.action && (
                  <div style={textStyles.caption}>
                    <strong>Action:</strong> {error.context.action}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recovery Actions */}
          {error.recoveryActions && error.recoveryActions.length > 0 && !error.isResolved && (
            <div style={{ marginBottom: spacing[3] }}>
              <div style={{
                ...textStyles.body,
                fontWeight: typography.fontWeight.semibold,
                marginBottom: spacing[2],
                color: colors.neutral[700]
              }}>
                Suggested Actions:
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
                {error.recoveryActions
                  .sort((a, b) => a.priority - b.priority)
                  .map((action) => (
                    <div key={action.id} style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: spacing[3],
                      padding: spacing[2],
                      backgroundColor: colors.neutral[50],
                      borderRadius: borderRadius.sm,
                      border: `1px solid ${colors.neutral[200]}`
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          ...textStyles.body,
                          fontWeight: typography.fontWeight.medium,
                          marginBottom: spacing[1],
                          color: colors.neutral[800]
                        }}>
                          {action.label}
                        </div>
                        <div style={{
                          ...textStyles.caption,
                          color: colors.neutral[600]
                        }}>
                          {action.description}
                        </div>
                      </div>

                      {action.type === 'button' && (
                        <button
                          onClick={() => handleRecoveryAction(action.id, action.action)}
                          disabled={isExecutingRecovery === action.id}
                          style={mergeStyles(buttonStyles.base, buttonStyles.primary, {
                            fontSize: typography.fontSize.xs,
                            padding: `${spacing[1]} ${spacing[2]}`,
                            opacity: isExecutingRecovery === action.id ? 0.6 : 1,
                            minWidth: '80px'
                          })}
                        >
                          {isExecutingRecovery === action.id ? '⏳' : action.label}
                        </button>
                      )}

                      {action.type === 'link' && action.url && (
                        <a
                          href={action.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={mergeStyles(buttonStyles.base, buttonStyles.secondary, {
                            fontSize: typography.fontSize.xs,
                            padding: `${spacing[1]} ${spacing[2]}`,
                            textDecoration: 'none',
                            display: 'inline-block'
                          })}
                        >
                          {action.label} ↗
                        </a>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Diagnostic Information */}
          {error.diagnosticInfo && (
            <div style={{ marginBottom: spacing[3] }}>
              <button
                onClick={() => setShowDiagnostics(!showDiagnostics)}
                style={mergeStyles(buttonStyles.base, buttonStyles.secondary, {
                  fontSize: typography.fontSize.xs,
                  padding: `${spacing[1]} ${spacing[2]}`,
                  marginBottom: showDiagnostics ? spacing[2] : 0
                })}
              >
                {showDiagnostics ? 'Hide' : 'Show'} Diagnostic Info
              </button>

              {showDiagnostics && (
                <div style={{
                  ...cardStyles.base,
                  backgroundColor: colors.neutral[50],
                  borderColor: colors.neutral[200],
                  padding: spacing[3]
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
                    {error.diagnosticInfo.extensionVersion && (
                      <div style={textStyles.caption}>
                        <strong>Extension Version:</strong> {error.diagnosticInfo.extensionVersion}
                      </div>
                    )}
                    {error.diagnosticInfo.browserVersion && (
                      <div style={textStyles.caption}>
                        <strong>Browser:</strong> {error.diagnosticInfo.browserVersion}
                      </div>
                    )}
                    {error.diagnosticInfo.storageUsage && (
                      <div style={textStyles.caption}>
                        <strong>Storage Usage:</strong> {Math.round(error.diagnosticInfo.storageUsage / 1024)} KB
                      </div>
                    )}
                    {error.diagnosticInfo.permissions && (
                      <div style={textStyles.caption}>
                        <strong>Permissions:</strong> {error.diagnosticInfo.permissions.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: spacing[2], justifyContent: 'flex-end' }}>
            {!error.isResolved && (
              <button
                onClick={handleResolve}
                style={mergeStyles(buttonStyles.base, {
                  fontSize: typography.fontSize.xs,
                  padding: `${spacing[1]} ${spacing[3]}`,
                  backgroundColor: colors.success[600],
                  color: colors.neutral[50]
                })}
              >
                Mark as Resolved
              </button>
            )}

            {error.isResolved && error.resolvedAt && (
              <div style={{
                ...textStyles.caption,
                color: colors.success[600],
                display: 'flex',
                alignItems: 'center',
                gap: spacing[1]
              }}>
                <span>✓</span>
                <span>Resolved {formatTimestamp(error.resolvedAt)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};