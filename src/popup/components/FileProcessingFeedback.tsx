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
  layoutStyles,
  mergeStyles
} from '../../shared/styled-utils';

interface FileProcessingFeedbackProps {
  fileName?: string;
  fileSize?: number;
  processingStage: 'idle' | 'uploading' | 'processing' | 'extracting' | 'storing' | 'complete' | 'error';
  progress?: number;
  error?: string;
  securityInfo?: {
    isEncrypted: boolean;
    storageLocation: 'local' | 'memory';
    dataRetention: string;
  };
  onCancel?: () => void;
}

interface ProcessingStage {
  id: string;
  label: string;
  description: string;
  icon: string;
  status: 'pending' | 'active' | 'complete' | 'error';
}

export const FileProcessingFeedback: React.FC<FileProcessingFeedbackProps> = ({
  fileName,
  fileSize,
  processingStage,
  progress = 0,
  error,
  securityInfo = {
    isEncrypted: true,
    storageLocation: 'local',
    dataRetention: 'Until manually deleted'
  },
  onCancel
}) => {
  const [stages, setStages] = useState<ProcessingStage[]>([
    {
      id: 'uploading',
      label: 'File Upload',
      description: 'Securely reading file data',
      icon: '📤',
      status: 'pending'
    },
    {
      id: 'processing',
      label: 'Security Check',
      description: 'Validating file type and size',
      icon: '🔍',
      status: 'pending'
    },
    {
      id: 'extracting',
      label: 'Text Extraction',
      description: 'Extracting text content locally',
      icon: '📝',
      status: 'pending'
    },
    {
      id: 'storing',
      label: 'Secure Storage',
      description: 'Encrypting and storing data locally',
      icon: '🔒',
      status: 'pending'
    }
  ]);

  useEffect(() => {
    updateStageStatus();
  }, [processingStage]);

  const updateStageStatus = () => {
    setStages(prevStages => {
      return prevStages.map(stage => {
        let status: 'pending' | 'active' | 'complete' | 'error' = 'pending';

        if (processingStage === 'error') {
          status = 'error';
        } else if (processingStage === 'complete') {
          status = 'complete';
        } else if (stage.id === processingStage) {
          status = 'active';
        } else {
          // Check if this stage should be complete based on current stage
          const stageOrder = ['uploading', 'processing', 'extracting', 'storing'];
          const currentIndex = stageOrder.indexOf(processingStage);
          const stageIndex = stageOrder.indexOf(stage.id);

          if (currentIndex > stageIndex) {
            status = 'complete';
          }
        }

        return { ...stage, status };
      });
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStageIcon = (status: string): string => {
    switch (status) {
      case 'complete': return '✅';
      case 'active': return '⏳';
      case 'error': return '❌';
      default: return '⏸️';
    }
  };

  const getStageColor = (status: string): string => {
    switch (status) {
      case 'complete': return colors.success[600];
      case 'active': return colors.primary[600];
      case 'error': return colors.error[600];
      default: return colors.neutral[400];
    }
  };

  if (processingStage === 'idle') {
    return null;
  }

  return (
    <div style={mergeStyles(cardStyles.base, {
      marginTop: spacing[3],
      borderColor: processingStage === 'error' ? colors.error[300] : colors.primary[300]
    })}>
      {/* Header */}
      <div style={layoutStyles.flexBetween}>
        <h4 style={mergeStyles(textStyles.heading2, { marginBottom: spacing[2] })}>
          File Processing
        </h4>
        {onCancel && processingStage !== 'complete' && processingStage !== 'error' && (
          <button
            onClick={onCancel}
            style={{
              padding: `${spacing[1]} ${spacing[2]}`,
              backgroundColor: 'transparent',
              border: `1px solid ${colors.neutral[300]}`,
              borderRadius: borderRadius.sm,
              fontSize: typography.fontSize.xs,
              cursor: 'pointer',
              color: colors.neutral[600]
            }}
          >
            Cancel
          </button>
        )}
      </div>

      {/* File Info */}
      {fileName && (
        <div style={{ marginBottom: spacing[3] }}>
          <div style={layoutStyles.flexRow}>
            <span style={{ marginRight: spacing[2] }}>📄</span>
            <div>
              <div style={textStyles.body}>{fileName}</div>
              {fileSize && (
                <div style={textStyles.caption}>
                  {formatFileSize(fileSize)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {(processingStage === 'uploading' || processingStage === 'processing' || processingStage === 'extracting' || processingStage === 'storing') && (
        <div style={{ marginBottom: spacing[3] }}>
          <div style={layoutStyles.flexBetween}>
            <span style={textStyles.caption}>Processing...</span>
            <span style={textStyles.caption}>{Math.round(progress)}%</span>
          </div>
          <div style={{
            width: '100%',
            height: '6px',
            backgroundColor: colors.neutral[200],
            borderRadius: borderRadius.full,
            marginTop: spacing[1],
            overflow: 'hidden'
          }}>
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                backgroundColor: colors.primary[600],
                transition: 'width 0.3s ease',
                borderRadius: borderRadius.full
              }}
            />
          </div>
        </div>
      )}

      {/* Processing Stages */}
      <div style={{ marginBottom: spacing[3] }}>
        <div style={mergeStyles(textStyles.caption, {
          marginBottom: spacing[2],
          fontWeight: typography.fontWeight.semibold
        })}>
          Processing Steps:
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
          {stages.map((stage) => (
            <div key={stage.id} style={layoutStyles.flexRow}>
              <span style={{
                marginRight: spacing[2],
                color: getStageColor(stage.status)
              }}>
                {getStageIcon(stage.status)}
              </span>
              <div style={{ flex: 1 }}>
                <div style={mergeStyles(textStyles.body, {
                  color: stage.status === 'active' ? colors.primary[700] :
                    stage.status === 'complete' ? colors.success[700] :
                      stage.status === 'error' ? colors.error[700] : colors.neutral[600]
                })}>
                  {stage.label}
                </div>
                <div style={textStyles.caption}>
                  {stage.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security Information */}
      <div style={mergeStyles(cardStyles.base, {
        backgroundColor: colors.success[50],
        borderColor: colors.success[200],
        marginBottom: spacing[3]
      })}>
        <div style={mergeStyles(textStyles.caption, {
          marginBottom: spacing[2],
          fontWeight: typography.fontWeight.semibold,
          color: colors.success[800]
        })}>
          Security & Privacy:
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
          <div style={layoutStyles.flexRow}>
            <span style={{
              marginRight: spacing[2],
              color: colors.success[600]
            }}>
              🔒
            </span>
            <span style={mergeStyles(textStyles.caption, { color: colors.success[700] })}>
              Data encrypted during storage
            </span>
          </div>

          <div style={layoutStyles.flexRow}>
            <span style={{
              marginRight: spacing[2],
              color: colors.success[600]
            }}>
              💾
            </span>
            <span style={mergeStyles(textStyles.caption, { color: colors.success[700] })}>
              Stored locally on your device only
            </span>
          </div>

          <div style={layoutStyles.flexRow}>
            <span style={{
              marginRight: spacing[2],
              color: colors.success[600]
            }}>
              🚫
            </span>
            <span style={mergeStyles(textStyles.caption, { color: colors.success[700] })}>
              No data sent to external servers
            </span>
          </div>

          <div style={layoutStyles.flexRow}>
            <span style={{
              marginRight: spacing[2],
              color: colors.success[600]
            }}>
              ⏱️
            </span>
            <span style={mergeStyles(textStyles.caption, { color: colors.success[700] })}>
              Retention: {securityInfo.dataRetention}
            </span>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && processingStage === 'error' && (
        <div style={mergeStyles(cardStyles.base, {
          backgroundColor: colors.error[50],
          borderColor: colors.error[300]
        })}>
          <div style={layoutStyles.flexRow}>
            <span style={{
              marginRight: spacing[2],
              color: colors.error[600]
            }}>
              ⚠️
            </span>
            <div>
              <div style={mergeStyles(textStyles.body, {
                color: colors.error[700],
                marginBottom: spacing[1]
              })}>
                Processing Failed
              </div>
              <div style={mergeStyles(textStyles.caption, { color: colors.error[600] })}>
                {error}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {processingStage === 'complete' && (
        <div style={mergeStyles(cardStyles.base, {
          backgroundColor: colors.success[50],
          borderColor: colors.success[300]
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
                File Processed Successfully
              </div>
              <div style={mergeStyles(textStyles.caption, { color: colors.success[600] })}>
                Your CV has been securely stored and is ready for autofill
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};