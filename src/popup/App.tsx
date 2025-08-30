import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { StatusIndicator } from './components/StatusIndicator';

// Lazy load heavy components to improve initial popup load time
const ProfileForm = lazy(() => import('./components/ProfileForm').then(module => ({ default: module.ProfileForm })));
const CVUploader = lazy(() => import('./components/CVUploader').then(module => ({ default: module.CVUploader })));
const AutofillToggle = lazy(() => import('./components/AutofillToggle').then(module => ({ default: module.AutofillToggle })));
import { UserProfile, CVData } from '../shared/types';
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  transitions,
  textStyles,
  mergeStyles
} from '../shared/design-system';

// Tab configuration with icons and labels
const tabs = [
  {
    id: 'status' as const,
    label: 'Status',
    icon: '●', // Status indicator dot
    ariaLabel: 'Extension status and activity'
  },
  {
    id: 'profile' as const,
    label: 'Profile',
    icon: '👤', // User profile icon
    ariaLabel: 'Edit personal profile information'
  },
  {
    id: 'cv' as const,
    label: 'CV',
    icon: '📄', // Document icon
    ariaLabel: 'Upload and manage CV/resume'
  },
  {
    id: 'autofill' as const,
    label: 'Autofill',
    icon: '⚡', // Lightning bolt for automation
    ariaLabel: 'Configure autofill settings'
  },
];

function App() {
  const [activeTab, setActiveTab] = useState<'profile' | 'cv' | 'autofill' | 'status'>('status');
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleProfileUpdate = (updatedProfile: UserProfile) => {
    console.log('🔄 Profile updated in App.tsx, triggering status refresh...', updatedProfile);
    setProfile(updatedProfile);
    // Trigger StatusIndicator refresh via custom event
    setTimeout(() => {
      console.log('🔄 Dispatching refreshStatus event...');
      window.dispatchEvent(new CustomEvent('refreshStatus'));
    }, 100); // Small delay to ensure data is saved
  };

  const handleCVUpdate = (_updatedCV: CVData | null) => {
    console.log('🔄 CV updated in App.tsx, triggering status refresh...', _updatedCV);
    // CV data is managed internally by CVUploader component
    // Trigger StatusIndicator refresh via custom event
    setTimeout(() => {
      console.log('🔄 Dispatching refreshStatus event...');
      window.dispatchEvent(new CustomEvent('refreshStatus'));
    }, 100); // Small delay to ensure data is saved
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
      // Trigger StatusIndicator refresh via custom event
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('refreshStatus'));
      }, 100); // Small delay to ensure data is saved
    }
  };

  // Keyboard navigation handler
  const handleKeyDown = (event: React.KeyboardEvent, tabId: string) => {
    const currentIndex = tabs.findIndex(tab => tab.id === tabId);
    let nextIndex = currentIndex;

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        nextIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
        break;
      case 'ArrowRight':
        event.preventDefault();
        nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'Home':
        event.preventDefault();
        nextIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        nextIndex = tabs.length - 1;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        setActiveTab(tabId as typeof activeTab);
        return;
      default:
        return;
    }

    // Focus the next tab
    const nextTab = tabRefs.current[nextIndex];
    if (nextTab) {
      nextTab.focus();
      setActiveTab(tabs[nextIndex].id);
    }
  };

  // Set up tab refs
  useEffect(() => {
    tabRefs.current = tabRefs.current.slice(0, tabs.length);
  }, []);

  // Modern tab styling with design system
  const getTabStyle = (isActive: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    gap: spacing[1],
    padding: `${spacing[2]} ${spacing[3]}`,
    backgroundColor: 'transparent',
    color: isActive ? colors.primary[600] : colors.neutral[600],
    border: 'none',
    borderRadius: borderRadius.base,
    fontSize: typography.fontSize.xs,
    fontWeight: isActive ? typography.fontWeight.semibold : typography.fontWeight.medium,
    fontFamily: typography.fontFamily.system,
    cursor: 'pointer',
    transition: `all ${transitions.normal}`,
    position: 'relative' as const,
    minWidth: 'fit-content',
    flex: '1 1 auto',
    justifyContent: 'center',
    outline: 'none',
    // Transform for smooth hover effects
    transform: 'translateY(0)',
  });

  const getTabHoverStyle = (isActive: boolean) => ({
    backgroundColor: isActive ? colors.primary[50] : colors.neutral[200],
    color: isActive ? colors.primary[700] : colors.neutral[800],
    transform: 'translateY(-1px)',
    boxShadow: shadows.sm,
  });

  const getTabFocusStyle = () => ({
    boxShadow: `0 0 0 2px ${colors.primary[200]}`,
    backgroundColor: colors.primary[50],
  });

  const getTabIndicatorStyle = (isActive: boolean) => ({
    content: '""',
    position: 'absolute' as const,
    bottom: '0',
    left: '50%',
    transform: 'translateX(-50%)',
    width: isActive ? '32px' : '0px',
    height: '3px',
    backgroundColor: colors.primary[600],
    borderRadius: borderRadius.full,
    transition: `all ${transitions.normal}`,
    opacity: isActive ? 1 : 0,
  });

  const containerStyle = mergeStyles(
    {
      width: '400px',
      minHeight: '500px',
      maxHeight: '600px',
      backgroundColor: colors.neutral[50],
      borderRadius: borderRadius.lg,
      boxShadow: shadows.lg,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column' as const,
    }
  );

  const headerStyle = mergeStyles(
    {
      padding: spacing[4],
      backgroundColor: colors.neutral[50],
      borderBottom: `1px solid ${colors.neutral[200]}`,
    }
  );

  const titleStyle = mergeStyles(
    textStyles.heading1,
    {
      marginBottom: spacing[4],
      color: colors.neutral[900],
    }
  );

  const tabNavigationStyle = mergeStyles(
    {
      display: 'flex',
      gap: '2px',
      padding: spacing[1],
      backgroundColor: colors.neutral[100],
      borderRadius: borderRadius.lg,
      position: 'relative' as const,
      width: '100%',
    }
  );

  const contentStyle = mergeStyles(
    {
      flex: '1',
      overflowY: 'auto' as const,
      backgroundColor: colors.neutral[50],
    }
  );

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h1 style={titleStyle}>
          Job Application Autofill
        </h1>

        {/* Enhanced Tab Navigation */}
        <nav
          style={tabNavigationStyle}
          role="tablist"
          aria-label="Extension navigation"
        >
          {tabs.map((tab, index) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                ref={(el) => (tabRefs.current[index] = el)}
                role="tab"
                aria-selected={isActive}
                aria-controls={`tabpanel-${tab.id}`}
                aria-label={tab.ariaLabel}
                tabIndex={isActive ? 0 : -1}
                className="tab-button"
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(e) => handleKeyDown(e, tab.id)}
                style={getTabStyle(isActive)}
                onMouseEnter={(e) => {
                  Object.assign(e.currentTarget.style, getTabHoverStyle(isActive));
                }}
                onMouseLeave={(e) => {
                  Object.assign(e.currentTarget.style, getTabStyle(isActive));
                }}
                onFocus={(e) => {
                  Object.assign(e.currentTarget.style, {
                    ...getTabStyle(isActive),
                    ...getTabFocusStyle(),
                  });
                }}
                onBlur={(e) => {
                  Object.assign(e.currentTarget.style, getTabStyle(isActive));
                }}
              >
                <span
                  style={{
                    fontSize: typography.fontSize.xs,
                    lineHeight: '1',
                    transition: transitions.fast,
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                >
                  {tab.icon}
                </span>
                <span
                  style={{
                    fontSize: typography.fontSize.xs,
                    fontWeight: 'inherit',
                    whiteSpace: 'nowrap' as const,
                    transition: transitions.fast,
                    flexShrink: 0,
                  }}
                >
                  {tab.label}
                </span>
                {/* Active indicator */}
                <span
                  style={getTabIndicatorStyle(isActive)}
                  className={isActive ? 'tab-indicator' : ''}
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div
        style={contentStyle}
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        className="tab-content"
      >
        {activeTab === 'status' && (
          <StatusIndicator />
        )}

        {activeTab === 'profile' && (
          <Suspense fallback={<div style={{ padding: '16px', textAlign: 'center' }}>Loading...</div>}>
            <ProfileForm onProfileUpdate={handleProfileUpdate} />
          </Suspense>
        )}

        {activeTab === 'cv' && (
          <Suspense fallback={<div style={{ padding: '16px', textAlign: 'center' }}>Loading...</div>}>
            <CVUploader onCVUpdate={handleCVUpdate} />
          </Suspense>
        )}

        {activeTab === 'autofill' && (
          <Suspense fallback={<div style={{ padding: '16px', textAlign: 'center' }}>Loading...</div>}>
            <AutofillToggle onToggleChange={handleToggleChange} />
          </Suspense>
        )}
      </div>
    </div>
  );
}

export default App