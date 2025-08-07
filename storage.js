// Storage Manager - Local storage operations for CV data and settings
class StorageManager {
  constructor() {
    this.STORAGE_KEYS = {
      CV_DATA: 'jobHelperCVData',
      SETTINGS: 'jobHelperSettings',
      TEMPLATES: 'jobHelperTemplates',
      INITIALIZED: 'jobHelperInitialized'
    };
  }

  // Save CV data to local storage
  async saveCVData(cvData) {
    try {
      await chrome.storage.local.set({ [this.STORAGE_KEYS.CV_DATA]: cvData });
      console.log('CV data saved successfully');
      return true;
    } catch (error) {
      console.error('Error saving CV data:', error);
      throw error;
    }
  }

  // Load CV data from local storage
  async loadCVData() {
    try {
      const result = await chrome.storage.local.get([this.STORAGE_KEYS.CV_DATA]);
      return result[this.STORAGE_KEYS.CV_DATA] || window.CVDataStructure.getDefaultCVData();
    } catch (error) {
      console.error('Error loading CV data:', error);
      return window.CVDataStructure.getDefaultCVData();
    }
  }

  // Save settings to local storage
  async saveSettings(settings) {
    try {
      await chrome.storage.local.set({ [this.STORAGE_KEYS.SETTINGS]: settings });
      console.log('Settings saved successfully');
      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  }

  // Load settings from local storage
  async loadSettings() {
    try {
      const result = await chrome.storage.local.get([this.STORAGE_KEYS.SETTINGS]);
      return result[this.STORAGE_KEYS.SETTINGS] || window.CVDataStructure.getDefaultSettings();
    } catch (error) {
      console.error('Error loading settings:', error);
      return window.CVDataStructure.getDefaultSettings();
    }
  }

  // Save templates to local storage
  async saveTemplates(templates) {
    try {
      await chrome.storage.local.set({ [this.STORAGE_KEYS.TEMPLATES]: templates });
      console.log('Templates saved successfully');
      return true;
    } catch (error) {
      console.error('Error saving templates:', error);
      throw error;
    }
  }

  // Load templates from local storage
  async loadTemplates() {
    try {
      const result = await chrome.storage.local.get([this.STORAGE_KEYS.TEMPLATES]);
      return result[this.STORAGE_KEYS.TEMPLATES] || window.CVDataStructure.getDefaultTemplates();
    } catch (error) {
      console.error('Error loading templates:', error);
      return window.CVDataStructure.getDefaultTemplates();
    }
  }

  // Check if extension has been initialized
  async isInitialized() {
    try {
      const result = await chrome.storage.local.get([this.STORAGE_KEYS.INITIALIZED]);
      return result[this.STORAGE_KEYS.INITIALIZED] || false;
    } catch (error) {
      console.error('Error checking initialization status:', error);
      return false;
    }
  }

  // Mark extension as initialized
  async setInitialized(value = true) {
    try {
      await chrome.storage.local.set({ [this.STORAGE_KEYS.INITIALIZED]: value });
      console.log('Initialization status set to:', value);
      return true;
    } catch (error) {
      console.error('Error setting initialization status:', error);
      throw error;
    }
  }

  // Initialize storage with default data
  async initializeStorage() {
    try {
      const isInitialized = await this.isInitialized();
      if (isInitialized) {
        console.log('Storage already initialized');
        return false;
      }

      // Initialize with defaults
      await this.saveCVData(window.CVDataStructure.getDefaultCVData());
      await this.saveSettings(window.CVDataStructure.getDefaultSettings());
      await this.saveTemplates(window.CVDataStructure.getDefaultTemplates());
      await this.setInitialized(true);

      console.log('Storage initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing storage:', error);
      throw error;
    }
  }

  // Clear all stored data
  async clearAll() {
    try {
      await chrome.storage.local.clear();
      console.log('All storage cleared');
      return true;
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  }

  // Get all stored data
  async getAllData() {
    try {
      const cvData = await this.loadCVData();
      const settings = await this.loadSettings();
      const templates = await this.loadTemplates();
      const initialized = await this.isInitialized();

      return {
        cvData,
        settings,
        templates,
        initialized
      };
    } catch (error) {
      console.error('Error loading all data:', error);
      throw error;
    }
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageManager;
} else {
  window.StorageManager = StorageManager;
}