// Chrome runtime messaging utilities
import { Message, MessageType } from './types';

export const messaging = {
  // Send message to service worker from popup or content script
  async sendToServiceWorker(message: Message): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        // Check if extension context is still valid
        if (!chrome.runtime?.id) {
          return reject(new Error('Extension context invalidated'));
        }

        // Add timeout to prevent hanging
        const timeout = setTimeout(() => {
          reject(new Error('Service worker communication timeout'));
        }, 5000);

        chrome.runtime.sendMessage(message, (response) => {
          clearTimeout(timeout);
          
          if (chrome.runtime.lastError) {
            const error = chrome.runtime.lastError.message || 'Unknown error';
            console.debug('sendToServiceWorker lastError:', error);
            
            // Handle specific context invalidation errors
            if (error.includes('Extension context invalidated') || 
                error.includes('receiving end does not exist')) {
              return reject(new Error('Extension context invalidated. Please reload the extension.'));
            }
            
            return reject(chrome.runtime.lastError);
          }
          resolve(response);
        });
      } catch (err) {
        reject(err);
      }
    });
  },

  // Send message to content script from service worker
  async sendToContentScript(tabId: number, message: Message): Promise<any> {
    if (tabId === undefined || tabId === null) {
      throw new Error('Invalid tabId');
    }
    return new Promise((resolve, reject) => {
      try {
        // Check if extension context is still valid
        if (!chrome.runtime?.id) {
          return reject(new Error('Extension context invalidated'));
        }

        chrome.tabs.sendMessage(tabId, message, (response) => {
          if (chrome.runtime.lastError) {
            const error = chrome.runtime.lastError.message || 'Unknown error';
            
            // Handle specific context invalidation errors
            if (error.includes('Extension context invalidated') || 
                error.includes('receiving end does not exist')) {
              return reject(new Error('Extension context invalidated or content script not ready'));
            }
            
            return reject(chrome.runtime.lastError);
          }
          resolve(response);
        });
      } catch (err) {
        reject(err);
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
    // Convert File to ArrayBuffer for message passing
    const arrayBuffer = await file.arrayBuffer();
    const fileData = {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      arrayBuffer: arrayBuffer
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