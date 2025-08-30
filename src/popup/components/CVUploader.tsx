import React, { useState, useEffect, useRef } from 'react';
import { CVData } from '../../shared/types';
import { messaging } from '../../shared/messaging';

interface CVUploaderProps {
  onCVUpdate?: (cvData: CVData | null) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc'];

export const CVUploader: React.FC<CVUploaderProps> = ({ onCVUpdate }) => {
  const [cvData, setCvData] = useState<CVData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing CV data on component mount
  useEffect(() => {
    loadCVData();
  }, []);

  const loadCVData = async () => {
    setIsLoading(true);
    try {
      const response = await messaging.getCVData();
      console.log('CVUploader: Loaded CV data response:', response);
      
      // Handle the response structure: {success: true, data: {...}}
      const existingCV = response && response.success ? response.data : response;
      
      if (existingCV) {
        setCvData(existingCV);
        console.log('CVUploader: CV data set successfully:', {
          fileName: existingCV.fileName,
          fileSize: existingCV.fileSize,
          hasFileBlob: !!existingCV.fileBlob,
          blobLength: existingCV.fileBlob ? existingCV.fileBlob.length : 0
        });
      } else {
        console.log('CVUploader: No CV data found');
      }
    } catch (error) {
      console.error('Error loading CV data:', error);
      setError('Error loading CV data');
    } finally {
      setIsLoading(false);
    }
  };

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        return 'Please select a PDF or Word document (.pdf, .docx, .doc)';
      }
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`;
    }

    // Check if file has content
    if (file.size === 0) {
      return 'File appears to be empty';
    }

    return null;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const simulateProgress = (): Promise<void> => {
    return new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 30;
        if (progress >= 90) {
          setUploadProgress(90);
          clearInterval(interval);
          resolve();
        } else {
          setUploadProgress(Math.min(progress, 90));
        }
      }, 200);
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Clear previous messages
    setError('');
    setSuccessMessage('');

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      await simulateProgress();

      // Upload file through messaging
      console.log('CVUploader: Starting CV upload for file:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      
      const result = await messaging.setCVData(file);
      
      console.log('CVUploader: Upload result:', result);
      
      setUploadProgress(100);

      if (result && result.success && result.data) {
        setCvData(result.data);
        console.log('CVUploader: CV upload successful, data saved:', {
          fileName: result.data.fileName,
          fileSize: result.data.fileSize,
          hasFileBlob: !!result.data.fileBlob,
          blobLength: result.data.fileBlob ? result.data.fileBlob.length : 0
        });
        
        setSuccessMessage(`CV uploaded successfully! ${result.data.extractedText ? 'Text extracted.' : 'Processing...'}`);
        
        if (onCVUpdate) {
          onCVUpdate(result.data);
        }

        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        console.error('CVUploader: Upload failed:', result?.error);
        throw new Error(result?.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading CV:', error);
      setError(error instanceof Error ? error.message : 'Error uploading CV. Please try again.');
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveCV = async () => {
    if (!cvData) return;

    try {
      // Clear CV data by setting null
      await messaging.setCVData(null as any);
      setCvData(null);
      setSuccessMessage('CV removed successfully');
      
      if (onCVUpdate) {
        onCVUpdate(null);
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error removing CV:', error);
      setError('Error removing CV. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '16px', textAlign: 'center' }}>
        <div>Loading CV data...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px' }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>CV Upload</h3>
      
      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Current CV Display */}
      {cvData && !isUploading && (
        <div
          style={{
            border: '1px solid #ddd',
            borderRadius: '4px',
            padding: '12px',
            marginBottom: '16px',
            backgroundColor: '#f9f9f9'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                📄 {cvData.fileName}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {formatFileSize(cvData.fileSize)} • Uploaded {formatDate(cvData.uploadDate)}
              </div>
              {cvData.extractedText && (
                <div style={{ fontSize: '12px', color: '#27ae60', marginTop: '4px' }}>
                  ✓ Text extracted ({cvData.extractedText.length} characters)
                </div>
              )}
            </div>
            <button
              onClick={handleRemoveCV}
              style={{
                padding: '4px 8px',
                backgroundColor: '#e74c3c',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer',
                marginLeft: '8px'
              }}
              title="Remove CV"
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', marginBottom: '8px' }}>
            Uploading CV... {Math.round(uploadProgress)}%
          </div>
          <div
            style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#ecf0f1',
              borderRadius: '4px',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                width: `${uploadProgress}%`,
                height: '100%',
                backgroundColor: '#3498db',
                transition: 'width 0.3s ease'
              }}
            />
          </div>
        </div>
      )}

      {/* Upload Button */}
      <button
        onClick={handleUploadClick}
        disabled={isUploading}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: isUploading ? '#95a5a6' : (cvData ? '#f39c12' : '#27ae60'),
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '14px',
          fontWeight: '500',
          cursor: isUploading ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
      >
        {isUploading ? (
          <>
            <span>Uploading...</span>
          </>
        ) : (
          <>
            <span>{cvData ? '📄 Replace CV' : '📄 Upload CV'}</span>
          </>
        )}
      </button>

      {/* File Type Info */}
      <div style={{ fontSize: '12px', color: '#666', marginTop: '8px', textAlign: 'center' }}>
        Supported formats: PDF, Word (.docx, .doc) • Max size: {MAX_FILE_SIZE / (1024 * 1024)}MB
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

      {/* Success Message */}
      {successMessage && (
        <div
          style={{
            marginTop: '12px',
            padding: '8px',
            borderRadius: '4px',
            fontSize: '12px',
            backgroundColor: '#efe',
            color: '#060',
            border: '1px solid #cfc'
          }}
        >
          {successMessage}
        </div>
      )}

      {/* CV Preview Info */}
      {cvData && cvData.extractedText && (
        <details style={{ marginTop: '16px' }}>
          <summary style={{ fontSize: '12px', color: '#666', cursor: 'pointer' }}>
            Preview extracted text ({cvData.extractedText.length} characters)
          </summary>
          <div
            style={{
              marginTop: '8px',
              padding: '8px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #e9ecef',
              borderRadius: '4px',
              fontSize: '11px',
              maxHeight: '100px',
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}
          >
            {cvData.extractedText.substring(0, 500)}
            {cvData.extractedText.length > 500 && '...'}
          </div>
        </details>
      )}
    </div>
  );
};