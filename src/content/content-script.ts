// Content script for Job Application Autofill extension
// This will handle form detection and filling on job application pages

import { fieldMapping } from '../shared/fieldMapping';
import { FieldType, FieldMapping, MessageType, Message } from '../shared/types';

console.log('Job Application Autofill content script loaded');

class FormDetectionSystem {
  private detectedFields: HTMLElement[] = [];
  private fieldMappings: FieldMapping[] = [];
  private observer: MutationObserver | null = null;
  private isScanning = false;

  constructor() {
    this.initializeDetection();
    this.setupMessageListener();
    this.injectStyles();
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

      console.log(`Detected ${this.detectedFields.length} fillable form fields`);
      
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
      // Get user profile data from service worker
      const userProfile = await this.getUserProfile();
      if (!userProfile) {
        console.log('No user profile available for field mapping');
        return;
      }

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
      console.error('Error during field classification:', error);
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
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: MessageType.GET_USER_PROFILE },
        (response) => {
          resolve(response?.data || null);
        }
      );
    });
  }

  /**
   * Notify service worker of autofill completion
   */
  private async notifyAutofillComplete(result: any): Promise<void> {
    try {
      await chrome.runtime.sendMessage({
        type: MessageType.AUTOFILL_COMPLETE,
        payload: result
      });
    } catch (error) {
      console.error('Error notifying autofill completion:', error);
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
    chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
      switch (message.type) {
        case MessageType.TRIGGER_AUTOFILL:
          this.handleAutofillTrigger(message.payload)
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ success: false, error: error.message }));
          return true; // Keep message channel open for async response
        
        case MessageType.TOGGLE_AUTOFILL:
          // Handle autofill toggle state changes
          if (message.payload && typeof message.payload.enabled === 'boolean') {
            console.log('Autofill toggled:', message.payload.enabled);
            // Could implement visual indicators here
          }
          sendResponse({ success: true });
          break;
        
        default:
          break;
      }
    });
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

      // Show completion feedback
      this.showAutofillCompletionFeedback(fillResult);

      const result = {
        success: true,
        filled: fillResult.filled,
        errors: fillResult.errors,
        fieldsDetected: this.detectedFields.length
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
   * Show completion feedback for the entire autofill operation
   */
  private showAutofillCompletionFeedback(result: { filled: number; errors: string[] }): void {
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
      max-width: 300px;
    `;

    const message = result.errors.length === 0 
      ? `✓ Successfully filled ${result.filled} fields`
      : `⚠ Filled ${result.filled} fields with ${result.errors.length} errors`;

    notification.textContent = message;
    document.body.appendChild(notification);

    // Remove notification after delay
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 4000);

    // Log detailed results
    console.log('Autofill completed:', result);
    if (result.errors.length > 0) {
      console.warn('Autofill errors:', result.errors);
    }
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