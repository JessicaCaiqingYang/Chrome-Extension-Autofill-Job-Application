/**
 * Design System Usage Examples
 * This file demonstrates how to use the design system components and utilities
 * Remove this file once the design system is fully implemented across components
 */

import React from 'react';
import { 
  buttonStyles, 
  inputStyles, 
  cardStyles, 
  textStyles,
  mergeStyles,
  formFieldStyles,
  toggleStyles,
  statusStyles
} from './design-system';

// Example: Using button styles
export const ExampleButton: React.FC<{ 
  variant?: 'primary' | 'secondary' | 'danger';
  children: React.ReactNode;
}> = ({ 
  variant = 'primary', 
  children 
}) => {
  const buttonStyle = mergeStyles(
    buttonStyles.base,
    buttonStyles[variant]
  );
  
  return (
    <button style={buttonStyle}>
      {children}
    </button>
  );
};

// Example: Using input styles with floating label
export const ExampleInput: React.FC<{ 
  label: string; 
  error?: string; 
  success?: boolean;
}> = ({ label, error, success }) => {
  const inputStyle = mergeStyles(
    inputStyles.base,
    error ? inputStyles.error : undefined,
    success ? inputStyles.success : undefined
  );
  
  return (
    <div style={formFieldStyles.container}>
      <div style={formFieldStyles.floatingLabel}>
        <input 
          style={inputStyle}
          placeholder=" "
          id={label.toLowerCase().replace(/\s+/g, '-')}
        />
        <label htmlFor={label.toLowerCase().replace(/\s+/g, '-')}>
          {label}
        </label>
      </div>
      {error && (
        <div style={formFieldStyles.errorText}>
          {error}
        </div>
      )}
      {success && !error && (
        <div style={formFieldStyles.successText}>
          Looks good!
        </div>
      )}
    </div>
  );
};

// Example: Using card styles
export const ExampleCard: React.FC<{ 
  title: string; 
  interactive?: boolean;
  children: React.ReactNode;
}> = ({ title, interactive, children }) => {
  const cardStyle = mergeStyles(
    cardStyles.base,
    cardStyles.elevated,
    interactive ? cardStyles.interactive : undefined
  );
  
  return (
    <div style={cardStyle}>
      <h3 style={textStyles.heading2}>{title}</h3>
      <div style={{ marginTop: '12px' }}>
        {children}
      </div>
    </div>
  );
};

// Example: Using toggle styles
export const ExampleToggle: React.FC<{ 
  label: string; 
  checked: boolean; 
  onChange: (checked: boolean) => void;
}> = ({ label, checked, onChange }) => {
  const switchStyle = mergeStyles(
    toggleStyles.switch,
    checked ? toggleStyles.switchActive : undefined
  );
  
  const thumbStyle = mergeStyles(
    toggleStyles.switchThumb,
    checked ? toggleStyles.switchThumbActive : undefined
  );
  
  return (
    <div style={toggleStyles.container}>
      <button 
        style={switchStyle}
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
      >
        <div style={thumbStyle} />
      </button>
      <label style={toggleStyles.label} onClick={() => onChange(!checked)}>
        {label}
      </label>
    </div>
  );
};

// Example: Using status indicator styles
export const ExampleStatus: React.FC<{ 
  status: 'healthy' | 'warning' | 'error';
  title: string;
  metrics: Array<{ label: string; value: string }>;
}> = ({ status, title, metrics }) => {
  const dotStyle = mergeStyles(
    statusStyles.statusDot,
    status === 'healthy' ? statusStyles.statusDotHealthy :
    status === 'warning' ? statusStyles.statusDotWarning :
    statusStyles.statusDotError
  );
  
  return (
    <div style={statusStyles.container}>
      <div style={statusStyles.header}>
        <h3 style={textStyles.heading2}>
          <span style={dotStyle} />
          {title}
        </h3>
      </div>
      {metrics.map((metric, index) => (
        <div key={index} style={statusStyles.metric}>
          <span style={statusStyles.metricLabel}>{metric.label}</span>
          <span style={statusStyles.metricValue}>{metric.value}</span>
        </div>
      ))}
    </div>
  );
};

// Example: Complete form using design system
export const ExampleForm: React.FC = () => {
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    notifications: false,
  });
  
  return (
    <ExampleCard title="Profile Settings">
      <form style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <ExampleInput 
          label="Full Name" 
          success={formData.name.length > 2}
        />
        <ExampleInput 
          label="Email Address" 
          error={formData.email && !formData.email.includes('@') ? 'Please enter a valid email' : undefined}
        />
        <ExampleToggle 
          label="Enable notifications"
          checked={formData.notifications}
          onChange={(checked) => setFormData(prev => ({ ...prev, notifications: checked }))}
        />
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <ExampleButton variant="primary">Save Changes</ExampleButton>
          <ExampleButton variant="secondary">Cancel</ExampleButton>
        </div>
      </form>
    </ExampleCard>
  );
};