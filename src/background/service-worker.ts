// Service worker for Job Application Autofill extension
// Handles background processing, storage operations, and inter-component communication

import { storage } from '../shared/storage';
import { messaging } from '../shared/messaging';
import { Message, MessageType, UserProfile, CVData, CVProcessingResult, CVProcessingErrorCode } from '../shared/types';
import { CVErrorHandler } from '../shared/cv-error-handler';
import { TimeoutHandler } from '../shared/timeout-handler';
import pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import { Buffer } from 'buffer';

console.log('Job Application Autofill service worker loaded');

// Test service worker startup
try {
  console.log('Service worker startup test - chrome.runtime.id:', chrome.runtime.id);
  console.log('Service worker startup test - chrome.storage available:', !!chrome.storage);
} catch (error) {
  console.error('Service worker startup error:', error);
}

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
chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  console.log('Service worker received message:', message.type, 'from:', sender?.tab?.id || 'popup');

  // Handle PING synchronously for immediate response
  if ((message as any).type === 'PING') {
    console.log('Service worker ping received - responding immediately');
    sendResponse({ success: true, status: 'ready', timestamp: Date.now() });
    return false; // Synchronous response
  }

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
          if (cvResult.success) {
            sendResponse({ success: true, data: cvResult.data });
          } else {
            sendResponse({ 
              success: false, 
              error: cvResult.error,
              errorCode: cvResult.errorCode,
              userMessage: cvResult.userMessage,
              details: cvResult.details
            });
          }
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
          console.log('Content script ready signal received from tab:', sender.tab?.id, 'with page info:', message.payload);
          // Store page relevance info for this tab
          if (sender.tab?.id && message.payload) {
            // Could store this in a Map for quick access if needed
            console.log('Page relevance for tab', sender.tab.id, ':', message.payload);
          }
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

async function handleSetCVData(payload: { fileData: any }): Promise<CVProcessingResult> {
  try {
    const { fileData } = payload;

    if (!fileData) {
      return CVErrorHandler.createError(
        CVProcessingErrorCode.EXTRACTION_FAILED,
        'No file data provided'
      );
    }

    // Reconstruct File object from serialized data
    const file = new File([fileData.arrayBuffer], fileData.name, {
      type: fileData.type,
      lastModified: fileData.lastModified
    });

    // Validate file before processing
    const validationError = CVErrorHandler.validateFile(file);
    if (validationError) {
      return validationError;
    }

    const fileType = getFileType(file.name)!; // We know it's valid from validation
    console.log('Processing CV file:', file.name, 'Type:', fileType, 'Size:', file.size);

    // Extract text from file with timeout
    const startTime = Date.now();
    const maxProcessingTime = fileType === 'pdf' 
      ? TimeoutHandler.DEFAULT_TIMEOUTS.PDF_PARSING 
      : TimeoutHandler.DEFAULT_TIMEOUTS.DOCX_PARSING;

    let extractionResult: { text: string; pageCount?: number };
    
    try {
      extractionResult = await TimeoutHandler.withTimeout(
        extractTextFromFile(file, fileType),
        maxProcessingTime,
        `CV processing timed out after ${maxProcessingTime / 1000} seconds`
      );
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      if (error instanceof Error && error.message.includes('timed out')) {
        return CVErrorHandler.createTimeoutError(processingTime, maxProcessingTime);
      }
      
      // Analyze the error and return appropriate error response
      return CVErrorHandler.analyzeError(error as Error, fileType);
    }

    const extractionTime = Date.now() - startTime;
    const cleanedText = extractionResult.text.trim();
    const wordCount = cleanedText.split(/\s+/).filter(word => word.length > 0).length;

    // Validate extracted content
    const contentValidationError = CVErrorHandler.validateContent(cleanedText, wordCount);
    if (contentValidationError) {
      return contentValidationError;
    }

    // Create CV data object
    const cvData: CVData = {
      fileName: file.name,
      fileSize: file.size,
      uploadDate: Date.now(),
      extractedText: cleanedText,
      fileType,
      extractionMetadata: {
        pageCount: extractionResult.pageCount,
        wordCount,
        extractionTime,
        extractionMethod: fileType === 'pdf' ? 'pdf-parse' : 'mammoth'
      }
    };

    // Save to storage
    const success = await storage.setCVData(cvData);

    if (success) {
      console.log('CV data saved successfully:', cvData.fileName);
      return { success: true, data: cvData };
    } else {
      return CVErrorHandler.createError(
        CVProcessingErrorCode.EXTRACTION_FAILED,
        'Failed to save CV data to storage'
      );
    }

  } catch (error) {
    console.error('Error processing CV file:', error);
    return CVErrorHandler.createError(
      CVProcessingErrorCode.EXTRACTION_FAILED,
      error instanceof Error ? error.message : 'Unknown error occurred'
    );
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
async function extractTextFromFile(file: File, fileType: 'pdf' | 'docx'): Promise<{ text: string; pageCount?: number }> {
  console.log(`Starting text extraction for ${fileType.toUpperCase()} file:`, file.name);
  
  let extractedText: string;
  let pageCount: number | undefined;
  
  if (fileType === 'pdf') {
    const pdfResult = await extractTextFromPDF(file);
    extractedText = pdfResult.text;
    pageCount = pdfResult.pageCount;
  } else if (fileType === 'docx') {
    extractedText = await extractTextFromDOCX(file);
    pageCount = undefined; // DOCX doesn't have page concept like PDF
  } else {
    throw new Error(`Unsupported file type: ${fileType}`);
  }
  
  // Clean the extracted text with timeout
  const cleanedText = await TimeoutHandler.withTimeout(
    Promise.resolve(cleanExtractedText(extractedText)),
    TimeoutHandler.DEFAULT_TIMEOUTS.TEXT_CLEANING,
    'Text cleaning operation timed out'
  );
  
  console.log(`Text extraction successful. Extracted ${cleanedText.length} characters from ${file.name}`);
  return { text: cleanedText, pageCount };
}

// Extract text from PDF files using pdf-parse
async function extractTextFromPDF(file: File): Promise<{ text: string; pageCount: number }> {
  console.log('Converting PDF file to buffer for parsing...');
  
  // Convert File to ArrayBuffer with timeout
  const arrayBuffer = await TimeoutHandler.withTimeout(
    file.arrayBuffer(),
    TimeoutHandler.DEFAULT_TIMEOUTS.FILE_READING,
    'File reading timed out'
  );
  
  const buffer = Buffer.from(arrayBuffer);
  console.log(`PDF buffer created, size: ${buffer.length} bytes`);
  
  // Parse PDF with pdf-parse and enhanced error handling
  try {
    const pdfData = await pdfParse(buffer, {
      max: 0, // Parse all pages (0 = no limit)
      version: 'v1.10.100' // Specify version for compatibility
    });
    
    console.log(`PDF parsing complete. Pages: ${pdfData.numpages}, Text length: ${pdfData.text.length}`);
    
    if (!pdfData.text || pdfData.text.trim().length === 0) {
      throw new Error('No readable text found in the PDF. The document may be image-based or corrupted.');
    }
    
    return {
      text: pdfData.text,
      pageCount: pdfData.numpages || 1
    };
    
  } catch (error) {
    console.error('PDF parsing error:', error);
    
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      
      // Handle specific pdf-parse errors with more detailed detection
      if (errorMessage.includes('invalid pdf') || 
          errorMessage.includes('pdf structure') ||
          errorMessage.includes('not a pdf') ||
          errorMessage.includes('corrupted')) {
        throw new Error('Invalid PDF structure - the file may be corrupted.');
      }
      
      if (errorMessage.includes('password') || 
          errorMessage.includes('encrypted') ||
          errorMessage.includes('security')) {
        throw new Error('Password-protected PDF files are not supported.');
      }
      
      if (errorMessage.includes('no readable text') || 
          errorMessage.includes('image-based')) {
        throw error; // Re-throw our custom validation error
      }
      
      if (errorMessage.includes('memory') || 
          errorMessage.includes('out of memory')) {
        throw new Error('PDF file is too complex to process. Please try a simpler document.');
      }
      
      // Generic PDF parsing error
      throw new Error(`PDF parsing failed: ${error.message}`);
    } else {
      throw new Error('Unknown error occurred during PDF parsing.');
    }
  }
}

// Extract text from DOCX files using mammoth
async function extractTextFromDOCX(file: File): Promise<string> {
  console.log('Converting DOCX file to buffer for parsing...');
  
  // Convert File to ArrayBuffer with timeout
  const arrayBuffer = await TimeoutHandler.withTimeout(
    file.arrayBuffer(),
    TimeoutHandler.DEFAULT_TIMEOUTS.FILE_READING,
    'File reading timed out'
  );
  
  console.log(`DOCX buffer created, size: ${arrayBuffer.byteLength} bytes`);
  
  // Parse DOCX with mammoth and enhanced error handling
  try {
    const result = await mammoth.extractRawText({ arrayBuffer });
    
    console.log(`DOCX parsing complete. Text length: ${result.value.length}`);
    
    // Check for extraction warnings and log them
    if (result.messages && result.messages.length > 0) {
      const warnings = result.messages.filter(msg => msg.type === 'warning');
      const errors = result.messages.filter(msg => msg.type === 'error');
      
      if (warnings.length > 0) {
        console.warn('DOCX extraction warnings:', warnings.map(w => w.message));
      }
      
      if (errors.length > 0) {
        console.error('DOCX extraction errors:', errors.map(e => e.message));
        throw new Error(`DOCX parsing errors: ${errors.map(e => e.message).join(', ')}`);
      }
    }
    
    if (!result.value || result.value.trim().length === 0) {
      throw new Error('No readable text found in the DOCX document. The document may be empty or corrupted.');
    }
    
    return result.value;
    
  } catch (error) {
    console.error('DOCX parsing error:', error);
    
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      
      // Handle specific mammoth errors with more detailed detection
      if (errorMessage.includes('not a valid zip') || 
          errorMessage.includes('invalid signature') ||
          errorMessage.includes('zip file') ||
          errorMessage.includes('corrupt')) {
        throw new Error('Invalid DOCX file structure - the file may be corrupted or not a valid Word document.');
      }
      
      if (errorMessage.includes('password') || 
          errorMessage.includes('encrypted') ||
          errorMessage.includes('protected')) {
        throw new Error('Password-protected or encrypted DOCX files are not supported.');
      }
      
      if (errorMessage.includes('no readable text') || 
          errorMessage.includes('empty')) {
        throw error; // Re-throw our custom validation error
      }
      
      if (errorMessage.includes('memory') || 
          errorMessage.includes('out of memory')) {
        throw new Error('DOCX file is too complex to process. Please try a simpler document.');
      }
      
      if (errorMessage.includes('docx parsing errors')) {
        throw error; // Re-throw mammoth-specific errors
      }
      
      // Generic DOCX parsing error
      throw new Error(`DOCX parsing failed: ${error.message}`);
    } else {
      throw new Error('Unknown error occurred during DOCX parsing.');
    }
  }
}

// Clean and normalize extracted text
function cleanExtractedText(text: string): string {
  if (!text) {
    return '';
  }
  
  console.log('Cleaning extracted text...');
  
  // Remove excessive whitespace and normalize line breaks
  let cleaned = text
    // Normalize different types of line breaks to \n
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove excessive whitespace (more than 2 consecutive spaces)
    .replace(/[ \t]{3,}/g, '  ')
    // Remove excessive line breaks (more than 2 consecutive newlines)
    .replace(/\n{3,}/g, '\n\n')
    // Remove trailing whitespace from each line
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    // Remove leading and trailing whitespace from the entire text
    .trim();
  
  // Remove common document artifacts
  cleaned = removeDocumentArtifacts(cleaned);
  
  console.log(`Text cleaning complete. Original length: ${text.length}, Cleaned length: ${cleaned.length}`);
  
  return cleaned;
}

// Remove common document artifacts like page numbers, headers, footers
function removeDocumentArtifacts(text: string): string {
  const lines = text.split('\n');
  const cleanedLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (line.length === 0) {
      cleanedLines.push('');
      continue;
    }
    
    // Skip lines that look like page numbers (just numbers or "Page X")
    if (/^(Page\s+)?\d+(\s+of\s+\d+)?$/i.test(line)) {
      continue;
    }
    
    // Skip lines that are just dates
    if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(line)) {
      continue;
    }
    
    // Skip very short lines that might be artifacts (less than 3 characters)
    // unless they contain meaningful content like bullet points
    if (line.length < 3 && !/[•\-\*]/.test(line)) {
      continue;
    }
    
    cleanedLines.push(line);
  }
  
  return cleanedLines.join('\n');
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