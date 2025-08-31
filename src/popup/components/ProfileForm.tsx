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
    success ? inputStyles.success : {}
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
    </div>
  );
};

export const ProfileForm: React.FC<ProfileFormProps> = ({ onProfileUpdate }) => {
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
            />
            <FloatingLabelInput
              id={`${idPrefix}-state`}
              name="address-level1"
              autoComplete="address-level1"
              value={profile.personalInfo.address.state}
              onChange={(value) => handleInputChange('address.state', value)}
              label="State/Province"
              placeholder="NY"
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
            />
            <FloatingLabelInput
              id={`${idPrefix}-country`}
              name="country-name"
              autoComplete="country-name"
              value={profile.personalInfo.address.country}
              onChange={(value) => handleInputChange('address.country', value)}
              label="Country"
              placeholder="United States"
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
          />

          <FloatingLabelInput
            id={`${idPrefix}-experience`}
            name="experience"
            value={profile.workInfo.experience || ''}
            onChange={(value) => handleInputChange('workInfo.experience', value)}
            label="Years of Experience"
            placeholder="5 years"
          />

          <FloatingLabelInput
            id={`${idPrefix}-skills`}
            name="skills"
            value={profile.workInfo.skills?.join(', ') || ''}
            onChange={(value) => handleSkillsChange(value)}
            label="Skills"
            placeholder="JavaScript, React, Node.js"
          />

          <FloatingLabelInput
            id={`${idPrefix}-linkedin`}
            name="linkedin"
            type="url"
            value={profile.workInfo.linkedinUrl || ''}
            onChange={(value) => handleInputChange('workInfo.linkedinUrl', value)}
            label="LinkedIn URL"
            placeholder="https://linkedin.com/in/johndoe"
          />

          <FloatingLabelInput
            id={`${idPrefix}-portfolio`}
            name="portfolio"
            type="url"
            value={profile.workInfo.portfolioUrl || ''}
            onChange={(value) => handleInputChange('workInfo.portfolioUrl', value)}
            label="Portfolio URL"
            placeholder="https://johndoe.dev"
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
    </div>
  );
};