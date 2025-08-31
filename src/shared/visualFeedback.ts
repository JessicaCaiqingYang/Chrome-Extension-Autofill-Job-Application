// Visual feedback system for form field detection and autofill operations
import { FieldMapping, FileUploadMapping } from './types';

export interface FieldHighlight {
  element: HTMLElement;
  status: 'detected' | 'filling' | 'filled' | 'error';
  originalStyle: {
    outline: string;
    backgroundColor: string;
    boxShadow: string;
    transition: string;
  };
}

export interface ProgressIndicator {
  element: HTMLElement;
  remove: () => void;
}

export class VisualFeedbackManager {
  private highlightedFields = new Map<HTMLElement, FieldHighlight>();
  private progressIndicators = new Map<HTMLElement, ProgressIndicator>();


  constructor() {
    this.injectStyles();
  }

  /**
   * Inject CSS styles for visual feedback
   */
  private injectStyles(): void {
    // Create and inject CSS for animations and styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes autofill-pulse {
        0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.7); }
        70% { box-shadow: 0 0 0 4px rgba(37, 99, 235, 0); }
        100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
      }

      @keyframes autofill-fill {
        0% { 
          background-color: rgba(37, 99, 235, 0.1);
          transform: scale(1);
        }
        50% { 
          background-color: rgba(37, 99, 235, 0.2);
          transform: scale(1.02);
        }
        100% { 
          background-color: rgba(34, 197, 94, 0.1);
          transform: scale(1);
        }
      }

      @keyframes autofill-success {
        0% { 
          background-color: rgba(34, 197, 94, 0.1);
          box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
        }
        50% { 
          background-color: rgba(34, 197, 94, 0.2);
          box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.3);
        }
        100% { 
          background-color: rgba(34, 197, 94, 0.05);
          box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
        }
      }

      @keyframes autofill-error {
        0% { 
          background-color: rgba(239, 68, 68, 0.1);
          box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
        }
        25% { 
          background-color: rgba(239, 68, 68, 0.2);
          box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.5);
          transform: translateX(-2px);
        }
        75% { 
          background-color: rgba(239, 68, 68, 0.2);
          box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.5);
          transform: translateX(2px);
        }
        100% { 
          background-color: rgba(239, 68, 68, 0.05);
          box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
          transform: translateX(0);
        }
      }

      .autofill-detected {
        outline: 2px solid rgba(37, 99, 235, 0.5) !important;
        outline-offset: 1px !important;
        background-color: rgba(37, 99, 235, 0.05) !important;
        transition: all 0.3s ease !important;
      }

      .autofill-filling {
        outline: 2px solid rgba(37, 99, 235, 0.8) !important;
        outline-offset: 1px !important;
        animation: autofill-pulse 1.5s infinite !important;
        transition: all 0.3s ease !important;
      }

      .autofill-filled {
        outline: 2px solid rgba(34, 197, 94, 0.6) !important;
        outline-offset: 1px !important;
        animation: autofill-success 1s ease-out !important;
        transition: all 0.3s ease !important;
      }

      .autofill-error {
        outline: 2px solid rgba(239, 68, 68, 0.6) !important;
        outline-offset: 1px !important;
        animation: autofill-error 0.8s ease-out !important;
        transition: all 0.3s ease !important;
      }

      .autofill-progress-indicator {
        position: absolute;
        top: -8px;
        right: -8px;
        width: 16px;
        height: 16px;
        background: linear-gradient(45deg, #2563eb, #3b82f6);
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        animation: autofill-pulse 1s infinite;
        pointer-events: none;
      }

      .autofill-progress-indicator::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 6px;
        height: 6px;
        background: white;
        border-radius: 50%;
        transform: translate(-50%, -50%);
      }

      .autofill-field-counter {
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(37, 99, 235, 0.95);
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 12px;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        z-index: 10001;
        transition: all 0.3s ease;
        pointer-events: none;
      }

      .autofill-field-counter.success {
        background: rgba(34, 197, 94, 0.95);
      }

      .autofill-field-counter.error {
        background: rgba(239, 68, 68, 0.95);
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Highlight detected form fields
   */
  highlightDetectedFields(fieldMappings: FieldMapping[], fileUploadMappings: FileUploadMapping[]): void {
    console.log('Highlighting detected fields:', fieldMappings.length, 'form fields,', fileUploadMappings.length, 'file upload fields');

    // Highlight regular form fields
    fieldMappings.forEach(mapping => {
      this.highlightField(mapping.element, 'detected');
    });

    // Highlight file upload fields
    fileUploadMappings.forEach(mapping => {
      this.highlightField(mapping.element, 'detected');
    });

    // Show field counter
    this.showFieldCounter(fieldMappings.length + fileUploadMappings.length, 0, 'detected');
  }

  /**
   * Highlight a single field with the specified status
   */
  highlightField(element: HTMLElement, status: FieldHighlight['status']): void {
    // Store original styles if not already stored
    if (!this.highlightedFields.has(element)) {
      const computedStyle = window.getComputedStyle(element);
      this.highlightedFields.set(element, {
        element,
        status,
        originalStyle: {
          outline: computedStyle.outline,
          backgroundColor: computedStyle.backgroundColor,
          boxShadow: computedStyle.boxShadow,
          transition: computedStyle.transition,
        }
      });
    }

    // Remove existing classes
    element.classList.remove('autofill-detected', 'autofill-filling', 'autofill-filled', 'autofill-error');
    
    // Add new class based on status
    element.classList.add(`autofill-${status}`);

    // Update status
    const highlight = this.highlightedFields.get(element);
    if (highlight) {
      highlight.status = status;
    }

    // Add progress indicator for filling status
    if (status === 'filling') {
      this.addProgressIndicator(element);
    } else {
      this.removeProgressIndicator(element);
    }
  }

  /**
   * Add progress indicator to a field
   */
  private addProgressIndicator(element: HTMLElement): void {
    // Remove existing indicator if present
    this.removeProgressIndicator(element);

    const rect = element.getBoundingClientRect();
    const indicator = document.createElement('div');
    indicator.className = 'autofill-progress-indicator';
    
    // Position relative to the field
    indicator.style.position = 'absolute';
    indicator.style.top = `${rect.top + window.scrollY - 8}px`;
    indicator.style.left = `${rect.right + window.scrollX - 8}px`;
    
    document.body.appendChild(indicator);

    this.progressIndicators.set(element, {
      element: indicator,
      remove: () => {
        if (indicator.parentNode) {
          indicator.parentNode.removeChild(indicator);
        }
      }
    });
  }

  /**
   * Remove progress indicator from a field
   */
  private removeProgressIndicator(element: HTMLElement): void {
    const indicator = this.progressIndicators.get(element);
    if (indicator) {
      indicator.remove();
      this.progressIndicators.delete(element);
    }
  }

  /**
   * Show field counter overlay
   */
  showFieldCounter(totalFields: number, filledFields: number, status: 'detected' | 'filling' | 'success' | 'error'): void {
    // Remove existing counter
    const existingCounter = document.querySelector('.autofill-field-counter');
    if (existingCounter) {
      existingCounter.remove();
    }

    const counter = document.createElement('div');
    counter.className = `autofill-field-counter ${status}`;
    
    let text = '';
    switch (status) {
      case 'detected':
        text = `${totalFields} field${totalFields !== 1 ? 's' : ''} detected`;
        break;
      case 'filling':
        text = `Filling ${filledFields}/${totalFields} fields`;
        break;
      case 'success':
        text = `✓ ${filledFields} field${filledFields !== 1 ? 's' : ''} filled`;
        break;
      case 'error':
        text = `✕ Failed to fill fields`;
        break;
    }
    
    counter.textContent = text;
    document.body.appendChild(counter);

    // Auto-remove after delay for success/error states
    if (status === 'success' || status === 'error') {
      setTimeout(() => {
        if (counter.parentNode) {
          counter.style.opacity = '0';
          counter.style.transform = 'translateY(-10px)';
          setTimeout(() => {
            if (counter.parentNode) {
              counter.parentNode.removeChild(counter);
            }
          }, 300);
        }
      }, 3000);
    }
  }

  /**
   * Update field counter during filling process
   */
  updateFieldCounter(totalFields: number, filledFields: number): void {
    const counter = document.querySelector('.autofill-field-counter');
    if (counter) {
      counter.textContent = `Filling ${filledFields}/${totalFields} fields`;
    }
  }

  /**
   * Show autofill progress for a specific field
   */
  showFieldProgress(element: HTMLElement, fieldType: string, value: string): void {
    this.highlightField(element, 'filling');
    
    // Add a temporary tooltip showing what's being filled
    const tooltip = document.createElement('div');
    tooltip.style.cssText = `
      position: absolute;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      z-index: 10002;
      pointer-events: none;
      white-space: nowrap;
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
    `;
    
    const rect = element.getBoundingClientRect();
    tooltip.style.top = `${rect.top + window.scrollY - 30}px`;
    tooltip.style.left = `${rect.left + window.scrollX}px`;
    tooltip.textContent = `${fieldType}: ${value.substring(0, 30)}${value.length > 30 ? '...' : ''}`;
    
    document.body.appendChild(tooltip);
    
    // Remove tooltip after a short delay
    setTimeout(() => {
      if (tooltip.parentNode) {
        tooltip.parentNode.removeChild(tooltip);
      }
    }, 1500);
  }

  /**
   * Mark field as successfully filled
   */
  markFieldSuccess(element: HTMLElement): void {
    this.highlightField(element, 'filled');
    
    // Auto-remove highlight after delay
    setTimeout(() => {
      this.removeFieldHighlight(element);
    }, 2000);
  }

  /**
   * Mark field as failed to fill
   */
  markFieldError(element: HTMLElement, error?: string): void {
    this.highlightField(element, 'error');
    
    // Show error tooltip if provided
    if (error) {
      const tooltip = document.createElement('div');
      tooltip.style.cssText = `
        position: absolute;
        background: rgba(239, 68, 68, 0.95);
        color: white;
        padding: 6px 10px;
        border-radius: 4px;
        font-size: 11px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        z-index: 10002;
        pointer-events: none;
        max-width: 250px;
        word-wrap: break-word;
      `;
      
      const rect = element.getBoundingClientRect();
      tooltip.style.top = `${rect.bottom + window.scrollY + 5}px`;
      tooltip.style.left = `${rect.left + window.scrollX}px`;
      tooltip.textContent = error;
      
      document.body.appendChild(tooltip);
      
      // Remove tooltip after delay
      setTimeout(() => {
        if (tooltip.parentNode) {
          tooltip.parentNode.removeChild(tooltip);
        }
      }, 4000);
    }
    
    // Auto-remove highlight after delay
    setTimeout(() => {
      this.removeFieldHighlight(element);
    }, 3000);
  }

  /**
   * Remove highlight from a specific field
   */
  removeFieldHighlight(element: HTMLElement): void {
    const highlight = this.highlightedFields.get(element);
    if (highlight) {
      // Restore original styles
      element.style.outline = highlight.originalStyle.outline;
      element.style.backgroundColor = highlight.originalStyle.backgroundColor;
      element.style.boxShadow = highlight.originalStyle.boxShadow;
      element.style.transition = highlight.originalStyle.transition;
      
      // Remove classes
      element.classList.remove('autofill-detected', 'autofill-filling', 'autofill-filled', 'autofill-error');
      
      // Remove progress indicator
      this.removeProgressIndicator(element);
      
      // Remove from tracking
      this.highlightedFields.delete(element);
    }
  }

  /**
   * Clear all field highlights
   */
  clearAllHighlights(): void {
    this.highlightedFields.forEach((_, element) => {
      this.removeFieldHighlight(element);
    });
    
    // Remove field counter
    const counter = document.querySelector('.autofill-field-counter');
    if (counter) {
      counter.remove();
    }
    
    // Clear all progress indicators
    this.progressIndicators.forEach(indicator => {
      indicator.remove();
    });
    this.progressIndicators.clear();
  }

  /**
   * Show completion notification overlay
   */
  showCompletionNotification(success: boolean, filledCount: number, totalCount: number, errors?: string[]): void {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: ${success ? 'rgba(34, 197, 94, 0.95)' : 'rgba(239, 68, 68, 0.95)'};
      color: white;
      padding: 20px 30px;
      border-radius: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 600;
      text-align: center;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      z-index: 10003;
      min-width: 250px;
      animation: autofill-success 0.6s ease-out;
    `;
    
    const icon = success ? '✓' : '✕';
    const title = success ? 'Autofill Complete!' : 'Autofill Failed';
    const message = success 
      ? `Successfully filled ${filledCount} of ${totalCount} fields`
      : `Failed to fill some fields${errors ? `: ${errors.join(', ')}` : ''}`;
    
    notification.innerHTML = `
      <div style="font-size: 24px; margin-bottom: 8px;">${icon}</div>
      <div style="font-size: 16px; margin-bottom: 4px;">${title}</div>
      <div style="font-size: 12px; opacity: 0.9;">${message}</div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after delay
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.opacity = '0';
        notification.style.transform = 'translate(-50%, -50%) scale(0.9)';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }
    }, success ? 2500 : 4000);
  }

  /**
   * Cleanup all visual feedback elements
   */
  cleanup(): void {
    this.clearAllHighlights();
    
    // Remove any remaining notification overlays
    const notifications = document.querySelectorAll('.autofill-field-counter');
    notifications.forEach(notification => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    });
  }
}

// Export singleton instance
export const visualFeedback = new VisualFeedbackManager();