import React from 'react';
import { Notification } from './Notification';
import { useNotifications } from '../contexts/NotificationContext';
import { spacing, zIndex } from '../../shared/design-system';

export const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotifications();

  if (notifications.length === 0) {
    return null;
  }

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    top: spacing[4],
    right: spacing[4],
    zIndex: zIndex.notification,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: spacing[2],
    pointerEvents: 'none', // Allow clicks to pass through empty areas
  };

  const notificationWrapperStyle: React.CSSProperties = {
    pointerEvents: 'auto', // Re-enable pointer events for notifications
  };

  return (
    <div style={containerStyle} aria-live="polite" aria-label="Notifications">
      {notifications.map((notification) => (
        <div key={notification.id} style={notificationWrapperStyle}>
          <Notification
            notification={notification}
            onDismiss={removeNotification}
          />
        </div>
      ))}
    </div>
  );
};