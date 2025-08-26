import React, { useState, useEffect, useRef } from 'react';
import { UserProfile } from '../../shared/types';
import { messaging } from '../../shared/messaging';

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

export const ProfileForm: React.FC<ProfileFormProps> = ({ onProfileUpdate }) => {
  // stable id prefix for form fields (avoids collisions and unused-useId issues)
  const idPrefixRef = useRef(`pf-${Math.random().toString(36).slice(2, 8)}`);
  const idPrefix = idPrefixRef.current;

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
  const [saveMessage, setSaveMessage] = useState<string>('');

  // Load existing profile data on component mount
  useEffect(() => {
    loadProfile();
  }, []);

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
      setSaveMessage('Error loading profile data');
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

    // Clear error for this field when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
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
      return;
    }

    setIsSaving(true);
    setSaveMessage('');

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
      setSaveMessage('Profile saved successfully!');

      if (onProfileUpdate) {
        onProfileUpdate(updatedProfile);
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
      setSaveMessage('Error saving profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '16px', textAlign: 'center' }}>
        <div>Loading profile...</div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ padding: '16px' }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>Personal Information</h3>

      {/* Personal Info Section */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <div style={{ flex: 1 }}>
            <label htmlFor={`${idPrefix}-firstName`} style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>
              First Name *
            </label>
            <input
              id={`${idPrefix}-firstName`}
              name="given-name"
              type="text"
              autoComplete="given-name"
              value={profile.personalInfo.firstName}
              onChange={(e) => handleInputChange('personalInfo.firstName', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: `1px solid ${errors.firstName ? '#e74c3c' : '#ddd'}`,
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
              placeholder="John"
            />
            {errors.firstName && (
              <div style={{ color: '#e74c3c', fontSize: '11px', marginTop: '2px' }}>
                {errors.firstName}
              </div>
            )}
          </div>

          <div style={{ flex: 1 }}>
            <label htmlFor={`${idPrefix}-lastName`} style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>
              Last Name *
            </label>
            <input
              id={`${idPrefix}-lastName`}
              name="family-name"
              type="text"
              autoComplete="family-name"
              value={profile.personalInfo.lastName}
              onChange={(e) => handleInputChange('personalInfo.lastName', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: `1px solid ${errors.lastName ? '#e74c3c' : '#ddd'}`,
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
              placeholder="Doe"
            />
            {errors.lastName && (
              <div style={{ color: '#e74c3c', fontSize: '11px', marginTop: '2px' }}>
                {errors.lastName}
              </div>
            )}
          </div>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label htmlFor={`${idPrefix}-email`} style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>
            Email *
          </label>
          <input
            id={`${idPrefix}-email`}
            name="email"
            type="email"
            autoComplete="email"
            value={profile.personalInfo.email}
            onChange={(e) => handleInputChange('personalInfo.email', e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: `1px solid ${errors.email ? '#e74c3c' : '#ddd'}`,
              borderRadius: '4px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
            placeholder="john.doe@example.com"
          />
          {errors.email && (
            <div style={{ color: '#e74c3c', fontSize: '11px', marginTop: '2px' }}>
              {errors.email}
            </div>
          )}
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label htmlFor={`${idPrefix}-phone`} style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>
            Phone *
          </label>
          <input
            id={`${idPrefix}-phone`}
            name="tel"
            type="tel"
            autoComplete="tel"
            value={profile.personalInfo.phone}
            onChange={(e) => handleInputChange('personalInfo.phone', e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: `1px solid ${errors.phone ? '#e74c3c' : '#ddd'}`,
              borderRadius: '4px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
            placeholder="+1 (555) 123-4567"
          />
          {errors.phone && (
            <div style={{ color: '#e74c3c', fontSize: '11px', marginTop: '2px' }}>
              {errors.phone}
            </div>
          )}
        </div>
      </div>

      {/* Address Section */}
      <h4 style={{ margin: '16px 0 12px 0', fontSize: '14px' }}>Address</h4>
      <div style={{ marginBottom: '16px' }}>
        <div style={{ marginBottom: '12px' }}>
          <label htmlFor={`${idPrefix}-street`} style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>
            Street Address
          </label>
          <input
            id={`${idPrefix}-street`}
            name="street-address"
            type="text"
            autoComplete="street-address"
            value={profile.personalInfo.address.street}
            onChange={(e) => handleInputChange('address.street', e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
            placeholder="123 Main Street"
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <div style={{ flex: 1 }}>
            <label htmlFor={`${idPrefix}-city`} style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>
              City
            </label>
            <input
              id={`${idPrefix}-city`}
              name="address-level2"
              type="text"
              autoComplete="address-level2"
              value={profile.personalInfo.address.city}
              onChange={(e) => handleInputChange('address.city', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
              placeholder="New York"
            />
          </div>

          <div style={{ flex: 1 }}>
            <label htmlFor={`${idPrefix}-state`} style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>
              State
            </label>
            <input
              id={`${idPrefix}-state`}
              name="address-level1"
              type="text"
              autoComplete="address-level1"
              value={profile.personalInfo.address.state}
              onChange={(e) => handleInputChange('address.state', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
              placeholder="NY"
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <div style={{ flex: 1 }}>
            <label htmlFor={`${idPrefix}-postal`} style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>
              Postal Code
            </label>
            <input
              id={`${idPrefix}-postal`}
              name="postal-code"
              type="text"
              autoComplete="postal-code"
              value={profile.personalInfo.address.postCode}
              onChange={(e) => handleInputChange('address.postCode', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
              placeholder="10001"
            />
          </div>

          <div style={{ flex: 1 }}>
            <label htmlFor={`${idPrefix}-country`} style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>
              Country
            </label>
            <input
              id={`${idPrefix}-country`}
              name="country-name"
              type="text"
              autoComplete="country-name"
              value={profile.personalInfo.address.country}
              onChange={(e) => handleInputChange('address.country', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
              placeholder="United States"
            />
          </div>
        </div>
      </div>

      {/* Work Info Section */}
      <h4 style={{ margin: '16px 0 12px 0', fontSize: '14px' }}>Work Information (Optional)</h4>
      <div style={{ marginBottom: '16px' }}>
        <div style={{ marginBottom: '12px' }}>
          <label htmlFor={`${idPrefix}-jobTitle`} style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>
            Current Job Title
          </label>
          <input
            id={`${idPrefix}-jobTitle`}
            name="organization-title"
            type="text"
            autoComplete="organization-title"
            value={profile.workInfo.currentTitle || ''}
            onChange={(e) => handleInputChange('workInfo.currentTitle', e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
            placeholder="Software Engineer"
          />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label htmlFor={`${idPrefix}-experience`} style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>
            Years of Experience
          </label>
          <input
            id={`${idPrefix}-experience`}
            name="experience"
            type="text"
            value={profile.workInfo.experience || ''}
            onChange={(e) => handleInputChange('workInfo.experience', e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
            placeholder="5 years"
          />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label htmlFor={`${idPrefix}-skills`} style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>
            Skills (comma-separated)
          </label>
          <input
            id={`${idPrefix}-skills`}
            name="skills"
            type="text"
            value={profile.workInfo.skills?.join(', ') || ''}
            onChange={(e) => handleSkillsChange(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
            placeholder="JavaScript, React, Node.js"
          />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label htmlFor={`${idPrefix}-linkedin`} style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>
            LinkedIn URL
          </label>
          <input
            id={`${idPrefix}-linkedin`}
            name="linkedin"
            type="url"
            value={profile.workInfo.linkedinUrl || ''}
            onChange={(e) => handleInputChange('workInfo.linkedinUrl', e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
            placeholder="https://linkedin.com/in/johndoe"
          />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label htmlFor={`${idPrefix}-portfolio`} style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>
            Portfolio URL
          </label>
          <input
            id={`${idPrefix}-portfolio`}
            name="portfolio"
            type="url"
            value={profile.workInfo.portfolioUrl || ''}
            onChange={(e) => handleInputChange('workInfo.portfolioUrl', e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
            placeholder="https://johndoe.dev"
          />
        </div>
      </div>

      {/* Save Button and Messages */}
      <div style={{ marginTop: '20px' }}>
        <button
          type="submit"
          disabled={isSaving}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: isSaving ? '#95a5a6' : '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: isSaving ? 'not-allowed' : 'pointer'
          }}
        >
          {isSaving ? 'Saving...' : 'Save Profile'}
        </button>

        {saveMessage && (
          <div
            style={{
              marginTop: '8px',
              padding: '8px',
              borderRadius: '4px',
              fontSize: '12px',
              textAlign: 'center',
              backgroundColor: saveMessage.includes('Error') ? '#fee' : '#efe',
              color: saveMessage.includes('Error') ? '#c33' : '#060',
              border: `1px solid ${saveMessage.includes('Error') ? '#fcc' : '#cfc'}`
            }}
          >
            {saveMessage}
          </div>
        )}
      </div>
    </form>
  );
};