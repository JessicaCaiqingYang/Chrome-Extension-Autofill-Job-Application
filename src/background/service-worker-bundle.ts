// Service worker for Job Application Autofill extension
// This is a bundled version that includes all dependencies inline

console.log('Job Application Autofill service worker loaded');

// Types (inlined)
interface UserProfile {
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: {
      street: string;
      city: string;
      state: string;
      postCode: string;
      country: string;
    };
  };
  workInfo: {
    currentTitle?: string;
    experience?: string;
    skills?: string[];
    linkedinUrl?: string;
    portfolioUrl?: string;
  };
  preferences: {
    autofillEnabled: boolean;
    lastUpdated: number;
  };
}

interface CVData {
  fileName: string;
  fileSize: number;
  uploadDate: number;
  extractedText: string;
  fileType: 'pdf' | 'docx';
}

interface Message {
  type: MessageType;
  payload?: any;
}

enum MessageType {
  GET_USER_PROFILE = 'GET_USER_PROFILE',
  SET_USER_PROFILE = 'SET_USER_PROFILE',
  GET_CV_DATA = 'GET_CV_DATA',
  SET_CV_DATA = 'SET_CV_DATA',
  TOGGLE_AUTOFILL = 'TOGGLE_AUTOFILL',
  TRIGGER_AUTOFILL = 'TRIGGER_AUTOFILL',
  AUTOFILL_COMPLETE = 'AUTOFILL_COMPLETE',
  ERROR = 'ERROR'
}

enum StorageKey {
  USER_PROFILE = 'userProfile',
  CV_DATA = 'cvData',
  AUTOFILL_ENABLED = 'autofillEnabled'
}

// Storage utilities (inlined)
const storage = {
  async getUserProfile(): Promise<UserProfile | null> {
    try {
      const result = await chrome.storage.local.get(StorageKey.USER_PROFILE);
      return result[StorageKey.USER_PROFILE] || null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  },

  async setUserProfile(profile: UserProfile): Promise<boolean> {
    try {
      await chrome.storage.local.set({
        [StorageKey.USER_PROFILE]: {
          ...profile,
          preferences: {
            ...profile.preferences,
            lastUpdated: Date.now()
          }
        }
      });
      return true;
    } catch (error) {
      console.error('Error setting user profile:', error);
      return false;
    }
  },

  async getCVData(): Promise<CVData | null> {
    try {
      const result = await chrome.storage.local.get(StorageKey.CV_DATA);
      return result[StorageKey.CV_DATA] || null;
    } catch (error) {
      console.error('Error getting CV data:', error);
      return null;
    }
  },

  async setCVData(cvData: CVData): Promise<boolean> {
    try {
      await chrome.storage.local.set({
        [StorageKey.CV_DATA]: cvData
      });
      return true;
    } catch (error) {
      console.error('Error setting CV data:', error);
      return false;
    }
  },

  async getAutofillEnabled(): Promise<boolean> {
    try {
      const result = await chrome.storage.local.get(StorageKey.AUTOFILL_ENABLED);
      return result[StorageKey.AUTOFILL_ENABLED] ?? true;
    } catch (error) {
      console.error('Error getting autofill status:', error);
      return false;
    }
  },

  async setAutofillEnabled(enabled: boolean): Promise<boolean> {
    try {
      await chrome.storage.local.set({
        [StorageKey.AUTOFILL_ENABLED]: enabled
      });
      return true;
    } catch (error) {
      console.error('Error setting autofill status:', error);
      return false;
    }
  }
};

// Messaging utilities (inlined)
const messaging = {
  async sendToContentScript(tabId: number, message: Message): Promise<any> {
    try {
      const response = await chrome.tabs.sendMessage(tabId, message);
      return response;
    } catch (error) {
      console.error('Error sending message to content script:', error);
      throw error;
    }
  },

  async sendToAllContentScripts(message: Message): Promise<void> {
    try {
      const tabs = await chrome.tabs.query({ active: true });
      const promises = tabs.map(tab => {
        if (tab.id) {
          return this.sendToContentScript(tab.id, message).catch(error => {
            console.debug('Could not send message to tab:', tab.id, error);
          });
        }
      });
      await Promise.allSettled(promises);
    } catch (error) {
      console.error('Error sending message to all content scripts:', error);
    }
  }
};

// Service worker installation and setup
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Extension installed');
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

// Message handling
chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  console.log('Service worker received message:', message.type, sender);

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

  return true; // Keep message channel open for async response
});

// Handler functions
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
    if (!profileData || !profileData.personalInfo) {
      throw new Error('Invalid profile data');
    }

    const success = await storage.setUserProfile(profileData);
    console.log('User profile saved:', success);

    if (success) {
      const autofillEnabled = await storage.getAutofillEnabled();
      if (autofillEnabled) {
        await messaging.sendToAllContentScripts({
          type: MessageType.SET_USER_PROFILE,
          payload: profileData
        });
      }
    }

    return success;
  } catch (error) {
    console.error('Error setting user profile:', error);
    throw error;
  }
}

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

    // Extract text from file (placeholder implementation)
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

async function extractTextFromFile(file: File, fileType: 'pdf' | 'docx'): Promise<string> {
  // TODO: Implement proper PDF/DOCX parsing with browser-compatible libraries
  console.warn('PDF/DOCX text extraction not yet implemented');
  return `[File uploaded: ${file.name} (${fileType.toUpperCase()}) - Text extraction will be implemented in a future update]`;
}

async function handleToggleAutofill(enabled: boolean): Promise<boolean> {
  try {
    const success = await storage.setAutofillEnabled(enabled);
    console.log('Autofill toggled:', enabled, 'Success:', success);

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
    const autofillEnabled = await storage.getAutofillEnabled();
    if (!autofillEnabled) {
      console.log('Autofill is disabled, ignoring trigger');
      throw new Error('Autofill is disabled');
    }

    const [userProfile, cvData] = await Promise.all([
      storage.getUserProfile(),
      storage.getCVData()
    ]);

    if (!userProfile) {
      console.warn('No user profile found, cannot autofill');
      throw new Error('No user profile found. Please complete your profile first.');
    }

    const autofillData = {
      userProfile,
      cvData,
      timestamp: Date.now()
    };

    let targetTabId = tabId;
    
    if (!targetTabId) {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length > 0 && tabs[0].id) {
        targetTabId = tabs[0].id;
      } else {
        throw new Error('No active tab found');
      }
    }

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
  } catch (error) {
    console.error('Error handling error report:', error);
  }
}

// Storage change listener
chrome.storage.onChanged.addListener((changes, namespace) => {
  console.log('Storage changed:', namespace, changes);
  Object.keys(changes).forEach(async (key) => {
    if (key === 'autofillEnabled') {
      await messaging.sendToAllContentScripts({
        type: MessageType.TOGGLE_AUTOFILL,
        payload: { enabled: changes[key].newValue }
      });
    }
  });
});

// Error handling
self.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection in service worker:', event.reason);
  event.preventDefault();
});

console.log('Service worker setup complete');