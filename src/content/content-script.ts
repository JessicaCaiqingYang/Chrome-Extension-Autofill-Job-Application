// Content script for Job Application Autofill extension
// This will handle form detection and filling on job application pages

import { fieldMapping } from '../shared/fieldMapping';
import { FieldType, FieldMapping, FileUploadMapping, FileUploadType, MessageType, Message } from '../shared/types';
import { messaging } from '../shared/messaging';
import { blobUtils } from '../shared/storage';

console.log('Job Application Autofill content script loaded');

// Utility function to check if extension context is valid
function isExtensionContextValid(): boolean {
  try {
    return !!(chrome.runtime && chrome.runtime.id);
  } catch {
    return false;
  }
}

// Signal that the content script is ready
if (isExtensionContextValid()) {
  chrome.runtime.sendMessage({ type: 'CONTENT_SCRIPT_READY' }).catch((error) => {
    if (error.message?.includes('Extension context invalidated') || 
        error.message?.includes('receiving end does not exist')) {
      console.warn('Extension context invalidated during initialization');
    } else {
      console.debug('Content script ready signal failed:', error);
    }
  });
} else {
  console.warn('Extension context is not valid, skipping ready signal');
}

class FormDetectionSystem {
  private detectedFields: HTMLElement[] = [];
  private fieldMappings: FieldMapping[] = [];
  private fileUploadFields: HTMLInputElement[] = [];
  private fileUploadMappings: FileUploadMapping[] = [];
  private observer: MutationObserver | null = null;
  private isScanning = false;

  constructor() {
    this.initializeDetection();
    this.setupMessageListener();
    this.injectStyles();
  }

  /**
   * Check if extension context is still valid
   */
  private isExtensionContextValid(): boolean {
    try {
      return !!(chrome.runtime && chrome.runtime.id);
    } catch {
      return false;
    }
  }

  /**
   * Initialize the form detection system
   */
  private initializeDetection(): void {
    // Initial scan when content script loads
    this.scanForFormFields().catch(console.error);

    // Set up mutation observer to detect dynamically added forms
    this.setupMutationObserver();

    // Re-scan periodically for dynamic content
    setInterval(() => {
      if (!this.isScanning) {
        this.scanForFormFields().catch(console.error);
      }
    }, 3000);
  }

  /**
   * Scan the page for fillable form fields using multiple detection strategies
   */
  public async scanForFormFields(): Promise<HTMLElement[]> {
    if (this.isScanning) {
      return this.detectedFields;
    }

    this.isScanning = true;
    console.log('Scanning for form fields...');

    try {
      // Strategy 1: Basic form field detection
      const basicFields = this.detectBasicFormFields();

      // Strategy 2: Context-aware detection
      const contextFields = this.detectFieldsByContext();

      // Strategy 3: Attribute-based detection
      const attributeFields = this.detectFieldsByAttributes();

      // Combine and deduplicate results
      const allFields = this.deduplicateFields([
        ...basicFields,
        ...contextFields,
        ...attributeFields
      ]);

      // Filter for fillable fields only
      this.detectedFields = allFields.filter(field =>
        fieldMapping.isFieldFillable(field)
      );

      // Classify field types
      await this.classifyFieldTypes();

      // Detect and classify file upload fields
      await this.detectAndClassifyFileUploadFields();

      console.log(`Detected ${this.detectedFields.length} fillable form fields and ${this.fileUploadFields.length} file upload fields`);

      return this.detectedFields;
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Strategy 1: Basic form field detection using standard selectors
   */
  private detectBasicFormFields(): HTMLElement[] {
    const selectors = [
      'input[type="text"]',
      'input[type="email"]',
      'input[type="tel"]',
      'input[type="url"]',
      'input[type="search"]',
      'input:not([type])', // Default input type is text
      'textarea',
      'select'
    ];

    const fields: HTMLElement[] = [];

    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        fields.push(element as HTMLElement);
      });
    });

    return fields;
  }

  /**
   * Strategy 2: Context-aware detection looking for form-like structures
   */
  private detectFieldsByContext(): HTMLElement[] {
    const fields: HTMLElement[] = [];

    // Look for elements within form containers
    const formContainers = document.querySelectorAll('form, [class*="form"], [id*="form"]');

    formContainers.forEach(container => {
      // Find input-like elements within form containers
      const inputs = container.querySelectorAll('input, textarea, select');
      inputs.forEach(input => {
        if (this.isLikelyFormField(input as HTMLElement)) {
          fields.push(input as HTMLElement);
        }
      });
    });

    // Look for standalone fields that might be part of a form
    const potentialFields = document.querySelectorAll('[placeholder], [aria-label]');
    potentialFields.forEach(field => {
      if (this.isLikelyFormField(field as HTMLElement)) {
        fields.push(field as HTMLElement);
      }
    });

    return fields;
  }

  /**
   * Strategy 3: Attribute-based detection using common field patterns
   */
  private detectFieldsByAttributes(): HTMLElement[] {
    const fields: HTMLElement[] = [];

    // Common attribute patterns for form fields
    const attributePatterns = [
      '[name*="name"]',
      '[name*="email"]',
      '[name*="phone"]',
      '[name*="address"]',
      '[name*="city"]',
      '[name*="state"]',
      '[name*="zip"]',
      '[name*="postal"]',
      '[id*="name"]',
      '[id*="email"]',
      '[id*="phone"]',
      '[id*="address"]',
      '[class*="input"]',
      '[class*="field"]',
      '[data-field]',
      '[data-input]'
    ];

    attributePatterns.forEach(pattern => {
      const elements = document.querySelectorAll(pattern);
      elements.forEach(element => {
        if (this.isLikelyFormField(element as HTMLElement)) {
          fields.push(element as HTMLElement);
        }
      });
    });

    return fields;
  }

  /**
   * Check if an element is likely a form field based on various criteria
   */
  private isLikelyFormField(element: HTMLElement): boolean {
    const tagName = element.tagName.toLowerCase();

    // Must be a form input element
    if (!['input', 'textarea', 'select'].includes(tagName)) {
      return false;
    }

    // Skip certain input types
    if (tagName === 'input') {
      const inputType = (element as HTMLInputElement).type.toLowerCase();
      const skipTypes = ['hidden', 'submit', 'button', 'reset', 'file', 'image', 'checkbox', 'radio'];
      if (skipTypes.includes(inputType)) {
        return false;
      }
    }

    // Must be visible and enabled
    if (!fieldMapping.isFieldFillable(element)) {
      return false;
    }

    // Additional heuristics
    const hasRelevantAttributes = this.hasRelevantAttributes(element);
    const hasRelevantContext = this.hasRelevantContext(element);

    return hasRelevantAttributes || hasRelevantContext;
  }

  /**
   * Check if element has attributes that suggest it's a form field
   */
  private hasRelevantAttributes(element: HTMLElement): boolean {
    const input = element as HTMLInputElement;

    // Check for common form field attributes
    const relevantAttributes = [
      input.name,
      input.id,
      input.className,
      input.placeholder,
      element.getAttribute('aria-label'),
      element.getAttribute('data-field'),
      element.getAttribute('data-input')
    ].filter(Boolean);

    if (relevantAttributes.length === 0) {
      return false;
    }

    // Check if any attribute contains form-related keywords
    const formKeywords = [
      'name', 'email', 'phone', 'address', 'city', 'state', 'zip', 'postal',
      'first', 'last', 'contact', 'user', 'profile', 'personal', 'info',
      'field', 'input', 'form', 'data'
    ];

    const attributeText = relevantAttributes.join(' ').toLowerCase();
    return formKeywords.some(keyword => attributeText.includes(keyword));
  }

  /**
   * Check if element has contextual clues that suggest it's a form field
   */
  private hasRelevantContext(element: HTMLElement): boolean {
    // Check for associated labels
    const labelText = fieldMapping.getAssociatedLabelText(element);
    if (labelText) {
      const formKeywords = [
        'name', 'email', 'phone', 'address', 'city', 'state', 'zip',
        'contact', 'personal', 'profile', 'information'
      ];
      const lowerLabelText = labelText.toLowerCase();
      if (formKeywords.some(keyword => lowerLabelText.includes(keyword))) {
        return true;
      }
    }

    // Check nearby text content
    const nearbyText = fieldMapping.getNearbyText(element);
    if (nearbyText) {
      const formKeywords = ['name', 'email', 'phone', 'address'];
      const lowerNearbyText = nearbyText.toLowerCase();
      if (formKeywords.some(keyword => lowerNearbyText.includes(keyword))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Remove duplicate fields from the detected fields array
   */
  private deduplicateFields(fields: HTMLElement[]): HTMLElement[] {
    const seen = new Set<HTMLElement>();
    return fields.filter(field => {
      if (seen.has(field)) {
        return false;
      }
      seen.add(field);
      return true;
    });
  }

  /**
   * Classify detected fields by type using the field mapping system
   */
  private async classifyFieldTypes(): Promise<void> {
    if (this.detectedFields.length === 0) {
      return;
    }

    try {
      // Check if extension context is valid before attempting communication
      if (!this.isExtensionContextValid()) {
        console.warn('Extension context invalidated, skipping field classification');
        return;
      }

      // Get user profile data from service worker
      const userProfile = await this.getUserProfile();
      if (!userProfile) {
        console.log('No user profile available for field mapping');
        return;
      }
      // ensure nested shape exists so later reads like userProfile.personalInfo.firstName are safe
      if (userProfile && !userProfile.personalInfo) {
        userProfile.personalInfo = { firstName: '', lastName: '', email: '' };
      }
      // use personal.firstName etc.

      // Map fields to user data using the intelligent mapping system
      this.fieldMappings = this.mapFieldsToUserData(this.detectedFields, userProfile);

      // Apply fallback strategies for unmapped fields
      this.applyFallbackStrategies();

      // Sort by confidence score
      this.fieldMappings.sort((a, b) => b.confidence - a.confidence);

      console.log(`Mapped ${this.fieldMappings.length} fields with confidence scores:`,
        this.fieldMappings.map(m => ({ type: m.fieldType, confidence: m.confidence }))
      );

    } catch (error) {
      if (error instanceof Error && 
          (error.message?.includes('Extension context invalidated') || 
           error.message?.includes('receiving end does not exist'))) {
        console.warn('Extension context invalidated during field classification');
      } else {
        console.error('Error during field classification:', error);
      }
    }
  }

  /**
   * Map detected fields to user data using intelligent field mapping
   */
  private mapFieldsToUserData(fields: HTMLElement[], userProfile: any): FieldMapping[] {
    const mappings: FieldMapping[] = [];

    fields.forEach(field => {
      const mapping = this.createFieldMapping(field, userProfile);
      if (mapping && mapping.confidence > 0.3) { // Only include mappings with reasonable confidence
        mappings.push(mapping);
      }
    });

    return mappings;
  }

  /**
   * Create a field mapping for a single field using multiple strategies
   */
  private createFieldMapping(field: HTMLElement, userProfile: any): FieldMapping | null {
    const inputElement = field as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

    // Strategy 1: Use existing field mapping logic
    const basicMapping = fieldMapping.identifyFieldType(field, userProfile);
    if (basicMapping && basicMapping.confidence > 0.5) {
      return basicMapping;
    }

    // Strategy 2: Enhanced attribute analysis
    const attributeMapping = this.mapByEnhancedAttributes(inputElement, userProfile);
    if (attributeMapping && attributeMapping.confidence > 0.5) {
      return attributeMapping;
    }

    // Strategy 3: Context-based mapping
    const contextMapping = this.mapByContext(inputElement, userProfile);
    if (contextMapping && contextMapping.confidence > 0.4) {
      return contextMapping;
    }

    // Strategy 4: Position-based mapping
    const positionMapping = this.mapByPosition(inputElement, userProfile);
    if (positionMapping && positionMapping.confidence > 0.3) {
      return positionMapping;
    }

    // Return the best mapping found, even if confidence is low
    const allMappings = [basicMapping, attributeMapping, contextMapping, positionMapping]
      .filter(Boolean) as FieldMapping[];

    if (allMappings.length > 0) {
      return allMappings.reduce((best, current) =>
        current.confidence > best.confidence ? current : best
      );
    }

    return null;
  }

  /**
   * Enhanced attribute-based mapping with improved pattern matching
   */
  private mapByEnhancedAttributes(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, userProfile: any): FieldMapping | null {
    const identifiers = fieldMapping.getFieldIdentifiers(element);
    const identifierText = identifiers.join(' ').toLowerCase();

    // Enhanced patterns with more variations and context
    const enhancedPatterns: Record<FieldType, { patterns: string[]; weight: number }> = {
      [FieldType.FIRST_NAME]: {
        patterns: [
          'firstname', 'first_name', 'fname', 'given_name', 'givenname',
          'first name', 'name_first', 'user_first_name', 'applicant_first',
          'candidate_first', 'personal_first', 'contact_first'
        ],
        weight: 1.0
      },
      [FieldType.LAST_NAME]: {
        patterns: [
          'lastname', 'last_name', 'lname', 'surname', 'family_name', 'familyname',
          'last name', 'name_last', 'user_last_name', 'applicant_last',
          'candidate_last', 'personal_last', 'contact_last'
        ],
        weight: 1.0
      },
      [FieldType.EMAIL]: {
        patterns: [
          'email', 'email_address', 'emailaddress', 'e_mail', 'e-mail',
          'user_email', 'contact_email', 'mail', 'applicant_email',
          'candidate_email', 'personal_email', 'work_email'
        ],
        weight: 1.2
      },
      [FieldType.PHONE]: {
        patterns: [
          'phone', 'telephone', 'tel', 'mobile', 'cell', 'phone_number',
          'phonenumber', 'contact_phone', 'user_phone', 'applicant_phone',
          'candidate_phone', 'personal_phone', 'work_phone', 'home_phone'
        ],
        weight: 1.1
      },
      [FieldType.ADDRESS]: {
        patterns: [
          'address', 'street', 'address_line_1', 'address1', 'street_address',
          'user_address', 'contact_address', 'home_address', 'personal_address',
          'mailing_address', 'residential_address'
        ],
        weight: 0.9
      },
      [FieldType.CITY]: {
        patterns: [
          'city', 'town', 'locality', 'user_city', 'address_city',
          'home_city', 'residence_city'
        ],
        weight: 0.8
      },
      [FieldType.STATE]: {
        patterns: [
          'state', 'province', 'region', 'user_state', 'address_state',
          'home_state', 'residence_state'
        ],
        weight: 0.8
      },
      [FieldType.POSTCODE]: {
        patterns: [
          'zip', 'zipcode', 'postal', 'postcode', 'postal_code',
          'user_zip', 'address_zip', 'home_zip'
        ],
        weight: 0.8
      },
      [FieldType.COVER_LETTER]: {
        patterns: [
          'cover_letter', 'coverletter', 'cover letter', 'message',
          'additional_info', 'comments', 'why_interested'
        ],
        weight: 0.7
      },
      [FieldType.RESUME_TEXT]: {
        patterns: [
          'resume', 'cv', 'curriculum', 'experience', 'background',
          'qualifications', 'skills'
        ],
        weight: 0.7
      }
    };

    let bestFieldType: FieldType | null = null;
    let bestConfidence = 0;

    (Object.keys(enhancedPatterns) as FieldType[]).forEach((fieldType) => {
      const config = enhancedPatterns[fieldType];
      let matchScore = 0;
      let totalWeight = 0;

      config.patterns.forEach(pattern => {
        if (identifierText.includes(pattern)) {
          const patternWeight = pattern.length / 10; // Longer patterns get more weight
          matchScore += patternWeight * config.weight;
          totalWeight += config.weight;
        }
      });

      if (matchScore > 0) {
        const confidence = Math.min(0.9, matchScore / Math.max(1, totalWeight));
        if (confidence > bestConfidence) {
          bestFieldType = fieldType;
          bestConfidence = confidence;
        }
      }
    });

    if (bestFieldType && bestConfidence > 0) {
      const value = fieldMapping.getValueForFieldType(bestFieldType, userProfile);
      return {
        element,
        fieldType: bestFieldType,
        confidence: bestConfidence,
        value
      };
    }

    return null;
  }

  /**
   * Context-based mapping using surrounding elements and page structure
   */
  private mapByContext(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, userProfile: any): FieldMapping | null {
    const contextClues = this.gatherContextClues(element);
    const contextText = contextClues.join(' ').toLowerCase();

    // Context-based patterns
    const contextPatterns: Record<FieldType, string[]> = {
      [FieldType.FIRST_NAME]: ['personal information', 'contact details', 'applicant info', 'your name'],
      [FieldType.LAST_NAME]: ['personal information', 'contact details', 'applicant info', 'your name'],
      [FieldType.EMAIL]: ['contact information', 'how to reach you', 'communication'],
      [FieldType.PHONE]: ['contact information', 'how to reach you', 'communication'],
      [FieldType.ADDRESS]: ['address information', 'location', 'where you live'],
      [FieldType.CITY]: ['address information', 'location', 'where you live'],
      [FieldType.STATE]: ['address information', 'location', 'where you live'],
      [FieldType.POSTCODE]: ['address information', 'location', 'where you live'],
      [FieldType.COVER_LETTER]: ['tell us about yourself', 'why are you interested', 'additional information', 'message'],
      [FieldType.RESUME_TEXT]: ['experience', 'qualifications', 'background', 'skills']
    };

    let bestFieldType: FieldType | null = null;
    let bestConfidence = 0;

    (Object.keys(contextPatterns) as FieldType[]).forEach((fieldType) => {
      const patterns = contextPatterns[fieldType];
      const matchCount = patterns.filter(pattern => contextText.includes(pattern)).length;
      if (matchCount > 0) {
        const confidence = Math.min(0.7, matchCount * 0.3);
        if (confidence > bestConfidence) {
          bestFieldType = fieldType;
          bestConfidence = confidence;
        }
      }
    });

    if (bestFieldType && bestConfidence > 0) {
      const value = fieldMapping.getValueForFieldType(bestFieldType, userProfile);
      return {
        element,
        fieldType: bestFieldType,
        confidence: bestConfidence,
        value
      };
    }

    return null;
  }

  /**
   * Position-based mapping using field order and form structure
   */
  private mapByPosition(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, userProfile: any): FieldMapping | null {
    const form = element.closest('form') || document.body;
    const allInputs = Array.from(form.querySelectorAll('input, textarea, select'))
      .filter(el => fieldMapping.isFieldFillable(el as HTMLElement)) as HTMLElement[];

    const elementIndex = allInputs.indexOf(element as HTMLElement);

    if (elementIndex === -1) return null;

    // Common field order patterns
    const positionPatterns = [
      { index: 0, fieldType: FieldType.FIRST_NAME, confidence: 0.4 },
      { index: 1, fieldType: FieldType.LAST_NAME, confidence: 0.4 },
      { index: 2, fieldType: FieldType.EMAIL, confidence: 0.5 },
      { index: 3, fieldType: FieldType.PHONE, confidence: 0.4 }
    ];

    const pattern = positionPatterns.find(p => p.index === elementIndex);
    if (pattern) {
      const value = fieldMapping.getValueForFieldType(pattern.fieldType, userProfile);
      return {
        element,
        fieldType: pattern.fieldType,
        confidence: pattern.confidence,
        value
      };
    }

    return null;
  }

  /**
   * Gather context clues from surrounding elements
   */
  private gatherContextClues(element: HTMLElement): string[] {
    const clues: string[] = [];

    // Get text from parent containers
    let parent = element.parentElement;
    let depth = 0;
    while (parent && depth < 3) {
      const textContent = parent.textContent?.trim();
      if (textContent && textContent.length < 200) {
        clues.push(textContent);
      }
      parent = parent.parentElement;
      depth++;
    }

    // Get text from preceding siblings
    let sibling = element.previousElementSibling;
    let siblingCount = 0;
    while (sibling && siblingCount < 2) {
      const textContent = sibling.textContent?.trim();
      if (textContent && textContent.length < 100) {
        clues.push(textContent);
      }
      sibling = sibling.previousElementSibling;
      siblingCount++;
    }

    return clues;
  }

  /**
   * Detect and classify file upload fields
   */
  private async detectAndClassifyFileUploadFields(): Promise<void> {
    try {
      // Detect file upload fields
      this.fileUploadFields = fieldMapping.detectFileUploadFields();
      
      if (this.fileUploadFields.length === 0) {
        console.log('No file upload fields detected');
        return;
      }

      console.log(`Raw file upload fields detected:`, this.fileUploadFields.map(f => ({
        id: f.id,
        name: f.name,
        className: f.className,
        accept: f.accept
      })));

      // Map file upload fields to upload types
      this.fileUploadMappings = fieldMapping.mapFileUploadFields(this.fileUploadFields);
      
      // Enhanced logging for debugging
      console.log(`Mapped ${this.fileUploadMappings.length} file upload fields`);
      
      this.fileUploadMappings.forEach((mapping, index) => {
        const element = mapping.element;
        const identifiers = fieldMapping.getFieldIdentifiers(element);
        console.log(`File upload field ${index + 1}:`, {
          type: mapping.fieldType,
          confidence: mapping.confidence,
          acceptedTypes: mapping.acceptedTypes,
          maxSize: mapping.maxSize,
          identifiers: identifiers,
          element: {
            id: element.id,
            name: element.name,
            className: element.className,
            placeholder: element.placeholder,
            accept: element.accept
          }
        });
      });

      // Log CV/resume specific fields
      const cvResumeFields = this.fileUploadMappings.filter(m => m.fieldType === FileUploadType.CV_RESUME);
      if (cvResumeFields.length > 0) {
        console.log(`Found ${cvResumeFields.length} CV/Resume upload fields:`, 
          cvResumeFields.map(f => ({ 
            confidence: f.confidence, 
            identifiers: fieldMapping.getFieldIdentifiers(f.element),
            element: { id: f.element.id, name: f.element.name }
          }))
        );
      } else {
        console.warn('No CV/Resume upload fields detected!');
      }

    } catch (error) {
      console.error('Error during file upload field detection:', error);
    }
  }

  /**
   * Apply fallback strategies for fields that couldn't be mapped with high confidence
   */
  private applyFallbackStrategies(): void {
    const unmappedFields = this.detectedFields.filter(field =>
      !this.fieldMappings.some(mapping => mapping.element === field)
    );

    unmappedFields.forEach(field => {
      const fallbackMapping = this.createFallbackMapping(field);
      if (fallbackMapping) {
        this.fieldMappings.push(fallbackMapping);
      }
    });
  }

  /**
   * Create a fallback mapping for unmapped fields using heuristics
   */
  private createFallbackMapping(field: HTMLElement): FieldMapping | null {
    const inputElement = field as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

    // Fallback based on input type
    if (inputElement.type === 'email') {
      return {
        element: inputElement,
        fieldType: FieldType.EMAIL,
        confidence: 0.8,
        value: '' // Will be filled when user profile is available
      };
    }

    if (inputElement.type === 'tel') {
      return {
        element: inputElement,
        fieldType: FieldType.PHONE,
        confidence: 0.8,
        value: ''
      };
    }

    // Fallback based on element characteristics
    if (inputElement.tagName.toLowerCase() === 'textarea') {
      return {
        element: inputElement,
        fieldType: FieldType.COVER_LETTER,
        confidence: 0.3,
        value: ''
      };
    }

    return null;
  }

  /**
   * Get user profile from service worker
   */
  private async getUserProfile(): Promise<any> {
    try {
      // Check if extension context is still valid
      if (!chrome.runtime?.id) {
        console.warn('Extension context invalidated, cannot get user profile');
        return null;
      }

      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { type: MessageType.GET_USER_PROFILE },
          (response) => {
            if (chrome.runtime.lastError) {
              const error = chrome.runtime.lastError;
              if (error.message?.includes('Extension context invalidated') || 
                  error.message?.includes('receiving end does not exist')) {
                console.warn('Extension context invalidated while getting user profile');
                resolve(null);
                return;
              }
              reject(error);
              return;
            }
            resolve(response?.data || null);
          }
        );
      });
    } catch (error) {
      console.warn('Error getting user profile:', error);
      return null;
    }
  }

  /**
   * Notify service worker of autofill completion
   */
  private async notifyAutofillComplete(result: any): Promise<void> {
    try {
      // Check if extension context is still valid
      if (!chrome.runtime?.id) {
        console.warn('Extension context invalidated, cannot notify autofill completion');
        return;
      }

      await chrome.runtime.sendMessage({
        type: MessageType.AUTOFILL_COMPLETE,
        payload: result
      });
    } catch (error) {
      if (error instanceof Error && 
          (error.message?.includes('Extension context invalidated') || 
           error.message?.includes('receiving end does not exist'))) {
        console.warn('Extension context invalidated while notifying autofill completion');
      } else {
        console.error('Error notifying autofill completion:', error);
      }
    }
  }

  /**
   * Set up mutation observer to detect dynamically added forms
   */
  private setupMutationObserver(): void {
    this.observer = new MutationObserver((mutations) => {
      let shouldRescan = false;

      mutations.forEach((mutation) => {
        // Check if new nodes were added
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;

              // Check if the added node contains form fields
              if (this.containsFormFields(element)) {
                shouldRescan = true;
              }
            }
          });
        }

        // Check if attributes changed on existing form fields
        if (mutation.type === 'attributes' && mutation.target.nodeType === Node.ELEMENT_NODE) {
          const element = mutation.target as Element;
          if (this.isLikelyFormField(element as HTMLElement)) {
            shouldRescan = true;
          }
        }
      });

      // Debounce rescanning to avoid excessive calls
      if (shouldRescan && !this.isScanning) {
        setTimeout(() => {
          this.scanForFormFields().catch(console.error);
        }, 500);
      }
    });

    // Start observing
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'id', 'name', 'placeholder', 'aria-label']
    });
  }

  /**
   * Check if an element or its descendants contain form fields
   */
  private containsFormFields(element: Element): boolean {
    const formSelectors = ['input', 'textarea', 'select', 'form'];

    // Check the element itself
    if (formSelectors.includes(element.tagName.toLowerCase())) {
      return true;
    }

    // Check descendants
    return formSelectors.some(selector =>
      element.querySelector(selector) !== null
    );
  }

  /**
   * Set up message listener for communication with other extension components
   */
  private setupMessageListener(): void {
    // Primary message listener for handling autofill triggers
    chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
      console.log('Content script received message:', message.type, 'from:', sender?.tab?.id || 'popup');
      
      try {
        switch (message.type) {
          case MessageType.TRIGGER_AUTOFILL:
            // Handle autofill trigger asynchronously
            this.handleAutofillTrigger(message.payload)
              .then(result => {
                console.log('Autofill trigger completed:', result);
                sendResponse(result);
              })
              .catch(error => {
                console.error('Autofill trigger failed:', error);
                sendResponse({ success: false, error: error.message });
              });
            return true; // Keep message channel open for async response

          case MessageType.TOGGLE_AUTOFILL:
            // Handle autofill toggle state changes
            if (message.payload && typeof message.payload.enabled === 'boolean') {
              console.log('Autofill toggled:', message.payload.enabled);
              // Could implement visual indicators here
            }
            sendResponse({ success: true });
            return false; // Synchronous response

          case 'PING' as any:
            // Health check - respond immediately
            console.log('Content script ping received');
            sendResponse({ success: true, status: 'ready' });
            return false; // Synchronous response

          default:
            console.warn('Unknown message type:', message.type);
            sendResponse({ success: false, error: 'Unknown message type' });
            return false;
        }
      } catch (error) {
        console.error('Error in message handler:', error);
        sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        return false;
      }
    });

    // Backup message listener for additional compatibility
    messaging.addMessageListener(async (message, _sender, sendResponse) => {
      console.log('Content script received message via messaging utility:', message.type);
      
      try {
        if (message.type === MessageType.TRIGGER_AUTOFILL) {
          const result = await this.handleAutofillTrigger(message.payload);
          sendResponse?.(result);
          return true;
        }
        
        sendResponse?.({ success: false, error: 'Unknown message type' });
      } catch (err) {
        console.error('Content script message handler error:', err);
        sendResponse?.({ success: false, error: String(err) });
      }
      return true;
    });

    console.log('Content script message listeners set up successfully');
  }

  /**
   * Handle autofill trigger from popup
   */
  private async handleAutofillTrigger(payload?: any): Promise<{ success: boolean; filled: number; errors: string[]; fieldsDetected: number }> {
    try {
      console.log('Autofill triggered', payload);

      // If payload contains user data, use it directly
      if (payload && payload.userProfile) {
        // Update field mappings with the provided user data
        await this.scanForFormFields();
        this.fieldMappings = this.mapFieldsToUserData(this.detectedFields, payload.userProfile);
        this.applyFallbackStrategies();
        this.fieldMappings.sort((a, b) => b.confidence - a.confidence);
      } else {
        // Ensure we have the latest field detection
        await this.scanForFormFields();
      }

      if (this.fieldMappings.length === 0) {
        const result = {
          success: false,
          filled: 0,
          errors: ['No fillable fields detected on this page'],
          fieldsDetected: this.detectedFields.length
        };

        // Notify service worker of completion
        await this.notifyAutofillComplete(result);
        return result;
      }

      // Fill the fields
      const fillResult = await this.fillDetectedFields();

      // Upload files to detected file upload fields
      const uploadResult = await this.uploadFilesToDetectedFields();

      // Combine results
      const combinedResult = {
        filled: fillResult.filled + uploadResult.uploaded,
        errors: [...fillResult.errors, ...uploadResult.errors],
        fileUploads: uploadResult.uploaded
      };

      // Show completion feedback with file upload information
      this.showAutofillCompletionFeedback(combinedResult);

      const result = {
        success: true,
        filled: combinedResult.filled,
        errors: combinedResult.errors,
        fieldsDetected: this.detectedFields.length,
        fileUploadsDetected: this.fileUploadFields.length,
        fileUploadsCompleted: uploadResult.uploaded
      };

      // Notify service worker of completion
      await this.notifyAutofillComplete(result);

      return result;

    } catch (error) {
      console.error('Error during autofill:', error);
      const result = {
        success: false,
        filled: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
        fieldsDetected: this.detectedFields.length
      };

      // Notify service worker of error
      await this.notifyAutofillComplete(result);
      return result;
    }
  }

  /**
   * Fill all detected and mapped fields
   */
  private async fillDetectedFields(): Promise<{ filled: number; errors: string[] }> {
    let filled = 0;
    const errors: string[] = [];

    // Only fill fields with confidence above threshold
    const highConfidenceFields = this.fieldMappings.filter(mapping => mapping.confidence > 0.4);

    console.log(`Attempting to fill ${highConfidenceFields.length} fields with confidence > 0.4`);

    for (const mapping of highConfidenceFields) {
      try {
        const success = await this.fillSingleField(mapping);
        if (success) {
          filled++;
          this.addVisualFeedback(mapping.element, 'success');
        } else {
          errors.push(`Failed to fill ${mapping.fieldType} field`);
          this.addVisualFeedback(mapping.element, 'error');
        }
      } catch (error) {
        const errorMessage = `Error filling ${mapping.fieldType}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMessage);
        console.error(errorMessage);
        this.addVisualFeedback(mapping.element, 'error');
      }

      // Small delay between fills to avoid overwhelming the page
      await this.delay(50);
    }

    return { filled, errors };
  }

  /**
   * Fill a single form field with proper error handling and validation
   */
  private async fillSingleField(mapping: FieldMapping): Promise<boolean> {
    const { element, value, fieldType } = mapping;

    // Skip if no value to fill
    if (!value || value.trim() === '') {
      console.log(`Skipping ${fieldType} - no value available`);
      return false;
    }

    // Check if field is still fillable
    if (!fieldMapping.isFieldFillable(element as HTMLElement)) {
      console.log(`Skipping ${fieldType} - field is no longer fillable`);
      return false;
    }

    try {
      // Store original value for potential rollback
      const originalValue = element.value;

      // Use safe filling method
      const success = this.safelyFillField(element, value);

      if (!success) {
        return false;
      }

      // Validate the fill was successful
      if (element.value !== value) {
        console.warn(`Fill validation failed for ${fieldType}. Expected: "${value}", Got: "${element.value}"`);
        // Attempt to restore original value
        element.value = originalValue;
        return false;
      }

      console.log(`Successfully filled ${fieldType} with value: "${value}"`);
      return true;

    } catch (error) {
      console.error(`Error filling ${fieldType}:`, error);
      return false;
    }
  }

  /**
   * Safely fill a form field with proper event handling
   */
  private safelyFillField(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string): boolean {
    try {
      // Focus the element first
      element.focus();

      // Clear existing value
      element.value = '';

      // Set the new value
      element.value = value;

      // Trigger input events to notify the page
      this.triggerFieldEvents(element);

      // Blur to complete the interaction
      element.blur();

      return true;

    } catch (error) {
      console.error('Error in safelyFillField:', error);
      return false;
    }
  }

  /**
   * Trigger appropriate events for form field changes
   */
  private triggerFieldEvents(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): void {
    const events = [
      new Event('input', { bubbles: true, cancelable: true }),
      new Event('change', { bubbles: true, cancelable: true }),
      new Event('blur', { bubbles: true, cancelable: true })
    ];

    // For React and other frameworks, also trigger synthetic events
    const syntheticEvents = [
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true }),
      new KeyboardEvent('keyup', { bubbles: true, cancelable: true })
    ];

    [...events, ...syntheticEvents].forEach(event => {
      try {
        element.dispatchEvent(event);
      } catch (error) {
        console.warn('Failed to dispatch event:', event.type, error);
      }
    });
  }

  /**
   * Add visual feedback to indicate field filling status
   */
  private addVisualFeedback(element: HTMLElement, status: 'success' | 'error'): void {
    // Remove any existing feedback classes
    element.classList.remove('autofill-success', 'autofill-error');

    // Add appropriate class
    const className = status === 'success' ? 'autofill-success' : 'autofill-error';
    element.classList.add(className);

    // Add inline styles for immediate visual feedback
    const originalStyle = {
      backgroundColor: element.style.backgroundColor,
      border: element.style.border,
      boxShadow: element.style.boxShadow
    };

    if (status === 'success') {
      element.style.backgroundColor = '#e8f5e8';
      element.style.border = '2px solid #4caf50';
      element.style.boxShadow = '0 0 5px rgba(76, 175, 80, 0.3)';
    } else {
      element.style.backgroundColor = '#ffeaea';
      element.style.border = '2px solid #f44336';
      element.style.boxShadow = '0 0 5px rgba(244, 67, 54, 0.3)';
    }

    // Remove visual feedback after delay
    setTimeout(() => {
      element.classList.remove(className);
      element.style.backgroundColor = originalStyle.backgroundColor;
      element.style.border = originalStyle.border;
      element.style.boxShadow = originalStyle.boxShadow;
    }, 3000);
  }

  /**
   * Upload files to detected file upload fields
   */
  private async uploadFilesToDetectedFields(): Promise<{ uploaded: number; errors: string[] }> {
    let uploaded = 0;
    const errors: string[] = [];

    // Process file upload fields with reasonable confidence, prioritizing CV/resume fields
    const highConfidenceUploads = this.fileUploadMappings.filter(mapping => mapping.confidence > 0.3);
    
    // Sort by confidence and prioritize CV/resume fields
    highConfidenceUploads.sort((a, b) => {
      // CV/resume fields get priority
      if (a.fieldType === FileUploadType.CV_RESUME && b.fieldType !== FileUploadType.CV_RESUME) {
        return -1;
      }
      if (b.fieldType === FileUploadType.CV_RESUME && a.fieldType !== FileUploadType.CV_RESUME) {
        return 1;
      }
      // Then sort by confidence
      return b.confidence - a.confidence;
    });

    if (highConfidenceUploads.length === 0) {
      console.log('No high-confidence file upload fields found');
      return { uploaded, errors };
    }

    // Get CV data from service worker
    const cvData = await this.getCVData();
    if (!cvData) {
      console.log('No CV data available for file upload');
      return { uploaded, errors };
    }

    console.log(`Attempting to upload CV to ${highConfidenceUploads.length} file upload fields`);
    console.log('CV data:', {
      fileName: cvData.fileName,
      fileSize: cvData.fileSize,
      mimeType: cvData.mimeType
    });

    for (const mapping of highConfidenceUploads) {
      try {
        console.log(`Processing upload field: ${mapping.fieldType} (confidence: ${mapping.confidence})`);
        
        // Check if the file upload field is compatible with our CV
        const isCompatible = fieldMapping.isFileUploadCompatibleWithCV(mapping, {
          mimeType: cvData.mimeType,
          fileSize: cvData.fileSize
        });

        if (!isCompatible) {
          const errorMsg = this.getFileUploadCompatibilityError(mapping, cvData);
          console.warn(`File upload compatibility check failed: ${errorMsg}`);
          errors.push(errorMsg);
          this.addFileUploadVisualFeedback(mapping.element, 'error');
          this.showFileUploadError(mapping.element, errorMsg);
          continue;
        }

        console.log(`File upload compatibility check passed for ${mapping.fieldType}`);
        const success = await this.uploadFileToField(mapping, cvData);
        
        if (success) {
          uploaded++;
          console.log(`Successfully uploaded CV to ${mapping.fieldType} field`);
          this.addFileUploadVisualFeedback(mapping.element, 'success');
        } else {
          const errorMsg = `Failed to upload CV to ${mapping.fieldType} field`;
          console.error(errorMsg);
          errors.push(errorMsg);
          this.addFileUploadVisualFeedback(mapping.element, 'error');
          this.showFileUploadError(mapping.element, errorMsg);
        }
      } catch (error) {
        const errorMessage = `Error uploading to ${mapping.fieldType}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMessage);
        errors.push(errorMessage);
        this.addFileUploadVisualFeedback(mapping.element, 'error');
        this.showFileUploadError(mapping.element, errorMessage);
      }

      // Small delay between uploads to avoid overwhelming the page
      await this.delay(100);
    }

    console.log(`File upload process completed: ${uploaded} successful, ${errors.length} errors`);
    return { uploaded, errors };
  }

  /**
   * Upload a file to a specific file input field
   */
  private async uploadFileToField(mapping: FileUploadMapping, cvData: any): Promise<boolean> {
    const { element } = mapping;

    try {
      console.log(`Uploading CV to ${mapping.fieldType} field:`, {
        element: {
          id: element.id,
          name: element.name,
          className: element.className,
          accept: element.accept
        },
        mapping: {
          fieldType: mapping.fieldType,
          confidence: mapping.confidence,
          acceptedTypes: mapping.acceptedTypes,
          maxSize: mapping.maxSize
        }
      });

      // Convert base64 blob back to File object
      const file = await this.createFileFromCVData(cvData);
      if (!file) {
        console.error('Failed to create File object from CV data');
        return false;
      }

      console.log('File object created successfully:', {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      });

      // Validate file against field constraints
      if (!this.validateFileForUpload(file, mapping)) {
        console.error('File validation failed for upload field');
        return false;
      }

      console.log('File validation passed, proceeding with upload');

      // Perform the file upload
      const success = await this.performFileUpload(element, file, mapping.fieldType);
      
      if (success) {
        console.log(`Successfully uploaded CV to ${mapping.fieldType} field`);
        return true;
      } else {
        console.error(`Failed to upload CV to ${mapping.fieldType} field`);
        return false;
      }

    } catch (error) {
      console.error(`Error uploading file to ${mapping.fieldType}:`, error);
      return false;
    }
  }

  /**
   * Create a File object from stored CV data
   */
  private async createFileFromCVData(cvData: any): Promise<File | null> {
    try {
      // Use the existing blobUtils from storage module
      const blob = blobUtils.base64ToBlob(cvData.fileBlob, cvData.mimeType);
      
      // Create File object
      const file = new File([blob], cvData.fileName, {
        type: cvData.mimeType,
        lastModified: cvData.uploadDate
      });

      console.log('Created File object from CV data:', {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type
      });

      return file;
    } catch (error) {
      console.error('Error creating File object from CV data:', error);
      return null;
    }
  }

  /**
   * Validate file against upload field constraints
   */
  private validateFileForUpload(file: File, mapping: FileUploadMapping): boolean {
    // Check file type if accept attribute is present
    if (mapping.acceptedTypes && mapping.acceptedTypes.length > 0) {
      const isTypeAccepted = mapping.acceptedTypes.some((acceptType: string) => {
        // Handle MIME types
        if (acceptType.includes('/')) {
          return file.type === acceptType;
        }
        
        // Handle file extensions
        if (acceptType.startsWith('.')) {
          const extension = acceptType.toLowerCase();
          const fileName = file.name.toLowerCase();
          return fileName.endsWith(extension);
        }
        
        return false;
      });

      if (!isTypeAccepted) {
        console.warn('File type not accepted by upload field:', file.type, 'Accepted:', mapping.acceptedTypes);
        return false;
      }
    }

    // Check file size if max size is specified
    if (mapping.maxSize && file.size > mapping.maxSize) {
      console.warn('File size exceeds maximum allowed:', file.size, 'Max:', mapping.maxSize);
      return false;
    }

    return true;
  }

  /**
   * Perform the actual file upload to the input element
   */
  private async performFileUpload(element: HTMLInputElement, file: File, fieldType?: string): Promise<boolean> {
    try {
      // Focus the file input element
      element.focus();

      // Create a DataTransfer object to hold the file
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);

      // Set the files property of the input element
      element.files = dataTransfer.files;

      // Trigger events to notify the page of the file selection
      this.triggerFileUploadEvents(element);

      // Verify the upload was successful
      if (element.files && element.files.length > 0 && element.files[0].name === file.name) {
        const fieldTypeStr = fieldType ? ` to ${fieldType} field` : '';
        console.log(`File upload successful: ${file.name} (${(file.size / 1024).toFixed(1)}KB)${fieldTypeStr}`);
        return true;
      } else {
        console.error('File upload verification failed - files property not set correctly');
        return false;
      }

    } catch (error) {
      console.error('Error performing file upload:', error);
      return false;
    }
  }

  /**
   * Trigger appropriate events for file upload
   */
  private triggerFileUploadEvents(element: HTMLInputElement): void {
    const events = [
      new Event('change', { bubbles: true, cancelable: true }),
      new Event('input', { bubbles: true, cancelable: true }),
      new Event('blur', { bubbles: true, cancelable: true })
    ];

    events.forEach(event => {
      try {
        element.dispatchEvent(event);
      } catch (error) {
        console.warn('Failed to dispatch file upload event:', event.type, error);
      }
    });

    // Also trigger focus event to ensure proper handling
    try {
      element.dispatchEvent(new Event('focus', { bubbles: true, cancelable: true }));
    } catch (error) {
      console.warn('Failed to dispatch focus event:', error);
    }
  }

  /**
   * Get CV data from service worker
   */
  private async getCVData(): Promise<any> {
    try {
      // Check if extension context is still valid
      if (!chrome.runtime?.id) {
        console.warn('Extension context invalidated, cannot get CV data');
        return null;
      }

      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { type: MessageType.GET_CV_DATA },
          (response) => {
            if (chrome.runtime.lastError) {
              const error = chrome.runtime.lastError;
              if (error.message?.includes('Extension context invalidated') || 
                  error.message?.includes('receiving end does not exist')) {
                console.warn('Extension context invalidated while getting CV data');
                resolve(null);
                return;
              }
              reject(error);
              return;
            }
            resolve(response?.data || null);
          }
        );
      });
    } catch (error) {
      console.warn('Error getting CV data:', error);
      return null;
    }
  }

  /**
   * Show completion feedback for the entire autofill operation
   */
  private showAutofillCompletionFeedback(result: { filled: number; errors: string[]; fileUploads?: number }): void {
    // Create a temporary notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${result.errors.length === 0 ? '#4caf50' : '#ff9800'};
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      z-index: 10000;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      max-width: 350px;
      line-height: 1.4;
    `;

    // Create detailed message including file uploads
    let message = '';
    const totalActions = result.filled;
    const fileUploads = result.fileUploads || 0;
    const fieldFills = totalActions - fileUploads;

    if (result.errors.length === 0) {
      if (fileUploads > 0 && fieldFills > 0) {
        message = `✓ Autofill complete: ${fieldFills} fields filled, ${fileUploads} file${fileUploads > 1 ? 's' : ''} uploaded`;
      } else if (fileUploads > 0) {
        message = `✓ File upload complete: ${fileUploads} file${fileUploads > 1 ? 's' : ''} uploaded`;
      } else if (fieldFills > 0) {
        message = `✓ Autofill complete: ${fieldFills} fields filled`;
      } else {
        message = '✓ Autofill completed (no actions needed)';
      }
    } else {
      if (fileUploads > 0 && fieldFills > 0) {
        message = `⚠ Autofill completed with ${result.errors.length} error${result.errors.length > 1 ? 's' : ''}: ${fieldFills} fields filled, ${fileUploads} file${fileUploads > 1 ? 's' : ''} uploaded`;
      } else {
        message = `⚠ Autofill completed: ${totalActions} action${totalActions > 1 ? 's' : ''} with ${result.errors.length} error${result.errors.length > 1 ? 's' : ''}`;
      }
    }

    notification.textContent = message;
    document.body.appendChild(notification);

    // Remove notification after delay
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000); // Slightly longer display time for more detailed message

    // Log detailed results
    console.log('Autofill completed:', {
      ...result,
      fieldFills,
      fileUploads,
      totalActions
    });
    if (result.errors.length > 0) {
      console.warn('Autofill errors:', result.errors);
    }
  }

  /**
   * Add specialized visual feedback for file upload operations
   */
  private addFileUploadVisualFeedback(element: HTMLElement, status: 'success' | 'error'): void {
    // Remove any existing feedback classes
    element.classList.remove('autofill-success', 'autofill-error', 'file-upload-success', 'file-upload-error');

    // Add appropriate class for file uploads
    const className = status === 'success' ? 'file-upload-success' : 'file-upload-error';
    element.classList.add(className);

    // Add inline styles for immediate visual feedback with file upload specific styling
    const originalStyle = {
      backgroundColor: element.style.backgroundColor,
      border: element.style.border,
      boxShadow: element.style.boxShadow
    };

    if (status === 'success') {
      element.style.backgroundColor = '#e8f5e8';
      element.style.border = '3px solid #4caf50';
      element.style.boxShadow = '0 0 10px rgba(76, 175, 80, 0.5)';
      
      // Add success icon overlay for file uploads
      this.addFileUploadIcon(element, '✓', '#4caf50');
    } else {
      element.style.backgroundColor = '#ffeaea';
      element.style.border = '3px solid #f44336';
      element.style.boxShadow = '0 0 10px rgba(244, 67, 54, 0.5)';
      
      // Add error icon overlay for file uploads
      this.addFileUploadIcon(element, '✗', '#f44336');
    }

    // Remove visual feedback after delay
    setTimeout(() => {
      element.classList.remove(className);
      element.style.backgroundColor = originalStyle.backgroundColor;
      element.style.border = originalStyle.border;
      element.style.boxShadow = originalStyle.boxShadow;
      
      // Remove icon overlay
      const icon = element.parentElement?.querySelector('.file-upload-icon');
      if (icon) {
        icon.remove();
      }
    }, 4000);
  }

  /**
   * Add icon overlay for file upload feedback
   */
  private addFileUploadIcon(element: HTMLElement, icon: string, color: string): void {
    const iconElement = document.createElement('div');
    iconElement.className = 'file-upload-icon';
    iconElement.style.cssText = `
      position: absolute;
      top: -8px;
      right: -8px;
      width: 20px;
      height: 20px;
      background: ${color};
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: bold;
      z-index: 1000;
      pointer-events: none;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    `;
    iconElement.textContent = icon;

    // Position relative to the file input
    const parent = element.parentElement;
    if (parent) {
      const originalPosition = parent.style.position;
      if (!originalPosition || originalPosition === 'static') {
        parent.style.position = 'relative';
      }
      parent.appendChild(iconElement);
    }
  }

  /**
   * Get detailed error message for file upload compatibility issues
   */
  private getFileUploadCompatibilityError(mapping: FileUploadMapping, cvData: any): string {
    // Check file type compatibility
    if (mapping.acceptedTypes.length > 0) {
      const isTypeAccepted = mapping.acceptedTypes.some(acceptType => {
        if (acceptType.includes('/')) {
          return cvData.mimeType === acceptType;
        }
        if (acceptType.startsWith('.')) {
          const extension = acceptType.toLowerCase();
          return (
            (extension === '.pdf' && cvData.mimeType === 'application/pdf') ||
            (extension === '.doc' && cvData.mimeType === 'application/msword') ||
            (extension === '.docx' && cvData.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
          );
        }
        return false;
      });

      if (!isTypeAccepted) {
        const fileExtension = cvData.fileName.split('.').pop()?.toLowerCase() || 'unknown';
        const acceptedExtensions = mapping.acceptedTypes
          .filter(type => type.startsWith('.'))
          .join(', ') || mapping.acceptedTypes.join(', ');
        return `CV file type (.${fileExtension}) not accepted. Accepted types: ${acceptedExtensions}`;
      }
    }

    // Check file size compatibility
    if (mapping.maxSize && cvData.fileSize > mapping.maxSize) {
      const maxSizeMB = (mapping.maxSize / (1024 * 1024)).toFixed(1);
      const fileSizeMB = (cvData.fileSize / (1024 * 1024)).toFixed(1);
      return `CV file size (${fileSizeMB}MB) exceeds maximum allowed size (${maxSizeMB}MB)`;
    }

    return `File upload field incompatible with CV (${mapping.fieldType})`;
  }

  /**
   * Show specific error message for file upload failures
   */
  private showFileUploadError(element: HTMLInputElement, errorMessage: string): void {
    // Create error tooltip
    const tooltip = document.createElement('div');
    tooltip.style.cssText = `
      position: absolute;
      background: #f44336;
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-family: Arial, sans-serif;
      font-size: 12px;
      z-index: 10001;
      max-width: 250px;
      word-wrap: break-word;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      pointer-events: none;
    `;

    tooltip.textContent = errorMessage;

    // Position tooltip near the element
    const rect = element.getBoundingClientRect();
    tooltip.style.left = `${rect.left + window.scrollX}px`;
    tooltip.style.top = `${rect.bottom + window.scrollY + 5}px`;

    document.body.appendChild(tooltip);

    // Remove tooltip after delay
    setTimeout(() => {
      if (tooltip.parentNode) {
        tooltip.parentNode.removeChild(tooltip);
      }
    }, 4000);
  }

  /**
   * Utility function to add delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Inject CSS styles for visual feedback
   */
  private injectStyles(): void {
    const styleId = 'job-autofill-styles';

    // Don't inject if already exists
    if (document.getElementById(styleId)) {
      return;
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .autofill-success {
        animation: autofill-success-pulse 0.5s ease-in-out;
      }
      
      .autofill-error {
        animation: autofill-error-pulse 0.5s ease-in-out;
      }
      
      .file-upload-success {
        animation: file-upload-success-pulse 0.8s ease-in-out;
      }
      
      .file-upload-error {
        animation: file-upload-error-pulse 0.8s ease-in-out;
      }
      
      @keyframes autofill-success-pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.02); }
        100% { transform: scale(1); }
      }
      
      @keyframes autofill-error-pulse {
        0% { transform: scale(1); }
        25% { transform: scale(1.02) translateX(-2px); }
        75% { transform: scale(1.02) translateX(2px); }
        100% { transform: scale(1); }
      }
      
      @keyframes file-upload-success-pulse {
        0% { transform: scale(1); }
        25% { transform: scale(1.05); }
        50% { transform: scale(1.02); }
        75% { transform: scale(1.05); }
        100% { transform: scale(1); }
      }
      
      @keyframes file-upload-error-pulse {
        0% { transform: scale(1); }
        20% { transform: scale(1.05) translateX(-3px); }
        40% { transform: scale(1.02) translateX(3px); }
        60% { transform: scale(1.05) translateX(-3px); }
        80% { transform: scale(1.02) translateX(3px); }
        100% { transform: scale(1); }
      }
      
      .file-upload-icon {
        animation: file-upload-icon-bounce 0.6s ease-in-out;
      }
      
      @keyframes file-upload-icon-bounce {
        0% { transform: scale(0); }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); }
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Get the currently detected fields
   */
  public getDetectedFields(): HTMLElement[] {
    return this.detectedFields;
  }

  /**
   * Get field mappings (will be populated in task 5.2)
   */
  public getFieldMappings(): FieldMapping[] {
    return this.fieldMappings;
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}

// Initialize the form detection system
const formDetector = new FormDetectionSystem();

// Make it available globally for debugging
(window as any).formDetector = formDetector;