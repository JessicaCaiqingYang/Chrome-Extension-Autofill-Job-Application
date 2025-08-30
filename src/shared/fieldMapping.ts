// Form field detection and mapping logic
import { FieldMapping, FieldType, UserProfile } from './types';

export const fieldMapping = {
  // Detect all fillable form fields on the current page
  detectFormFields(): HTMLElement[] {
    const selectors = [
      'input[type="text"]',
      'input[type="email"]',
      'input[type="tel"]',
      'input[type="url"]',
      'input:not([type])', // Default input type is text
      'textarea',
      'select'
    ];
    
    const elements: HTMLElement[] = [];
    selectors.forEach(selector => {
      const found = document.querySelectorAll(selector);
      found.forEach(element => {
        // Filter out hidden or disabled fields
        const htmlElement = element as HTMLElement;
        if (this.isFieldFillable(htmlElement)) {
          elements.push(htmlElement);
        }
      });
    });
    
    return elements;
  },

  // Check if a field is fillable (visible and enabled)
  isFieldFillable(element: HTMLElement): boolean {
    const computedStyle = window.getComputedStyle(element);
    const isVisible = computedStyle.display !== 'none' && 
                     computedStyle.visibility !== 'hidden' && 
                     computedStyle.opacity !== '0';
    
    const isEnabled = !(element as HTMLInputElement).disabled && 
                     !(element as HTMLInputElement).readOnly;
    
    return isVisible && isEnabled;
  },

  // Map form fields to user data based on field attributes and context
  mapFieldsToData(elements: HTMLElement[], userProfile: UserProfile): FieldMapping[] {
    const mappings: FieldMapping[] = [];
    
    elements.forEach(element => {
      const mapping = this.identifyFieldType(element, userProfile);
      if (mapping) {
        mappings.push(mapping);
      }
    });
    
    // Sort by confidence score (highest first)
    return mappings.sort((a, b) => b.confidence - a.confidence);
  },

  // Identify field type and create mapping
  identifyFieldType(element: HTMLElement, userProfile: UserProfile): FieldMapping | null {
    const inputElement = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    
    // Get all possible identifiers for the field
    const identifiers = this.getFieldIdentifiers(inputElement);
    const fieldType = this.matchFieldType(identifiers);
    
    if (!fieldType) {
      return null;
    }
    
    const value = this.getValueForFieldType(fieldType, userProfile);
    const confidence = this.calculateConfidence(identifiers, fieldType);
    
    return {
      element: inputElement,
      fieldType,
      confidence,
      value
    };
  },

  // Extract all possible identifiers from a form field
  getFieldIdentifiers(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string[] {
    const identifiers: string[] = [];
    
    // Add element attributes
    if (element.name) identifiers.push(element.name.toLowerCase());
    if (element.id) identifiers.push(element.id.toLowerCase());
    if (element.className) identifiers.push(element.className.toLowerCase());
    if ('placeholder' in element && element.placeholder) {
      identifiers.push(element.placeholder.toLowerCase());
    }
    
    // Add aria-label
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) identifiers.push(ariaLabel.toLowerCase());
    
    // Add associated label text
    const labelText = this.getAssociatedLabelText(element);
    if (labelText) identifiers.push(labelText.toLowerCase());
    
    // Add nearby text content for context
    const contextText = this.getNearbyText(element);
    if (contextText) identifiers.push(contextText.toLowerCase());
    
    return identifiers;
  },

  // Get text from associated label elements
  getAssociatedLabelText(element: HTMLElement): string | null {
    // Try to find label by 'for' attribute
    if (element.id) {
      const label = document.querySelector(`label[for="${element.id}"]`);
      if (label) {
        return label.textContent?.trim() || null;
      }
    }
    
    // Try to find parent label
    const parentLabel = element.closest('label');
    if (parentLabel) {
      return parentLabel.textContent?.trim() || null;
    }
    
    return null;
  },

  // Get nearby text content for context
  getNearbyText(element: HTMLElement): string | null {
    const parent = element.parentElement;
    if (!parent) return null;
    
    // Look for text in parent element
    const textNodes = Array.from(parent.childNodes)
      .filter(node => node.nodeType === Node.TEXT_NODE)
      .map(node => node.textContent?.trim())
      .filter(text => text && text.length > 0);
    
    return textNodes.join(' ') || null;
  },

  // Match field identifiers to field types
  matchFieldType(identifiers: string[]): FieldType | null {
    const patterns = {
      [FieldType.FIRST_NAME]: [
        'firstname', 'first_name', 'fname', 'given_name', 'givenname',
        'first name', 'name_first', 'user_first_name'
      ],
      [FieldType.LAST_NAME]: [
        'lastname', 'last_name', 'lname', 'surname', 'family_name', 'familyname',
        'last name', 'name_last', 'user_last_name'
      ],
      [FieldType.EMAIL]: [
        'email', 'email_address', 'emailaddress', 'e_mail', 'e-mail',
        'user_email', 'contact_email', 'mail'
      ],
      [FieldType.PHONE]: [
        'phone', 'telephone', 'tel', 'mobile', 'cell', 'phone_number',
        'phonenumber', 'contact_phone', 'user_phone'
      ],
      [FieldType.ADDRESS]: [
        'address', 'street', 'address_line_1', 'address1', 'street_address',
        'user_address', 'contact_address', 'home_address'
      ],
      [FieldType.CITY]: [
        'city', 'town', 'locality', 'user_city', 'address_city'
      ],
      [FieldType.STATE]: [
        'state', 'province', 'region', 'user_state', 'address_state'
      ],
      [FieldType.POSTCODE]: [
        'zip', 'zipcode', 'postal', 'postcode', 'postal_code',
        'user_zip', 'address_zip'
      ],
      [FieldType.COVER_LETTER]: [
        'cover_letter', 'coverletter', 'cover letter', 'message',
        'additional_info', 'comments', 'why_interested'
      ],
      [FieldType.RESUME_TEXT]: [
        'resume', 'cv', 'curriculum', 'experience', 'background',
        'qualifications', 'skills'
      ]
    };
    
    const identifierText = identifiers.join(' ');
    
    // Find the best matching field type
    let bestMatch: FieldType | null = null;
    let bestScore = 0;
    
    Object.entries(patterns).forEach(([fieldType, keywords]) => {
      const score = keywords.reduce((acc, keyword) => {
        if (identifierText.includes(keyword)) {
          return acc + keyword.length; // Longer matches get higher scores
        }
        return acc;
      }, 0);
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = fieldType as FieldType;
      }
    });
    
    return bestMatch;
  },

  // Calculate confidence score for field mapping
  calculateConfidence(identifiers: string[], fieldType: FieldType): number {
    const identifierText = identifiers.join(' ');
    
    // Base confidence based on field type match quality
    let confidence = 0.5;
    
    // Boost confidence for exact matches
    const exactMatches: Partial<Record<FieldType, string[]>> = {
      [FieldType.EMAIL]: ['email'],
      [FieldType.PHONE]: ['phone', 'tel'],
      [FieldType.FIRST_NAME]: ['firstname', 'first_name'],
      [FieldType.LAST_NAME]: ['lastname', 'last_name']
    };
    
    const exactKeywords = exactMatches[fieldType] || [];
    if (exactKeywords.some((keyword: string) => identifierText.includes(keyword))) {
      confidence += 0.3;
    }
    
    // Boost confidence for multiple identifier sources
    if (identifiers.length > 2) {
      confidence += 0.1;
    }
    
    // Reduce confidence for generic terms
    const genericTerms = ['input', 'field', 'text', 'data'];
    if (genericTerms.some(term => identifierText.includes(term))) {
      confidence -= 0.2;
    }
    
    return Math.min(1.0, Math.max(0.0, confidence));
  },

  // Get the appropriate value for a field type from user profile
  getValueForFieldType(fieldType: FieldType, userProfile: UserProfile): string {
    const { personalInfo, workInfo } = userProfile;
    
    switch (fieldType) {
      case FieldType.FIRST_NAME:
        return personalInfo.firstName;
      case FieldType.LAST_NAME:
        return personalInfo.lastName;
      case FieldType.EMAIL:
        return personalInfo.email;
      case FieldType.PHONE:
        return personalInfo.phone;
      case FieldType.ADDRESS:
        return personalInfo.address.street;
      case FieldType.CITY:
        return personalInfo.address.city;
      case FieldType.STATE:
        return personalInfo.address.state;
      case FieldType.POSTCODE:
        return personalInfo.address.postCode;
      case FieldType.COVER_LETTER:
        return workInfo.experience || '';
      case FieldType.RESUME_TEXT:
        return workInfo.skills?.join(', ') || '';
      default:
        return '';
    }
  },

  // Fill form fields with mapped values
  fillFields(mappings: FieldMapping[]): { filled: number; errors: string[] } {
    let filled = 0;
    const errors: string[] = [];
    
    mappings.forEach(mapping => {
      try {
        if (mapping.confidence > 0.5) { // Only fill fields with reasonable confidence
          this.fillField(mapping.element, mapping.value);
          filled++;
        }
      } catch (error) {
        errors.push(`Failed to fill ${mapping.fieldType}: ${error}`);
      }
    });
    
    return { filled, errors };
  },

  // Fill a single form field
  fillField(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string): void {
    if (!value) return;
    
    // Set the value
    element.value = value;
    
    // Trigger events to notify the page of the change
    const events = ['input', 'change', 'blur'];
    events.forEach(eventType => {
      const event = new Event(eventType, { bubbles: true });
      element.dispatchEvent(event);
    });
    
    // Add visual feedback
    element.style.backgroundColor = '#e8f5e8';
    setTimeout(() => {
      element.style.backgroundColor = '';
    }, 2000);
  }
};