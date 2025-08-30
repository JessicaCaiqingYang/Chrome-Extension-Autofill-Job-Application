// Form field detection and mapping logic
import { FieldMapping, FieldType, UserProfile, FileUploadMapping, FileUploadType } from './types';

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
    
    // Find the best matching field type with improved scoring
    let bestMatch: FieldType | null = null;
    let bestScore = 0;
    
    Object.entries(patterns).forEach(([fieldType, keywords]) => {
      let score = 0;
      let hasExactMatch = false;
      
      keywords.forEach(keyword => {
        if (identifierText.includes(keyword)) {
          // Give higher priority to exact matches and compound terms
          if (keyword.includes('_') || keyword.includes(' ') || keyword.length > 6) {
            score += keyword.length * 2; // Boost compound/specific terms
            hasExactMatch = true;
          } else {
            score += keyword.length;
          }
        }
      });
      
      // Special handling for email vs address conflict
      if (fieldType === FieldType.EMAIL && identifierText.includes('email')) {
        score += 20; // Strong boost for email fields
        hasExactMatch = true;
      }
      
      // Penalize generic matches when more specific ones exist
      if (fieldType === FieldType.ADDRESS && identifierText.includes('email')) {
        score = Math.max(0, score - 15); // Reduce score for address when email is present
      }
      
      // Prefer exact matches over partial matches
      if (hasExactMatch) {
        score += 10;
      }
      
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
      [FieldType.EMAIL]: ['email', 'email_address', 'emailaddress'],
      [FieldType.PHONE]: ['phone', 'tel', 'telephone'],
      [FieldType.FIRST_NAME]: ['firstname', 'first_name'],
      [FieldType.LAST_NAME]: ['lastname', 'last_name'],
      [FieldType.ADDRESS]: ['street_address', 'address_line']
    };
    
    const exactKeywords = exactMatches[fieldType] || [];
    if (exactKeywords.some((keyword: string) => identifierText.includes(keyword))) {
      confidence += 0.3;
    }
    
    // Special boost for email fields when "email" is present
    if (fieldType === FieldType.EMAIL && identifierText.includes('email')) {
      confidence += 0.4; // Strong confidence boost for email
    }
    
    // Penalize address fields when email context is present
    if (fieldType === FieldType.ADDRESS && identifierText.includes('email')) {
      confidence -= 0.5; // Strong penalty to prevent email/address confusion
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
  },

  // Detect file upload fields on the current page
  detectFileUploadFields(): HTMLInputElement[] {
    const fileInputs = document.querySelectorAll('input[type="file"]') as NodeListOf<HTMLInputElement>;
    const elements: HTMLInputElement[] = [];
    
    fileInputs.forEach(element => {
      // Filter out hidden or disabled file inputs
      if (this.isFieldFillable(element)) {
        elements.push(element);
      }
    });
    
    return elements;
  },

  // Map file upload fields to upload types based on context and attributes
  mapFileUploadFields(elements: HTMLInputElement[]): FileUploadMapping[] {
    const mappings: FileUploadMapping[] = [];
    
    elements.forEach(element => {
      const mapping = this.identifyFileUploadType(element);
      if (mapping) {
        mappings.push(mapping);
      }
    });
    
    // Sort by confidence score (highest first)
    return mappings.sort((a, b) => b.confidence - a.confidence);
  },

  // Identify file upload type and create mapping
  identifyFileUploadType(element: HTMLInputElement): FileUploadMapping | null {
    // Get all possible identifiers for the file input
    const identifiers = this.getFieldIdentifiers(element);
    const fileUploadType = this.matchFileUploadType(identifiers);
    
    if (!fileUploadType) {
      return null;
    }
    
    // Parse accept attribute for allowed file types
    const acceptedTypes = this.parseAcceptAttribute(element);
    
    // Extract max file size if specified
    const maxSize = this.extractMaxFileSize(element);
    
    const confidence = this.calculateFileUploadConfidence(identifiers, fileUploadType, acceptedTypes);
    
    return {
      element,
      fieldType: fileUploadType,
      confidence,
      acceptedTypes,
      maxSize
    };
  },

  // Match field identifiers to file upload types
  matchFileUploadType(identifiers: string[]): FileUploadType | null {
    const patterns = {
      [FileUploadType.CV_RESUME]: [
        'resume', 'cv', 'curriculum', 'curriculum_vitae', 'curriculum vitae',
        'resume_file', 'cv_file', 'resumefile', 'cvfile', 'upload_resume',
        'upload_cv', 'attach_resume', 'attach_cv', 'your_resume', 'your_cv',
        'resume_upload', 'cv_upload', 'resume attachment', 'cv attachment',
        // Enhanced patterns for better detection
        'upload resume', 'upload cv', 'upload your resume', 'upload your cv',
        'resume upload', 'cv upload', 'resume file', 'cv file',
        'resume document', 'cv document', 'resume pdf', 'cv pdf',
        'resume doc', 'cv doc', 'resume docx', 'cv docx',
        'attach resume', 'attach cv', 'attach your resume', 'attach your cv',
        'resume attachment', 'cv attachment', 'resume file upload', 'cv file upload',
        'upload resume file', 'upload cv file', 'resume file input', 'cv file input',
        'resume input', 'cv input', 'resume field', 'cv field',
        'resume upload field', 'cv upload field', 'resume file field', 'cv file field'
      ],
      [FileUploadType.COVER_LETTER_FILE]: [
        'cover_letter', 'coverletter', 'cover letter', 'cover_letter_file',
        'coverletterfile', 'upload_cover_letter', 'attach_cover_letter',
        'cover_letter_upload', 'cover letter upload', 'cover letter attachment',
        // Enhanced patterns
        'upload cover letter', 'upload your cover letter', 'cover letter upload',
        'cover letter file', 'cover letter document', 'cover letter pdf',
        'cover letter doc', 'cover letter docx', 'attach cover letter',
        'attach your cover letter', 'cover letter attachment', 'cover letter file upload',
        'upload cover letter file', 'cover letter file input', 'cover letter input',
        'cover letter field', 'cover letter upload field', 'cover letter file field'
      ],
      [FileUploadType.PORTFOLIO]: [
        'portfolio', 'portfolio_file', 'portfoliofile', 'work_samples',
        'samples', 'portfolio_upload', 'upload_portfolio', 'attach_portfolio',
        'portfolio attachment', 'work portfolio',
        // Enhanced patterns
        'upload portfolio', 'upload your portfolio', 'portfolio upload',
        'portfolio file', 'portfolio document', 'work samples', 'sample work',
        'attach portfolio', 'attach your portfolio', 'portfolio attachment',
        'portfolio file upload', 'upload portfolio file', 'portfolio file input',
        'portfolio input', 'portfolio field', 'portfolio upload field',
        'portfolio file field', 'work samples upload', 'sample work upload'
      ],
      [FileUploadType.OTHER]: [
        'document', 'file', 'attachment', 'upload', 'additional_documents',
        'supporting_documents', 'other_documents',
        // Enhanced patterns
        'upload document', 'upload file', 'upload attachment', 'file upload',
        'document upload', 'attachment upload', 'upload additional documents',
        'upload supporting documents', 'upload other documents', 'file input',
        'document input', 'attachment input', 'file field', 'document field',
        'attachment field', 'file upload field', 'document upload field',
        'attachment upload field'
      ]
    };
    
    const identifierText = identifiers.join(' ');
    
    // Find the best matching file upload type
    let bestMatch: FileUploadType | null = null;
    let bestScore = 0;
    
    Object.entries(patterns).forEach(([uploadType, keywords]) => {
      const score = keywords.reduce((acc, keyword) => {
        if (identifierText.includes(keyword)) {
          return acc + keyword.length; // Longer matches get higher scores
        }
        return acc;
      }, 0);
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = uploadType as FileUploadType;
      }
    });
    
    return bestMatch;
  },

  // Parse the accept attribute to get allowed file types
  parseAcceptAttribute(element: HTMLInputElement): string[] {
    const accept = element.getAttribute('accept');
    if (!accept) {
      return [];
    }
    
    // Split by comma and clean up whitespace
    return accept.split(',').map(type => type.trim().toLowerCase());
  },

  // Extract maximum file size from various sources
  extractMaxFileSize(element: HTMLInputElement): number | undefined {
    // Check data attributes
    const dataSizeAttr = element.getAttribute('data-max-size') || 
                        element.getAttribute('data-maxsize') ||
                        element.getAttribute('max-size');
    
    if (dataSizeAttr) {
      const size = parseInt(dataSizeAttr, 10);
      if (!isNaN(size)) {
        return size;
      }
    }
    
    // Look for size information in nearby text
    const nearbyText = this.getNearbyText(element);
    if (nearbyText) {
      // Look for patterns like "max 5MB", "up to 10MB", "5 MB maximum"
      const sizePattern = /(?:max|maximum|up to|limit)\s*:?\s*(\d+)\s*(mb|kb|gb)/i;
      const match = nearbyText.match(sizePattern);
      
      if (match) {
        const size = parseInt(match[1], 10);
        const unit = match[2].toLowerCase();
        
        if (!isNaN(size)) {
          switch (unit) {
            case 'kb':
              return size * 1024;
            case 'mb':
              return size * 1024 * 1024;
            case 'gb':
              return size * 1024 * 1024 * 1024;
            default:
              return size;
          }
        }
      }
    }
    
    return undefined;
  },

  // Calculate confidence score for file upload field mapping
  calculateFileUploadConfidence(
    identifiers: string[], 
    fileUploadType: FileUploadType, 
    acceptedTypes: string[]
  ): number {
    const identifierText = identifiers.join(' ');
    
    // Base confidence
    let confidence = 0.4;
    
    // Boost confidence for exact matches with enhanced scoring
    const exactMatches: Partial<Record<FileUploadType, string[]>> = {
      [FileUploadType.CV_RESUME]: [
        'resume', 'cv', 'curriculum', 'upload resume', 'upload cv',
        'resume upload', 'cv upload', 'resume file', 'cv file'
      ],
      [FileUploadType.COVER_LETTER_FILE]: [
        'cover_letter', 'coverletter', 'cover letter', 'upload cover letter',
        'cover letter upload', 'cover letter file'
      ],
      [FileUploadType.PORTFOLIO]: [
        'portfolio', 'work_samples', 'upload portfolio', 'portfolio upload',
        'portfolio file', 'work samples'
      ]
    };
    
    const exactKeywords = exactMatches[fileUploadType] || [];
    let exactMatchScore = 0;
    exactKeywords.forEach(keyword => {
      if (identifierText.includes(keyword)) {
        // Give higher weight to longer, more specific matches
        if (keyword.includes(' ') || keyword.includes('_')) {
          exactMatchScore += keyword.length * 1.5; // Boost compound terms
        } else {
          exactMatchScore += keyword.length;
        }
      }
    });
    
    if (exactMatchScore > 0) {
      confidence += Math.min(0.5, exactMatchScore / 20); // Cap at 0.5 boost
    }
    
    // Special boost for "upload resume" and "upload cv" patterns
    if (fileUploadType === FileUploadType.CV_RESUME) {
      const uploadPatterns = ['upload resume', 'upload cv', 'resume upload', 'cv upload'];
      const hasUploadPattern = uploadPatterns.some(pattern => 
        identifierText.includes(pattern)
      );
      if (hasUploadPattern) {
        confidence += 0.3; // Strong boost for upload patterns
      }
    }
    
    // Boost confidence based on accept attribute relevance
    if (acceptedTypes.length > 0) {
      const documentTypes = ['.pdf', '.doc', '.docx', 'application/pdf', 
                           'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      
      const hasDocumentTypes = acceptedTypes.some(type => 
        documentTypes.some(docType => type.includes(docType))
      );
      
      if (hasDocumentTypes) {
        confidence += 0.2;
      }
    }
    
    // Boost confidence for multiple identifier sources
    if (identifiers.length > 2) {
      confidence += 0.1;
    }
    
    // Reduce confidence for very generic terms when no specific context
    const genericTerms = ['file', 'upload', 'attachment'];
    const hasOnlyGeneric = identifiers.every(id => 
      genericTerms.some(term => id.includes(term))
    );
    
    if (hasOnlyGeneric && fileUploadType === FileUploadType.OTHER) {
      confidence -= 0.2;
    }
    
    // Boost confidence for CV/Resume fields with document-specific accept types
    if (fileUploadType === FileUploadType.CV_RESUME && acceptedTypes.length > 0) {
      const cvRelevantTypes = ['.pdf', '.doc', '.docx', 'application/pdf'];
      const hasCvTypes = acceptedTypes.some(type => 
        cvRelevantTypes.some(cvType => type.includes(cvType))
      );
      
      if (hasCvTypes) {
        confidence += 0.2;
      }
    }
    
    // Additional boost for CV/Resume fields with high relevance
    if (fileUploadType === FileUploadType.CV_RESUME) {
      const cvSpecificTerms = ['resume', 'cv', 'curriculum', 'curriculum vitae'];
      const hasCvSpecificTerms = cvSpecificTerms.some(term => 
        identifierText.includes(term)
      );
      if (hasCvSpecificTerms) {
        confidence += 0.15;
      }
    }
    
    return Math.min(1.0, Math.max(0.0, confidence));
  },

  // Check if a file upload field is compatible with CV upload
  isFileUploadCompatibleWithCV(mapping: FileUploadMapping, cvData: { mimeType: string; fileSize: number }): boolean {
    // Check file type compatibility
    if (mapping.acceptedTypes.length > 0) {
      const isTypeAccepted = mapping.acceptedTypes.some(acceptType => {
        // Handle MIME types
        if (acceptType.includes('/')) {
          return cvData.mimeType === acceptType;
        }
        
        // Handle file extensions
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
        return false;
      }
    }
    
    // Check file size compatibility
    if (mapping.maxSize && cvData.fileSize > mapping.maxSize) {
      return false;
    }
    
    return true;
  }
};