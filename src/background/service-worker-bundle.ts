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
const CONTENT_SCRIPT_FILE = 'content/content.js';

const messaging = {
  async sendToContentScript(tabId: number, message: Message): Promise<any> {
    if (tabId === undefined || tabId === null) throw new Error('Invalid tabId');
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (resp) => {
        if (!chrome.runtime.lastError) return resolve(resp);

        // No receiver: try to inject the content script then retry once
        console.warn('No receiver in tab, attempting to inject content script:', chrome.runtime.lastError.message);
        chrome.scripting.executeScript(
          { target: { tabId }, files: [CONTENT_SCRIPT_FILE] },
          () => {
            if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
            // short delay, then retry sending
            setTimeout(() => {
              chrome.tabs.sendMessage(tabId, message, (resp2) => {
                if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
                resolve(resp2);
              });
            }, 50);
          }
        );
      });
    });
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
            await handleTriggerAutofill(sender);
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

    // Normalize incoming fileData:
    // Accept:
    // - a File / Blob (sent from popup mistakenly)
    // - an object: { name, type, lastModified, size, arrayBuffer } where arrayBuffer is ArrayBuffer or Uint8Array or base64 string
    let file: File | null = null;
    let inferredName = fileData.name || 'uploaded_cv';
    let inferredType = fileData.type || 'application/octet-stream';
    let inferredLastModified = fileData.lastModified || Date.now();
    let inferredSize = fileData.size;

    if (fileData instanceof File || fileData instanceof Blob) {
      // If popup accidentally sent a File/Blob, use it directly (but DO NOT store it raw)
      const blob = fileData as Blob;
      inferredSize = blob.size;
      inferredType = blob.type || inferredType;
      // convert blob -> File so we have name & lastModified metadata (if available)
      try {
        file = new File([blob], inferredName, { type: inferredType, lastModified: inferredLastModified });
      } catch (e) {
        // Some environments may not allow File constructor; fallback to Blob
        file = new File([blob], inferredName, { type: inferredType, lastModified: inferredLastModified });
      }
    } else if (typeof fileData === 'object' && fileData.arrayBuffer !== undefined) {
      // Accept ArrayBuffer, SharedArrayBuffer, TypedArray, or base64 string.
      let abLike: ArrayBufferLike | null = null;
      const arrival = fileData.arrayBuffer;

      if (arrival instanceof ArrayBuffer) {
        abLike = arrival;
      } else if (ArrayBuffer.isView(arrival) && (arrival as ArrayBufferView).buffer) {
        // TypedArray (Uint8Array, etc.)
        abLike = (arrival as ArrayBufferView).buffer;
      } else if (typeof arrival === 'object' && arrival && 'buffer' in arrival) {
        // e.g. { buffer: SharedArrayBuffer } or similar wrappers
        abLike = (arrival as any).buffer;
      } else if (typeof arrival === 'string') {
        // base64 -> ArrayBuffer
        try {
          const binary = atob(arrival);
          const len = binary.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
          abLike = bytes.buffer;
        } catch (err) {
          console.warn('Could not decode base64 arrayBuffer in fileData');
        }
      }

      if (!abLike) {
        return { success: false, error: 'fileData.arrayBuffer not in a supported format' };
      }

      inferredName = fileData.name || inferredName;
      inferredType = fileData.type || inferredType;
      inferredLastModified = fileData.lastModified || inferredLastModified;
      // use (abLike as any).byteLength to support SharedArrayBuffer in TS
      inferredSize = fileData.size ?? (abLike as any).byteLength;

      // Create a Uint8Array view. Cast to BlobPart to satisfy TS Blob/File constructor types.
      const blobView = new Uint8Array(abLike as any);
      const blobPart = blobView as unknown as BlobPart;
      try {
        file = new File([blobPart], inferredName, { type: inferredType, lastModified: inferredLastModified });
      } catch (e) {
        const blob = new Blob([blobPart], { type: inferredType });
        file = new File([blob], inferredName, { type: inferredType, lastModified: inferredLastModified });
      }
    } else {
      return { success: false, error: 'Unsupported fileData format' };
    }

    // At this point we have a File object (local only) and inferredSize
    const fileSize = inferredSize ?? (file ? file.size : 0);

    // Validate file type
    const fileType = getFileType(inferredName);
    if (!fileType) {
      return { success: false, error: 'Unsupported file type. Please upload PDF or Word documents.' };
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (fileSize > maxSize) {
      return { success: false, error: 'File size too large. Please upload files smaller than 5MB.' };
    }

    console.log('Processing CV file:', inferredName, 'Type:', fileType, 'Size:', fileSize);

    // Extract text from file (placeholder implementation)
    const extractedText = await extractTextFromFile(file as File, fileType);

    if (!extractedText || extractedText.trim().length === 0) {
      return { success: false, error: 'Could not extract text from the file. Please ensure the file is not corrupted.' };
    }

    // Create CV data object (only plain serializable fields; do NOT include binary buffers)
    const cvData: CVData = {
      fileName: inferredName,
      fileSize,
      uploadDate: Date.now(),
      extractedText: extractedText.trim(),
      fileType
    };

    // Save to storage (only metadata/text)
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

async function handleTriggerAutofill(sender?: chrome.runtime.MessageSender) {
  try {
    let tabId = sender?.tab?.id;
    if (tabId === undefined || tabId === null) {
      const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      tabId = tabs?.[0]?.id;
    }
    if (!tabId) {
      console.warn('No target tab available for TRIGGER_AUTOFILL');
      return;
    }

    try {
      await messaging.sendToContentScript(tabId, { type: MessageType.TRIGGER_AUTOFILL });
      console.debug('Autofill message sent to tab', tabId);
    } catch (err: any) {
      console.warn('Initial send failed, attempting to inject content script:', err?.message || err);
      // inject the built content script file and retry once
      try {
        await chrome.scripting.executeScript({ target: { tabId }, files: [CONTENT_SCRIPT_FILE] });
        // small delay and retry
        await new Promise(res => setTimeout(res, 60));
        await messaging.sendToContentScript(tabId, { type: MessageType.TRIGGER_AUTOFILL });
        console.debug('Autofill message sent after injection to tab', tabId);
      } catch (injectErr) {
        console.error('Failed to inject/retry content script:', injectErr);
      }
    }
  } catch (e) {
    console.error('handleTriggerAutofill error:', e);
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