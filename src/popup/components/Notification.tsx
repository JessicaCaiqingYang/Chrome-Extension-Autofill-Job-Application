import React, { useEffect, useState } from 'react';
import { NotificationItem } from '../../shared/types';
import { 
  colors, 
  typography, 
  spacing, 
  borderRadius, 
  shadows, 
  transitions,
  zIndex 
} from '../../shared/design-system';

interface NotificationProps {
  notification: NotificationItem;
  onDismiss: (id: string) => void;
}

export const Notification: React.FC<NotificationProps> = ({ notification, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // Animation states
  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(notification.id);
    }, 200); // Match exit animation duration
  };

  // Get colors based on notification type
  const getTypeColors = (type: NotificationItem['type']) => {
    switch (type) {
      case 'success':
        return {
          background: colors.success[50],
          border: colors.success[200],
          icon: colors.success[600],
          text: colors.success[800],
        };
      case 'error':
        return {
          background: colors.error[50],
          border: colors.error[200],
          icon: colors.error[600],
          text: colors.error[800],
        };
      case 'warning':
        return {
          background: colors.warning[50],
          border: colors.warning[200],
          icon: colors.warning[600],
          text: colors.warning[800],
        };
      case 'info':
      default:
        return {
          background: colors.primary[50],
          border: colors.primary[200],
          icon: colors.primary[600],
          text: colors.primary[800],
        };
    }
  };

  // Get icon based on notification type
  const getTypeIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
      default:
        return 'ℹ';
    }
  };

  const typeColors = getTypeColors(notification.type);
  const typeIcon = getTypeIcon(notification.type);

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: spacing[3],
    padding: spacing[4],
    backgroundColor: typeColors.background,
    border: `1px solid ${typeColors.border}`,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.md,
    marginBottom: spacing[2],
    position: 'relative',
    minWidth: '300px',
    maxWidth: '400px',
    transform: isExiting 
      ? 'translateX(100%) scale(0.95)' 
      : isVisible 
        ? 'translateX(0) scale(1)' 
        : 'translateX(100%) scale(0.95)',
    opacity: isExiting ? 0 : isVisible ? 1 : 0,
    transition: `all ${transitions.normal}`,
    zIndex: zIndex.notification,
  };

  const iconStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '20px',
    height: '20px',
    borderRadius: borderRadius.full,
    backgroundColor: typeColors.icon,
    color: 'white',
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    flexShrink: 0,
    marginTop: '2px',
  };

  const contentStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: typeColors.text,
    margin: 0,
    marginBottom: notification.message ? spacing[1] : 0,
    lineHeight: typography.lineHeight.tight,
  };

  const messageStyle: React.CSSProperties = {
    fontSize: typography.fontSize.xs,
    color: typeColors.text,
    margin: 0,
    lineHeight: typography.lineHeight.normal,
    opacity: 0.8,
  };

  const actionsStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: notification.message ? spacing[2] : spacing[1],
  };

  const actionButtonStyle: React.CSSProperties = {
    padding: `${spacing[1]} ${spacing[2]}`,
    backgroundColor: typeColors.icon,
    color: 'white',
    border: 'none',
    borderRadius: borderRadius.sm,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    cursor: 'pointer',
    transition: transitions.fast,
  };

  const dismissButtonStyle: React.CSSProperties = {
    position: 'absolute',
    top: spacing[2],
    right: spacing[2],
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: borderRadius.sm,
    color: typeColors.text,
    cursor: 'pointer',
    fontSize: typography.fontSize.xs,
    opacity: 0.6,
    transition: transitions.fast,
  };

  return (
    <div style={containerStyle} role="alert" aria-live="polite">
      {/* Type Icon */}
      <div style={iconStyle} aria-hidden="true">
        {typeIcon}
      </div>

      {/* Content */}
      <div style={contentStyle}>
        <h4 style={titleStyle}>{notification.title}</h4>
        {notification.message && (
          <p style={messageStyle}>{notification.message}</p>
        )}

        {/* Actions */}
        {notification.action && (
          <div style={actionsStyle}>
            <button
              style={actionButtonStyle}
              onClick={notification.action.onClick}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.9';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {notification.action.label}
            </button>
          </div>
        )}
      </div>

      {/* Dismiss Button */}
      <button
        style={dismissButtonStyle}
        onClick={handleDismiss}
        aria-label="Dismiss notification"
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '1';
          e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '0.6';
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        ×
      </button>
    </div>
  );
};