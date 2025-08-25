import { useState } from 'react';
import { ProfileForm } from './components/ProfileForm';
import { CVUploader } from './components/CVUploader';
import { AutofillToggle } from './components/AutofillToggle';
import { StatusIndicator } from './components/StatusIndicator';
import { UserProfile, CVData } from '../shared/types';

function App() {
  const [activeTab, setActiveTab] = useState<'profile' | 'cv' | 'autofill' | 'status'>('status');
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const handleProfileUpdate = (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);
  };

  const handleCVUpdate = (_updatedCV: CVData | null) => {
    // CV data is managed internally by CVUploader component
    // This callback is kept for potential future use
  };

  const handleToggleChange = (enabled: boolean) => {
    if (profile) {
      setProfile({
        ...profile,
        preferences: {
          ...profile.preferences,
          autofillEnabled: enabled
        }
      });
    }
  };

  const tabStyle = (isActive: boolean) => ({
    padding: '8px 12px',
    backgroundColor: isActive ? '#3498db' : '#f8f9fa',
    color: isActive ? 'white' : '#666',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    fontWeight: isActive ? '500' : 'normal'
  });

  return (
    <div style={{ width: '400px', minHeight: '500px', backgroundColor: 'white' }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 0 16px', borderBottom: '1px solid #eee' }}>
        <h1 style={{ fontSize: '18px', margin: '0 0 16px 0', color: '#2c3e50' }}>
          Job Application Autofill
        </h1>
        
        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
          <button
            onClick={() => setActiveTab('status')}
            style={tabStyle(activeTab === 'status')}
          >
            Status
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            style={tabStyle(activeTab === 'profile')}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab('cv')}
            style={tabStyle(activeTab === 'cv')}
          >
            CV Upload
          </button>
          <button
            onClick={() => setActiveTab('autofill')}
            style={tabStyle(activeTab === 'autofill')}
          >
            Autofill
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ maxHeight: '450px', overflowY: 'auto' }}>
        {activeTab === 'status' && (
          <StatusIndicator />
        )}
        
        {activeTab === 'profile' && (
          <ProfileForm onProfileUpdate={handleProfileUpdate} />
        )}
        
        {activeTab === 'cv' && (
          <CVUploader onCVUpdate={handleCVUpdate} />
        )}
        
        {activeTab === 'autofill' && (
          <AutofillToggle onToggleChange={handleToggleChange} />
        )}
      </div>
    </div>
  );
}

export default App