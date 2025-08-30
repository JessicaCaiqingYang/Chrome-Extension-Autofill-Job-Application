/**
 * Design System Index
 * Central export point for all design system utilities
 */

// Design tokens
export * from './design-tokens';

// Styled utilities
export * from './styled-utils';

// Component patterns
export * from './component-patterns';

// Import for the isDesignSystemLoaded function
import { colors, typography, spacing } from './design-tokens';

// Type definitions for the design system
export interface ThemeConfig {
  colors: typeof import('./design-tokens').colors;
  typography: typeof import('./design-tokens').typography;
  spacing: typeof import('./design-tokens').spacing;
  borderRadius: typeof import('./design-tokens').borderRadius;
  shadows: typeof import('./design-tokens').shadows;
  transitions: typeof import('./design-tokens').transitions;
}

// Design system version for cache busting and compatibility
export const DESIGN_SYSTEM_VERSION = '1.0.0';

// Utility to check if design system is properly loaded
export const isDesignSystemLoaded = (): boolean => {
  try {
    // Simple check to ensure design tokens are available
    return typeof colors !== 'undefined' && typeof typography !== 'undefined' && typeof spacing !== 'undefined';
  } catch {
    return false;
  }
};