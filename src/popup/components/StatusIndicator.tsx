import React, { useState, useEffect } from 'react';
import { messaging } from '../../shared/messaging';
import { MessageType } from '../../shared/types';

interface StatusIndicatorProps {
  className?: string;
  style?: React.CSSProperties;
}

interface ExtensionStatus {
  isReady: boolean;
  hasProfile: boolean;
  hasCV: boolean;
  autofillEnabled: boolean;
  lastActivity?: string;
  currentPage?: string;
  errors: string[];
  warnings: string[];
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ className, style }) => {
  const [status, setStatus] = useState<ExtensionStatus>({
    isReady: false,
    hasProfile: false,
    hasCV: false,
    autofillEnabled: true,
    errors: [],
    warnings: []
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

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

    // Refresh status every 30 seconds
    const interval = setInterval(loadStatus, 30000);

    return () => {
      clearInterval(interval);
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  const loadStatus = async () => {
    try {
      const [profile, cvData] = await Promise.all([
        messaging.getUserProfile().catch(() => null),
        messaging.getCVData().catch(() => null)
      ]);

      const newStatus: ExtensionStatus = {
        isReady: true,
        hasProfile: !!(profile && profile.personalInfo && profile.personalInfo.firstName && profile.personalInfo.email),
        hasCV: !!(cvData && cvData.fileName),
        autofillEnabled: profile?.preferences?.autofillEnabled ?? true,
        lastActivity: profile?.preferences?.lastUpdated ? new Date(profile.preferences.lastUpdated).toLocaleTimeString() : undefined,
        errors: [],
        warnings: []
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
        errors: ['Error loading extension status']
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutofillComplete = (payload: any) => {
    setStatus(prev => ({
      ...prev,
      lastActivity: new Date().toLocaleTimeString(),
      errors: payload.errors || [],
      warnings: payload.warnings || []
    }));
    setLastUpdate(Date.now());
  };

  const handleError = (payload: any) => {
    setStatus(prev => ({
      ...prev,
      errors: [...prev.errors, payload.error || 'Unknown error occurred']
    }));
    setLastUpdate(Date.now());
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

  const getOverallStatus = (): { text: string; color: string; icon: string } => {
    if (isLoading) {
      return { text: 'Loading...', color: '#95a5a6', icon: '⏳' };
    }

    if (!status.isReady) {
      return { text: 'Not Ready', color: '#e74c3c', icon: '❌' };
    }

    if (status.errors.length > 0) {
      return { text: 'Error', color: '#e74c3c', icon: '⚠️' };
    }

    if (!status.hasProfile || !status.autofillEnabled) {
      return { text: 'Setup Required', color: '#f39c12', icon: '⚙️' };
    }

    if (status.warnings.length > 0) {
      return { text: 'Ready (with warnings)', color: '#f39c12', icon: '⚠️' };
    }

    return { text: 'Ready', color: '#27ae60', icon: '✅' };
  };

  const overallStatus = getOverallStatus();

  return (
    <div className={className} style={{ padding: '16px', ...style }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>Extension Status</h3>
      
      {/* Overall Status */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px',
          border: '1px solid #ddd',
          borderRadius: '8px',
          backgroundColor: '#f9f9f9',
          marginBottom: '16px'
        }}
      >
        <div style={{ fontSize: '20px', marginRight: '12px' }}>
          {overallStatus.icon}
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: '16px',
              fontWeight: '500',
              color: overallStatus.color,
              marginBottom: '2px'
            }}
          >
            {overallStatus.text}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            Last updated: {new Date(lastUpdate).toLocaleTimeString()}
          </div>
        </div>
        <button
          onClick={loadStatus}
          disabled={isLoading}
          style={{
            padding: '6px 12px',
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? '...' : '🔄'}
        </button>
      </div>

      {/* Detailed Status */}
      <div style={{ marginBottom: '16px' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Component Status</h4>
        
        <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ marginRight: '8px' }}>
              {status.hasProfile ? '✅' : '❌'}
            </span>
            <span>Profile Data: {status.hasProfile ? 'Complete' : 'Missing or incomplete'}</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ marginRight: '8px' }}>
              {status.hasCV ? '✅' : '⚠️'}
            </span>
            <span>CV Upload: {status.hasCV ? 'Uploaded' : 'Not uploaded'}</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ marginRight: '8px' }}>
              {status.autofillEnabled ? '✅' : '⏸️'}
            </span>
            <span>Autofill: {status.autofillEnabled ? 'Enabled' : 'Disabled'}</span>
          </div>

          {status.currentPage && (
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ marginRight: '8px' }}>🌐</span>
              <span>Current page: {status.currentPage}</span>
            </div>
          )}

          {status.lastActivity && (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: '8px' }}>🕒</span>
              <span>Last activity: {status.lastActivity}</span>
            </div>
          )}
        </div>
      </div>

      {/* Errors */}
      {status.errors.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h4 style={{ margin: '0', fontSize: '14px', color: '#e74c3c' }}>
              Errors ({status.errors.length})
            </h4>
            <button
              onClick={clearErrors}
              style={{
                padding: '2px 6px',
                backgroundColor: '#e74c3c',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                fontSize: '10px',
                cursor: 'pointer'
              }}
            >
              Clear
            </button>
          </div>
          <div
            style={{
              padding: '8px',
              backgroundColor: '#fee',
              border: '1px solid #fcc',
              borderRadius: '4px',
              fontSize: '12px'
            }}
          >
            {status.errors.map((error, index) => (
              <div key={index} style={{ marginBottom: index < status.errors.length - 1 ? '4px' : '0' }}>
                • {error}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {status.warnings.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h4 style={{ margin: '0', fontSize: '14px', color: '#f39c12' }}>
              Warnings ({status.warnings.length})
            </h4>
            <button
              onClick={clearWarnings}
              style={{
                padding: '2px 6px',
                backgroundColor: '#f39c12',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                fontSize: '10px',
                cursor: 'pointer'
              }}
            >
              Clear
            </button>
          </div>
          <div
            style={{
              padding: '8px',
              backgroundColor: '#fff8e1',
              border: '1px solid #ffcc02',
              borderRadius: '4px',
              fontSize: '12px'
            }}
          >
            {status.warnings.map((warning, index) => (
              <div key={index} style={{ marginBottom: index < status.warnings.length - 1 ? '4px' : '0' }}>
                • {warning}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {status.isReady && (
        <div>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Quick Actions</h4>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {!status.hasProfile && (
              <div style={{ fontSize: '11px', color: '#666', padding: '4px 8px', backgroundColor: '#f0f0f0', borderRadius: '3px' }}>
                Complete your profile first
              </div>
            )}
            
            {status.hasProfile && status.autofillEnabled && (
              <button
                onClick={async () => {
                  try {
                    const result = await messaging.triggerAutofill();
                    if (result && result.success) {
                      // Success is handled by the message listener
                    } else {
                      handleError({ error: result?.error || 'Failed to trigger autofill' });
                    }
                  } catch (error) {
                    handleError({ error: 'Failed to trigger autofill' });
                  }
                }}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#3498db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                Fill Current Page
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};