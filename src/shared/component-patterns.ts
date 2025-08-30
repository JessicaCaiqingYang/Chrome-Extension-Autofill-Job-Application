/**
 * Component Styling Patterns
 * Pre-built styling patterns for common UI components
 */

import { StyleObject, mergeStyles, cardStyles, textStyles } from './styled-utils';
import { colors, spacing, borderRadius, shadows, transitions } from './design-tokens';

/**
 * Tab navigation patterns
 */
export const tabStyles = {
  container: {
    display: 'flex',
    borderBottom: `1px solid ${colors.neutral[200]}`,
    backgroundColor: colors.neutral[50],
    borderRadius: `${borderRadius.lg} ${borderRadius.lg} 0 0`,
  } as StyleObject,
  
  tab: {
    flex: 1,
    padding: `${spacing[3]} ${spacing[4]}`,
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: colors.neutral[600],
    transition: transitions.normal,
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    '&:hover': {
      color: colors.neutral[800],
      backgroundColor: colors.neutral[100],
    },
    '&:focus': {
      outline: 'none',
      backgroundColor: colors.neutral[100],
    },
  } as StyleObject,
  
  tabActive: {
    color: colors.primary[600],
    backgroundColor: colors.neutral[50],
    '&::after': {
      content: '""',
      position: 'absolute' as const,
      bottom: 0,
      left: 0,
      right: 0,
      height: '2px',
      backgroundColor: colors.primary[600],
    },
  } as StyleObject,
  
  tabIcon: {
    width: '16px',
    height: '16px',
    fill: 'currentColor',
  } as StyleObject,
};

/**
 * Form field patterns
 */
export const formFieldStyles = {
  container: {
    marginBottom: spacing[4],
  } as StyleObject,
  
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '600',
    color: colors.neutral[700],
    marginBottom: spacing[1],
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  } as StyleObject,
  
  floatingLabel: {
    position: 'relative' as const,
    '& input': {
      paddingTop: spacing[5],
      paddingBottom: spacing[2],
    },
    '& label': {
      position: 'absolute' as const,
      left: spacing[3],
      top: spacing[3],
      fontSize: '14px',
      color: colors.neutral[500],
      transition: transitions.normal,
      pointerEvents: 'none' as const,
      textTransform: 'none' as const,
      letterSpacing: 'normal',
    },
    '& input:focus + label, & input:not(:placeholder-shown) + label': {
      top: spacing[1],
      fontSize: '12px',
      color: colors.primary[600],
      fontWeight: '600',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
    },
  } as StyleObject,
  
  helpText: {
    fontSize: '12px',
    color: colors.neutral[500],
    marginTop: spacing[1],
  } as StyleObject,
  
  errorText: {
    fontSize: '12px',
    color: colors.error[600],
    marginTop: spacing[1],
    display: 'flex',
    alignItems: 'center',
    gap: spacing[1],
  } as StyleObject,
  
  successText: {
    fontSize: '12px',
    color: colors.success[600],
    marginTop: spacing[1],
    display: 'flex',
    alignItems: 'center',
    gap: spacing[1],
  } as StyleObject,
};

/**
 * Toggle switch patterns
 */
export const toggleStyles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[3],
  } as StyleObject,
  
  switch: {
    position: 'relative' as const,
    width: '44px',
    height: '24px',
    backgroundColor: colors.neutral[300],
    borderRadius: borderRadius.full,
    cursor: 'pointer',
    transition: transitions.normal,
    border: 'none',
    outline: 'none',
    '&:focus': {
      boxShadow: `0 0 0 3px ${colors.primary[200]}`,
    },
  } as StyleObject,
  
  switchActive: {
    backgroundColor: colors.primary[600],
  } as StyleObject,
  
  switchThumb: {
    position: 'absolute' as const,
    top: '2px',
    left: '2px',
    width: '20px',
    height: '20px',
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.full,
    transition: transitions.normal,
    boxShadow: shadows.sm,
  } as StyleObject,
  
  switchThumbActive: {
    transform: 'translateX(20px)',
  } as StyleObject,
  
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: colors.neutral[700],
    cursor: 'pointer',
  } as StyleObject,
};

/**
 * Status indicator patterns
 */
export const statusStyles = {
  container: mergeStyles(cardStyles.base, {
    padding: spacing[4],
  }),
  
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  } as StyleObject,
  
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: borderRadius.full,
    display: 'inline-block',
    marginRight: spacing[2],
  } as StyleObject,
  
  statusDotHealthy: {
    backgroundColor: colors.success[500],
  } as StyleObject,
  
  statusDotWarning: {
    backgroundColor: colors.warning[500],
  } as StyleObject,
  
  statusDotError: {
    backgroundColor: colors.error[500],
  } as StyleObject,
  
  metric: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${spacing[2]} 0`,
    borderBottom: `1px solid ${colors.neutral[200]}`,
    '&:last-child': {
      borderBottom: 'none',
    },
  } as StyleObject,
  
  metricLabel: mergeStyles(textStyles.caption, {
    color: colors.neutral[600],
  }),
  
  metricValue: mergeStyles(textStyles.body, {
    fontWeight: '600',
  }),
};

/**
 * Notification patterns
 */
export const notificationStyles = {
  container: {
    position: 'fixed' as const,
    top: spacing[4],
    right: spacing[4],
    zIndex: 50,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing[2],
    maxWidth: '320px',
  } as StyleObject,
  
  notification: {
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    boxShadow: shadows.lg,
    display: 'flex',
    alignItems: 'flex-start',
    gap: spacing[3],
    animation: 'slideIn 300ms ease-out',
  } as StyleObject,
  
  notificationSuccess: {
    backgroundColor: colors.success[50],
    border: `1px solid ${colors.success[200]}`,
    color: colors.success[800],
  } as StyleObject,
  
  notificationError: {
    backgroundColor: colors.error[50],
    border: `1px solid ${colors.error[200]}`,
    color: colors.error[800],
  } as StyleObject,
  
  notificationWarning: {
    backgroundColor: colors.warning[50],
    border: `1px solid ${colors.warning[200]}`,
    color: colors.warning[800],
  } as StyleObject,
  
  notificationInfo: {
    backgroundColor: colors.primary[50],
    border: `1px solid ${colors.primary[200]}`,
    color: colors.primary[800],
  } as StyleObject,
  
  notificationIcon: {
    width: '20px',
    height: '20px',
    flexShrink: 0,
  } as StyleObject,
  
  notificationContent: {
    flex: 1,
  } as StyleObject,
  
  notificationTitle: {
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: spacing[1],
  } as StyleObject,
  
  notificationMessage: {
    fontSize: '13px',
    lineHeight: '1.4',
  } as StyleObject,
  
  notificationClose: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: spacing[1],
    borderRadius: borderRadius.sm,
    color: 'currentColor',
    opacity: 0.7,
    '&:hover': {
      opacity: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.1)',
    },
  } as StyleObject,
};

/**
 * Progress indicator patterns
 */
export const progressStyles = {
  container: {
    width: '100%',
    backgroundColor: colors.neutral[200],
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    height: '8px',
  } as StyleObject,
  
  bar: {
    height: '100%',
    backgroundColor: colors.primary[600],
    transition: 'width 300ms ease-out',
    borderRadius: borderRadius.full,
  } as StyleObject,
  
  barSuccess: {
    backgroundColor: colors.success[600],
  } as StyleObject,
  
  barWarning: {
    backgroundColor: colors.warning[600],
  } as StyleObject,
  
  barError: {
    backgroundColor: colors.error[600],
  } as StyleObject,
  
  label: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[1],
    fontSize: '12px',
    color: colors.neutral[600],
  } as StyleObject,
};

/**
 * Loading state patterns
 */
export const loadingStyles = {
  spinner: {
    width: '20px',
    height: '20px',
    border: `2px solid ${colors.neutral[200]}`,
    borderTop: `2px solid ${colors.primary[600]}`,
    borderRadius: borderRadius.full,
    animation: 'spin 1s linear infinite',
  } as StyleObject,
  
  spinnerSmall: {
    width: '16px',
    height: '16px',
    border: `2px solid ${colors.neutral[200]}`,
    borderTop: `2px solid ${colors.primary[600]}`,
    borderRadius: borderRadius.full,
    animation: 'spin 1s linear infinite',
  } as StyleObject,
  
  skeleton: {
    backgroundColor: colors.neutral[200],
    borderRadius: borderRadius.sm,
    animation: 'pulse 2s infinite',
  } as StyleObject,
  
  skeletonText: {
    height: '1em',
    marginBottom: spacing[2],
    '&:last-child': {
      marginBottom: 0,
    },
  } as StyleObject,
};

/**
 * Utility function to get component styles by name
 */
export const getComponentStyles = (componentName: string) => {
  const styleMap = {
    tab: tabStyles,
    formField: formFieldStyles,
    toggle: toggleStyles,
    status: statusStyles,
    notification: notificationStyles,
    progress: progressStyles,
    loading: loadingStyles,
  };
  
  return styleMap[componentName as keyof typeof styleMap] || {};
};