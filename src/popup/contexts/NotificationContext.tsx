import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { NotificationItem, NotificationContextType } from '../../shared/types';

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const timeoutRefs = useRef<Map<string, number>>(new Map());

  const addNotification = useCallback((
    notification: Omit<NotificationItem, 'id' | 'timestamp'>
  ): string => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Date.now();
    
    const newNotification: NotificationItem = {
      id,
      timestamp,
      duration: notification.duration || 5000, // Default 5 seconds
      ...notification,
    };

    setNotifications(prev => [...prev, newNotification]);

    // Set up auto-hide if enabled
    if (newNotification.autoHide) {
      const timeout = setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
      
      timeoutRefs.current.set(id, timeout);
    }

    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
    
    // Clear timeout if it exists
    const timeout = timeoutRefs.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutRefs.current.delete(id);
    }
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    
    // Clear all timeouts
    timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    timeoutRefs.current.clear();
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
      timeoutRefs.current.clear();
    };
  }, []);

  const contextValue: NotificationContextType = {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};