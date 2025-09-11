import React, { useState, useEffect } from 'react';
import { messaging } from '../../shared/messaging';
import { 
  colors, 
  typography, 
  spacing, 
  borderRadius, 
  transitions 
} from '../../shared/design-system';

interface StatusBadgeProps {
  className?: string;
  style?: React.CSSProperties;
}

interface ExtensionStatus {
  hasProfile: boolean;
  hasCV: boolean;
  autofillEnabled: boolean;
  isReady: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ className, style }) => {
  const [status, setStatus] = useState<ExtensionStatus>({
    hasProfile: false,
    hasCV: false,
    autofillEnabled: true,
    isReady: false
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const [profile, cvData] = await Promise.all([
        messaging.getUserProfile().catch(() => null),
        messaging.getCVData().catch(() => null)
      ]);

      const hasCompleteProfile = !!(profile && 
        profile.personalInfo && 
        profile.personalInfo.firstName && 
        profile.personalInfo.email
      );
      const hasCVData = !!(cvData && cvData.fileName);
      const isAutofillEnabled = profile?.preferences?.autofillEnabled ?? true;

      setStatus({
        hasProfile: hasCompleteProfile,
        hasCV: hasCVData,
        autofillEnabled: isAutofillEnabled,
        isReady: hasCompleteProfile && isAutofillEnabled
      });
    } catch (error) {
      console.error('Error loading status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (): string => {
    if (isLoading) return colors.neutral[400];
    if (!status.hasProfile) return colors.error[500];
    if (!status.autofillEnabled) return colors.warning[500];
    return colors.success[500];
  };

  const getStatusIcon = (): string => {
    if (isLoading) return '⏳';
    if (!status.hasProfile) return '⚠️';
    if (!status.autofillEnabled) return '⏸️';
    return '✅';
  };

  const getStatusText = (): string => {
    if (isLoading) return 'Loading...';
    if (!status.hasProfile) return 'Setup Required';
    if (!status.autofillEnabled) return 'Disabled';
    return 'Ready';
  };

  return (
    <div 
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: spacing[1],
        padding: `${spacing[1]} ${spacing[2]}`,
        backgroundColor: colors.neutral[100],
        borderRadius: borderRadius.full,
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.medium,
        color: getStatusColor(),
        transition: transitions.normal,
        ...style
      }}
    >
      <span style={{ fontSize: typography.fontSize.xs }}>
        {getStatusIcon()}
      </span>
      <span>
        {getStatusText()}
      </span>
    </div>
  );
};