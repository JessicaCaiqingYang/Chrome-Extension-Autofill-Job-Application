import React, { useState, useEffect } from 'react';
import { messaging } from '../../shared/messaging';

interface AutofillToggleProps {
  onToggleChange?: (enabled: boolean) => void;
}

export const AutofillToggle: React.FC<AutofillToggleProps> = ({ onToggleChange }) => {
  const [isEnabled, setIsEnabled] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Load current autofill status on component mount
  useEffect(() => {
    loadAutofillStatus();
  }, []);

  const loadAutofillStatus = async () => {
    setIsLoading(true);
    setError('');

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
      setError('Error loading autofill status');
      // Default to enabled on error
      setIsEnabled(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async () => {
    if (isUpdating) return;

    const newState = !isEnabled;
    setIsUpdating(true);
    setError('');

    try {
      // Update autofill status through service worker
      const result = await messaging.toggleAutofill(newState);

      if (result && result.success) {
        setIsEnabled(newState);

        if (onToggleChange) {
          onToggleChange(newState);
        }
      } else {
        throw new Error(result?.error || 'Failed to update autofill status');
      }
    } catch (error) {
      console.error('Error toggling autofill:', error);
      setError('Error updating autofill status. Please try again.');

      // Revert the state on error
      // Note: We don't change isEnabled here since the toggle failed
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusText = (): string => {
    if (isLoading) return 'Loading...';
    if (isUpdating) return 'Updating...';
    return isEnabled ? 'Autofill is ON' : 'Autofill is OFF';
  };

  const getStatusColor = (): string => {
    if (isLoading || isUpdating) return '#95a5a6';
    return isEnabled ? '#27ae60' : '#e74c3c';
  };

  const getToggleColor = (): string => {
    if (isLoading || isUpdating) return '#bdc3c7';
    return isEnabled ? '#27ae60' : '#95a5a6';
  };

  if (isLoading) {
    return (
      <div style={{ padding: '16px', textAlign: 'center' }}>
        <div style={{ fontSize: '14px', color: '#666' }}>Loading autofill status...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px' }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>Autofill Control</h3>

      {/* Toggle Switch Container */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px',
          border: '1px solid #ddd',
          borderRadius: '8px',
          backgroundColor: '#f9f9f9'
        }}
      >
        <div style={{ flex: 1 }}>
          {/* Status Text */}
          <div
            style={{
              fontSize: '16px',
              fontWeight: '500',
              color: getStatusColor(),
              marginBottom: '4px'
            }}
          >
            {getStatusText()}
          </div>

          {/* Description */}
          <div style={{ fontSize: '12px', color: '#666' }}>
            {isEnabled
              ? 'Extension will automatically fill job application forms'
              : 'Extension will not fill forms automatically'
            }
          </div>
        </div>

        {/* Toggle Switch */}
        <div
          onClick={handleToggle}
          style={{
            position: 'relative',
            width: '50px',
            height: '28px',
            backgroundColor: getToggleColor(),
            borderRadius: '14px',
            cursor: (isLoading || isUpdating) ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.3s ease',
            marginLeft: '16px'
          }}
        >
          {/* Toggle Knob */}
          <div
            style={{
              position: 'absolute',
              top: '2px',
              left: isEnabled ? '24px' : '2px',
              width: '24px',
              height: '24px',
              backgroundColor: 'white',
              borderRadius: '12px',
              transition: 'left 0.3s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
          />
        </div>
      </div>

      {/* Status Indicator */}
      <div
        style={{
          marginTop: '12px',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          textAlign: 'center',
          backgroundColor: isEnabled ? '#e8f5e8' : '#ffeaea',
          color: isEnabled ? '#2d5a2d' : '#8b2635',
          border: `1px solid ${isEnabled ? '#c3e6c3' : '#f5c6cb'}`
        }}
      >
        {isEnabled ? (
          <>
            <span style={{ marginRight: '4px' }}>✓</span>
            Ready to autofill forms on job sites
          </>
        ) : (
          <>
            <span style={{ marginRight: '4px' }}>⏸</span>
            Autofill is paused - forms will not be filled
          </>
        )}
      </div>

      {/* Additional Info */}
      <div style={{ marginTop: '12px', fontSize: '11px', color: '#666', lineHeight: '1.4' }}>
        <div style={{ marginBottom: '4px' }}>
          <strong>How it works:</strong>
        </div>
        <ul style={{ margin: '0', paddingLeft: '16px' }}>
          <li>When enabled, the extension scans job application pages</li>
          <li>Automatically fills detected form fields with your profile data</li>
          <li>Works across different job sites and application forms</li>
          <li>You can toggle this on/off anytime</li>
        </ul>
      </div>

      {/* Error Message */}
      {error && (
        <div
          style={{
            marginTop: '12px',
            padding: '8px',
            borderRadius: '4px',
            fontSize: '12px',
            backgroundColor: '#fee',
            color: '#c33',
            border: '1px solid #fcc'
          }}
        >
          {error}
        </div>
      )}

      {/* Manual Trigger Button */}
      {isEnabled && !isLoading && !isUpdating && (
        <div style={{ marginTop: '16px' }}>
          <button
            onClick={async () => {
              setIsUpdating(true);
              try {
                const result = await messaging.triggerAutofill();
                if (result && result.success) {
                  setError('');
                  // Show success feedback briefly
                  const successMsg = `Autofill completed! Filled ${result.data?.filled || 0} fields.`;
                  setError(successMsg);
                  setTimeout(() => setError(''), 3000);
                } else {
                  throw new Error(result?.error || 'Autofill failed');
                }
              } catch (error) {
                console.error('Error triggering autofill:', error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                
                if (errorMessage.includes('No web page tabs found')) {
                  setError('Please open a job application website in a new tab and try again.');
                } else if (errorMessage.includes('Cannot autofill on this page')) {
                  setError('Cannot autofill on this page. Please navigate to a job application website.');
                } else if (errorMessage.includes('No user profile found')) {
                  setError('Please complete your profile first in the Profile tab.');
                } else {
                  setError('Error triggering autofill. Make sure you are on a job application page.');
                }
                
                setTimeout(() => setError(''), 7000);
              } finally {
                setIsUpdating(false);
              }
            }}
            disabled={isUpdating}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: isUpdating ? '#95a5a6' : '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: isUpdating ? 'not-allowed' : 'pointer'
            }}
          >
  {isUpdating ? '⏳ Filling...' : '🚀 Fill Current Page'}
          </button>
          <div style={{ fontSize: '11px', color: '#666', textAlign: 'center', marginTop: '4px' }}>
            Fills forms on the active web page tab
          </div>
        </div>
      )}
    </div>
  );
};