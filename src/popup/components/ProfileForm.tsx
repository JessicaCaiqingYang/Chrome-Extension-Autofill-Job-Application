import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserProfile } from '../../shared/types';
import { messaging } from '../../shared/messaging';
import { useNotifications } from '../contexts/NotificationContext';
import { 
  colors, 
  typography, 
  spacing, 
  borderRadius, 
  transitions,
  inputStyles,
  buttonStyles,
  textStyles,
  layoutStyles,
  mergeStyles
} from '../../shared/design-system';

interface ProfileFormProps {
  onProfileUpdate?: (profile: UserProfile) => void;
  extractedProfile?: Partial<UserProfile>;
  extractionConfidence?: Record<string, number>;
  onReExtract?: () => void;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  street?: string;
  city?: string;
  state?: string;
  postCode?: string;
  country?: string;
}

interface CollapsibleSectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  completionCount?: number;
  totalFields?: number;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ 
  title, 
  isOpen, 
  onToggle, 
  children, 
  completionCount = 0, 
  totalFields = 0 
}) => {
  const completionPercentage = totalFields > 0 ? (completionCount / totalFields) * 100 : 0;
  
  return (
    <div style={{
      border: `1px solid ${colors.neutral[200]}`,
      borderRadius: borderRadius.lg,
      marginBottom: spacing[4],
      overflow: 'hidden',
      backgroundColor: colors.neutral[50],
    }}>
      <button
        type="button"
        onClick={onToggle}
        style={mergeStyles(
          {
            width: '100%',
            padding: spacing[4],
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            transition: transitions.normal,
          },
          layoutStyles.flexBetween,
          isOpen ? { backgroundColor: colors.neutral[100] } : {}
        )}
      >
        <div style={layoutStyles.flexRow}>
          <h3 style={mergeStyles(textStyles.heading2, { marginRight: spacing[3] })}>
            {title}
          </h3>
          {totalFields > 0 && (
            <div style={{
              fontSize: typography.fontSize.xs,
              color: colors.neutral[500],
              backgroundColor: colors.neutral[200],
              padding: `${spacing[1]} ${spacing[2]}`,
              borderRadius: borderRadius.full,
            }}>
              {completionCount}/{totalFields}
            </div>
          )}
        </div>
        <div style={layoutStyles.flexRow}>
          {totalFields > 0 && (
            <div style={{
              width: '60px',
              height: '4px',
              backgroundColor: colors.neutral[200],
              borderRadius: borderRadius.full,
              marginRight: spacing[3],
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${completionPercentage}%`,
                height: '100%',
                backgroundColor: completionPercentage === 100 ? colors.success[500] : colors.primary[500],
                transition: transitions.normal,
              }} />
            </div>
          )}
          <span style={{
            fontSize: typography.fontSize.sm,
            color: colors.neutral[500],
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: transitions.normal,
          }}>
            ▼
          </span>
        </div>
      </button>
      {isOpen && (
        <div style={{
          padding: `0 ${spacing[4]} ${spacing[4]} ${spacing[4]}`,
          borderTop: `1px solid ${colors.neutral[200]}`,
          backgroundColor: colors.neutral[50],
        }}>
          {children}
        </div>
      )}
    </div>
  );
};

// Helper functions for confidence indicators
const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.8) {
    return {
      background: colors.success[100],
      text: colors.success[700],
    };
  } else if (confidence >= 0.6) {
    return {
      background: colors.warning[100],
      text: colors.warning[700],
    };
  } else {
    return {
      background: colors.error[100],
      text: colors.error[700],
    };
  }
};

const getConfidenceLabel = (confidence: number): string => {
  if (confidence >= 0.8) return 'High';
  if (confidence >= 0.6) return 'Medium';
  return 'Low';
};

const getConfidenceTooltip = (confidence: number): string => {
  const percentage = Math.round(confidence * 100);
  if (confidence >= 0.8) {
    return `High confidence (${percentage}%): This information was clearly identified in your CV and is likely accurate.`;
  } else if (confidence >= 0.6) {
    return `Medium confidence (${percentage}%): This information was found in your CV but may need verification.`;
  } else {
    return `Low confidence (${percentage}%): This information was extracted but may be inaccurate. Please review carefully.`;
  }
};

interface FloatingLabelInputProps {
  id: string;
  name?: string;
  type?: string;
  autoComplete?: string;
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  success?: boolean;
  isAutoPopulated?: boolean;
  confidence?: number;
}

const FloatingLabelInput: React.FC<FloatingLabelInputProps> = ({
  id,
  name,
  type = 'text',
  autoComplete,
  value,
  onChange,
  label,
  placeholder,
  required = false,
  error,
  success = false,
  isAutoPopulated = false,
  confidence,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value.length > 0;
  const isFloating = isFocused || hasValue;

  const inputStyle = mergeStyles(
    inputStyles.base,
    {
      paddingTop: spacing[4],
      paddingBottom: spacing[2],
    },
    error ? inputStyles.error : {},
    success ? inputStyles.success : {},
    isAutoPopulated ? {
      borderLeft: `4px solid ${colors.primary[400]}`,
      backgroundColor: colors.primary[50],
    } : {}
  );

  const labelStyle: React.CSSProperties = {
    position: 'absolute',
    left: spacing[3],
    color: error ? colors.error[600] : isFocused ? colors.primary[600] : colors.neutral[500],
    fontSize: isFloating ? typography.fontSize.xs : typography.fontSize.sm,
    fontWeight: isFloating ? typography.fontWeight.medium : typography.fontWeight.normal,
    top: isFloating ? '8px' : '50%',
    transform: isFloating ? 'translateY(0)' : 'translateY(-50%)',
    transition: transitions.normal,
    pointerEvents: 'none',
    backgroundColor: colors.neutral[50],
    padding: isFloating ? `0 ${spacing[1]}` : '0',
  };

  return (
    <div style={{ position: 'relative', marginBottom: spacing[3] }}>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={isFocused ? placeholder : ''}
        style={inputStyle}
      />
      <label htmlFor={id} style={labelStyle}>
        {label}{required && ' *'}
      </label>
      {error && (
        <div style={{
          color: colors.error[600],
          fontSize: typography.fontSize.xs,
          marginTop: spacing[1],
          display: 'flex',
          alignItems: 'center',
          gap: spacing[1],
        }}>
          <span>⚠</span>
          {error}
        </div>
      )}
      {success && !error && (
        <div style={{
          color: colors.success[600],
          fontSize: typography.fontSize.xs,
          marginTop: spacing[1],
          display: 'flex',
          alignItems: 'center',
          gap: spacing[1],
        }}>
          <span>✓</span>
          Valid
        </div>
      )}
      {isAutoPopulated && !error && (
        <div style={{
          color: colors.primary[600],
          fontSize: typography.fontSize.xs,
          marginTop: spacing[1],
          display: 'flex',
          alignItems: 'center',
          gap: spacing[1],
        }}>
          <span>🤖</span>
          Auto-populated from CV
          {confidence !== undefined && (
            <div style={{
              position: 'relative',
              display: 'inline-block',
            }}>
              <span 
                style={{
                  backgroundColor: getConfidenceColor(confidence).background,
                  color: getConfidenceColor(confidence).text,
                  padding: `${spacing[1]} ${spacing[2]}`,
                  borderRadius: borderRadius.sm,
                  fontSize: typography.fontSize.xs,
                  fontWeight: typography.fontWeight.medium,
                  cursor: 'help',
                }}
                title={getConfidenceTooltip(confidence)}
              >
                {getConfidenceLabel(confidence)} ({Math.round(confidence * 100)}%)
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const ProfileForm: React.FC<ProfileFormProps> = ({ 
  onProfileUpdate, 
  extractedProfile, 
  extractionConfidence, 
  onReExtract 
}) => {
  // stable id prefix for form fields (avoids collisions and unused-useId issues)
  const idPrefixRef = useRef(`pf-${Math.random().toString(36).slice(2, 8)}`);
  const idPrefix = idPrefixRef.current;
  const { addNotification } = useNotifications();

  const [profile, setProfile] = useState<UserProfile>({
    personalInfo: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: {
        street: '',
        city: '',
        state: '',
        postCode: '',
        country: ''
      }
    },
    workInfo: {
      currentTitle: '',
      experience: '',
      skills: [],
      linkedinUrl: '',
      portfolioUrl: ''
    },
    preferences: {
      autofillEnabled: true,
      lastUpdated: Date.now()
    }
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<number | null>(null);
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Track auto-populated fields
  const [autoPopulatedFields, setAutoPopulatedFields] = useState<Set<string>>(new Set());
  
  // Re-extraction confirmation dialog
  const [showReExtractDialog, setShowReExtractDialog] = useState(false);
  
  // Section collapse states
  const [sectionsOpen, setSectionsOpen] = useState({
    personal: true,
    address: false,
    work: false,
  });

  // Load existing profile data on component mount
  useEffect(() => {
    loadProfile();
  }, []);

  // Handle extracted profile data
  useEffect(() => {
    if (extractedProfile) {
      mergeExtractedProfile(extractedProfile);
    }
  }, [extractedProfile]);

  // Auto-save functionality
  const autoSave = useCallback(async (profileData: UserProfile) => {
    try {
      const updatedProfile = {
        ...profileData,
        preferences: {
          ...profileData.preferences,
          lastUpdated: Date.now()
        }
      };

      await messaging.setUserProfile(updatedProfile);
      setLastSaved(Date.now());
      setHasUnsavedChanges(false);
      
      if (onProfileUpdate) {
        onProfileUpdate(updatedProfile);
      }
    } catch (error) {
      console.error('Auto-save error:', error);
      addNotification({
        type: 'error',
        title: 'Auto-save Failed',
        message: 'Your changes could not be saved automatically. Please save manually.',
        autoHide: true,
        duration: 5000,
      });
    }
  }, [onProfileUpdate, addNotification]);

  // Trigger auto-save when profile changes
  useEffect(() => {
    if (hasUnsavedChanges) {
      // Clear existing timeout
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }

      // Set new timeout for auto-save (2 seconds after last change)
      const timeout = setTimeout(() => {
        autoSave(profile);
      }, 2000);

      setAutoSaveTimeout(timeout);

      // Cleanup timeout on unmount or dependency change
      return () => {
        if (timeout) {
          clearTimeout(timeout);
        }
      };
    }
  }, [profile, hasUnsavedChanges, autoSave, autoSaveTimeout]);

  // Calculate profile completion
  const calculateCompletion = useCallback(() => {
    const personalFields = [
      profile.personalInfo.firstName,
      profile.personalInfo.lastName,
      profile.personalInfo.email,
      profile.personalInfo.phone,
    ];
    const personalCompleted = personalFields.filter(field => field.trim().length > 0).length;

    const addressFields = [
      profile.personalInfo.address.street,
      profile.personalInfo.address.city,
      profile.personalInfo.address.state,
      profile.personalInfo.address.postCode,
      profile.personalInfo.address.country,
    ];
    const addressCompleted = addressFields.filter(field => field.trim().length > 0).length;

    const workFields = [
      profile.workInfo.currentTitle || '',
      profile.workInfo.experience || '',
      (profile.workInfo.skills || []).join(''),
      profile.workInfo.linkedinUrl || '',
      profile.workInfo.portfolioUrl || '',
    ];
    const workCompleted = workFields.filter(field => field.trim().length > 0).length;

    return {
      personal: { completed: personalCompleted, total: personalFields.length },
      address: { completed: addressCompleted, total: addressFields.length },
      work: { completed: workCompleted, total: workFields.length },
      overall: { 
        completed: personalCompleted + addressCompleted + workCompleted, 
        total: personalFields.length + addressFields.length + workFields.length 
      }
    };
  }, [profile]);

  const completion = calculateCompletion();

  const mergeExtractedProfile = useCallback((extracted: Partial<UserProfile>) => {
    const newAutoPopulatedFields = new Set<string>();
    
    setProfile(prev => {
      const merged = { ...prev };
      
      // Merge personal info
      if (extracted.personalInfo) {
        Object.entries(extracted.personalInfo).forEach(([key, value]) => {
          if (value && typeof value === 'string' && value.trim()) {
            // Only auto-populate if the field is currently empty
            if (key === 'address') return; // Handle address separately
            const currentValue = (merged.personalInfo as any)[key];
            if (!currentValue || currentValue.trim() === '') {
              (merged.personalInfo as any)[key] = value;
              newAutoPopulatedFields.add(`personalInfo.${key}`);
            }
          }
        });
        
        // Handle address separately
        if (extracted.personalInfo.address) {
          Object.entries(extracted.personalInfo.address).forEach(([key, value]) => {
            if (value && typeof value === 'string' && value.trim()) {
              const currentValue = (merged.personalInfo.address as any)[key];
              if (!currentValue || currentValue.trim() === '') {
                (merged.personalInfo.address as any)[key] = value;
                newAutoPopulatedFields.add(`address.${key}`);
              }
            }
          });
        }
      }
      
      // Merge work info
      if (extracted.workInfo) {
        Object.entries(extracted.workInfo).forEach(([key, value]) => {
          if (value) {
            const currentValue = (merged.workInfo as any)[key];
            if (key === 'skills' && Array.isArray(value)) {
              // Merge skills arrays if current is empty
              if (!currentValue || currentValue.length === 0) {
                merged.workInfo.skills = value;
                newAutoPopulatedFields.add(`workInfo.${key}`);
              }
            } else if (typeof value === 'string' && value.trim()) {
              // Only auto-populate if the field is currently empty
              if (!currentValue || currentValue.trim() === '') {
                (merged.workInfo as any)[key] = value;
                newAutoPopulatedFields.add(`workInfo.${key}`);
              }
            }
          }
        });
      }
      
      return merged;
    });
    
    setAutoPopulatedFields(newAutoPopulatedFields);
    setHasUnsavedChanges(true);
    
    // Show notification about auto-population
    addNotification({
      type: 'success',
      title: 'Profile Auto-Populated',
      message: `${newAutoPopulatedFields.size} fields were automatically filled from your CV.`,
      autoHide: true,
      duration: 5000,
    });
  }, [addNotification]);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const existingProfile = await messaging.getUserProfile();
      if (existingProfile) {
        setProfile(prev => ({
          ...prev,
          ...existingProfile,
          personalInfo: { ...(prev.personalInfo || {}), ...(existingProfile.personalInfo || {}) },
          workInfo: { ...(prev.workInfo || {}), ...(existingProfile.workInfo || {}) },
          preferences: { ...(prev.preferences || {}), ...(existingProfile.preferences || {}) }
        }));
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      addNotification({
        type: 'error',
        title: 'Load Failed',
        message: 'Error loading profile data',
        autoHide: true,
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Required field validation
    if (!profile.personalInfo.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!profile.personalInfo.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!profile.personalInfo.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.personalInfo.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!profile.personalInfo.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[\+]?[\d\s\-\(\)]{10,}$/.test(profile.personalInfo.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setProfile(prev => {
      const newProfile = { ...prev };

      // Handle nested fields
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        if (parent === 'personalInfo') {
          if (child === 'address') {
            // This shouldn't happen with current implementation
            return prev;
          } else {
            (newProfile.personalInfo as any)[child] = value;
          }
        } else if (parent === 'workInfo') {
          (newProfile.workInfo as any)[child] = value;
        } else if (parent === 'address') {
          (newProfile.personalInfo.address as any)[child] = value;
        }
      } else {
        // Handle top-level fields
        (newProfile as any)[field] = value;
      }

      return newProfile;
    });

    // Remove field from auto-populated set when user manually edits
    if (autoPopulatedFields.has(field)) {
      setAutoPopulatedFields(prev => {
        const newSet = new Set(prev);
        newSet.delete(field);
        return newSet;
      });
    }

    // Mark as having unsaved changes
    setHasUnsavedChanges(true);

    // Real-time validation - clear error and validate field
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }

    // Perform real-time validation for specific fields
    validateField(field, value);
  };

  const validateField = (field: string, value: string) => {
    const newErrors: Partial<FormErrors> = {};

    switch (field) {
      case 'personalInfo.email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          newErrors.email = 'Please enter a valid email address';
        }
        break;
      case 'personalInfo.phone':
        if (value && !/^[\+]?[\d\s\-\(\)]{10,}$/.test(value)) {
          newErrors.phone = 'Please enter a valid phone number';
        }
        break;
      case 'personalInfo.firstName':
        if (!value.trim()) {
          newErrors.firstName = 'First name is required';
        }
        break;
      case 'personalInfo.lastName':
        if (!value.trim()) {
          newErrors.lastName = 'Last name is required';
        }
        break;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(prev => ({ ...prev, ...newErrors }));
    }
  };

  const handleSkillsChange = (skillsText: string) => {
    const skillsArray = skillsText.split(',').map(skill => skill.trim()).filter(skill => skill);
    setProfile(prev => ({
      ...prev,
      workInfo: {
        ...prev.workInfo,
        skills: skillsArray
      }
    }));

    // Remove field from auto-populated set when user manually edits
    if (autoPopulatedFields.has('workInfo.skills')) {
      setAutoPopulatedFields(prev => {
        const newSet = new Set(prev);
        newSet.delete('workInfo.skills');
        return newSet;
      });
    }

    setHasUnsavedChanges(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fix the errors in the form before saving.',
        autoHide: true,
        duration: 4000,
      });
      return;
    }

    setIsSaving(true);

    try {
      const updatedProfile = {
        ...profile,
        preferences: {
          ...profile.preferences,
          lastUpdated: Date.now()
        }
      };

      await messaging.setUserProfile(updatedProfile);
      setProfile(updatedProfile);
      setLastSaved(Date.now());
      setHasUnsavedChanges(false);

      addNotification({
        type: 'success',
        title: 'Profile Saved',
        message: 'Your profile has been saved successfully!',
        autoHide: true,
        duration: 3000,
      });

      if (onProfileUpdate) {
        onProfileUpdate(updatedProfile);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      addNotification({
        type: 'error',
        title: 'Save Failed',
        message: 'Error saving profile. Please try again.',
        autoHide: true,
        duration: 5000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSection = (section: keyof typeof sectionsOpen) => {
    setSectionsOpen(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const isFieldValid = (field: string, value: string): boolean => {
    switch (field) {
      case 'email':
        return value.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'phone':
        return value.length > 0 && /^[\+]?[\d\s\-\(\)]{10,}$/.test(value);
      case 'firstName':
      case 'lastName':
        return value.trim().length > 0;
      default:
        return value.trim().length > 0;
    }
  };

  const getFieldConfidence = (fieldPath: string): number | undefined => {
    if (!extractionConfidence || !autoPopulatedFields.has(fieldPath)) {
      return undefined;
    }
    
    // Map field paths to confidence keys
    const confidenceKeyMap: Record<string, string> = {
      'personalInfo.firstName': 'personalInfo',
      'personalInfo.lastName': 'personalInfo',
      'personalInfo.email': 'personalInfo',
      'personalInfo.phone': 'personalInfo',
      'address.street': 'personalInfo',
      'address.city': 'personalInfo',
      'address.state': 'personalInfo',
      'address.postCode': 'personalInfo',
      'address.country': 'personalInfo',
      'workInfo.currentTitle': 'workExperience',
      'workInfo.experience': 'workExperience',
      'workInfo.skills': 'skills',
      'workInfo.linkedinUrl': 'personalInfo',
      'workInfo.portfolioUrl': 'personalInfo',
    };
    
    const confidenceKey = confidenceKeyMap[fieldPath];
    return confidenceKey ? extractionConfidence[confidenceKey] : undefined;
  };

  const handleReExtract = () => {
    setShowReExtractDialog(true);
  };

  const confirmReExtract = () => {
    if (onReExtract) {
      onReExtract();
      setShowReExtractDialog(false);
      addNotification({
        type: 'info',
        title: 'Re-extraction Started',
        message: 'Your CV is being re-processed. New data will appear shortly.',
        autoHide: true,
        duration: 4000,
      });
    }
  };

  const cancelReExtract = () => {
    setShowReExtractDialog(false);
  };

  if (isLoading) {
    return (
      <div style={mergeStyles(layoutStyles.flexCenter, { padding: spacing[4], minHeight: '200px' })}>
        <div style={textStyles.body}>Loading profile...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: spacing[4] }}>
      {/* Profile Completion Header */}
      <div style={{
        marginBottom: spacing[6],
        padding: spacing[4],
        backgroundColor: colors.neutral[50],
        borderRadius: borderRadius.lg,
        border: `1px solid ${colors.neutral[200]}`,
      }}>
        <div style={mergeStyles(layoutStyles.flexBetween, { marginBottom: spacing[2] })}>
          <h2 style={textStyles.heading1}>Profile Setup</h2>
          <div style={{
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.medium,
            color: completion.overall.completed === completion.overall.total ? colors.success[600] : colors.primary[600],
          }}>
            {Math.round((completion.overall.completed / completion.overall.total) * 100)}% Complete
          </div>
        </div>
        
        <div style={{
          width: '100%',
          height: '8px',
          backgroundColor: colors.neutral[200],
          borderRadius: borderRadius.full,
          overflow: 'hidden',
          marginBottom: spacing[2],
        }}>
          <div style={{
            width: `${(completion.overall.completed / completion.overall.total) * 100}%`,
            height: '100%',
            backgroundColor: completion.overall.completed === completion.overall.total ? colors.success[500] : colors.primary[500],
            transition: transitions.normal,
          }} />
        </div>

        {/* Auto-save status */}
        <div style={layoutStyles.flexBetween}>
          <div style={{
            fontSize: typography.fontSize.xs,
            color: colors.neutral[500],
          }}>
            {hasUnsavedChanges ? (
              <span style={{ color: colors.warning[600] }}>● Unsaved changes</span>
            ) : lastSaved ? (
              <span style={{ color: colors.success[600] }}>✓ Auto-saved {new Date(lastSaved).toLocaleTimeString()}</span>
            ) : (
              'Changes auto-save after 2 seconds'
            )}
          </div>
          <div style={{
            fontSize: typography.fontSize.xs,
            color: colors.neutral[500],
          }}>
            {completion.overall.completed}/{completion.overall.total} fields completed
          </div>
        </div>
      </div>

      {/* Extraction Confidence Summary */}
      {extractionConfidence && autoPopulatedFields.size > 0 && (
        <div style={{
          marginBottom: spacing[4],
          padding: spacing[4],
          backgroundColor: colors.primary[50],
          borderRadius: borderRadius.lg,
          border: `1px solid ${colors.primary[200]}`,
        }}>
          <h3 style={mergeStyles(textStyles.heading3, { marginBottom: spacing[3] })}>
            CV Extraction Summary
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: spacing[3],
          }}>
            {Object.entries(extractionConfidence).map(([category, confidence]) => (
              <div key={category} style={{
                padding: spacing[3],
                backgroundColor: colors.neutral[50],
                borderRadius: borderRadius.base,
                border: `1px solid ${colors.neutral[200]}`,
              }}>
                <div style={mergeStyles(layoutStyles.flexBetween, { marginBottom: spacing[2] })}>
                  <span style={{
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.medium,
                    color: colors.neutral[700],
                    textTransform: 'capitalize',
                  }}>
                    {category.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <span style={{
                    backgroundColor: getConfidenceColor(confidence).background,
                    color: getConfidenceColor(confidence).text,
                    padding: `${spacing[1]} ${spacing[2]}`,
                    borderRadius: borderRadius.sm,
                    fontSize: typography.fontSize.xs,
                    fontWeight: typography.fontWeight.medium,
                  }}>
                    {getConfidenceLabel(confidence)}
                  </span>
                </div>
                <div style={{
                  width: '100%',
                  height: '4px',
                  backgroundColor: colors.neutral[200],
                  borderRadius: borderRadius.full,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${confidence * 100}%`,
                    height: '100%',
                    backgroundColor: getConfidenceColor(confidence).text,
                    transition: transitions.normal,
                  }} />
                </div>
                <div style={{
                  fontSize: typography.fontSize.xs,
                  color: colors.neutral[500],
                  marginTop: spacing[1],
                }}>
                  {Math.round(confidence * 100)}% confidence
                </div>
              </div>
            ))}
          </div>
          <div style={{
            marginTop: spacing[3],
            padding: spacing[2],
            backgroundColor: colors.neutral[100],
            borderRadius: borderRadius.sm,
            fontSize: typography.fontSize.xs,
            color: colors.neutral[600],
          }}>
            <strong>Note:</strong> Fields marked with 🤖 were auto-populated from your CV. 
            You can edit any field, and your changes will be preserved.
          </div>
        </div>
      )}

      {/* Re-extraction Button */}
      {onReExtract && (
        <div style={{
          marginBottom: spacing[4],
          padding: spacing[3],
          backgroundColor: colors.neutral[50],
          borderRadius: borderRadius.lg,
          border: `1px solid ${colors.neutral[200]}`,
        }}>
          <div style={mergeStyles(layoutStyles.flexBetween, { alignItems: 'center' })}>
            <div>
              <h3 style={mergeStyles(textStyles.heading3, { marginBottom: spacing[1] })}>
                CV Data Extraction
              </h3>
              <p style={{
                fontSize: typography.fontSize.sm,
                color: colors.neutral[600],
                margin: 0,
              }}>
                Re-extract profile information from your uploaded CV
              </p>
            </div>
            <button
              type="button"
              onClick={handleReExtract}
              style={mergeStyles(
                buttonStyles.base,
                buttonStyles.secondary,
                {
                  padding: `${spacing[2]} ${spacing[3]}`,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.medium,
                }
              )}
            >
              <span style={layoutStyles.flexRow}>
                <span style={{ marginRight: spacing[2] }}>🔄</span>
                Re-extract from CV
              </span>
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Personal Information Section */}
        <CollapsibleSection
          title="Personal Information"
          isOpen={sectionsOpen.personal}
          onToggle={() => toggleSection('personal')}
          completionCount={completion.personal.completed}
          totalFields={completion.personal.total}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[3], marginBottom: spacing[3] }}>
            <FloatingLabelInput
              id={`${idPrefix}-firstName`}
              name="given-name"
              autoComplete="given-name"
              value={profile.personalInfo.firstName}
              onChange={(value) => handleInputChange('personalInfo.firstName', value)}
              label="First Name"
              placeholder="John"
              required
              error={errors.firstName}
              success={isFieldValid('firstName', profile.personalInfo.firstName)}
              isAutoPopulated={autoPopulatedFields.has('personalInfo.firstName')}
              confidence={getFieldConfidence('personalInfo.firstName')}
            />
            <FloatingLabelInput
              id={`${idPrefix}-lastName`}
              name="family-name"
              autoComplete="family-name"
              value={profile.personalInfo.lastName}
              onChange={(value) => handleInputChange('personalInfo.lastName', value)}
              label="Last Name"
              placeholder="Doe"
              required
              error={errors.lastName}
              success={isFieldValid('lastName', profile.personalInfo.lastName)}
              isAutoPopulated={autoPopulatedFields.has('personalInfo.lastName')}
              confidence={getFieldConfidence('personalInfo.lastName')}
            />
          </div>

          <FloatingLabelInput
            id={`${idPrefix}-email`}
            name="email"
            type="email"
            autoComplete="email"
            value={profile.personalInfo.email}
            onChange={(value) => handleInputChange('personalInfo.email', value)}
            label="Email"
            placeholder="john.doe@example.com"
            required
            error={errors.email}
            success={isFieldValid('email', profile.personalInfo.email)}
            isAutoPopulated={autoPopulatedFields.has('personalInfo.email')}
            confidence={getFieldConfidence('personalInfo.email')}
          />

          <FloatingLabelInput
            id={`${idPrefix}-phone`}
            name="tel"
            type="tel"
            autoComplete="tel"
            value={profile.personalInfo.phone}
            onChange={(value) => handleInputChange('personalInfo.phone', value)}
            label="Phone"
            placeholder="+1 (555) 123-4567"
            required
            error={errors.phone}
            success={isFieldValid('phone', profile.personalInfo.phone)}
            isAutoPopulated={autoPopulatedFields.has('personalInfo.phone')}
            confidence={getFieldConfidence('personalInfo.phone')}
          />
        </CollapsibleSection>

        {/* Address Section */}
        <CollapsibleSection
          title="Address Information"
          isOpen={sectionsOpen.address}
          onToggle={() => toggleSection('address')}
          completionCount={completion.address.completed}
          totalFields={completion.address.total}
        >
          <FloatingLabelInput
            id={`${idPrefix}-street`}
            name="street-address"
            autoComplete="street-address"
            value={profile.personalInfo.address.street}
            onChange={(value) => handleInputChange('address.street', value)}
            label="Street Address"
            placeholder="123 Main Street"
            isAutoPopulated={autoPopulatedFields.has('address.street')}
            confidence={getFieldConfidence('address.street')}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[3] }}>
            <FloatingLabelInput
              id={`${idPrefix}-city`}
              name="address-level2"
              autoComplete="address-level2"
              value={profile.personalInfo.address.city}
              onChange={(value) => handleInputChange('address.city', value)}
              label="City"
              placeholder="New York"
              isAutoPopulated={autoPopulatedFields.has('address.city')}
              confidence={getFieldConfidence('address.city')}
            />
            <FloatingLabelInput
              id={`${idPrefix}-state`}
              name="address-level1"
              autoComplete="address-level1"
              value={profile.personalInfo.address.state}
              onChange={(value) => handleInputChange('address.state', value)}
              label="State/Province"
              placeholder="NY"
              isAutoPopulated={autoPopulatedFields.has('address.state')}
              confidence={getFieldConfidence('address.state')}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[3] }}>
            <FloatingLabelInput
              id={`${idPrefix}-postal`}
              name="postal-code"
              autoComplete="postal-code"
              value={profile.personalInfo.address.postCode}
              onChange={(value) => handleInputChange('address.postCode', value)}
              label="Postal Code"
              placeholder="10001"
              isAutoPopulated={autoPopulatedFields.has('address.postCode')}
              confidence={getFieldConfidence('address.postCode')}
            />
            <FloatingLabelInput
              id={`${idPrefix}-country`}
              name="country-name"
              autoComplete="country-name"
              value={profile.personalInfo.address.country}
              onChange={(value) => handleInputChange('address.country', value)}
              label="Country"
              placeholder="United States"
              isAutoPopulated={autoPopulatedFields.has('address.country')}
              confidence={getFieldConfidence('address.country')}
            />
          </div>
        </CollapsibleSection>

        {/* Work Information Section */}
        <CollapsibleSection
          title="Work Information"
          isOpen={sectionsOpen.work}
          onToggle={() => toggleSection('work')}
          completionCount={completion.work.completed}
          totalFields={completion.work.total}
        >
          <FloatingLabelInput
            id={`${idPrefix}-jobTitle`}
            name="organization-title"
            autoComplete="organization-title"
            value={profile.workInfo.currentTitle || ''}
            onChange={(value) => handleInputChange('workInfo.currentTitle', value)}
            label="Current Job Title"
            placeholder="Software Engineer"
            isAutoPopulated={autoPopulatedFields.has('workInfo.currentTitle')}
            confidence={getFieldConfidence('workInfo.currentTitle')}
          />

          <FloatingLabelInput
            id={`${idPrefix}-experience`}
            name="experience"
            value={profile.workInfo.experience || ''}
            onChange={(value) => handleInputChange('workInfo.experience', value)}
            label="Years of Experience"
            placeholder="5 years"
            isAutoPopulated={autoPopulatedFields.has('workInfo.experience')}
            confidence={getFieldConfidence('workInfo.experience')}
          />

          <FloatingLabelInput
            id={`${idPrefix}-skills`}
            name="skills"
            value={profile.workInfo.skills?.join(', ') || ''}
            onChange={(value) => handleSkillsChange(value)}
            label="Skills"
            placeholder="JavaScript, React, Node.js"
            isAutoPopulated={autoPopulatedFields.has('workInfo.skills')}
            confidence={getFieldConfidence('workInfo.skills')}
          />

          <FloatingLabelInput
            id={`${idPrefix}-linkedin`}
            name="linkedin"
            type="url"
            value={profile.workInfo.linkedinUrl || ''}
            onChange={(value) => handleInputChange('workInfo.linkedinUrl', value)}
            label="LinkedIn URL"
            placeholder="https://linkedin.com/in/johndoe"
            isAutoPopulated={autoPopulatedFields.has('workInfo.linkedinUrl')}
            confidence={getFieldConfidence('workInfo.linkedinUrl')}
          />

          <FloatingLabelInput
            id={`${idPrefix}-portfolio`}
            name="portfolio"
            type="url"
            value={profile.workInfo.portfolioUrl || ''}
            onChange={(value) => handleInputChange('workInfo.portfolioUrl', value)}
            label="Portfolio URL"
            placeholder="https://johndoe.dev"
            isAutoPopulated={autoPopulatedFields.has('workInfo.portfolioUrl')}
            confidence={getFieldConfidence('workInfo.portfolioUrl')}
          />
        </CollapsibleSection>

        {/* Save Button */}
        <div style={{ marginTop: spacing[6] }}>
          <button
            type="submit"
            disabled={isSaving}
            style={mergeStyles(
              buttonStyles.base,
              buttonStyles.primary,
              {
                width: '100%',
                padding: `${spacing[3]} ${spacing[4]}`,
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.semibold,
              },
              isSaving ? { opacity: 0.7, cursor: 'not-allowed' } : {}
            )}
          >
            {isSaving ? (
              <span style={layoutStyles.flexRow}>
                <span style={{ marginRight: spacing[2] }}>⏳</span>
                Saving Profile...
              </span>
            ) : (
              <span style={layoutStyles.flexRow}>
                <span style={{ marginRight: spacing[2] }}>💾</span>
                Save Profile
              </span>
            )}
          </button>
        </div>
      </form>

      {/* Re-extraction Confirmation Dialog */}
      {showReExtractDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: colors.neutral[50],
            borderRadius: borderRadius.lg,
            padding: spacing[6],
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          }}>
            <h3 style={mergeStyles(textStyles.heading2, { marginBottom: spacing[3] })}>
              Re-extract Profile Data?
            </h3>
            <p style={{
              fontSize: typography.fontSize.sm,
              color: colors.neutral[600],
              marginBottom: spacing[4],
              lineHeight: 1.5,
            }}>
              This will re-process your CV and may overwrite some of the current profile information. 
              Any manual edits you've made will be preserved, but auto-populated fields may be updated 
              with new extracted data.
            </p>
            <div style={{
              display: 'flex',
              gap: spacing[3],
              justifyContent: 'flex-end',
            }}>
              <button
                type="button"
                onClick={cancelReExtract}
                style={mergeStyles(
                  buttonStyles.base,
                  buttonStyles.secondary,
                  {
                    padding: `${spacing[2]} ${spacing[4]}`,
                    fontSize: typography.fontSize.sm,
                  }
                )}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmReExtract}
                style={mergeStyles(
                  buttonStyles.base,
                  buttonStyles.primary,
                  {
                    padding: `${spacing[2]} ${spacing[4]}`,
                    fontSize: typography.fontSize.sm,
                  }
                )}
              >
                <span style={layoutStyles.flexRow}>
                  <span style={{ marginRight: spacing[2] }}>🔄</span>
                  Re-extract
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};