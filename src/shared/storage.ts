// Chrome storage API wrapper functions
import { UserProfile, CVData, StorageKey } from './types';

// Utility functions for blob-to-base64 conversion for Chrome storage compatibility
export const blobUtils = {
  // Convert Blob to base64 string for storage
  async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('Failed to convert blob to base64'));
      reader.readAsDataURL(blob);
    });
  },

  // Convert base64 string back to Blob
  base64ToBlob(base64: string, mimeType: string): Blob {
    try {
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      return new Blob([byteArray], { type: mimeType });
    } catch (error) {
      throw new Error('Failed to convert base64 to blob: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  },

  // Get MIME type from file extension
  getMimeTypeFromExtension(fileName: string): string {
    const extension = fileName.toLowerCase().split('.').pop();
    switch (extension) {
      case 'pdf':
        return 'application/pdf';
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'doc':
        return 'application/msword';
      default:
        return 'application/octet-stream';
    }
  },

  // Create File object from stored CV data
  createFileFromCVData(cvData: CVData): File {
    const blob = this.base64ToBlob(cvData.fileBlob, cvData.mimeType);
    return new File([blob], cvData.fileName, {
      type: cvData.mimeType,
      lastModified: cvData.uploadDate
    });
  }
};

export const storage = {
  // Get user profile from Chrome storage
  async getUserProfile(): Promise<UserProfile | null> {
    try {
      const result = await chrome.storage.local.get(StorageKey.USER_PROFILE);
      return result[StorageKey.USER_PROFILE] || null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  },

  // Set user profile in Chrome storage
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

  // Get CV data from Chrome storage
  async getCVData(): Promise<CVData | null> {
    try {
      const result = await chrome.storage.local.get(StorageKey.CV_DATA);
      const cvData = result[StorageKey.CV_DATA];
      
      if (!cvData) {
        return null;
      }

      // Check if this is legacy data without blob fields
      if (!cvData.fileBlob || !cvData.mimeType) {
        console.warn('Legacy CV data found without blob fields. File upload functionality will not be available until CV is re-uploaded.');
        // Return the data as-is but with empty blob fields to maintain compatibility
        return {
          ...cvData,
          fileBlob: '',
          mimeType: blobUtils.getMimeTypeFromExtension(cvData.fileName || '')
        };
      }

      return cvData;
    } catch (error) {
      console.error('Error getting CV data:', error);
      return null;
    }
  },

  // Set CV data in Chrome storage
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

  // Get autofill enabled status
  async getAutofillEnabled(): Promise<boolean> {
    try {
      const result = await chrome.storage.local.get(StorageKey.AUTOFILL_ENABLED);
      return result[StorageKey.AUTOFILL_ENABLED] ?? true; // Default to enabled
    } catch (error) {
      console.error('Error getting autofill status:', error);
      return false;
    }
  },

  // Set autofill enabled status
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
  },

  // Clear all stored data (for uninstall cleanup)
  async clearAll(): Promise<boolean> {
    try {
      await chrome.storage.local.clear();
      return true;
    } catch (error) {
      console.error('Error clearing storage:', error);
      return false;
    }
  },

  // Get storage usage information
  async getStorageInfo(): Promise<{ bytesInUse: number; quota: number } | null> {
    try {
      const bytesInUse = await chrome.storage.local.getBytesInUse();
      const quota = chrome.storage.local.QUOTA_BYTES;
      return { bytesInUse, quota };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return null;
    }
  },

  // Check if CV data has valid blob data for file uploads
  async hasCVFileData(): Promise<boolean> {
    try {
      const cvData = await this.getCVData();
      return !!(cvData && cvData.fileBlob && cvData.mimeType);
    } catch (error) {
      console.error('Error checking CV file data:', error);
      return false;
    }
  }
};