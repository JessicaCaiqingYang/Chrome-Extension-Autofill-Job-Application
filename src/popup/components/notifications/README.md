# Notification System

A comprehensive notification system for the Job Application Autofill Chrome extension that provides toast-style notifications with different types, auto-hide functionality, and manual dismiss options.

## Features

- **Multiple notification types**: Success, Error, Warning, Info
- **Auto-hide functionality**: Configurable duration for automatic dismissal
- **Manual dismissal**: Users can manually close notifications
- **Action buttons**: Optional action buttons for user interaction
- **Smooth animations**: Entrance and exit animations
- **Accessibility**: ARIA labels and screen reader support
- **Type-safe**: Full TypeScript support

## Usage

### Basic Setup

1. Wrap your app with the `NotificationProvider`:

```tsx
import { NotificationProvider } from './contexts/NotificationContext';
import { NotificationContainer } from './components/NotificationContainer';

function App() {
  return (
    <NotificationProvider>
      {/* Your app content */}
      <YourAppContent />
      
      {/* Notification container - place at the end */}
      <NotificationContainer />
    </NotificationProvider>
  );
}
```

### Using Notifications in Components

```tsx
import { useNotificationHelpers } from './hooks/useNotificationHelpers';

function MyComponent() {
  const { showSuccess, showError, showWarning, showInfo } = useNotificationHelpers();

  const handleSuccess = () => {
    showSuccess('Operation Complete', 'Your data has been saved successfully');
  };

  const handleError = () => {
    showError('Operation Failed', 'Please try again later', {
      action: {
        label: 'Retry',
        onClick: () => {
          // Retry logic here
        }
      }
    });
  };

  return (
    <div>
      <button onClick={handleSuccess}>Success</button>
      <button onClick={handleError}>Error</button>
    </div>
  );
}
```

### Notification Types

#### Success Notifications
- **Auto-hide**: Yes (4 seconds by default)
- **Use case**: Successful operations, confirmations

```tsx
showSuccess('Profile Saved', 'Your profile has been updated');
```

#### Error Notifications
- **Auto-hide**: No (stays until manually dismissed)
- **Use case**: Errors, failures that need user attention

```tsx
showError('Upload Failed', 'File size too large', {
  action: {
    label: 'Try Again',
    onClick: () => retryUpload()
  }
});
```

#### Warning Notifications
- **Auto-hide**: Yes (6 seconds by default)
- **Use case**: Non-critical issues, warnings

```tsx
showWarning('Profile Incomplete', 'Some fields are missing');
```

#### Info Notifications
- **Auto-hide**: Yes (5 seconds by default)
- **Use case**: General information, tips

```tsx
showInfo('Tip', 'You can upload a CV for better autofill results');
```

### Advanced Usage

#### Custom Duration
```tsx
showSuccess('Quick Message', undefined, { duration: 2000 }); // 2 seconds
```

#### Disable Auto-hide
```tsx
showWarning('Important', 'This stays until dismissed', { autoHide: false });
```

#### With Action Button
```tsx
showError('Connection Failed', 'Check your internet connection', {
  action: {
    label: 'Retry',
    onClick: () => {
      // Retry connection logic
    }
  }
});
```

### Convenience Methods

The `useNotificationHelpers` hook provides convenience methods for common scenarios:

```tsx
const {
  showAutofillSuccess,
  showAutofillError,
  showProfileSaved,
  showCVUploaded,
  showCVUploadError
} = useNotificationHelpers();

// Autofill completed successfully
showAutofillSuccess(5); // "Successfully filled 5 fields"

// Profile saved
showProfileSaved(); // "Your profile information has been updated"

// CV uploaded
showCVUploaded('resume.pdf'); // "resume.pdf has been processed successfully"
```

### Direct Context Access

For more control, you can use the context directly:

```tsx
import { useNotifications } from './contexts/NotificationContext';

function MyComponent() {
  const { addNotification, removeNotification, clearAllNotifications } = useNotifications();

  const showCustomNotification = () => {
    const id = addNotification({
      type: 'success',
      title: 'Custom Notification',
      message: 'This is a custom notification',
      autoHide: true,
      duration: 3000,
      action: {
        label: 'Action',
        onClick: () => console.log('Action clicked')
      }
    });

    // Remove after 10 seconds regardless of auto-hide setting
    setTimeout(() => removeNotification(id), 10000);
  };

  return (
    <div>
      <button onClick={showCustomNotification}>Custom</button>
      <button onClick={clearAllNotifications}>Clear All</button>
    </div>
  );
}
```

## Styling

The notification system uses the design system tokens for consistent styling:

- **Colors**: Matches the extension's color palette
- **Typography**: Uses system font stack
- **Spacing**: Consistent with design system spacing
- **Animations**: Smooth entrance and exit transitions
- **Shadows**: Subtle elevation for visual hierarchy

## Accessibility

- **ARIA labels**: Proper labeling for screen readers
- **Role attributes**: `role="alert"` for notifications
- **Keyboard navigation**: Dismiss buttons are keyboard accessible
- **Focus management**: Proper focus handling for interactive elements

## Testing

The notification system includes comprehensive tests:

```bash
npm test -- NotificationSystem.test.tsx
```

Tests cover:
- Notification display for all types
- Auto-hide functionality
- Manual dismissal
- Multiple notifications
- Action button interactions

## Integration with Extension Components

The notification system is integrated with existing extension components:

- **StatusIndicator**: Shows notifications for autofill completion and errors
- **ProfileForm**: Will show notifications for save operations and validation
- **CVUploader**: Will show notifications for upload progress and completion
- **AutofillToggle**: Will show notifications for state changes

## Performance Considerations

- **Efficient rendering**: Only renders visible notifications
- **Memory management**: Automatic cleanup of timeouts
- **Minimal DOM impact**: Notifications are positioned absolutely
- **Smooth animations**: Hardware-accelerated CSS transitions