// Service worker for Job Application Autofill extension
// Handles background processing, storage operations, and inter-component communication

import { storage } from '../shared/storage';
import { messaging } from '../shared/messaging';
import { Message, MessageType, UserProfile, CVData } from '../shared/types';
import pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import { Buffer } from 'buffer';

console.log('Job Application Autofill service worker loaded');

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
messaging.addMessageListener(async (message: Message, sender, sendResponse) => {
  console.log('Service worker received message:', message.type, sender);

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

      default:
        console.warn('Unknown message type:', message.type);
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  } catch (error) {
    console.error('Error handling message:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    sendResponse({ success: false, error: errorMessage });
  }
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
  const arrayBuffer = await file.arrayBuffer();

  try {
    if (fileType === 'pdf') {
      // pdf-parse expects a Buffer, so we need to create one from the ArrayBuffer
      const buffer = Buffer.from(arrayBuffer);
      const data = await pdfParse(buffer);
      return data.text;
    } else if (fileType === 'docx') {
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    }
  } catch (error) {
    console.error('Error extracting text from file:', error);
    throw new Error(`Failed to extract text from ${fileType.toUpperCase()} file`);
  }

  throw new Error('Unsupported file type');
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
      if (tabs.length > 0 && tabs[0].id) {
        targetTabId = tabs[0].id;
      } else {
        throw new Error('No active tab found');
      }
    }

    // Send message to specific tab
    if (targetTabId) {
      try {
        const response = await messaging.sendToContentScript(targetTabId, {
          type: MessageType.TRIGGER_AUTOFILL,
          payload: autofillData
        });
        console.log('Autofill triggered successfully, response:', response);
      } catch (error) {
        console.error('Error sending message to content script:', error);
        throw new Error('Could not communicate with the page. Please refresh and try again.');
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