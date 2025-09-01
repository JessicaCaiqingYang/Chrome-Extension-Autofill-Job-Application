// Standalone content script for Job Application Autofill extension
// This version inlines all dependencies to avoid import issues

console.log('Job Application Autofill content script loaded');

// Inline types and enums for content script
const ContentFieldType = {
    FIRST_NAME: 'FIRST_NAME',
    LAST_NAME: 'LAST_NAME',
    EMAIL: 'EMAIL',
    PHONE: 'PHONE',
    ADDRESS: 'ADDRESS',
    CITY: 'CITY',
    STATE: 'STATE',
    POSTCODE: 'POSTCODE',
    COVER_LETTER: 'COVER_LETTER',
    RESUME_TEXT: 'RESUME_TEXT'
} as const;

type ContentFieldType = typeof ContentFieldType[keyof typeof ContentFieldType];

const ContentMessageType = {
    GET_USER_PROFILE: 'GET_USER_PROFILE',
    SET_USER_PROFILE: 'SET_USER_PROFILE',
    GET_CV_DATA: 'GET_CV_DATA',
    SET_CV_DATA: 'SET_CV_DATA',
    TOGGLE_AUTOFILL: 'TOGGLE_AUTOFILL',
    TRIGGER_AUTOFILL: 'TRIGGER_AUTOFILL',
    AUTOFILL_COMPLETE: 'AUTOFILL_COMPLETE',
    ERROR: 'ERROR'
} as const;

type ContentMessageType = typeof ContentMessageType[keyof typeof ContentMessageType];

interface ContentFieldMapping {
    element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    fieldType: ContentFieldType;
    confidence: number;
    value: string;
}

interface ContentMessage {
    type: ContentMessageType | string;
    payload?: any;
}

// Signal that the content script is ready
chrome.runtime.sendMessage({ type: 'CONTENT_SCRIPT_READY' }).catch(() => {
    // Ignore errors if service worker is not ready
});

class FormDetectionSystem {
    private detectedFields: HTMLElement[] = [];
    private fieldMappings: ContentFieldMapping[] = [];
    private observer: MutationObserver | null = null;
    private isScanning = false;

    constructor() {
        this.initializeDetection();
        this.setupMessageListener();
        this.injectStyles();
    }

    private initializeDetection(): void {
        this.scanForFormFields().catch(console.error);
        this.setupMutationObserver();
        setInterval(() => {
            if (!this.isScanning) {
                this.scanForFormFields().catch(console.error);
            }
        }, 3000);
    }

    public async scanForFormFields(): Promise<HTMLElement[]> {
        if (this.isScanning) {
            return this.detectedFields;
        }

        this.isScanning = true;
        console.log('Scanning for form fields...');

        try {
            const basicFields = this.detectBasicFormFields();
            const contextFields = this.detectFieldsByContext();
            const attributeFields = this.detectFieldsByAttributes();

            const allFields = this.deduplicateFields([
                ...basicFields,
                ...contextFields,
                ...attributeFields
            ]);

            this.detectedFields = allFields.filter(field =>
                this.isFieldFillable(field)
            );

            await this.classifyFieldTypes();

            console.log(`Detected ${this.detectedFields.length} fillable form fields`);
            return this.detectedFields;
        } finally {
            this.isScanning = false;
        }
    }

    private detectBasicFormFields(): HTMLElement[] {
        const selectors = [
            'input[type="text"]',
            'input[type="email"]',
            'input[type="tel"]',
            'input[type="url"]',
            'input[type="search"]',
            'input:not([type])',
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

    private detectFieldsByContext(): HTMLElement[] {
        const fields: HTMLElement[] = [];

        const formContainers = document.querySelectorAll('form, [class*="form"], [id*="form"]');
        formContainers.forEach(container => {
            const inputs = container.querySelectorAll('input, textarea, select');
            inputs.forEach(input => {
                if (this.isLikelyFormField(input as HTMLElement)) {
                    fields.push(input as HTMLElement);
                }
            });
        });

        const potentialFields = document.querySelectorAll('[placeholder], [aria-label]');
        potentialFields.forEach(field => {
            if (this.isLikelyFormField(field as HTMLElement)) {
                fields.push(field as HTMLElement);
            }
        });

        return fields;
    }

    private detectFieldsByAttributes(): HTMLElement[] {
        const fields: HTMLElement[] = [];
        const attributePatterns = [
            '[name*="name"]', '[name*="email"]', '[name*="phone"]', '[name*="address"]',
            '[name*="city"]', '[name*="state"]', '[name*="zip"]', '[name*="postal"]',
            '[id*="name"]', '[id*="email"]', '[id*="phone"]', '[id*="address"]',
            '[class*="input"]', '[class*="field"]', '[data-field]', '[data-input]'
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

    private isLikelyFormField(element: HTMLElement): boolean {
        const tagName = element.tagName.toLowerCase();

        if (!['input', 'textarea', 'select'].includes(tagName)) {
            return false;
        }

        if (tagName === 'input') {
            const inputType = (element as HTMLInputElement).type.toLowerCase();
            const skipTypes = ['hidden', 'submit', 'button', 'reset', 'file', 'image', 'checkbox', 'radio'];
            if (skipTypes.includes(inputType)) {
                return false;
            }
        }

        if (!this.isFieldFillable(element)) {
            return false;
        }

        return this.hasRelevantAttributes(element) || this.hasRelevantContext(element);
    }

    private hasRelevantAttributes(element: HTMLElement): boolean {
        const input = element as HTMLInputElement;
        const relevantAttributes = [
            input.name, input.id, input.className, input.placeholder,
            element.getAttribute('aria-label'),
            element.getAttribute('data-field'),
            element.getAttribute('data-input')
        ].filter(Boolean);

        if (relevantAttributes.length === 0) {
            return false;
        }

        const formKeywords = [
            'name', 'email', 'phone', 'address', 'city', 'state', 'zip', 'postal',
            'first', 'last', 'contact', 'user', 'profile', 'personal', 'info',
            'field', 'input', 'form', 'data'
        ];

        const attributeText = relevantAttributes.join(' ').toLowerCase();
        return formKeywords.some(keyword => attributeText.includes(keyword));
    }

    private hasRelevantContext(element: HTMLElement): boolean {
        const labelText = this.getAssociatedLabelText(element);
        if (labelText) {
            const formKeywords = ['name', 'email', 'phone', 'address', 'city', 'state', 'zip', 'contact', 'personal', 'profile', 'information'];
            const lowerLabelText = labelText.toLowerCase();
            if (formKeywords.some(keyword => lowerLabelText.includes(keyword))) {
                return true;
            }
        }

        const nearbyText = this.getNearbyText(element);
        if (nearbyText) {
            const formKeywords = ['name', 'email', 'phone', 'address'];
            const lowerNearbyText = nearbyText.toLowerCase();
            if (formKeywords.some(keyword => lowerNearbyText.includes(keyword))) {
                return true;
            }
        }

        return false;
    }

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

    private async classifyFieldTypes(): Promise<void> {
        if (this.detectedFields.length === 0) {
            return;
        }

        try {
            const userProfile = await this.getUserProfile();
            if (!userProfile) {
                console.log('No user profile available for field mapping');
                return;
            }

            if (userProfile && !userProfile.personalInfo) {
                userProfile.personalInfo = { firstName: '', lastName: '', email: '' };
            }

            this.fieldMappings = this.mapFieldsToUserData(this.detectedFields, userProfile);
            this.fieldMappings.sort((a, b) => b.confidence - a.confidence);

            console.log(`Mapped ${this.fieldMappings.length} fields with confidence scores:`,
                this.fieldMappings.map(m => ({ type: m.fieldType, confidence: m.confidence }))
            );

        } catch (error) {
            console.error('Error during field classification:', error);
        }
    }

    private mapFieldsToUserData(fields: HTMLElement[], userProfile: any): ContentFieldMapping[] {
        const mappings: ContentFieldMapping[] = [];

        fields.forEach(field => {
            const mapping = this.createFieldMapping(field, userProfile);
            if (mapping && mapping.confidence > 0.3) {
                mappings.push(mapping);
            }
        });

        return mappings;
    }

    private createFieldMapping(field: HTMLElement, userProfile: any): ContentFieldMapping | null {
        const element = field as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
        const identifiers = this.getFieldIdentifiers(element);
        const identifierText = identifiers.join(' ').toLowerCase();

        const patterns: Record<ContentFieldType, { patterns: string[]; weight: number }> = {
            [ContentFieldType.FIRST_NAME]: {
                patterns: ['firstname', 'first_name', 'fname', 'given_name', 'givenname', 'first name', 'name_first'],
                weight: 1.0
            },
            [ContentFieldType.LAST_NAME]: {
                patterns: ['lastname', 'last_name', 'lname', 'surname', 'family_name', 'familyname', 'last name', 'name_last'],
                weight: 1.0
            },
            [ContentFieldType.EMAIL]: {
                patterns: [
                    'email', 'email_address', 'emailaddress', 'e_mail', 'e-mail', 'mail',
                    'email address', 'electronic mail'
                ],
                weight: 1.2
            },
            [ContentFieldType.PHONE]: {
                patterns: ['phone', 'telephone', 'tel', 'mobile', 'cell', 'phone_number', 'phonenumber'],
                weight: 1.1
            },
            [ContentFieldType.ADDRESS]: {
                patterns: ['address', 'street', 'address_line_1', 'address1', 'street_address'],
                weight: 0.9
            },
            [ContentFieldType.CITY]: {
                patterns: ['city', 'town', 'locality'],
                weight: 0.8
            },
            [ContentFieldType.STATE]: {
                patterns: ['state', 'province', 'region'],
                weight: 0.8
            },
            [ContentFieldType.POSTCODE]: {
                patterns: ['zip', 'zipcode', 'postal', 'postcode', 'postal_code'],
                weight: 0.8
            },
            [ContentFieldType.COVER_LETTER]: {
                patterns: ['cover_letter', 'coverletter', 'cover letter', 'message', 'additional_info', 'comments'],
                weight: 0.7
            },
            [ContentFieldType.RESUME_TEXT]: {
                patterns: ['resume', 'cv', 'curriculum', 'experience', 'background', 'qualifications', 'skills'],
                weight: 0.7
            }
        };

        let bestFieldType: ContentFieldType | null = null;
        let bestConfidence = 0;

        (Object.keys(patterns) as ContentFieldType[]).forEach((fieldType) => {
            const config = patterns[fieldType];
            let matchScore = 0;
            let totalWeight = 0;

            config.patterns.forEach(pattern => {
                if (identifierText.includes(pattern)) {
                    const patternWeight = pattern.length / 10;
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
            const value = this.getValueForFieldType(bestFieldType, userProfile);
            return {
                element,
                fieldType: bestFieldType,
                confidence: bestConfidence,
                value
            };
        }

        return null;
    }

    private getFieldIdentifiers(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string[] {
        const identifiers: string[] = [];

        if (element.name) identifiers.push(element.name.toLowerCase());
        if (element.id) identifiers.push(element.id.toLowerCase());
        if (element.className) identifiers.push(element.className.toLowerCase());
        if ('placeholder' in element && element.placeholder) identifiers.push(element.placeholder.toLowerCase());

        const ariaLabel = element.getAttribute('aria-label');
        if (ariaLabel) identifiers.push(ariaLabel.toLowerCase());

        const labelText = this.getAssociatedLabelText(element);
        if (labelText) identifiers.push(labelText.toLowerCase());

        const nearbyText = this.getNearbyText(element);
        if (nearbyText) identifiers.push(nearbyText.toLowerCase());

        return identifiers;
    }

    private getAssociatedLabelText(element: HTMLElement): string | null {
        if (element.id) {
            const label = document.querySelector(`label[for="${element.id}"]`);
            if (label) {
                return label.textContent?.trim() || null;
            }
        }

        const parentLabel = element.closest('label');
        if (parentLabel) {
            return parentLabel.textContent?.trim() || null;
        }

        return null;
    }

    private getNearbyText(element: HTMLElement): string | null {
        const parent = element.parentElement;
        if (!parent) return null;

        const textNodes = Array.from(parent.childNodes)
            .filter(node => node.nodeType === Node.TEXT_NODE)
            .map(node => node.textContent?.trim())
            .filter(text => text && text.length > 0);

        return textNodes.join(' ') || null;
    }

    private getValueForFieldType(fieldType: ContentFieldType, userProfile: any): string {
        const { personalInfo, workInfo } = userProfile;

        switch (fieldType) {
            case ContentFieldType.FIRST_NAME:
                return personalInfo?.firstName || '';
            case ContentFieldType.LAST_NAME:
                return personalInfo?.lastName || '';
            case ContentFieldType.EMAIL:
                return personalInfo?.email || '';
            case ContentFieldType.PHONE:
                return personalInfo?.phone || '';
            case ContentFieldType.ADDRESS:
                return personalInfo?.address?.street || '';
            case ContentFieldType.CITY:
                return personalInfo?.address?.city || '';
            case ContentFieldType.STATE:
                return personalInfo?.address?.state || '';
            case ContentFieldType.POSTCODE:
                return personalInfo?.address?.postCode || '';
            case ContentFieldType.COVER_LETTER:
                return workInfo?.experience || '';
            case ContentFieldType.RESUME_TEXT:
                return workInfo?.skills?.join(', ') || '';
            default:
                return '';
        }
    }

    private isFieldFillable(element: HTMLElement): boolean {
        const computedStyle = window.getComputedStyle(element);
        const isVisible = computedStyle.display !== 'none' &&
            computedStyle.visibility !== 'hidden' &&
            computedStyle.opacity !== '0';

        const input = element as HTMLInputElement;
        const isEnabled = !input.disabled && !input.readOnly;

        return isVisible && isEnabled;
    }

    private async getUserProfile(): Promise<any> {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage(
                { type: ContentMessageType.GET_USER_PROFILE },
                (response) => {
                    resolve(response?.data || null);
                }
            );
        });
    }

    private setupMutationObserver(): void {
        this.observer = new MutationObserver((mutations) => {
            let shouldRescan = false;

            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const element = node as Element;
                            if (this.containsFormFields(element)) {
                                shouldRescan = true;
                            }
                        }
                    });
                }

                if (mutation.type === 'attributes' && mutation.target.nodeType === Node.ELEMENT_NODE) {
                    const element = mutation.target as Element;
                    if (this.isLikelyFormField(element as HTMLElement)) {
                        shouldRescan = true;
                    }
                }
            });

            if (shouldRescan && !this.isScanning) {
                setTimeout(() => {
                    this.scanForFormFields().catch(console.error);
                }, 500);
            }
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'id', 'name', 'placeholder', 'aria-label']
        });
    }

    private containsFormFields(element: Element): boolean {
        const formSelectors = ['input', 'textarea', 'select', 'form'];

        if (formSelectors.includes(element.tagName.toLowerCase())) {
            return true;
        }

        return formSelectors.some(selector =>
            element.querySelector(selector) !== null
        );
    }

    private setupMessageListener(): void {
        chrome.runtime.onMessage.addListener((message: ContentMessage, sender, sendResponse) => {
            console.log('Content script received message:', message.type, 'from:', sender?.tab?.id || 'popup');

            try {
                switch (message.type) {
                    case ContentMessageType.TRIGGER_AUTOFILL:
                        this.handleAutofillTrigger(message.payload)
                            .then(result => {
                                console.log('Autofill trigger completed:', result);
                                sendResponse(result);
                            })
                            .catch(error => {
                                console.error('Autofill trigger failed:', error);
                                sendResponse({ success: false, error: error.message });
                            });
                        return true;

                    case ContentMessageType.TOGGLE_AUTOFILL:
                        if (message.payload && typeof message.payload.enabled === 'boolean') {
                            console.log('Autofill toggled:', message.payload.enabled);
                        }
                        sendResponse({ success: true });
                        return false;

                    case 'PING':
                        console.log('Content script ping received');
                        sendResponse({ success: true, status: 'ready' });
                        return false;

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

        console.log('Content script message listeners set up successfully');
    }

    private async handleAutofillTrigger(payload?: any): Promise<{ success: boolean; filled: number; errors: string[]; fieldsDetected: number }> {
        try {
            console.log('Autofill triggered', payload);

            if (payload && payload.userProfile) {
                await this.scanForFormFields();
                this.fieldMappings = this.mapFieldsToUserData(this.detectedFields, payload.userProfile);
                this.fieldMappings.sort((a, b) => b.confidence - a.confidence);
            } else {
                await this.scanForFormFields();
            }

            if (this.fieldMappings.length === 0) {
                const result = {
                    success: false,
                    filled: 0,
                    errors: ['No fillable fields detected on this page'],
                    fieldsDetected: this.detectedFields.length
                };

                await this.notifyAutofillComplete(result);
                return result;
            }

            const fillResult = await this.fillDetectedFields();
            this.showAutofillCompletionFeedback(fillResult);

            const result = {
                success: true,
                filled: fillResult.filled,
                errors: fillResult.errors,
                fieldsDetected: this.detectedFields.length
            };

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

            await this.notifyAutofillComplete(result);
            return result;
        }
    }

    private async fillDetectedFields(): Promise<{ filled: number; errors: string[] }> {
        let filled = 0;
        const errors: string[] = [];

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

            await this.delay(50);
        }

        return { filled, errors };
    }

    private async fillSingleField(mapping: ContentFieldMapping): Promise<boolean> {
        const { element, value, fieldType } = mapping;

        if (!value || value.trim() === '') {
            console.log(`Skipping ${fieldType} - no value available`);
            return false;
        }

        if (!this.isFieldFillable(element)) {
            console.log(`Skipping ${fieldType} - field is no longer fillable`);
            return false;
        }

        try {
            const originalValue = element.value;

            if (this.safelyFillField(element, value)) {
                if (element.value !== value) {
                    console.warn(`Fill validation failed for ${fieldType}. Expected: "${value}", Got: "${element.value}"`);
                    element.value = originalValue;
                    return false;
                } else {
                    console.log(`Successfully filled ${fieldType} with value: "${value}"`);
                    return true;
                }
            }

            return false;
        } catch (error) {
            console.error(`Error filling ${fieldType}:`, error);
            return false;
        }
    }

    private safelyFillField(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string): boolean {
        try {
            element.focus();
            element.value = '';
            element.value = value;
            this.triggerFieldEvents(element);
            element.blur();
            return true;
        } catch (error) {
            console.error('Error in safelyFillField:', error);
            return false;
        }
    }

    private triggerFieldEvents(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): void {
        const events = [
            new Event('input', { bubbles: true, cancelable: true }),
            new Event('change', { bubbles: true, cancelable: true }),
            new Event('blur', { bubbles: true, cancelable: true })
        ];

        const keyboardEvents = [
            new KeyboardEvent('keydown', { bubbles: true, cancelable: true }),
            new KeyboardEvent('keyup', { bubbles: true, cancelable: true })
        ];

        [...events, ...keyboardEvents].forEach(event => {
            try {
                element.dispatchEvent(event);
            } catch (error) {
                console.warn('Failed to dispatch event:', event.type, error);
            }
        });
    }

    private addVisualFeedback(element: HTMLElement, type: 'success' | 'error'): void {
        element.classList.remove('autofill-success', 'autofill-error');

        const className = type === 'success' ? 'autofill-success' : 'autofill-error';
        element.classList.add(className);

        const originalStyles = {
            backgroundColor: element.style.backgroundColor,
            border: element.style.border,
            boxShadow: element.style.boxShadow
        };

        if (type === 'success') {
            element.style.backgroundColor = '#e8f5e8';
            element.style.border = '2px solid #4caf50';
            element.style.boxShadow = '0 0 5px rgba(76, 175, 80, 0.3)';
        } else {
            element.style.backgroundColor = '#ffeaea';
            element.style.border = '2px solid #f44336';
            element.style.boxShadow = '0 0 5px rgba(244, 67, 54, 0.3)';
        }

        setTimeout(() => {
            element.classList.remove(className);
            element.style.backgroundColor = originalStyles.backgroundColor;
            element.style.border = originalStyles.border;
            element.style.boxShadow = originalStyles.boxShadow;
        }, 3000);
    }

    private showAutofillCompletionFeedback(result: { filled: number; errors: string[] }): void {
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

        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 4000);

        console.log('Autofill completed:', result);
        if (result.errors.length > 0) {
            console.warn('Autofill errors:', result.errors);
        }
    }

    private async notifyAutofillComplete(result: any): Promise<void> {
        try {
            await chrome.runtime.sendMessage({
                type: ContentMessageType.AUTOFILL_COMPLETE,
                payload: result
            });
        } catch (error) {
            console.error('Error notifying autofill completion:', error);
        }
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private injectStyles(): void {
        const styleId = 'job-autofill-styles';
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

    public getDetectedFields(): HTMLElement[] {
        return this.detectedFields;
    }

    public getFieldMappings(): ContentFieldMapping[] {
        return this.fieldMappings;
    }

    public destroy(): void {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }
}

// Initialize the form detection system
const formDetector = new FormDetectionSystem();
(window as any).formDetector = formDetector;