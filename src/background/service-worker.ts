// Service worker for Job Application Autofill extension
// Handles background processing, storage operations, and inter-component communication

import { storage } from '../shared/storage';
import { messaging } from '../shared/messaging';
import { Message, MessageType, UserProfile, CVData } from '../shared/types';
import pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import { Buffer } from 'buffer';

console.log('Job Application Autofill service worker loaded');

// Verify parsing libraries are loaded correctly
function verifyParsingLibraries(): boolean {
  try {
    // Check if pdf-parse is available
    if (typeof pdfParse !== 'function') {
      console.error('pdf-parse library not loaded correctly');
      return false;
    }

    // Check if mammoth is available
    if (!mammoth || typeof mammoth.extractRawText !== 'function') {
      console.error('mammoth library not loaded correctly');
      return false;
    }

    // Check if Buffer is available
    if (!Buffer || typeof Buffer.from !== 'function') {
      console.error('Buffer polyfill not loaded correctly');
      return false;
    }

    console.log('All parsing libraries loaded successfully');
    
    // Test basic functionality without actual files
    try {
      // Test Buffer creation
      const testBuffer = Buffer.from('test string', 'utf8');
      if (testBuffer.length !== 11) {
        console.error('Buffer functionality test failed');
        return false;
      }

      // Test mammoth object structure
      if (!mammoth.convertToHtml || !mammoth.extractRawText) {
        console.error('mammoth library missing expected methods');
        return false;
      }

      console.log('Parsing libraries functionality verified');
      return true;
    } catch (funcError) {
      console.error('Error testing parsing library functionality:', funcError);
      return false;
    }
  } catch (error) {
    console.error('Error verifying parsing libraries:', error);
    return false;
  }
}

// Verify libraries on service worker startup
verifyParsingLibraries();

// Service worker installation and setup
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Extension installed');

  // Initialize default settings
  try {
    const autofillEnabled = await storage.getAutofillEnabled();
    if (autofillEnabled === null) {
      await storage.setAutofillEnabled(true);
    }
    console.log('Extension initialized successfully');
  } catch (error) {
    console.error('Error initializing extension:', error);
  }
});

// Extension uninstall cleanup
chrome.runtime.onSuspend.addListener(async () => {
  console.log('Extension suspending - performing cleanup');
});

// Message handling system for popup and content script communication
messaging.addMessageListener((message: Message, sender, sendResponse) => {
  console.log('Service worker received message:', message.type, sender);

  // Handle async operations properly
  (async () => {
    try {
      switch (message.type) {
        case MessageType.GET_USER_PROFILE:
          const profile = await handleGetUserProfile();
          sendResponse({ success: true, data: profile });
          break;

        case MessageType.SET_USER_PROFILE:
          const profileResult = await handleSetUserProfile(message.payload);
          sendResponse({ success: profileResult });
          break;

        case MessageType.GET_CV_DATA:
          const cvData = await handleGetCVData();
          sendResponse({ success: true, data: cvData });
          break;

        case MessageType.SET_CV_DATA:
          const cvResult = await handleSetCVData(message.payload);
          sendResponse({ success: cvResult.success, data: cvResult.data, error: cvResult.error });
          break;

        case MessageType.TOGGLE_AUTOFILL:
          const toggleResult = await handleToggleAutofill(message.payload.enabled);
          sendResponse({ success: toggleResult });
          break;

        case MessageType.TRIGGER_AUTOFILL:
          try {
            await handleTriggerAutofill(sender.tab?.id);
            sendResponse({ success: true });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            sendResponse({ success: false, error: errorMessage });
          }
          break;

        case MessageType.AUTOFILL_COMPLETE:
          await handleAutofillComplete(message.payload);
          sendResponse({ success: true });
          break;

        case MessageType.ERROR:
          await handleError(message.payload);
          sendResponse({ success: true });
          break;

        case 'CONTENT_SCRIPT_READY' as any:
          console.log('Content script ready signal received from tab:', sender.tab?.id);
          sendResponse({ success: true });
          break;

        default:
          console.warn('Unknown message type:', message.type);
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      sendResponse({ success: false, error: errorMessage });
    }
  })();

  // Return true to indicate we will respond asynchronously
  return true;
});

// Chrome storage operations for user profile data
async function handleGetUserProfile(): Promise<UserProfile | null> {
  try {
    const profile = await storage.getUserProfile();
    console.log('Retrieved user profile:', profile ? 'found' : 'not found');
    return profile;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
}

async function handleSetUserProfile(profileData: UserProfile): Promise<boolean> {
  try {
    // Validate profile data
    if (!profileData || !profileData.personalInfo) {
      throw new Error('Invalid profile data');
    }

    const success = await storage.setUserProfile(profileData);
    console.log('User profile saved:', success);

    // Notify content scripts about profile update if autofill is enabled
    const autofillEnabled = await storage.getAutofillEnabled();
    if (autofillEnabled && success) {
      await messaging.sendToAllContentScripts({
        type: MessageType.SET_USER_PROFILE,
        payload: profileData
      });
    }

    return success;
  } catch (error) {
    console.error('Error setting user profile:', error);
    throw error;
  }
}

// CV file processing functionality for PDF and Word documents
async function handleGetCVData(): Promise<CVData | null> {
  try {
    const cvData = await storage.getCVData();
    console.log('Retrieved CV data:', cvData ? cvData.fileName : 'not found');
    return cvData;
  } catch (error) {
    console.error('Error getting CV data:', error);
    throw error;
  }
}

async function handleSetCVData(payload: { fileData: any }): Promise<{ success: boolean; data?: CVData; error?: string }> {
  try {
    const { fileData } = payload;

    if (!fileData) {
      return { success: false, error: 'No file data provided' };
    }

    // Reconstruct File object from serialized data
    const file = new File([fileData.arrayBuffer], fileData.name, {
      type: fileData.type,
      lastModified: fileData.lastModified
    });

    // Validate file type
    const fileType = getFileType(file.name);
    if (!fileType) {
      return { success: false, error: 'Unsupported file type. Please upload PDF or Word documents.' };
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return { success: false, error: 'File size too large. Please upload files smaller than 5MB.' };
    }

    console.log('Processing CV file:', file.name, 'Type:', fileType, 'Size:', file.size);

    // Extract text from file
    const extractedText = await extractTextFromFile(file, fileType);

    if (!extractedText || extractedText.trim().length === 0) {
      return { success: false, error: 'Could not extract text from the file. Please ensure the file is not corrupted.' };
    }

    // Create CV data object
    const cvData: CVData = {
      fileName: file.name,
      fileSize: file.size,
      uploadDate: Date.now(),
      extractedText: extractedText.trim(),
      fileType
    };

    // Save to storage
    const success = await storage.setCVData(cvData);

    if (success) {
      console.log('CV data saved successfully:', cvData.fileName);
      return { success: true, data: cvData };
    } else {
      return { success: false, error: 'Failed to save CV data to storage' };
    }

  } catch (error) {
    console.error('Error processing CV file:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to process CV file';
    return { success: false, error: errorMessage };
  }
}

// Helper function to determine file type
function getFileType(fileName: string): 'pdf' | 'docx' | null {
  const extension = fileName.toLowerCase().split('.').pop();
  switch (extension) {
    case 'pdf':
      return 'pdf';
    case 'docx':
    case 'doc':
      return 'docx';
    default:
      return null;
  }
}

// Extract text from PDF or Word files
async function extractTextFromFile(file: File, fileType: 'pdf' | 'docx'): Promise<string> {
  // TODO: Implement proper PDF/DOCX parsing with browser-compatible libraries
  // For now, return a placeholder message
  console.warn('PDF/DOCX text extraction not yet implemented');
  return `[File uploaded: ${file.name} (${fileType.toUpperCase()}) - Text extraction will be implemented in a future update]`;
}

// Autofill state management
async function handleToggleAutofill(enabled: boolean): Promise<boolean> {
  try {
    const success = await storage.setAutofillEnabled(enabled);
    console.log('Autofill toggled:', enabled, 'Success:', success);

    // Notify all content scripts about the state change
    if (success) {
      await messaging.sendToAllContentScripts({
        type: MessageType.TOGGLE_AUTOFILL,
        payload: { enabled }
      });
    }

    return success;
  } catch (error) {
    console.error('Error toggling autofill:', error);
    throw error;
  }
}

async function handleTriggerAutofill(tabId?: number): Promise<void> {
  try {
    // Check if autofill is enabled
    const autofillEnabled = await storage.getAutofillEnabled();
    if (!autofillEnabled) {
      console.log('Autofill is disabled, ignoring trigger');
      throw new Error('Autofill is disabled');
    }

    // Get user profile and CV data
    const [userProfile, cvData] = await Promise.all([
      storage.getUserProfile(),
      storage.getCVData()
    ]);

    if (!userProfile) {
      console.warn('No user profile found, cannot autofill');
      throw new Error('No user profile found. Please complete your profile first.');
    }

    // Send autofill data to content script
    const autofillData = {
      userProfile,
      cvData,
      timestamp: Date.now()
    };

    let targetTabId = tabId;

    // If no specific tab ID provided, get the active tab
    if (!targetTabId) {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Filter out extension pages and find the first valid web page
      const webTabs = tabs.filter(tab => 
        tab.url && 
        !tab.url.startsWith('chrome://') && 
        !tab.url.startsWith('chrome-extension://') &&
        !tab.url.startsWith('moz-extension://') &&
        !tab.url.startsWith('edge-extension://')
      );
      
      if (webTabs.length > 0 && webTabs[0].id) {
        targetTabId = webTabs[0].id;
      } else {
        // If no web tabs found, try to get any available web tab
        const allTabs = await chrome.tabs.query({ currentWindow: true });
        const webTabsInWindow = allTabs.filter(tab => 
          tab.url && 
          !tab.url.startsWith('chrome://') && 
          !tab.url.startsWith('chrome-extension://') &&
          !tab.url.startsWith('moz-extension://') &&
          !tab.url.startsWith('edge-extension://')
        );
          
        if (webTabsInWindow.length > 0 && webTabsInWindow[0].id) {
          targetTabId = webTabsInWindow[0].id;
        } else {
          throw new Error('No web page tabs found. Please open a job application website and try again.');
        }
      }
    }

    // Validate the target tab
    if (targetTabId) {
      const targetTab = await chrome.tabs.get(targetTabId);
      console.log('Target tab:', targetTab.url);
      
      if (!targetTab.url || 
          targetTab.url.startsWith('chrome://') || 
          targetTab.url.startsWith('chrome-extension://') ||
          targetTab.url.startsWith('moz-extension://') ||
          targetTab.url.startsWith('edge-extension://')) {
        throw new Error('Cannot autofill on this page. Please navigate to a job application website and try again.');
      }

      try {
        // First, ping the content script to check if it's responsive
        console.log('Pinging content script on tab:', targetTabId, targetTab.url);
        await messaging.sendToContentScript(targetTabId, {
          type: 'PING' as any,
          payload: {}
        });

        // If ping succeeds, send the autofill trigger
        const response = await messaging.sendToContentScript(targetTabId, {
          type: MessageType.TRIGGER_AUTOFILL,
          payload: autofillData
        });
        console.log('Autofill triggered successfully, response:', response);
      } catch (error) {
        console.error('Error communicating with content script:', error);

        // If content script is not responding, try to inject it manually
        try {
          console.log('Attempting to inject content script manually...');

          // Inject the content script manually
          await chrome.scripting.executeScript({
            target: { tabId: targetTabId },
            files: ['content/content.js']
          });

          // Wait a moment for the content script to initialize
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Try sending the message again
          const retryResponse = await messaging.sendToContentScript(targetTabId, {
            type: MessageType.TRIGGER_AUTOFILL,
            payload: autofillData
          });
          console.log('Autofill triggered successfully after manual injection, response:', retryResponse);

        } catch (injectionError) {
          console.error('Failed to inject content script:', injectionError);
          throw new Error('Could not communicate with the page. Please refresh and try again.');
        }
      }
    } else {
      throw new Error('No valid tab found to trigger autofill');
    }

  } catch (error) {
    console.error('Error triggering autofill:', error);
    throw error;
  }
}

async function handleAutofillComplete(result: any): Promise<void> {
  try {
    console.log('Autofill completed:', result);

    // Could implement analytics or logging here
    // For now, just log the completion
    if (result.success) {
      console.log('Autofill successful:', result.fieldsFilledCount || 0, 'fields filled');
    } else {
      console.warn('Autofill failed:', result.error);
    }
  } catch (error) {
    console.error('Error handling autofill completion:', error);
  }
}

async function handleError(errorData: { error: string; details?: any }): Promise<void> {
  try {
    console.error('Extension error reported:', errorData.error, errorData.details);

    // Could implement error reporting or recovery mechanisms here
    // For now, just log the error
  } catch (error) {
    console.error('Error handling error report:', error);
  }
}

// Storage change listener for debugging and state synchronization
chrome.storage.onChanged.addListener((changes, namespace) => {
  console.log('Storage changed:', namespace, changes);

  // Notify content scripts about relevant storage changes
  Object.keys(changes).forEach(async (key) => {
    if (key === 'autofillEnabled') {
      await messaging.sendToAllContentScripts({
        type: MessageType.TOGGLE_AUTOFILL,
        payload: { enabled: changes[key].newValue }
      });
    }
  });
});

// Error handling for unhandled promise rejections
self.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection in service worker:', event.reason);
  event.preventDefault();
});

console.log('Service worker setup complete');