import React, { useState, useEffect, useRef } from 'react';
import { CVData, UserProfile, ExtractedProfileData } from '../../shared/types';
import { messaging } from '../../shared/messaging';
import { FileProcessingFeedback } from './FileProcessingFeedback';
import { CVParser } from '../../shared/cvParser';
import { profileMapper } from '../../shared/profileMapper';

interface CVUploaderProps {
  onCVUpdate?: (cvData: CVData | null) => void;
  onProfileExtracted?: (extractedProfile: Partial<UserProfile>) => void;
  autoExtractProfile?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc'];

export const CVUploader: React.FC<CVUploaderProps> = ({ 
  onCVUpdate, 
  onProfileExtracted, 
  autoExtractProfile = true 
}) => {
  const [cvData, setCvData] = useState<CVData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [processingStage, setProcessingStage] = useState<'idle' | 'uploading' | 'processing' | 'extracting' | 'storing' | 'complete' | 'error'>('idle');
  const [currentFileName, setCurrentFileName] = useState<string>('');
  const [currentFileSize, setCurrentFileSize] = useState<number>(0);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [extractedProfile, setExtractedProfile] = useState<ExtractedProfileData | null>(null);
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

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return '#27ae60'; // High confidence - green
    if (confidence >= 0.6) return '#f39c12'; // Medium confidence - orange
    return '#e74c3c'; // Low confidence - red
  };

  const formatAddress = (address: any): string => {
    const parts = [];
    if (address.street) parts.push(address.street);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.postCode) parts.push(address.postCode);
    if (address.country) parts.push(address.country);
    return parts.join(', ');
  };

  const simulateProgress = (): Promise<void> => {
    return new Promise((resolve) => {
      let progress = 0;
      const stages = ['uploading', 'processing', 'extracting', 'storing'] as const;
      let currentStageIndex = 0;
      
      const interval = setInterval(() => {
        progress += Math.random() * 15 + 5; // 5-20% increments
        
        // Update processing stage based on progress
        const stageProgress = Math.floor(progress / 25);
        if (stageProgress < stages.length && stageProgress !== currentStageIndex) {
          currentStageIndex = stageProgress;
          setProcessingStage(stages[currentStageIndex]);
        }
        
        if (progress >= 90) {
          setUploadProgress(90);
          setProcessingStage('storing');
          clearInterval(interval);
          resolve();
        } else {
          setUploadProgress(Math.min(progress, 90));
        }
      }, 300);
    });
  };

  const extractProfileFromCV = async (cvData: CVData): Promise<void> => {
    if (!cvData.extractedText || !autoExtractProfile) {
      return;
    }

    setIsExtracting(true);
    setExtractionProgress(0);
    setError('');

    try {
      // Initialize CV parser
      const parser = new CVParser();
      
      // Simulate extraction progress
      const progressInterval = setInterval(() => {
        setExtractionProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Extract profile data from CV text
      const extractedData = await parser.parseCV(cvData.extractedText);
      
      clearInterval(progressInterval);
      setExtractionProgress(100);

      // Map extracted data to UserProfile format
      const mappedProfile = profileMapper.mapExtractedDataToProfile(extractedData);

      // Store extracted profile data
      setExtractedProfile(extractedData);

      // Update CV data with extraction results and save
      const updatedCvData: CVData = {
        ...cvData,
        profileExtracted: true,
        extractedProfile: extractedData,
        extractionDate: Date.now()
      };

      // Update local state with extraction results
      setCvData(updatedCvData);

      // Notify parent component about extracted profile
      if (onProfileExtracted) {
        onProfileExtracted(mappedProfile);
      }

      setSuccessMessage('Profile extracted successfully from CV!');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);

    } catch (error) {
      console.error('Profile extraction failed:', error);
      setError(error instanceof Error ? error.message : 'Profile extraction failed. Please try again.');
    } finally {
      setIsExtracting(false);
      setExtractionProgress(0);
    }
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
    setProcessingStage('uploading');
    setCurrentFileName(file.name);
    setCurrentFileSize(file.size);

    try {
      // Simulate upload progress with stages
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
      setProcessingStage('complete');

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

        // Trigger profile extraction if auto-extract is enabled and text is available
        if (autoExtractProfile && result.data.extractedText) {
          try {
            await extractProfileFromCV(result.data);
          } catch (extractionError) {
            console.error('Profile extraction failed:', extractionError);
            // Don't fail the entire upload if extraction fails
          }
        }

        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage('');
          setProcessingStage('idle');
        }, 3000);
      } else {
        console.error('CVUploader: Upload failed:', result?.error);
        throw new Error(result?.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading CV:', error);
      setError(error instanceof Error ? error.message : 'Error uploading CV. Please try again.');
      setUploadProgress(0);
      setProcessingStage('error');
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
              {cvData.profileExtracted && cvData.extractionDate && (
                <div style={{ fontSize: '12px', color: '#3498db', marginTop: '4px' }}>
                  ✓ Profile extracted {formatDate(cvData.extractionDate)}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {cvData.extractedText && !isExtracting && (
                <button
                  onClick={() => extractProfileFromCV(cvData)}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#3498db',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                  title="Extract profile information from CV"
                >
                  Extract Profile
                </button>
              )}
              <button
                onClick={handleRemoveCV}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
                title="Remove CV"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Processing Feedback */}
      <FileProcessingFeedback
        fileName={currentFileName}
        fileSize={currentFileSize}
        processingStage={processingStage}
        progress={uploadProgress}
        error={error}
        onCancel={() => {
          setIsUploading(false);
          setProcessingStage('idle');
          setUploadProgress(0);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }}
      />

      {/* Profile Extraction Progress */}
      {isExtracting && (
        <div
          style={{
            border: '1px solid #3498db',
            borderRadius: '4px',
            padding: '12px',
            marginBottom: '16px',
            backgroundColor: '#f8f9fa'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: '500' }}>
              🔍 Extracting profile information...
            </span>
          </div>
          <div
            style={{
              width: '100%',
              height: '6px',
              backgroundColor: '#e9ecef',
              borderRadius: '3px',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                width: `${extractionProgress}%`,
                height: '100%',
                backgroundColor: '#3498db',
                transition: 'width 0.3s ease'
              }}
            />
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            Analyzing CV content and extracting structured data...
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

      {/* Extraction Results Preview */}
      {extractedProfile && (
        <div style={{ marginTop: '16px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#2c3e50' }}>
            📋 Extracted Profile Information
          </h4>
          
          {/* Personal Information Section */}
          {extractedProfile.personalInfo && Object.keys(extractedProfile.personalInfo).length > 0 && (
            <details style={{ marginBottom: '12px' }}>
              <summary style={{ 
                fontSize: '13px', 
                fontWeight: '500', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                👤 Personal Information
                <span style={{ 
                  fontSize: '11px', 
                  backgroundColor: getConfidenceColor(extractedProfile.confidence.personalInfo),
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '10px'
                }}>
                  {Math.round(extractedProfile.confidence.personalInfo * 100)}% confidence
                </span>
              </summary>
              <div style={{ 
                marginTop: '8px', 
                padding: '8px', 
                backgroundColor: '#f8f9fa', 
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                {extractedProfile.personalInfo.firstName && (
                  <div><strong>First Name:</strong> {extractedProfile.personalInfo.firstName}</div>
                )}
                {extractedProfile.personalInfo.lastName && (
                  <div><strong>Last Name:</strong> {extractedProfile.personalInfo.lastName}</div>
                )}
                {extractedProfile.personalInfo.email && (
                  <div><strong>Email:</strong> {extractedProfile.personalInfo.email}</div>
                )}
                {extractedProfile.personalInfo.phone && (
                  <div><strong>Phone:</strong> {extractedProfile.personalInfo.phone}</div>
                )}
                {extractedProfile.personalInfo.address && (
                  <div><strong>Address:</strong> {formatAddress(extractedProfile.personalInfo.address)}</div>
                )}
                {extractedProfile.personalInfo.linkedinUrl && (
                  <div><strong>LinkedIn:</strong> {extractedProfile.personalInfo.linkedinUrl}</div>
                )}
                {extractedProfile.personalInfo.portfolioUrl && (
                  <div><strong>Portfolio:</strong> {extractedProfile.personalInfo.portfolioUrl}</div>
                )}
              </div>
            </details>
          )}

          {/* Work Experience Section */}
          {extractedProfile.workExperience && extractedProfile.workExperience.length > 0 && (
            <details style={{ marginBottom: '12px' }}>
              <summary style={{ 
                fontSize: '13px', 
                fontWeight: '500', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                💼 Work Experience ({extractedProfile.workExperience.length} positions)
                <span style={{ 
                  fontSize: '11px', 
                  backgroundColor: getConfidenceColor(extractedProfile.confidence.workExperience),
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '10px'
                }}>
                  {Math.round(extractedProfile.confidence.workExperience * 100)}% confidence
                </span>
              </summary>
              <div style={{ 
                marginTop: '8px', 
                padding: '8px', 
                backgroundColor: '#f8f9fa', 
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                {extractedProfile.workExperience.map((exp, index) => (
                  <div key={index} style={{ marginBottom: index < extractedProfile.workExperience.length - 1 ? '12px' : '0', paddingBottom: index < extractedProfile.workExperience.length - 1 ? '12px' : '0', borderBottom: index < extractedProfile.workExperience.length - 1 ? '1px solid #dee2e6' : 'none' }}>
                    <div><strong>{exp.jobTitle}</strong> at <strong>{exp.company}</strong></div>
                    {(exp.startDate || exp.endDate || exp.current) && (
                      <div style={{ color: '#666', fontSize: '11px' }}>
                        {exp.startDate} - {exp.current ? 'Present' : exp.endDate || 'Unknown'}
                      </div>
                    )}
                    {exp.description && (
                      <div style={{ marginTop: '4px', fontSize: '11px' }}>
                        {exp.description.length > 100 ? `${exp.description.substring(0, 100)}...` : exp.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Education Section */}
          {extractedProfile.education && extractedProfile.education.length > 0 && (
            <details style={{ marginBottom: '12px' }}>
              <summary style={{ 
                fontSize: '13px', 
                fontWeight: '500', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                🎓 Education ({extractedProfile.education.length} entries)
                <span style={{ 
                  fontSize: '11px', 
                  backgroundColor: getConfidenceColor(extractedProfile.confidence.education),
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '10px'
                }}>
                  {Math.round(extractedProfile.confidence.education * 100)}% confidence
                </span>
              </summary>
              <div style={{ 
                marginTop: '8px', 
                padding: '8px', 
                backgroundColor: '#f8f9fa', 
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                {extractedProfile.education.map((edu, index) => (
                  <div key={index} style={{ marginBottom: index < extractedProfile.education.length - 1 ? '8px' : '0' }}>
                    <div><strong>{edu.degree}</strong></div>
                    <div>{edu.institution}</div>
                    {edu.fieldOfStudy && <div style={{ fontSize: '11px', color: '#666' }}>Field: {edu.fieldOfStudy}</div>}
                    {edu.graduationDate && <div style={{ fontSize: '11px', color: '#666' }}>Graduated: {edu.graduationDate}</div>}
                    {edu.gpa && <div style={{ fontSize: '11px', color: '#666' }}>GPA: {edu.gpa}</div>}
                    {edu.honors && <div style={{ fontSize: '11px', color: '#666' }}>Honors: {edu.honors}</div>}
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Skills Section */}
          {extractedProfile.skills && extractedProfile.skills.length > 0 && (
            <details style={{ marginBottom: '12px' }}>
              <summary style={{ 
                fontSize: '13px', 
                fontWeight: '500', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                🛠️ Skills ({extractedProfile.skills.length} identified)
                <span style={{ 
                  fontSize: '11px', 
                  backgroundColor: getConfidenceColor(extractedProfile.confidence.skills),
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '10px'
                }}>
                  {Math.round(extractedProfile.confidence.skills * 100)}% confidence
                </span>
              </summary>
              <div style={{ 
                marginTop: '8px', 
                padding: '8px', 
                backgroundColor: '#f8f9fa', 
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {extractedProfile.skills.map((skill, index) => (
                    <span key={index} style={{
                      backgroundColor: '#e9ecef',
                      padding: '2px 6px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      border: '1px solid #dee2e6'
                    }}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </details>
          )}
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