// Chrome runtime messaging utilities
import { Message, MessageType } from './types';
import { errorHandler, createConnectionError } from './errorHandling';
import { ErrorCategory } from './errorTypes';

export const messaging = {
  // Send message to service worker from popup or content script
  async sendToServiceWorker(message: Message): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        // Check if extension context is still valid
        if (!chrome.runtime?.id) {
          const error = createConnectionError({
            component: 'messaging',
            action: 'sendToServiceWorker'
          });
          return reject(error);
        }

        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            const chromeError = chrome.runtime.lastError;
            console.debug('sendToServiceWorker lastError:', chromeError.message);
            
            // Handle specific error cases with enhanced error handling
            if (chromeError.message?.includes('Extension context invalidated') || 
                chromeError.message?.includes('receiving end does not exist')) {
              const error = createConnectionError({
                component: 'messaging',
                action: 'sendToServiceWorker'
              });
              return reject(error);
            }
            
            // Create a generic connection error for other Chrome runtime errors
            const error = errorHandler.createErrorFromException(
              new Error(chromeError.message || 'Chrome runtime error'),
              ErrorCategory.CONNECTION,
              {
                component: 'messaging',
                action: 'sendToServiceWorker'
              }
            );
            return reject(error);
          }
          resolve(response);
        });
      } catch (err) {
        const error = errorHandler.createErrorFromException(
          err instanceof Error ? err : new Error(String(err)),
          ErrorCategory.CONNECTION,
          {
            component: 'messaging',
            action: 'sendToServiceWorker'
          }
        );
        reject(error);
      }
    });
  },

  // Send message to content script from service worker
  async sendToContentScript(tabId: number, message: Message): Promise<any> {
    if (tabId === undefined || tabId === null) {
      const error = errorHandler.createError('VAL_001', {
        component: 'messaging',
        action: 'sendToContentScript',
        tabId
      }, {
        userMessage: 'Invalid tab ID provided for content script communication.',
        technicalDetails: `tabId was ${tabId}`
      });
      throw error;
    }
    
    return new Promise((resolve, reject) => {
      try {
        chrome.tabs.sendMessage(tabId, message, (response) => {
          if (chrome.runtime.lastError) {
            const chromeError = chrome.runtime.lastError;
            
            // Create appropriate error based on the Chrome error
            const error = errorHandler.createError('CONN_003', {
              component: 'messaging',
              action: 'sendToContentScript',
              tabId
            }, {
              technicalDetails: chromeError.message
            });
            
            return reject(error);
          }
          resolve(response);
        });
      } catch (err) {
        const error = errorHandler.createErrorFromException(
          err instanceof Error ? err : new Error(String(err)),
          ErrorCategory.CONNECTION,
          {
            component: 'messaging',
            action: 'sendToContentScript',
            tabId
          }
        );
        reject(error);
      }
    });
  },

  // Send message to all content scripts
  async sendToAllContentScripts(message: Message): Promise<void> {
    try {
      const tabs = await chrome.tabs.query({ active: true });
      const promises = tabs.map(tab => {
        if (tab.id) {
          return this.sendToContentScript(tab.id, message).catch(error => {
            // Ignore errors for tabs that don't have content scripts
            console.debug('Could not send message to tab:', tab.id, error);
          });
        }
      });
      await Promise.allSettled(promises);
    } catch (error) {
      console.error('Error sending message to all content scripts:', error);
    }
  },

  // Listen for messages (to be used in service worker and content scripts)
  addMessageListener(callback: (message: Message, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => void): void {
    // Log registration so we can confirm listener is active in each context
    try {
      console.debug('messaging.addMessageListener registered in context:', (typeof window !== 'undefined') ? 'window' : 'worker');
    } catch { }

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      // Quick validation and debug to help track "receiving end does not exist" problems
      if (!message || typeof (message as any).type !== 'string') {
        return false;
      }
      console.debug('messaging.onMessage received:', (message as any).type, 'from', sender?.tab?.id ?? sender?.id ?? 'unknown');
      try {
        callback(message as Message, sender, sendResponse);
      } catch (err) {
        console.error('Error in message callback:', err);
        try { sendResponse({ success: false, error: String(err) }); } catch { }
      }
      return true; // Keep message channel open for async responses
    });
  },

  // Helper functions for common message types
  async getUserProfile(): Promise<any> {
    return this.sendToServiceWorker({
      type: MessageType.GET_USER_PROFILE
    });
  },

  async setUserProfile(profile: any): Promise<any> {
    return this.sendToServiceWorker({
      type: MessageType.SET_USER_PROFILE,
      payload: profile
    });
  },

  async getCVData(): Promise<any> {
    return this.sendToServiceWorker({
      type: MessageType.GET_CV_DATA
    });
  },

  async setCVData(file: File): Promise<any> {
    // Convert File to base64 string for message passing
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const base64String = btoa(String.fromCharCode(...uint8Array));
    
    const fileData = {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      base64Data: base64String
    };

    return this.sendToServiceWorker({
      type: MessageType.SET_CV_DATA,
      payload: { fileData }
    });
  },

  async toggleAutofill(enabled: boolean): Promise<any> {
    return this.sendToServiceWorker({
      type: MessageType.TOGGLE_AUTOFILL,
      payload: { enabled }
    });
  },

  async triggerAutofill(): Promise<any> {
    return this.sendToServiceWorker({
      type: MessageType.TRIGGER_AUTOFILL
    });
  },

  // Notify about autofill completion
  async notifyAutofillComplete(result: any): Promise<void> {
    try {
      await this.sendToServiceWorker({
        type: MessageType.AUTOFILL_COMPLETE,
        payload: result
      });
    } catch (error) {
      console.error('Error notifying autofill completion:', error);
    }
  },

  // Send error message
  async sendError(error: string, details?: any): Promise<void> {
    try {
      await this.sendToServiceWorker({
        type: MessageType.ERROR,
        payload: { error, details }
      });
    } catch (err) {
      console.error('Error sending error message:', err);
    }
  }
};