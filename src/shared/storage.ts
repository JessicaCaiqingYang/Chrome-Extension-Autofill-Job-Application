// Chrome storage API wrapper functions
import { UserProfile, CVData, StorageKey } from './types';

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
      return result[StorageKey.CV_DATA] || null;
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
  }
};