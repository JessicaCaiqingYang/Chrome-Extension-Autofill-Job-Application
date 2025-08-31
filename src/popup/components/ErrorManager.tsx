import React, { useState, useEffect, useCallback } from 'react';
import { ErrorDisplay } from './ErrorDisplay';
import { errorHandler } from '../../shared/errorHandling';
import { ExtensionError, ErrorCategory, ErrorSeverity, SEVERITY_CONFIG } from '../../shared/errorTypes';
import { useNotifications } from '../contexts/NotificationContext';
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

interface ErrorManagerProps {
  className?: string;
  style?: React.CSSProperties;
  maxDisplayErrors?: number;
  showTechnicalDetails?: boolean;
  autoRefresh?: boolean;
}

export const ErrorManager: React.FC<ErrorManagerProps> = ({
  className,
  style,
  maxDisplayErrors = 10,
  showTechnicalDetails = false,
  autoRefresh = true
}) => {
  const [errors, setErrors] = useState<ExtensionError[]>([]);
  const [filteredErrors, setFilteredErrors] = useState<ExtensionError[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: 'all' as ErrorCategory | 'all',
    severity: 'all' as ErrorSeverity | 'all',
    resolved: 'all' as 'resolved' | 'unresolved' | 'all',
    timeRange: '24h' as '1h' | '24h' | '7d' | 'all'
  });
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<any>(null);

  const { addNotification } = useNotifications();

  // Load errors on component mount
  useEffect(() => {
    loadErrors();
    loadStats();

    // Set up error listener
    const handleNewError = (error: ExtensionError) => {
      setErrors(prev => [error, ...prev].slice(0, 100)); // Keep last 100 errors
      
      // Show notification for new errors
      if (!error.isResolved && error.severity !== ErrorSeverity.LOW) {
        addNotification({
          type: 'error',
          title: 'Extension Error',
          message: error.userMessage,
          autoHide: true,
          duration: 8000,
          action: {
            label: 'View Details',
            onClick: () => {
              // Scroll to error or expand error list
            }
          }
        });
      }
    };

    errorHandler.addErrorListener(handleNewError);

    // Auto-refresh if enabled
    let refreshInterval: number | undefined;
    if (autoRefresh) {
      refreshInterval = window.setInterval(() => {
        loadErrors();
        loadStats();
      }, 30000); // Refresh every 30 seconds
    }

    return () => {
      errorHandler.removeErrorListener(handleNewError);
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [autoRefresh, addNotification]);

  // Apply filters when errors or filters change
  useEffect(() => {
    applyFilters();
  }, [errors, filters]);

  const loadErrors = useCallback(async () => {
    try {
      setIsLoading(true);
      const allErrors = errorHandler.getErrors();
      setErrors(allErrors);
    } catch (error) {
      console.error('Failed to load errors:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const errorStats = errorHandler.getErrorStats();
      setStats(errorStats);
    } catch (error) {
      console.error('Failed to load error stats:', error);
    }
  }, []);

  const applyFilters = useCallback(() => {
    let filtered = [...errors];

    // Category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter(error => error.category === filters.category);
    }

    // Severity filter
    if (filters.severity !== 'all') {
      filtered = filtered.filter(error => error.severity === filters.severity);
    }

    // Resolved filter
    if (filters.resolved === 'resolved') {
      filtered = filtered.filter(error => error.isResolved);
    } else if (filters.resolved === 'unresolved') {
      filtered = filtered.filter(error => !error.isResolved);
    }

    // Time range filter
    if (filters.timeRange !== 'all') {
      const now = Date.now();
      let cutoffTime = 0;
      
      switch (filters.timeRange) {
        case '1h':
          cutoffTime = now - (60 * 60 * 1000);
          break;
        case '24h':
          cutoffTime = now - (24 * 60 * 60 * 1000);
          break;
        case '7d':
          cutoffTime = now - (7 * 24 * 60 * 60 * 1000);
          break;
      }
      
      filtered = filtered.filter(error => error.timestamp >= cutoffTime);
    }

    // Sort by timestamp (newest first) and severity
    filtered.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const aSeverity = severityOrder[a.severity] || 0;
      const bSeverity = severityOrder[b.severity] || 0;
      
      // First sort by resolved status (unresolved first)
      if (a.isResolved !== b.isResolved) {
        return a.isResolved ? 1 : -1;
      }
      
      // Then by severity
      if (aSeverity !== bSeverity) {
        return bSeverity - aSeverity;
      }
      
      // Finally by timestamp
      return b.timestamp - a.timestamp;
    });

    setFilteredErrors(filtered.slice(0, maxDisplayErrors));
  }, [errors, filters, maxDisplayErrors]);

  const handleResolveError = useCallback((errorId: string) => {
    errorHandler.resolveError(errorId);
    setErrors(prev => prev.map(error => 
      error.id === errorId 
        ? { ...error, isResolved: true, resolvedAt: Date.now() }
        : error
    ));
    
    addNotification({
      type: 'success',
      title: 'Error Resolved',
      message: 'The error has been marked as resolved.',
      autoHide: true,
      duration: 3000
    });
  }, [addNotification]);

  const handleExecuteRecovery = useCallback(async (_actionId: string, action?: () => void | Promise<void>) => {
    try {
      if (action) {
        await action();
      }
      
      addNotification({
        type: 'success',
        title: 'Recovery Action Executed',
        message: 'The recovery action has been completed.',
        autoHide: true,
        duration: 3000
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Recovery Action Failed',
        message: 'The recovery action could not be completed.',
        autoHide: true,
        duration: 5000
      });
    }
  }, [addNotification]);

  const handleClearOldErrors = useCallback(() => {
    const removedCount = errorHandler.clearOldErrors(7);
    loadErrors();
    loadStats();
    
    addNotification({
      type: 'success',
      title: 'Errors Cleared',
      message: `Removed ${removedCount} old resolved errors.`,
      autoHide: true,
      duration: 3000
    });
  }, [addNotification, loadErrors, loadStats]);

  // const getFilterLabel = (key: string, value: string): string => {
  //   switch (key) {
  //     case 'category':
  //       return value === 'all' ? 'All Categories' : value.charAt(0).toUpperCase() + value.slice(1);
  //     case 'severity':
  //       return value === 'all' ? 'All Severities' : value.charAt(0).toUpperCase() + value.slice(1);
  //     case 'resolved':
  //       return value === 'all' ? 'All Errors' : value.charAt(0).toUpperCase() + value.slice(1);
  //     case 'timeRange':
  //       switch (value) {
  //         case '1h': return 'Last Hour';
  //         case '24h': return 'Last 24 Hours';
  //         case '7d': return 'Last 7 Days';
  //         case 'all': return 'All Time';
  //         default: return value;
  //       }
  //     default:
  //       return value;
  //   }
  // };

  if (isLoading) {
    return (
      <div className={className} style={{ padding: spacing[4], ...style }}>
        <div style={{
          ...textStyles.body,
          textAlign: 'center',
          color: colors.neutral[500]
        }}>
          Loading errors...
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={{ padding: spacing[4], ...style }}>
      <div style={layoutStyles.flexBetween}>
        <h3 style={mergeStyles(textStyles.heading1, { marginBottom: spacing[4] })}>
          Error Management
        </h3>
        
        <div style={{ display: 'flex', gap: spacing[2] }}>
          <button
            onClick={() => setShowStats(!showStats)}
            style={mergeStyles(buttonStyles.base, buttonStyles.secondary, {
              fontSize: typography.fontSize.xs,
              padding: `${spacing[1]} ${spacing[2]}`
            })}
          >
            {showStats ? 'Hide' : 'Show'} Stats
          </button>
          
          <button
            onClick={loadErrors}
            style={mergeStyles(buttonStyles.base, buttonStyles.secondary, {
              fontSize: typography.fontSize.xs,
              padding: `${spacing[1]} ${spacing[2]}`
            })}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Error Statistics */}
      {showStats && stats && (
        <div style={mergeStyles(cardStyles.base, { marginBottom: spacing[4] })}>
          <h4 style={mergeStyles(textStyles.heading2, { marginBottom: spacing[3] })}>
            Error Statistics
          </h4>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
            gap: spacing[3],
            marginBottom: spacing[3]
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={mergeStyles(textStyles.heading1, { 
                color: colors.neutral[600],
                fontSize: typography.fontSize.lg 
              })}>
                {stats.total}
              </div>
              <div style={textStyles.caption}>Total Errors</div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={mergeStyles(textStyles.heading1, { 
                color: colors.error[600],
                fontSize: typography.fontSize.lg 
              })}>
                {stats.unresolved}
              </div>
              <div style={textStyles.caption}>Unresolved</div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={mergeStyles(textStyles.heading1, { 
                color: colors.success[600],
                fontSize: typography.fontSize.lg 
              })}>
                {stats.resolved}
              </div>
              <div style={textStyles.caption}>Resolved</div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={mergeStyles(textStyles.heading1, { 
                color: colors.warning[600],
                fontSize: typography.fontSize.lg 
              })}>
                {stats.recentErrors}
              </div>
              <div style={textStyles.caption}>Recent (24h)</div>
            </div>
          </div>

          {/* Severity Breakdown */}
          <div style={{ marginBottom: spacing[3] }}>
            <div style={mergeStyles(textStyles.body, { 
              fontWeight: typography.fontWeight.semibold,
              marginBottom: spacing[2]
            })}>
              By Severity:
            </div>
            <div style={{ display: 'flex', gap: spacing[3], flexWrap: 'wrap' }}>
              {Object.entries(stats.bySeverity).map(([severity, count]) => {
                const config = SEVERITY_CONFIG[severity as ErrorSeverity];
                return (
                  <div key={severity} style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                    <span style={{ color: config.color }}>{config.icon}</span>
                    <span style={textStyles.caption}>
                      {severity}: {String(count)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: spacing[2] }}>
            <button
              onClick={handleClearOldErrors}
              style={mergeStyles(buttonStyles.base, buttonStyles.secondary, {
                fontSize: typography.fontSize.xs,
                padding: `${spacing[1]} ${spacing[2]}`
              })}
            >
              Clear Old Errors
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={mergeStyles(cardStyles.base, { marginBottom: spacing[4] })}>
        <h4 style={mergeStyles(textStyles.heading2, { marginBottom: spacing[3] })}>
          Filters
        </h4>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
          gap: spacing[3] 
        }}>
          {/* Category Filter */}
          <div>
            <label style={mergeStyles(textStyles.caption, { 
              display: 'block',
              marginBottom: spacing[1],
              fontWeight: typography.fontWeight.medium
            })}>
              Category:
            </label>
            <select
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value as any }))}
              style={{
                width: '100%',
                padding: `${spacing[1]} ${spacing[2]}`,
                border: `1px solid ${colors.neutral[300]}`,
                borderRadius: borderRadius.sm,
                fontSize: typography.fontSize.sm,
                backgroundColor: colors.neutral[50]
              }}
            >
              <option value="all">All Categories</option>
              {Object.values(ErrorCategory).map(category => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Severity Filter */}
          <div>
            <label style={mergeStyles(textStyles.caption, { 
              display: 'block',
              marginBottom: spacing[1],
              fontWeight: typography.fontWeight.medium
            })}>
              Severity:
            </label>
            <select
              value={filters.severity}
              onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value as any }))}
              style={{
                width: '100%',
                padding: `${spacing[1]} ${spacing[2]}`,
                border: `1px solid ${colors.neutral[300]}`,
                borderRadius: borderRadius.sm,
                fontSize: typography.fontSize.sm,
                backgroundColor: colors.neutral[50]
              }}
            >
              <option value="all">All Severities</option>
              {Object.values(ErrorSeverity).map(severity => (
                <option key={severity} value={severity}>
                  {severity.charAt(0).toUpperCase() + severity.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Resolved Filter */}
          <div>
            <label style={mergeStyles(textStyles.caption, { 
              display: 'block',
              marginBottom: spacing[1],
              fontWeight: typography.fontWeight.medium
            })}>
              Status:
            </label>
            <select
              value={filters.resolved}
              onChange={(e) => setFilters(prev => ({ ...prev, resolved: e.target.value as any }))}
              style={{
                width: '100%',
                padding: `${spacing[1]} ${spacing[2]}`,
                border: `1px solid ${colors.neutral[300]}`,
                borderRadius: borderRadius.sm,
                fontSize: typography.fontSize.sm,
                backgroundColor: colors.neutral[50]
              }}
            >
              <option value="all">All Errors</option>
              <option value="unresolved">Unresolved</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          {/* Time Range Filter */}
          <div>
            <label style={mergeStyles(textStyles.caption, { 
              display: 'block',
              marginBottom: spacing[1],
              fontWeight: typography.fontWeight.medium
            })}>
              Time Range:
            </label>
            <select
              value={filters.timeRange}
              onChange={(e) => setFilters(prev => ({ ...prev, timeRange: e.target.value as any }))}
              style={{
                width: '100%',
                padding: `${spacing[1]} ${spacing[2]}`,
                border: `1px solid ${colors.neutral[300]}`,
                borderRadius: borderRadius.sm,
                fontSize: typography.fontSize.sm,
                backgroundColor: colors.neutral[50]
              }}
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error List */}
      <div>
        <div style={layoutStyles.flexBetween}>
          <h4 style={mergeStyles(textStyles.heading2, { marginBottom: spacing[3] })}>
            Errors ({filteredErrors.length})
          </h4>
          
          {filteredErrors.length > 0 && (
            <div style={textStyles.caption}>
              Showing {Math.min(filteredErrors.length, maxDisplayErrors)} of {filteredErrors.length}
            </div>
          )}
        </div>

        {filteredErrors.length === 0 ? (
          <div style={mergeStyles(cardStyles.base, {
            textAlign: 'center',
            padding: spacing[6],
            color: colors.neutral[500]
          })}>
            {errors.length === 0 ? (
              <div>
                <div style={{ fontSize: '48px', marginBottom: spacing[2] }}>✅</div>
                <div style={textStyles.body}>No errors found!</div>
                <div style={textStyles.caption}>The extension is running smoothly.</div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '48px', marginBottom: spacing[2] }}>🔍</div>
                <div style={textStyles.body}>No errors match the current filters.</div>
                <div style={textStyles.caption}>Try adjusting your filter settings.</div>
              </div>
            )}
          </div>
        ) : (
          <div>
            {filteredErrors.map((error) => (
              <ErrorDisplay
                key={error.id}
                error={error}
                onResolve={handleResolveError}
                onExecuteRecovery={handleExecuteRecovery}
                showTechnicalDetails={showTechnicalDetails}
                compact={true}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};