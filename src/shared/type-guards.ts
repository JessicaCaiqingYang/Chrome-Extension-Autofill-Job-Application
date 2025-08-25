// Type guards for runtime type checking
import { UserProfile, CVData, Message, MessageType } from './types';

export function isUserProfile(obj: any): obj is UserProfile {
  return (
    obj &&
    typeof obj === 'object' &&
    obj.personalInfo &&
    typeof obj.personalInfo === 'object' &&
    typeof obj.personalInfo.firstName === 'string' &&
    typeof obj.personalInfo.lastName === 'string' &&
    typeof obj.personalInfo.email === 'string' &&
    obj.preferences &&
    typeof obj.preferences === 'object' &&
    typeof obj.preferences.autofillEnabled === 'boolean'
  );
}

export function isCVData(obj: any): obj is CVData {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.fileName === 'string' &&
    typeof obj.fileSize === 'number' &&
    typeof obj.uploadDate === 'number' &&
    typeof obj.extractedText === 'string' &&
    (obj.fileType === 'pdf' || obj.fileType === 'docx')
  );
}

export function isMessage(obj: any): obj is Message {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.type === 'string' &&
    Object.values(MessageType).includes(obj.type as MessageType)
  );
}

export function isFormElement(element: any): element is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  return (
    element &&
    element.nodeType === Node.ELEMENT_NODE &&
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)
  );
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPhone(phone: string): boolean {
  // Basic phone validation - can be enhanced
  const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}