import React, { useState, useEffect } from 'react';
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
import { storage } from '../../shared/storage';
import { SecurityWarnings } from './SecurityWarnings';

interface PrivacySecurityIndicatorProps {
  className?: string;
  style?: React.CSSProperties;
}

interface StorageInfo {
  bytesInUse: number;
  quota: number;
  usagePercentage: number;
}

interface PermissionStatus {
  storage: boolean;
  activeTab: boolean;
  scripting: boolean;
  hostPermissions: boolean;
}

interface SecurityStatus {
  dataEncryption: 'local' | 'none';
  dataLocation: 'local' | 'cloud';
  thirdPartyAccess: boolean;
  networkRequests: boolean;
}

export const PrivacySecurityIndicator: React.FC<PrivacySecurityIndicatorProps> = ({ 
  className, 
  style 
}) => {
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>({
    storage: false,
    activeTab: false,
    scripting: false,
    hostPermissions: false
  });
  const [securityStatus] = useState<SecurityStatus>({
    dataEncryption: 'local',
    dataLocation: 'local',
    thirdPartyAccess: false,
    networkRequests: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadPrivacySecurityInfo();
  }, []);

  const loadPrivacySecurityInfo = async () => {
    setIsLoading(true);
    try {
      // Load storage information
      const storageData = await storage.getStorageInfo();
      if (storageData) {
        setStorageInfo({
          ...storageData,
          usagePercentage: (storageData.bytesInUse / storageData.quota) * 100
        });
      }

      // Check permissions
      const permissions = await checkPermissions();
      setPermissionStatus(permissions);
    } catch (error) {
      console.error('Error loading privacy/security info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkPermissions = async (): Promise<PermissionStatus> => {
    try {
      const permissions = await chrome.permissions.getAll();
      
      return {
        storage: permissions.permissions?.includes('storage') ?? false,
        activeTab: permissions.permissions?.includes('activeTab') ?? false,
        scripting: permissions.permissions?.includes('scripting') ?? false,
        hostPermissions: (permissions.origins?.length ?? 0) > 0
      };
    } catch (error) {
      console.error('Error checking permissions:', error);
      return {
        storage: false,
        activeTab: false,
        scripting: false,
        hostPermissions: false
      };
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getSecurityIcon = (status: boolean | string): string => {
    if (typeof status === 'boolean') {
      return status ? '🔒' : '🔓';
    }
    return status === 'local' ? '🔒' : '🌐';
  };

  const getSecurityColor = (status: boolean | string, isGood: boolean = true): string => {
    if (typeof status === 'boolean') {
      return (status === isGood) ? colors.success[600] : colors.warning[600];
    }
    return status === 'local' ? colors.success[600] : colors.warning[600];
  };

  if (isLoading) {
    return (
      <div className={className} style={{ padding: spacing[4], ...style }}>
        <div style={mergeStyles(textStyles.body, { textAlign: 'center' })}>
          Loading privacy & security information...
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={{ padding: spacing[4], ...style }}>
      <div style={layoutStyles.flexBetween}>
        <h3 style={mergeStyles(textStyles.heading1, { marginBottom: spacing[4] })}>
          Privacy & Security
        </h3>
        <button
          onClick={() => setShowDetails(!showDetails)}
          style={mergeStyles(buttonStyles.base, buttonStyles.secondary, {
            padding: `${spacing[1]} ${spacing[3]}`,
            fontSize: typography.fontSize.xs
          })}
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      {/* Data Storage Overview */}
      <div style={mergeStyles(cardStyles.base, { marginBottom: spacing[4] })}>
        <h4 style={mergeStyles(textStyles.heading2, { marginBottom: spacing[3] })}>
          Data Storage
        </h4>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
          <div style={layoutStyles.flexRow}>
            <span style={{ marginRight: spacing[2] }}>🔒</span>
            <span style={textStyles.body}>
              All data stored locally on your device
            </span>
          </div>
          
          <div style={layoutStyles.flexRow}>
            <span style={{ marginRight: spacing[2] }}>🚫</span>
            <span style={textStyles.body}>
              No data sent to external servers
            </span>
          </div>

          {storageInfo && (
            <div style={layoutStyles.flexRow}>
              <span style={{ marginRight: spacing[2] }}>💾</span>
              <div style={{ flex: 1 }}>
                <div style={textStyles.body}>
                  Storage used: {formatBytes(storageInfo.bytesInUse)} of {formatBytes(storageInfo.quota)}
                </div>
                <div style={{
                  width: '100%',
                  height: '4px',
                  backgroundColor: colors.neutral[200],
                  borderRadius: borderRadius.full,
                  marginTop: spacing[1],
                  overflow: 'hidden'
                }}>
                  <div
                    style={{
                      width: `${Math.min(storageInfo.usagePercentage, 100)}%`,
                      height: '100%',
                      backgroundColor: storageInfo.usagePercentage > 80 
                        ? colors.warning[600] 
                        : colors.success[600],
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>
                <div style={mergeStyles(textStyles.caption, { marginTop: spacing[1] })}>
                  {storageInfo.usagePercentage.toFixed(1)}% used
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Permission Status */}
      <div style={mergeStyles(cardStyles.base, { marginBottom: spacing[4] })}>
        <h4 style={mergeStyles(textStyles.heading2, { marginBottom: spacing[3] })}>
          Permissions
        </h4>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
          <div style={layoutStyles.flexRow}>
            <span style={{ 
              marginRight: spacing[2],
              color: getSecurityColor(permissionStatus.storage)
            }}>
              {getSecurityIcon(permissionStatus.storage)}
            </span>
            <div style={{ flex: 1 }}>
              <div style={textStyles.body}>Local Storage Access</div>
              <div style={textStyles.caption}>
                Required to save your profile and CV data
              </div>
            </div>
            <span style={mergeStyles(textStyles.caption, {
              color: getSecurityColor(permissionStatus.storage)
            })}>
              {permissionStatus.storage ? 'Granted' : 'Missing'}
            </span>
          </div>

          <div style={layoutStyles.flexRow}>
            <span style={{ 
              marginRight: spacing[2],
              color: getSecurityColor(permissionStatus.activeTab)
            }}>
              {getSecurityIcon(permissionStatus.activeTab)}
            </span>
            <div style={{ flex: 1 }}>
              <div style={textStyles.body}>Active Tab Access</div>
              <div style={textStyles.caption}>
                Required to detect and fill forms on current page
              </div>
            </div>
            <span style={mergeStyles(textStyles.caption, {
              color: getSecurityColor(permissionStatus.activeTab)
            })}>
              {permissionStatus.activeTab ? 'Granted' : 'Missing'}
            </span>
          </div>

          <div style={layoutStyles.flexRow}>
            <span style={{ 
              marginRight: spacing[2],
              color: getSecurityColor(permissionStatus.scripting)
            }}>
              {getSecurityIcon(permissionStatus.scripting)}
            </span>
            <div style={{ flex: 1 }}>
              <div style={textStyles.body}>Script Injection</div>
              <div style={textStyles.caption}>
                Required to interact with form fields
              </div>
            </div>
            <span style={mergeStyles(textStyles.caption, {
              color: getSecurityColor(permissionStatus.scripting)
            })}>
              {permissionStatus.scripting ? 'Granted' : 'Missing'}
            </span>
          </div>

          <div style={layoutStyles.flexRow}>
            <span style={{ 
              marginRight: spacing[2],
              color: getSecurityColor(permissionStatus.hostPermissions)
            }}>
              {getSecurityIcon(permissionStatus.hostPermissions)}
            </span>
            <div style={{ flex: 1 }}>
              <div style={textStyles.body}>Website Access</div>
              <div style={textStyles.caption}>
                Required to access job application websites
              </div>
            </div>
            <span style={mergeStyles(textStyles.caption, {
              color: getSecurityColor(permissionStatus.hostPermissions)
            })}>
              {permissionStatus.hostPermissions ? 'Granted' : 'Missing'}
            </span>
          </div>
        </div>
      </div>

      {/* Security Features */}
      <div style={mergeStyles(cardStyles.base, { marginBottom: spacing[4] })}>
        <h4 style={mergeStyles(textStyles.heading2, { marginBottom: spacing[3] })}>
          Security Features
        </h4>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
          <div style={layoutStyles.flexRow}>
            <span style={{ 
              marginRight: spacing[2],
              color: getSecurityColor(securityStatus.dataLocation)
            }}>
              {getSecurityIcon(securityStatus.dataLocation)}
            </span>
            <div style={{ flex: 1 }}>
              <div style={textStyles.body}>Data Location</div>
              <div style={textStyles.caption}>
                All data stored locally on your device
              </div>
            </div>
            <span style={mergeStyles(textStyles.caption, {
              color: colors.success[600]
            })}>
              Local Only
            </span>
          </div>

          <div style={layoutStyles.flexRow}>
            <span style={{ 
              marginRight: spacing[2],
              color: getSecurityColor(securityStatus.thirdPartyAccess, false)
            }}>
              {getSecurityIcon(!securityStatus.thirdPartyAccess)}
            </span>
            <div style={{ flex: 1 }}>
              <div style={textStyles.body}>Third-party Access</div>
              <div style={textStyles.caption}>
                No external services can access your data
              </div>
            </div>
            <span style={mergeStyles(textStyles.caption, {
              color: colors.success[600]
            })}>
              Blocked
            </span>
          </div>

          <div style={layoutStyles.flexRow}>
            <span style={{ 
              marginRight: spacing[2],
              color: getSecurityColor(securityStatus.networkRequests, false)
            }}>
              {getSecurityIcon(!securityStatus.networkRequests)}
            </span>
            <div style={{ flex: 1 }}>
              <div style={textStyles.body}>Network Requests</div>
              <div style={textStyles.caption}>
                Extension works entirely offline
              </div>
            </div>
            <span style={mergeStyles(textStyles.caption, {
              color: colors.success[600]
            })}>
              None
            </span>
          </div>
        </div>
      </div>

      {/* Detailed Information */}
      {showDetails && (
        <div style={mergeStyles(cardStyles.base, { 
          marginBottom: spacing[4],
          backgroundColor: colors.neutral[100]
        })}>
          <h4 style={mergeStyles(textStyles.heading2, { marginBottom: spacing[3] })}>
            Detailed Privacy Information
          </h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
            <div>
              <div style={mergeStyles(textStyles.body, { 
                fontWeight: typography.fontWeight.semibold,
                marginBottom: spacing[1]
              })}>
                What data is stored:
              </div>
              <ul style={{ 
                margin: 0, 
                paddingLeft: spacing[4],
                fontSize: typography.fontSize.sm,
                lineHeight: 1.5
              }}>
                <li>Personal information (name, email, phone, address)</li>
                <li>Work experience and skills</li>
                <li>CV/resume files (stored as encrypted data)</li>
                <li>Extension preferences and settings</li>
                <li>Usage statistics (forms filled, success rates)</li>
              </ul>
            </div>

            <div>
              <div style={mergeStyles(textStyles.body, { 
                fontWeight: typography.fontWeight.semibold,
                marginBottom: spacing[1]
              })}>
                How data is protected:
              </div>
              <ul style={{ 
                margin: 0, 
                paddingLeft: spacing[4],
                fontSize: typography.fontSize.sm,
                lineHeight: 1.5
              }}>
                <li>All data stored locally using Chrome's secure storage API</li>
                <li>No data transmitted to external servers</li>
                <li>Files are encoded and stored securely</li>
                <li>Data is only accessible by this extension</li>
                <li>Automatic cleanup when extension is uninstalled</li>
              </ul>
            </div>

            <div>
              <div style={mergeStyles(textStyles.body, { 
                fontWeight: typography.fontWeight.semibold,
                marginBottom: spacing[1]
              })}>
                Permissions explained:
              </div>
              <ul style={{ 
                margin: 0, 
                paddingLeft: spacing[4],
                fontSize: typography.fontSize.sm,
                lineHeight: 1.5
              }}>
                <li><strong>Storage:</strong> Save your profile and CV data locally</li>
                <li><strong>Active Tab:</strong> Detect forms on the current webpage</li>
                <li><strong>Scripting:</strong> Fill form fields with your data</li>
                <li><strong>Host Permissions:</strong> Access job application websites</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Security Warnings */}
      <SecurityWarnings />

      {/* Quick Actions */}
      <div style={mergeStyles(cardStyles.base)}>
        <h4 style={mergeStyles(textStyles.heading2, { marginBottom: spacing[3] })}>
          Privacy Actions
        </h4>
        
        <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap' }}>
          <button
            onClick={loadPrivacySecurityInfo}
            style={mergeStyles(buttonStyles.base, buttonStyles.secondary, {
              fontSize: typography.fontSize.xs
            })}
          >
            🔄 Refresh Status
          </button>
          
          <button
            onClick={async () => {
              if (confirm('This will permanently delete all stored data. Are you sure?')) {
                try {
                  await storage.clearAll();
                  alert('All data has been cleared successfully.');
                  loadPrivacySecurityInfo();
                } catch (error) {
                  alert('Error clearing data. Please try again.');
                }
              }
            }}
            style={mergeStyles(buttonStyles.base, buttonStyles.danger, {
              fontSize: typography.fontSize.xs
            })}
          >
            🗑️ Clear All Data
          </button>
        </div>
      </div>
    </div>
  );
};