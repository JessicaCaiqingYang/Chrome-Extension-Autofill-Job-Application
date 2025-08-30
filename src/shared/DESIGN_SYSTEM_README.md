# Design System Documentation

This design system provides a comprehensive foundation for consistent styling across the job application autofill Chrome extension.

## Overview

The design system includes:
- **Design Tokens**: Colors, typography, spacing, and other design constants
- **Styled Utilities**: Reusable styling functions and CSS-in-JS helpers
- **Component Patterns**: Pre-built styling patterns for common UI components
- **Base Styles**: Global CSS styles and animations

## Quick Start

```typescript
import { 
  colors, 
  buttonStyles, 
  inputStyles, 
  cardStyles, 
  textStyles,
  mergeStyles 
} from '../shared/design-system';

// Use design tokens directly
const myStyle = {
  color: colors.primary[600],
  padding: spacing[4],
  borderRadius: borderRadius.lg,
};

// Use pre-built component styles
const buttonStyle = mergeStyles(
  buttonStyles.base,
  buttonStyles.primary
);

// Apply to JSX
<button style={buttonStyle}>Click me</button>
```

## Design Tokens

### Colors
- **Primary**: Blue color palette for actions and highlights
- **Success**: Green color palette for positive states
- **Warning**: Amber color palette for warnings
- **Error**: Red color palette for errors
- **Neutral**: Gray color palette for text and backgrounds

```typescript
colors.primary[600]  // Main primary color
colors.success[600]  // Main success color
colors.neutral[700]  // Main text color
colors.neutral[50]   // Light background
```

### Typography
- **Font Family**: System font stack
- **Font Sizes**: xs (12px), sm (14px), base (16px), lg (18px), xl (20px)
- **Font Weights**: normal (400), medium (500), semibold (600), bold (700)
- **Line Heights**: tight (1.25), normal (1.5), relaxed (1.75)

### Spacing
Based on 8px grid system: 0, 1 (4px), 2 (8px), 3 (12px), 4 (16px), 5 (20px), 6 (24px), 8 (32px), 10 (40px), 12 (48px), 16 (64px)

### Other Tokens
- **Border Radius**: none, sm (4px), base (6px), lg (8px), xl (12px), full (9999px)
- **Shadows**: sm, base, md, lg, xl
- **Transitions**: fast (150ms), normal (200ms), slow (300ms)

## Component Patterns

### Buttons
```typescript
import { buttonStyles, mergeStyles } from '../shared/design-system';

const primaryButton = mergeStyles(buttonStyles.base, buttonStyles.primary);
const secondaryButton = mergeStyles(buttonStyles.base, buttonStyles.secondary);
const dangerButton = mergeStyles(buttonStyles.base, buttonStyles.danger);
```

### Form Inputs
```typescript
import { inputStyles, formFieldStyles, mergeStyles } from '../shared/design-system';

const inputStyle = mergeStyles(inputStyles.base);
const errorInputStyle = mergeStyles(inputStyles.base, inputStyles.error);
const successInputStyle = mergeStyles(inputStyles.base, inputStyles.success);
```

### Cards
```typescript
import { cardStyles, mergeStyles } from '../shared/design-system';

const cardStyle = mergeStyles(cardStyles.base, cardStyles.elevated);
const interactiveCardStyle = mergeStyles(cardStyles.base, cardStyles.interactive);
```

### Tabs
```typescript
import { tabStyles, mergeStyles } from '../shared/design-system';

const tabContainerStyle = tabStyles.container;
const tabStyle = tabStyles.tab;
const activeTabStyle = mergeStyles(tabStyles.tab, tabStyles.tabActive);
```

### Toggle Switches
```typescript
import { toggleStyles, mergeStyles } from '../shared/design-system';

const switchStyle = mergeStyles(
  toggleStyles.switch,
  isActive ? toggleStyles.switchActive : undefined
);
```

### Status Indicators
```typescript
import { statusStyles, mergeStyles } from '../shared/design-system';

const statusContainer = statusStyles.container;
const healthyDot = mergeStyles(statusStyles.statusDot, statusStyles.statusDotHealthy);
const warningDot = mergeStyles(statusStyles.statusDot, statusStyles.statusDotWarning);
const errorDot = mergeStyles(statusStyles.statusDot, statusStyles.statusDotError);
```

### Notifications
```typescript
import { notificationStyles, mergeStyles } from '../shared/design-system';

const successNotification = mergeStyles(
  notificationStyles.notification,
  notificationStyles.notificationSuccess
);
```

### Progress Indicators
```typescript
import { progressStyles } from '../shared/design-system';

const progressContainer = progressStyles.container;
const progressBar = progressStyles.bar;
```

### Loading States
```typescript
import { loadingStyles } from '../shared/design-system';

const spinner = loadingStyles.spinner;
const skeleton = loadingStyles.skeleton;
```

## Utility Functions

### mergeStyles
Combines multiple style objects safely:
```typescript
const combinedStyle = mergeStyles(baseStyle, conditionalStyle, anotherStyle);
```

### getColor
Gets colors from the design token system:
```typescript
const primaryColor = getColor('primary.600');
const neutralColor = getColor('neutral.500');
```

### getSpacing
Gets spacing values from the design token system:
```typescript
const mediumSpacing = getSpacing(4); // Returns '16px'
```

## Accessibility Features

The design system includes:
- **Focus States**: Proper focus indicators for keyboard navigation
- **Color Contrast**: WCAG 2.1 AA compliant color combinations
- **Reduced Motion**: Respects user's motion preferences
- **High Contrast**: Support for high contrast mode
- **Screen Reader**: Proper semantic markup and ARIA labels

## CSS Classes

Base styles include utility classes:
- `.sr-only`: Screen reader only content
- `.truncate`: Text truncation with ellipsis
- `.loading-spinner`: Spinning animation
- `.loading-pulse`: Pulsing animation
- `.bounce-animation`: Bounce animation

## Migration Guide

To migrate existing components to use the design system:

1. Import the design system utilities
2. Replace hardcoded values with design tokens
3. Use pre-built component patterns where applicable
4. Apply consistent spacing and typography
5. Ensure accessibility compliance

## Examples

See `src/shared/example-usage.tsx` for complete examples of how to use the design system components.

## Browser Support

The design system supports:
- Chrome 88+ (Manifest V3 requirement)
- Modern CSS features (CSS Grid, Flexbox, CSS Custom Properties)
- Reduced motion preferences
- High contrast mode