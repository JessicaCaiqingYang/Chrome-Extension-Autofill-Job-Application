/**
 * Styled Component Utilities and CSS-in-JS Helpers
 * Reusable styling functions and utilities for consistent component styling
 */

import { colors, typography, spacing, borderRadius, shadows, transitions } from './design-tokens';

/**
 * CSS-in-JS style object type
 */
export type StyleObject = React.CSSProperties;

/**
 * Theme-aware color utilities
 */
export const getColor = (colorPath: string): string => {
  const [colorName, shade] = colorPath.split('.');
  const colorGroup = colors[colorName as keyof typeof colors];
  
  if (!colorGroup) {
    console.warn(`Color group "${colorName}" not found`);
    return colors.neutral[500];
  }
  
  if (typeof colorGroup === 'string') {
    return colorGroup;
  }
  
  const shadeValue = colorGroup[shade as unknown as keyof typeof colorGroup];
  if (!shadeValue) {
    console.warn(`Color shade "${shade}" not found in "${colorName}"`);
    return colors.neutral[500];
  }
  
  return shadeValue;
};

/**
 * Spacing utilities
 */
export const getSpacing = (size: keyof typeof spacing): string => {
  return spacing[size];
};

/**
 * Common button styles
 */
export const buttonStyles = {
  base: {
    fontFamily: typography.fontFamily.system,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    lineHeight: typography.lineHeight.normal,
    padding: `${spacing[2]} ${spacing[4]}`,
    borderRadius: borderRadius.base,
    border: 'none',
    cursor: 'pointer',
    transition: transitions.normal,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  } as StyleObject,
  
  primary: {
    backgroundColor: colors.primary[600],
    color: colors.neutral[50],
    '&:hover': {
      backgroundColor: colors.primary[700],
    },
    '&:focus': {
      outline: 'none',
      boxShadow: `0 0 0 3px ${colors.primary[200]}`,
    },
    '&:disabled': {
      backgroundColor: colors.neutral[300],
      cursor: 'not-allowed',
    },
  } as StyleObject,
  
  secondary: {
    backgroundColor: colors.neutral[100],
    color: colors.neutral[700],
    border: `1px solid ${colors.neutral[300]}`,
    '&:hover': {
      backgroundColor: colors.neutral[200],
    },
    '&:focus': {
      outline: 'none',
      boxShadow: `0 0 0 3px ${colors.neutral[200]}`,
    },
    '&:disabled': {
      backgroundColor: colors.neutral[100],
      color: colors.neutral[400],
      cursor: 'not-allowed',
    },
  } as StyleObject,
  
  danger: {
    backgroundColor: colors.error[600],
    color: colors.neutral[50],
    '&:hover': {
      backgroundColor: colors.error[700],
    },
    '&:focus': {
      outline: 'none',
      boxShadow: `0 0 0 3px ${colors.error[200]}`,
    },
    '&:disabled': {
      backgroundColor: colors.neutral[300],
      cursor: 'not-allowed',
    },
  } as StyleObject,
};

/**
 * Common input styles
 */
export const inputStyles = {
  base: {
    fontFamily: typography.fontFamily.system,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.normal,
    padding: `${spacing[2]} ${spacing[3]}`,
    borderRadius: borderRadius.base,
    border: `1px solid ${colors.neutral[300]}`,
    backgroundColor: colors.neutral[50],
    transition: transitions.normal,
    width: '100%',
    '&:focus': {
      outline: 'none',
      borderColor: colors.primary[600],
      boxShadow: `0 0 0 3px ${colors.primary[200]}`,
    },
    '&:disabled': {
      backgroundColor: colors.neutral[100],
      color: colors.neutral[400],
      cursor: 'not-allowed',
    },
  } as StyleObject,
  
  error: {
    borderColor: colors.error[600],
    '&:focus': {
      borderColor: colors.error[600],
      boxShadow: `0 0 0 3px ${colors.error[200]}`,
    },
  } as StyleObject,
  
  success: {
    borderColor: colors.success[600],
    '&:focus': {
      borderColor: colors.success[600],
      boxShadow: `0 0 0 3px ${colors.success[200]}`,
    },
  } as StyleObject,
};

/**
 * Card component styles
 */
export const cardStyles = {
  base: {
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
    padding: spacing[4],
    border: `1px solid ${colors.neutral[200]}`,
  } as StyleObject,
  
  elevated: {
    boxShadow: shadows.md,
  } as StyleObject,
  
  interactive: {
    cursor: 'pointer',
    transition: transitions.normal,
    '&:hover': {
      boxShadow: shadows.lg,
      transform: 'translateY(-1px)',
    },
  } as StyleObject,
};

/**
 * Text styles
 */
export const textStyles = {
  heading1: {
    fontFamily: typography.fontFamily.system,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.lineHeight.tight,
    color: colors.neutral[900],
    margin: 0,
  } as StyleObject,
  
  heading2: {
    fontFamily: typography.fontFamily.system,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.lineHeight.tight,
    color: colors.neutral[800],
    margin: 0,
  } as StyleObject,
  
  heading3: {
    fontFamily: typography.fontFamily.system,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.lineHeight.tight,
    color: colors.neutral[700],
    margin: 0,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  } as StyleObject,
  
  body: {
    fontFamily: typography.fontFamily.system,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.normal,
    lineHeight: typography.lineHeight.normal,
    color: colors.neutral[700],
    margin: 0,
  } as StyleObject,
  
  caption: {
    fontFamily: typography.fontFamily.system,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.normal,
    lineHeight: typography.lineHeight.normal,
    color: colors.neutral[500],
    margin: 0,
  } as StyleObject,
};

/**
 * Layout utilities
 */
export const layoutStyles = {
  flexRow: {
    display: 'flex',
    flexDirection: 'row' as const,
    alignItems: 'center',
  } as StyleObject,
  
  flexColumn: {
    display: 'flex',
    flexDirection: 'column' as const,
  } as StyleObject,
  
  flexCenter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as StyleObject,
  
  flexBetween: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as StyleObject,
  
  grid: {
    display: 'grid',
    gap: spacing[4],
  } as StyleObject,
};

/**
 * Animation utilities
 */
export const animations = {
  fadeIn: {
    animation: 'fadeIn 200ms ease-in-out',
  } as StyleObject,
  
  slideIn: {
    animation: 'slideIn 300ms ease-out',
  } as StyleObject,
  
  pulse: {
    animation: 'pulse 2s infinite',
  } as StyleObject,
};

/**
 * Utility function to merge style objects
 */
export const mergeStyles = (...styles: (StyleObject | undefined)[]): StyleObject => {
  return styles.reduce<StyleObject>((merged, style) => {
    if (!style) return merged;
    return { ...merged, ...style };
  }, {});
};

/**
 * Responsive breakpoints (for future use)
 */
export const breakpoints = {
  sm: '320px',
  md: '400px',
  lg: '480px',
} as const;