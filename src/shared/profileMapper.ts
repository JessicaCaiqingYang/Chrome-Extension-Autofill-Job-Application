import { 
  UserProfile, 
  ExtractedProfileData, 
  PersonalInfo, 
  WorkExperience
} from './types';
import { isValidEmail, isValidPhone } from './type-guards';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ConflictResolutionStrategy {
  personalInfo: 'preserve_existing' | 'prefer_extracted' | 'merge_intelligent';
  workInfo: 'preserve_existing' | 'prefer_extracted' | 'merge_intelligent';
  skills: 'replace' | 'merge' | 'preserve_existing';
}

export interface MergeOptions {
  conflictResolution?: ConflictResolutionStrategy;
  preserveUserModifications?: boolean;
  confidenceThreshold?: number;
}

export interface ProfileMapperService {
  mapExtractedDataToProfile(extractedData: ExtractedProfileData): Partial<UserProfile>;
  mergeWithExistingProfile(extracted: Partial<UserProfile>, existing: UserProfile, options?: MergeOptions): UserProfile;
  validateMappedData(profile: Partial<UserProfile>): ValidationResult;
}

export class ProfileMapper implements ProfileMapperService {
  /**
   * Maps extracted CV data to UserProfile format
   * Transforms the structured extracted data into the format expected by the extension
   */
  mapExtractedDataToProfile(extractedData: ExtractedProfileData): Partial<UserProfile> {
    const mappedProfile: Partial<UserProfile> = {};

    // Map personal information
    if (extractedData.personalInfo && Object.keys(extractedData.personalInfo).length > 0) {
      const mappedPersonalInfo = this.mapPersonalInfo(extractedData.personalInfo);
      if (Object.keys(mappedPersonalInfo).length > 0) {
        // Only include if we have meaningful data
        (mappedProfile as any).personalInfo = mappedPersonalInfo;
      }
    }

    // Map work information
    if (extractedData.workExperience?.length > 0 || extractedData.skills?.length > 0) {
      const mappedWorkInfo = this.mapWorkInfo(extractedData.workExperience, extractedData.skills, extractedData.personalInfo);
      if (Object.keys(mappedWorkInfo).length > 0) {
        (mappedProfile as any).workInfo = mappedWorkInfo;
      }
    }

    return mappedProfile;
  }

  /**
   * Merges extracted profile data with existing user profile
   * Preserves user-modified data while updating auto-extracted fields
   */
  mergeWithExistingProfile(extracted: Partial<UserProfile>, existing: UserProfile, options?: MergeOptions): UserProfile {
    const defaultOptions: MergeOptions = {
      conflictResolution: {
        personalInfo: 'preserve_existing',
        workInfo: 'merge_intelligent',
        skills: 'merge'
      },
      preserveUserModifications: true,
      confidenceThreshold: 0.7
    };

    const mergeOptions = { ...defaultOptions, ...options };

    const merged: UserProfile = {
      ...existing,
      preferences: {
        ...existing.preferences,
        lastUpdated: Date.now()
      }
    };

    // Merge personal information based on conflict resolution strategy
    if (extracted.personalInfo) {
      merged.personalInfo = this.mergePersonalInfoWithStrategy(
        extracted.personalInfo, 
        existing.personalInfo, 
        mergeOptions.conflictResolution!.personalInfo,
        mergeOptions.preserveUserModifications!
      );
    }

    // Merge work information based on conflict resolution strategy
    if (extracted.workInfo) {
      merged.workInfo = this.mergeWorkInfoWithStrategy(
        extracted.workInfo, 
        existing.workInfo, 
        mergeOptions.conflictResolution!.workInfo,
        mergeOptions.conflictResolution!.skills
      );
    }

    return merged;
  }

  /**
   * Validates mapped profile data for completeness and accuracy
   */
  validateMappedData(profile: Partial<UserProfile>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate personal information
    if (profile.personalInfo) {
      const personalValidation = this.validatePersonalInfo(profile.personalInfo);
      errors.push(...personalValidation.errors);
      warnings.push(...personalValidation.warnings);
    }

    // Validate work information
    if (profile.workInfo) {
      const workValidation = this.validateWorkInfo(profile.workInfo);
      errors.push(...workValidation.errors);
      warnings.push(...workValidation.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Maps extracted personal information to UserProfile format
   */
  private mapPersonalInfo(extracted: Partial<PersonalInfo>): Partial<UserProfile['personalInfo']> {
    const mapped: Partial<UserProfile['personalInfo']> = {};

    if (extracted.firstName) {
      mapped.firstName = this.cleanText(extracted.firstName);
    }

    if (extracted.lastName) {
      mapped.lastName = this.cleanText(extracted.lastName);
    }

    if (extracted.email && isValidEmail(extracted.email)) {
      mapped.email = extracted.email.toLowerCase().trim();
    }

    if (extracted.phone && isValidPhone(extracted.phone)) {
      mapped.phone = this.normalizePhone(extracted.phone);
    }

    if (extracted.address) {
      mapped.address = {
        street: extracted.address.street ? this.cleanText(extracted.address.street) : '',
        city: extracted.address.city ? this.cleanText(extracted.address.city) : '',
        state: extracted.address.state ? this.cleanText(extracted.address.state) : '',
        postCode: extracted.address.postCode ? this.cleanText(extracted.address.postCode) : '',
        country: extracted.address.country ? this.cleanText(extracted.address.country) : ''
      };
    }

    return mapped;
  }

  /**
   * Maps work experience and skills to UserProfile work info format
   */
  private mapWorkInfo(
    workExperience: WorkExperience[], 
    skills: string[], 
    personalInfo: Partial<PersonalInfo>
  ): Partial<UserProfile['workInfo']> {
    const mapped: Partial<UserProfile['workInfo']> = {};

    // Get current/most recent job title
    if (workExperience?.length > 0) {
      const currentJob = workExperience.find(exp => exp.current) || workExperience[0];
      if (currentJob?.jobTitle) {
        mapped.currentTitle = this.cleanText(currentJob.jobTitle);
      }

      // Create experience summary from work history
      mapped.experience = this.createExperienceSummary(workExperience);
    }

    // Map skills
    if (skills?.length > 0) {
      mapped.skills = skills
        .map(skill => this.cleanText(skill))
        .filter(skill => skill.length > 0)
        .slice(0, 20); // Limit to top 20 skills
    }

    // Map LinkedIn URL
    if (personalInfo?.linkedinUrl) {
      mapped.linkedinUrl = personalInfo.linkedinUrl;
    }

    // Map portfolio URL
    if (personalInfo?.portfolioUrl) {
      mapped.portfolioUrl = personalInfo.portfolioUrl;
    }

    return mapped;
  }

  /**
   * Merges personal information with conflict resolution strategy
   */
  private mergePersonalInfoWithStrategy(
    extracted: Partial<UserProfile['personalInfo']>, 
    existing: UserProfile['personalInfo'],
    strategy: 'preserve_existing' | 'prefer_extracted' | 'merge_intelligent',
    preserveUserModifications: boolean
  ): UserProfile['personalInfo'] {
    switch (strategy) {
      case 'preserve_existing':
        return this.mergePersonalInfoPreserveExisting(extracted, existing);
      
      case 'prefer_extracted':
        return this.mergePersonalInfoPreferExtracted(extracted, existing, preserveUserModifications);
      
      case 'merge_intelligent':
      default:
        return this.mergePersonalInfoIntelligent(extracted, existing);
    }
  }

  /**
   * Merges personal information, preserving existing data where appropriate
   */
  private mergePersonalInfoPreserveExisting(
    extracted: Partial<UserProfile['personalInfo']>, 
    existing: UserProfile['personalInfo']
  ): UserProfile['personalInfo'] {
    const merged = { ...existing };

    // Only update empty fields
    if (!existing.firstName && extracted.firstName) {
      merged.firstName = extracted.firstName;
    }

    if (!existing.lastName && extracted.lastName) {
      merged.lastName = extracted.lastName;
    }

    if (!existing.email && extracted.email) {
      merged.email = extracted.email;
    }

    if (!existing.phone && extracted.phone) {
      merged.phone = extracted.phone;
    }

    // Merge address - update empty fields only
    if (extracted.address) {
      merged.address = {
        street: existing.address.street || extracted.address.street || '',
        city: existing.address.city || extracted.address.city || '',
        state: existing.address.state || extracted.address.state || '',
        postCode: existing.address.postCode || extracted.address.postCode || '',
        country: existing.address.country || extracted.address.country || ''
      };
    }

    return merged;
  }

  /**
   * Merges personal information, preferring extracted data
   */
  private mergePersonalInfoPreferExtracted(
    extracted: Partial<UserProfile['personalInfo']>, 
    existing: UserProfile['personalInfo'],
    preserveUserModifications: boolean
  ): UserProfile['personalInfo'] {

    return {
      firstName: (extracted.firstName && (!preserveUserModifications || !existing.firstName)) 
        ? extracted.firstName : existing.firstName,
      lastName: (extracted.lastName && (!preserveUserModifications || !existing.lastName)) 
        ? extracted.lastName : existing.lastName,
      email: (extracted.email && isValidEmail(extracted.email) && (!preserveUserModifications || !existing.email)) 
        ? extracted.email : existing.email,
      phone: (extracted.phone && isValidPhone(extracted.phone) && (!preserveUserModifications || !existing.phone)) 
        ? extracted.phone : existing.phone,
      address: {
        street: extracted.address?.street || existing.address.street || '',
        city: extracted.address?.city || existing.address.city || '',
        state: extracted.address?.state || existing.address.state || '',
        postCode: extracted.address?.postCode || existing.address.postCode || '',
        country: extracted.address?.country || existing.address.country || ''
      }
    };
  }

  /**
   * Merges personal information using intelligent conflict resolution
   */
  private mergePersonalInfoIntelligent(
    extracted: Partial<UserProfile['personalInfo']>, 
    existing: UserProfile['personalInfo']
  ): UserProfile['personalInfo'] {

    return {
      firstName: (extracted.firstName && (!existing.firstName || extracted.firstName.length > existing.firstName.length)) 
        ? extracted.firstName : existing.firstName,
      lastName: (extracted.lastName && (!existing.lastName || extracted.lastName.length > existing.lastName.length)) 
        ? extracted.lastName : existing.lastName,
      email: (extracted.email && isValidEmail(extracted.email) && (!existing.email || !isValidEmail(existing.email))) 
        ? extracted.email : existing.email,
      phone: (extracted.phone && isValidPhone(extracted.phone) && (!existing.phone || extracted.phone.length > existing.phone.length)) 
        ? extracted.phone : existing.phone,
      address: {
        street: this.chooseBetterValue(existing.address.street, extracted.address?.street),
        city: this.chooseBetterValue(existing.address.city, extracted.address?.city),
        state: this.chooseBetterValue(existing.address.state, extracted.address?.state),
        postCode: this.chooseBetterValue(existing.address.postCode, extracted.address?.postCode),
        country: this.chooseBetterValue(existing.address.country, extracted.address?.country)
      }
    };
  }

  /**
   * Merges work information with conflict resolution strategy
   */
  private mergeWorkInfoWithStrategy(
    extracted: Partial<UserProfile['workInfo']>, 
    existing: UserProfile['workInfo'],
    workStrategy: 'preserve_existing' | 'prefer_extracted' | 'merge_intelligent',
    skillsStrategy: 'replace' | 'merge' | 'preserve_existing'
  ): UserProfile['workInfo'] {
    const merged = { ...existing };

    // Handle non-skills fields based on work strategy
    switch (workStrategy) {
      case 'preserve_existing':
        if (!existing.currentTitle && extracted.currentTitle) {
          merged.currentTitle = extracted.currentTitle;
        }
        if (!existing.experience && extracted.experience) {
          merged.experience = extracted.experience;
        }
        if (!existing.linkedinUrl && extracted.linkedinUrl) {
          merged.linkedinUrl = extracted.linkedinUrl;
        }
        if (!existing.portfolioUrl && extracted.portfolioUrl) {
          merged.portfolioUrl = extracted.portfolioUrl;
        }
        break;

      case 'prefer_extracted':
        if (extracted.currentTitle) merged.currentTitle = extracted.currentTitle;
        if (extracted.experience) merged.experience = extracted.experience;
        if (extracted.linkedinUrl) merged.linkedinUrl = extracted.linkedinUrl;
        if (extracted.portfolioUrl) merged.portfolioUrl = extracted.portfolioUrl;
        break;

      case 'merge_intelligent':
      default:
        merged.currentTitle = this.chooseBetterValue(existing.currentTitle, extracted.currentTitle);
        merged.experience = this.chooseBetterValue(existing.experience, extracted.experience);
        merged.linkedinUrl = this.chooseBetterValue(existing.linkedinUrl, extracted.linkedinUrl);
        merged.portfolioUrl = this.chooseBetterValue(existing.portfolioUrl, extracted.portfolioUrl);
        break;
    }

    // Handle skills based on skills strategy
    if (extracted.skills && extracted.skills.length > 0) {
      switch (skillsStrategy) {
        case 'replace':
          merged.skills = [...extracted.skills];
          break;

        case 'preserve_existing':
          if (!existing.skills || existing.skills.length === 0) {
            merged.skills = [...extracted.skills];
          }
          break;

        case 'merge':
        default:
          merged.skills = this.mergeSkills(existing.skills || [], extracted.skills);
          break;
      }
    }

    return merged;
  }

  /**
   * Merges skills arrays with intelligent deduplication
   */
  private mergeSkills(existingSkills: string[], extractedSkills: string[]): string[] {
    const combinedSkills = [...existingSkills, ...extractedSkills];
    const skillMap = new Map<string, string>();

    // Deduplicate while preserving best casing
    for (const skill of combinedSkills) {
      const lowerSkill = skill.toLowerCase().trim();
      if (lowerSkill && (!skillMap.has(lowerSkill) || skill.length > skillMap.get(lowerSkill)!.length)) {
        skillMap.set(lowerSkill, skill);
      }
    }

    return Array.from(skillMap.values())
      .filter(skill => skill.length > 1) // Filter out single characters
      .slice(0, 30); // Limit total skills
  }

  /**
   * Chooses the better value between existing and extracted data
   */
  private chooseBetterValue(existing?: string, extracted?: string): string {
    if (!existing && !extracted) return '';
    if (!existing) return extracted || '';
    if (!extracted) return existing;
    
    // Prefer longer, more complete values
    if (extracted.length > existing.length * 1.2) {
      return extracted;
    }
    
    return existing;
  }

  /**
   * Creates a summary of work experience
   */
  private createExperienceSummary(workExperience: WorkExperience[]): string {
    if (!workExperience?.length) return '';

    const totalYears = this.calculateTotalExperience(workExperience);
    const companies = workExperience.map(exp => exp.company).filter(Boolean);
    const uniqueCompanies = Array.from(new Set(companies));

    let summary = `${totalYears} years of experience`;
    if (uniqueCompanies.length > 0) {
      summary += ` at companies including ${uniqueCompanies.slice(0, 3).join(', ')}`;
    }

    return summary;
  }

  /**
   * Calculates total years of experience from work history
   */
  private calculateTotalExperience(workExperience: WorkExperience[]): number {
    let totalMonths = 0;

    for (const exp of workExperience) {
      if (exp.startDate) {
        const startDate = new Date(exp.startDate);
        const endDate = exp.current ? new Date() : (exp.endDate ? new Date(exp.endDate) : new Date());
        
        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
          const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                        (endDate.getMonth() - startDate.getMonth());
          totalMonths += Math.max(0, months);
        }
      }
    }

    return Math.round(totalMonths / 12 * 10) / 10; // Round to 1 decimal place
  }

  /**
   * Validates personal information
   */
  private validatePersonalInfo(personalInfo: Partial<UserProfile['personalInfo']>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (personalInfo.email && !isValidEmail(personalInfo.email)) {
      errors.push('Invalid email format');
    }

    if (personalInfo.phone && !isValidPhone(personalInfo.phone)) {
      warnings.push('Phone number format may be invalid');
    }

    if (!personalInfo.firstName) {
      warnings.push('First name not extracted');
    }

    if (!personalInfo.lastName) {
      warnings.push('Last name not extracted');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validates work information
   */
  private validateWorkInfo(workInfo: Partial<UserProfile['workInfo']>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (workInfo.linkedinUrl && !this.isValidUrl(workInfo.linkedinUrl)) {
      warnings.push('LinkedIn URL format may be invalid');
    }

    if (workInfo.portfolioUrl && !this.isValidUrl(workInfo.portfolioUrl)) {
      warnings.push('Portfolio URL format may be invalid');
    }

    if (!workInfo.skills || workInfo.skills.length === 0) {
      warnings.push('No skills extracted');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Cleans and normalizes text content
   */
  private cleanText(text: string): string {
    return text.trim().replace(/\s+/g, ' ');
  }

  /**
   * Normalizes phone number format
   */
  private normalizePhone(phone: string): string {
    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    // Basic formatting for common patterns
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    
    return cleaned;
  }

  /**
   * Validates URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const profileMapper = new ProfileMapper();