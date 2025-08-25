// Chrome runtime messaging utilities
import { Message, MessageType } from './types';

export const messaging = {
  // Send message to service worker from popup or content script
  async sendToServiceWorker(message: Message): Promise<any> {
    try {
      const response = await chrome.runtime.sendMessage(message);
      return response;
    } catch (error) {
      console.error('Error sending message to service worker:', error);
      throw error;
    }
  },

  // Send message to content script from service worker
  async sendToContentScript(tabId: number, message: Message): Promise<any> {
    try {
      const response = await chrome.tabs.sendMessage(tabId, message);
      return response;
    } catch (error) {
      console.error('Error sending message to content script:', error);
      throw error;
    }
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
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      // Validate message format
      if (message && typeof message.type === 'string') {
        callback(message as Message, sender, sendResponse);
        return true; // Keep message channel open for async responses
      }
      return false;
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