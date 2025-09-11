/**
 * CV Parser Service
 * 
 * Extracts structured profile data from CV text using pattern matching
 * and natural language processing techniques.
 */

import {
  ExtractedProfileData,
  PersonalInfo,
  WorkExperience,
  Education
} from './types';

export class CVParser {
  private readonly HIGH_CONFIDENCE = 0.8;

  /**
   * Main parsing method that extracts all profile data from CV text
   */
  async parseCV(extractedText: string): Promise<ExtractedProfileData> {
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text content provided for parsing');
    }

    const cleanedText = this.preprocessText(extractedText);

    try {
      // Extract different sections of the CV
      const personalInfo = this.extractPersonalInfo(cleanedText);
      const workExperience = this.extractWorkExperience(cleanedText);
      const education = this.extractEducation(cleanedText);
      const skills = this.extractSkills(cleanedText);

      // Calculate confidence scores
      const confidence = this.calculateConfidenceScores(
        personalInfo,
        workExperience,
        education,
        skills
      );

      return {
        personalInfo,
        workExperience,
        education,
        skills,
        confidence
      };
    } catch (error) {
      console.error('CV parsing failed:', error);
      throw new Error(`CV parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract personal information from CV text
   */
  extractPersonalInfo(text: string): Partial<PersonalInfo> {
    const personalInfo: Partial<PersonalInfo> = {};

    // Extract name (usually at the beginning of CV)
    const nameMatch = this.extractName(text);
    if (nameMatch) {
      personalInfo.firstName = nameMatch.firstName;
      personalInfo.lastName = nameMatch.lastName;
    }

    // Extract email
    const emailMatch = this.extractEmail(text);
    if (emailMatch) {
      personalInfo.email = emailMatch;
    }

    // Extract phone number
    const phoneMatch = this.extractPhone(text);
    if (phoneMatch) {
      personalInfo.phone = phoneMatch;
    }

    // Extract address
    const addressMatch = this.extractAddress(text);
    if (addressMatch) {
      personalInfo.address = addressMatch;
    }

    // Extract LinkedIn URL
    const linkedinMatch = this.extractLinkedIn(text);
    if (linkedinMatch) {
      personalInfo.linkedinUrl = linkedinMatch;
    }

    // Extract portfolio URL
    const portfolioMatch = this.extractPortfolio(text);
    if (portfolioMatch) {
      personalInfo.portfolioUrl = portfolioMatch;
    }

    return personalInfo;
  }

  /**
   * Extract work experience from CV text
   */
  extractWorkExperience(text: string): WorkExperience[] {
    const experiences: WorkExperience[] = [];

    // Find experience section
    const experienceSection = this.findSection(text, [
      'experience', 'employment', 'work history', 'professional experience',
      'career history', 'work experience', 'employment history'
    ]);

    if (!experienceSection) {
      return experiences;
    }

    // Split into individual job entries
    const jobEntries = this.splitJobEntries(experienceSection);

    for (const entry of jobEntries) {
      const experience = this.parseJobEntry(entry);
      if (experience) {
        experiences.push(experience);
      }
    }

    // Sort by start date (most recent first)
    return this.sortExperienceChronologically(experiences);
  }

  /**
   * Extract education information from CV text
   */
  extractEducation(text: string): Education[] {
    const educationList: Education[] = [];

    // Find education section
    const educationSection = this.findSection(text, [
      'education', 'academic background', 'qualifications', 'academic qualifications',
      'educational background', 'degrees', 'certifications'
    ]);

    if (!educationSection) {
      return educationList;
    }

    // Split into individual education entries
    const educationEntries = this.splitEducationEntries(educationSection);

    for (const entry of educationEntries) {
      const education = this.parseEducationEntry(entry);
      if (education) {
        educationList.push(education);
      }
    }

    return educationList;
  }

  /**
   * Extract skills and competencies from CV text
   */
  extractSkills(text: string): string[] {
    const skills = new Set<string>();

    // Find skills section
    const skillsSection = this.findSection(text, [
      'skills', 'technical skills', 'competencies', 'technologies',
      'programming languages', 'software', 'tools', 'expertise'
    ]);

    if (skillsSection) {
      const sectionSkills = this.parseSkillsSection(skillsSection);
      sectionSkills.forEach(skill => skills.add(skill));
    }

    // Extract skills from job descriptions
    const experienceSkills = this.extractSkillsFromExperience(text);
    experienceSkills.forEach(skill => skills.add(skill));

    // Extract skills from summary/objective
    const summarySkills = this.extractSkillsFromSummary(text);
    summarySkills.forEach(skill => skills.add(skill));

    return Array.from(skills).sort();
  }

  /**
   * Preprocess text for better parsing
   */
  private preprocessText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  /**
   * Calculate confidence scores for extracted data
   */
  private calculateConfidenceScores(
    personalInfo: Partial<PersonalInfo>,
    workExperience: WorkExperience[],
    education: Education[],
    skills: string[]
  ): ExtractedProfileData['confidence'] {

    // Personal info confidence based on completeness
    const personalInfoFields = Object.keys(personalInfo).length;
    const personalInfoConfidence = Math.min(personalInfoFields / 6, 1) * this.HIGH_CONFIDENCE;

    // Work experience confidence based on number and completeness
    const workExperienceConfidence = workExperience.length > 0
      ? Math.min(workExperience.length / 3, 1) * this.HIGH_CONFIDENCE
      : 0;

    // Education confidence based on presence and completeness
    const educationConfidence = education.length > 0
      ? Math.min(education.length / 2, 1) * this.HIGH_CONFIDENCE
      : 0;

    // Skills confidence based on number found
    const skillsConfidence = skills.length > 0
      ? Math.min(skills.length / 10, 1) * this.HIGH_CONFIDENCE
      : 0;

    return {
      personalInfo: personalInfoConfidence,
      workExperience: workExperienceConfidence,
      education: educationConfidence,
      skills: skillsConfidence
    };
  }

  /**
   * Extract name from text
   */
  private extractName(text: string): { firstName: string; lastName: string } | null {
    const lines = text.split('\n');

    // Try to find name in first few lines (most common location)
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i].trim();

      // Skip empty lines and lines that look like headers
      if (!line || line.length < 3 || /^(cv|resume|curriculum vitae)$/i.test(line)) {
        continue;
      }

      // Name patterns - look for 2-4 capitalized words
      const namePatterns = [
        // Standard "First Last" format
        /^([A-Z][a-z]+(?:[-']?[A-Z][a-z]+)*)\s+([A-Z][a-z]+(?:[-']?[A-Z][a-z]+)*)$/,
        // "First Middle Last" format - take first and last
        /^([A-Z][a-z]+(?:[-']?[A-Z][a-z]+)*)\s+(?:[A-Z][a-z]+\s+)?([A-Z][a-z]+(?:[-']?[A-Z][a-z]+)*)$/,
        // Handle names with prefixes like "Dr. John Smith"
        /^(?:Dr\.?|Mr\.?|Ms\.?|Mrs\.?|Prof\.?)\s+([A-Z][a-z]+(?:[-']?[A-Z][a-z]+)*)\s+([A-Z][a-z]+(?:[-']?[A-Z][a-z]+)*)$/i
      ];

      for (const pattern of namePatterns) {
        const match = line.match(pattern);
        if (match && match[1] && match[2]) {
          return {
            firstName: this.normalizeNamePart(match[1]),
            lastName: this.normalizeNamePart(match[2])
          };
        }
      }
    }

    return null;
  }

  /**
   * Extract email from text
   */
  private extractEmail(text: string): string | null {
    // Comprehensive email regex pattern
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const matches = text.match(emailPattern);

    if (matches && matches.length > 0) {
      // Return the first valid email found
      for (const email of matches) {
        if (this.validateEmail(email)) {
          return email.toLowerCase();
        }
      }
    }

    return null;
  }

  /**
   * Extract phone from text
   */
  private extractPhone(text: string): string | null {
    // Phone number patterns for various formats
    const phonePatterns = [
      // International format: +1 (555) 123-4567
      /\+\d{1,3}\s*\(?\d{3}\)?\s*\d{3}[-.\s]?\d{4}/g,
      // US format: (555) 123-4567
      /\(\d{3}\)\s*\d{3}[-.\s]?\d{4}/g,
      // US format: 555-123-4567
      /\d{3}[-.\s]\d{3}[-.\s]\d{4}/g,
      // Simple format: 5551234567
      /\b\d{10}\b/g,
      // International without country code: 555 123 4567
      /\b\d{3}\s+\d{3}\s+\d{4}\b/g
    ];

    for (const pattern of phonePatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        const phone = this.normalizePhone(matches[0]);
        if (phone && this.validatePhone(phone)) {
          return phone;
        }
      }
    }

    return null;
  }

  /**
   * Extract address from text
   */
  private extractAddress(text: string): PersonalInfo['address'] | null {
    const address: PersonalInfo['address'] = {};

    // Look for address patterns
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines
      if (!line) continue;

      // Look for postal/zip code patterns
      const postalCodeMatch = line.match(/\b(\d{5}(?:-\d{4})?|\d{6}|[A-Z]\d[A-Z]\s*\d[A-Z]\d)\b/);
      if (postalCodeMatch) {
        address.postCode = postalCodeMatch[1];

        // Try to extract city and state from the same line
        const cityStateMatch = line.match(/^(.+?),\s*([A-Z]{2}|\w+)\s+\d/);
        if (cityStateMatch) {
          address.city = cityStateMatch[1].trim();
          address.state = cityStateMatch[2].trim();
        }
      }

      // Look for street address patterns
      const streetMatch = line.match(/^\d+\s+.+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd|way|court|ct|place|pl)\.?$/i);
      if (streetMatch) {
        address.street = line;
      }

      // Look for country patterns (usually at the end)
      const countryMatch = line.match(/\b(United States|USA|US|Canada|UK|United Kingdom|Australia|Germany|France|Italy|Spain|Netherlands|Sweden|Norway|Denmark)\b/i);
      if (countryMatch) {
        address.country = countryMatch[1];
      }
    }

    // Return address only if we found at least one component
    return Object.keys(address).length > 0 ? address : null;
  }

  /**
   * Extract LinkedIn URL from text
   */
  private extractLinkedIn(text: string): string | null {
    const linkedinPatterns = [
      // Full LinkedIn URLs
      /https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+\/?/gi,
      // LinkedIn profile paths
      /linkedin\.com\/in\/[a-zA-Z0-9-]+\/?/gi,
      // Just the username part if mentioned with "LinkedIn:"
      /linkedin:?\s*([a-zA-Z0-9-]+)/gi
    ];

    for (const pattern of linkedinPatterns) {
      const match = text.match(pattern);
      if (match && match[0]) {
        let url = match[0];

        // Ensure it's a full URL
        if (!url.startsWith('http')) {
          if (url.startsWith('linkedin.com')) {
            url = 'https://' + url;
          } else {
            // It's just a username
            url = `https://linkedin.com/in/${url.replace(/linkedin:?\s*/i, '')}`;
          }
        }

        return url;
      }
    }

    return null;
  }

  /**
   * Extract portfolio URL from text
   */
  private extractPortfolio(text: string): string | null {
    const portfolioPatterns = [
      // Common portfolio domains
      /https?:\/\/(?:www\.)?(?:[a-zA-Z0-9-]+\.)?(?:github\.io|netlify\.app|vercel\.app|herokuapp\.com|portfolio\.com|behance\.net|dribbble\.com)\/[^\s]*/gi,
      // Personal domains that might be portfolios
      /https?:\/\/(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/gi,
      // Portfolio keywords followed by URL
      /(?:portfolio|website|site):?\s*(https?:\/\/[^\s]+)/gi
    ];

    for (const pattern of portfolioPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          // Skip LinkedIn and email addresses
          if (!match.includes('linkedin.com') && !match.includes('@')) {
            return match;
          }
        }
      }
    }

    return null;
  }

  /**
   * Normalize name parts (capitalize properly)
   */
  private normalizeNamePart(name: string): string {
    return name
      .split(/[-']/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(name.includes('-') ? '-' : "'");
  }

  /**
   * Validate email format
   */
  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  /**
   * Normalize phone number format
   */
  private normalizePhone(phone: string): string {
    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');

    // If it starts with +, keep it
    if (cleaned.startsWith('+')) {
      return cleaned;
    }

    // If it's 10 digits, assume US format
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    }

    // If it's 11 digits and starts with 1, assume US format
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+${cleaned}`;
    }

    return cleaned;
  }

  /**
   * Validate phone number
   */
  private validatePhone(phone: string): boolean {
    // Basic validation - should be at least 10 digits
    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly.length >= 10 && digitsOnly.length <= 15;
  }

  /**
   * Find section in text by headers
   */
  private findSection(text: string, headers: string[]): string | null {
    const lines = text.split('\n');
    let sectionStart = -1;
    let sectionEnd = -1;

    // Find the section header
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim().toLowerCase();

      for (const header of headers) {
        if (line.includes(header.toLowerCase()) && line.length < 50) {
          sectionStart = i + 1;
          break;
        }
      }

      if (sectionStart !== -1) break;
    }

    if (sectionStart === -1) return null;

    // Find the end of the section (next major header or end of text)
    const commonHeaders = [
      'education', 'skills', 'projects', 'certifications', 'awards',
      'references', 'languages', 'interests', 'hobbies', 'summary',
      'objective', 'profile', 'contact', 'personal'
    ];

    for (let i = sectionStart; i < lines.length; i++) {
      const line = lines[i].trim().toLowerCase();

      // Check if this line is a new section header
      if (line.length < 50 && commonHeaders.some(header =>
        line.includes(header) && !headers.some(h => line.includes(h.toLowerCase()))
      )) {
        sectionEnd = i;
        break;
      }
    }

    if (sectionEnd === -1) sectionEnd = lines.length;

    return lines.slice(sectionStart, sectionEnd).join('\n').trim();
  }

  /**
   * Split job entries from experience section
   */
  private splitJobEntries(text: string): string[] {
    const entries: string[] = [];
    const lines = text.split('\n');
    let currentEntry: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines
      if (!line) {
        if (currentEntry.length > 0) {
          currentEntry.push('');
        }
        continue;
      }

      // Check if this line starts a new job entry
      if (this.isJobEntryStart(line)) {
        // Save previous entry if it exists
        if (currentEntry.length > 0) {
          entries.push(currentEntry.join('\n').trim());
          currentEntry = [];
        }
      }

      currentEntry.push(line);
    }

    // Add the last entry
    if (currentEntry.length > 0) {
      entries.push(currentEntry.join('\n').trim());
    }

    return entries.filter(entry => entry.length > 10); // Filter out very short entries
  }

  /**
   * Check if a line starts a new job entry
   */
  private isJobEntryStart(line: string): boolean {
    // Look for patterns that typically start job entries
    const jobStartPatterns = [
      // Job title followed by company (with common separators)
      /^[A-Z][^,\n]+(,|\s+at\s+|\s+\|\s+|\s+-\s+)[A-Z][^,\n]+/,
      // Company name followed by job title
      /^[A-Z][^,\n]+\s+(,|\||-)\s*[A-Z][^,\n]+/,
      // Date patterns at the beginning
      /^\d{4}[-\s]\d{4}|^\w+\s+\d{4}/,
      // Common job title patterns
      /^(Senior|Junior|Lead|Principal|Director|Manager|Developer|Engineer|Analyst|Specialist|Coordinator|Assistant)/i
    ];

    return jobStartPatterns.some(pattern => pattern.test(line));
  }

  /**
   * Parse individual job entry
   */
  private parseJobEntry(entry: string): WorkExperience | null {
    const lines = entry.split('\n').map(line => line.trim()).filter(line => line);

    if (lines.length === 0) return null;

    const experience: Partial<WorkExperience> = {};

    // Parse the first line for job title and company
    const firstLine = lines[0];
    const titleCompanyMatch = this.parseJobTitleAndCompany(firstLine);

    if (titleCompanyMatch) {
      experience.jobTitle = titleCompanyMatch.jobTitle;
      experience.company = titleCompanyMatch.company;
    } else {
      // If we can't parse title and company, skip this entry
      return null;
    }

    // Look for dates in the entry
    const dateInfo = this.parseJobDates(entry);
    if (dateInfo) {
      experience.startDate = dateInfo.startDate;
      experience.endDate = dateInfo.endDate;
      experience.current = dateInfo.current;
    }

    // Extract job description and achievements
    const descriptionLines = lines.slice(1).filter(line =>
      !this.isDateLine(line) && line.length > 10
    );

    if (descriptionLines.length > 0) {
      experience.description = descriptionLines.join(' ').trim();
      experience.achievements = this.extractAchievements(descriptionLines);
    }

    // Validate that we have minimum required fields
    if (!experience.jobTitle || !experience.company) {
      return null;
    }

    return experience as WorkExperience;
  }

  /**
   * Parse job title and company from a line
   */
  private parseJobTitleAndCompany(line: string): { jobTitle: string; company: string } | null {
    const patterns = [
      // "Job Title at Company Name"
      /^(.+?)\s+at\s+(.+)$/,
      // "Job Title | Company Name"
      /^(.+?)\s*\|\s*(.+)$/,
      // "Job Title - Company Name"
      /^(.+?)\s*-\s*(.+)$/,
      // "Job Title, Company Name"
      /^(.+?),\s*(.+)$/,
      // "Company Name - Job Title" (reversed)
      /^([A-Z][^-]+)\s*-\s*(.+)$/
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match && match[1] && match[2]) {
        const part1 = match[1].trim();
        const part2 = match[2].trim();

        // Determine which is job title and which is company
        // Companies often have certain indicators
        const companyIndicators = ['Inc', 'LLC', 'Corp', 'Ltd', 'Company', 'Technologies', 'Solutions', 'Systems', 'Group'];
        const isCompanyFirst = companyIndicators.some(indicator =>
          part1.toLowerCase().includes(indicator.toLowerCase())
        );

        if (isCompanyFirst) {
          return { jobTitle: part2, company: part1 };
        } else {
          return { jobTitle: part1, company: part2 };
        }
      }
    }

    return null;
  }

  /**
   * Parse job dates from entry text
   */
  private parseJobDates(text: string): { startDate?: string; endDate?: string; current?: boolean } | null {
    const datePatterns = [
      // "Jan 2020 - Dec 2022"
      /(\w+\s+\d{4})\s*[-–]\s*(\w+\s+\d{4})/g,
      // "2020 - 2022"
      /(\d{4})\s*[-–]\s*(\d{4})/g,
      // "Jan 2020 - Present"
      /(\w+\s+\d{4})\s*[-–]\s*(Present|Current|Now)/gi,
      // "2020 - Present"
      /(\d{4})\s*[-–]\s*(Present|Current|Now)/gi,
      // "01/2020 - 12/2022"
      /(\d{1,2}\/\d{4})\s*[-–]\s*(\d{1,2}\/\d{4})/g,
      // "01/2020 - Present"
      /(\d{1,2}\/\d{4})\s*[-–]\s*(Present|Current|Now)/gi
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        const startDate = this.normalizeDateString(match[1]);
        const endDateRaw = match[2];
        const isCurrent = /present|current|now/i.test(endDateRaw);
        const endDate = isCurrent ? undefined : this.normalizeDateString(endDateRaw);

        return {
          startDate,
          endDate,
          current: isCurrent
        };
      }
    }

    return null;
  }

  /**
   * Check if a line contains date information
   */
  private isDateLine(line: string): boolean {
    const datePatterns = [
      /\d{4}[-–]\d{4}/,
      /\w+\s+\d{4}[-–]\w+\s+\d{4}/,
      /\d{1,2}\/\d{4}[-–]\d{1,2}\/\d{4}/,
      /(Present|Current|Now)/i
    ];

    return datePatterns.some(pattern => pattern.test(line));
  }

  /**
   * Extract achievements from description lines
   */
  private extractAchievements(lines: string[]): string[] {
    const achievements: string[] = [];

    for (const line of lines) {
      // Look for bullet points or achievement indicators
      if (line.match(/^[•·▪▫‣⁃]\s*/) ||
        line.match(/^[-*]\s*/) ||
        line.toLowerCase().includes('achieved') ||
        line.toLowerCase().includes('improved') ||
        line.toLowerCase().includes('increased') ||
        line.toLowerCase().includes('reduced') ||
        line.toLowerCase().includes('led') ||
        line.toLowerCase().includes('managed')) {
        achievements.push(line.replace(/^[•·▪▫‣⁃\-*]\s*/, '').trim());
      }
    }

    return achievements;
  }

  /**
   * Normalize date string to consistent format
   */
  private normalizeDateString(dateStr: string): string {
    // Handle month names
    const monthMap: { [key: string]: string } = {
      'jan': '01', 'january': '01',
      'feb': '02', 'february': '02',
      'mar': '03', 'march': '03',
      'apr': '04', 'april': '04',
      'may': '05',
      'jun': '06', 'june': '06',
      'jul': '07', 'july': '07',
      'aug': '08', 'august': '08',
      'sep': '09', 'september': '09',
      'oct': '10', 'october': '10',
      'nov': '11', 'november': '11',
      'dec': '12', 'december': '12'
    };

    // "Jan 2020" -> "01/2020"
    const monthYearMatch = dateStr.match(/(\w+)\s+(\d{4})/);
    if (monthYearMatch) {
      const month = monthMap[monthYearMatch[1].toLowerCase()];
      if (month) {
        return `${month}/${monthYearMatch[2]}`;
      }
    }

    // "01/2020" -> keep as is
    if (dateStr.match(/\d{1,2}\/\d{4}/)) {
      return dateStr;
    }

    // "2020" -> "01/2020"
    if (dateStr.match(/^\d{4}$/)) {
      return `01/${dateStr}`;
    }

    return dateStr;
  }

  /**
   * Sort experience chronologically (most recent first)
   */
  private sortExperienceChronologically(experiences: WorkExperience[]): WorkExperience[] {
    return experiences.sort((a, b) => {
      // Current jobs come first
      if (a.current && !b.current) return -1;
      if (!a.current && b.current) return 1;

      // Compare start dates
      const aDate = this.parseDate(a.startDate);
      const bDate = this.parseDate(b.startDate);

      if (aDate && bDate) {
        return bDate.getTime() - aDate.getTime(); // Most recent first
      }

      // If dates can't be parsed, maintain original order
      return 0;
    });
  }

  /**
   * Parse date string to Date object
   */
  private parseDate(dateStr?: string): Date | null {
    if (!dateStr) return null;

    // Handle "MM/YYYY" format
    const mmYyyyMatch = dateStr.match(/(\d{1,2})\/(\d{4})/);
    if (mmYyyyMatch) {
      return new Date(parseInt(mmYyyyMatch[2]), parseInt(mmYyyyMatch[1]) - 1);
    }

    // Handle "YYYY" format
    const yyyyMatch = dateStr.match(/^\d{4}$/);
    if (yyyyMatch) {
      return new Date(parseInt(dateStr), 0);
    }

    return null;
  }

  /**
   * Split education entries from education section
   */
  private splitEducationEntries(text: string): string[] {
    const entries: string[] = [];
    const lines = text.split('\n');
    let currentEntry: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines
      if (!line) {
        if (currentEntry.length > 0) {
          currentEntry.push('');
        }
        continue;
      }

      // Check if this line starts a new education entry
      if (this.isEducationEntryStart(line)) {
        // Save previous entry if it exists
        if (currentEntry.length > 0) {
          entries.push(currentEntry.join('\n').trim());
          currentEntry = [];
        }
      }

      currentEntry.push(line);
    }

    // Add the last entry
    if (currentEntry.length > 0) {
      entries.push(currentEntry.join('\n').trim());
    }

    return entries.filter(entry => entry.length > 5);
  }

  /**
   * Check if a line starts a new education entry
   */
  private isEducationEntryStart(line: string): boolean {
    const educationStartPatterns = [
      // Degree patterns
      /^(Bachelor|Master|PhD|Doctor|Associate|Certificate|Diploma)/i,
      // Common degree abbreviations
      /^(B\.?A\.?|B\.?S\.?|M\.?A\.?|M\.?S\.?|M\.?B\.?A\.?|Ph\.?D\.?|B\.?Sc\.?|M\.?Sc\.?)/,
      // Institution names (often capitalized)
      /^[A-Z][^,\n]+(University|College|Institute|School|Academy)/i,
      // Date patterns at the beginning
      /^\d{4}[-\s]\d{4}|^\w+\s+\d{4}/,
      // GPA patterns
      /GPA:?\s*\d\.\d/i
    ];

    return educationStartPatterns.some(pattern => pattern.test(line));
  }

  /**
   * Parse individual education entry
   */
  private parseEducationEntry(entry: string): Education | null {
    const lines = entry.split('\n').map(line => line.trim()).filter(line => line);

    if (lines.length === 0) return null;

    const education: Partial<Education> = {};

    // Parse degree and institution
    const degreeInstitution = this.parseDegreeAndInstitution(entry);
    if (degreeInstitution) {
      education.degree = degreeInstitution.degree;
      education.institution = degreeInstitution.institution;
      education.fieldOfStudy = degreeInstitution.fieldOfStudy;
    }

    // Parse graduation date
    const graduationDate = this.parseGraduationDate(entry);
    if (graduationDate) {
      education.graduationDate = graduationDate;
    }

    // Parse GPA
    const gpa = this.parseGPA(entry);
    if (gpa) {
      education.gpa = gpa;
    }

    // Parse honors/distinctions
    const honors = this.parseHonors(entry);
    if (honors) {
      education.honors = honors;
    }

    // Validate that we have minimum required fields
    if (!education.degree || !education.institution) {
      return null;
    }

    return education as Education;
  }

  /**
   * Parse degree and institution information
   */
  private parseDegreeAndInstitution(text: string): { degree: string; institution: string; fieldOfStudy?: string } | null {
    const patterns = [
      // "Bachelor of Science in Computer Science, University of Example"
      /^(Bachelor|Master|PhD|Doctor|Associate|Certificate|Diploma)\s+(?:of\s+)?([^,\n]+?)(?:,\s*in\s+([^,\n]+?))?,\s*([^,\n]+(?:University|College|Institute|School|Academy)[^,\n]*)/i,
      // "B.S. Computer Science, University of Example"
      /^(B\.?A\.?|B\.?S\.?|M\.?A\.?|M\.?S\.?|M\.?B\.?A\.?|Ph\.?D\.?|B\.?Sc\.?|M\.?Sc\.?)\s*(?:in\s+)?([^,\n]+?)?,\s*([^,\n]+(?:University|College|Institute|School|Academy)[^,\n]*)/i,
      // "University of Example - Bachelor of Science"
      /^([^,\n]+(?:University|College|Institute|School|Academy)[^,\n]*)\s*[-–]\s*(Bachelor|Master|PhD|Doctor|Associate|Certificate|Diploma)\s+(?:of\s+)?([^,\n]+)/i,
      // "University of Example, B.S. Computer Science"
      /^([^,\n]+(?:University|College|Institute|School|Academy)[^,\n]*),\s*(B\.?A\.?|B\.?S\.?|M\.?A\.?|M\.?S\.?|M\.?B\.?A\.?|Ph\.?D\.?|B\.?Sc\.?|M\.?Sc\.?)\s*(?:in\s+)?([^,\n]+)?/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        // Determine the order based on the pattern
        if (pattern.source.startsWith('^(Bachelor|Master|PhD')) {
          // Degree first format
          return {
            degree: this.normalizeDegree(match[1]),
            institution: match[4] || match[3],
            fieldOfStudy: match[3] && match[4] ? match[3] : match[2]
          };
        } else if (pattern.source.includes('University.*[-–]')) {
          // Institution first format
          return {
            degree: this.normalizeDegree(match[2]),
            institution: match[1],
            fieldOfStudy: match[3]
          };
        } else {
          // Other formats
          return {
            degree: this.normalizeDegree(match[2]),
            institution: match[1],
            fieldOfStudy: match[3]
          };
        }
      }
    }

    return null;
  }

  /**
   * Parse graduation date from education entry
   */
  private parseGraduationDate(text: string): string | null {
    const datePatterns = [
      // "Graduated: May 2020"
      /Graduated:?\s*(\w+\s+\d{4})/i,
      // "Class of 2020"
      /Class\s+of\s+(\d{4})/i,
      // "May 2020" (standalone)
      /(\w+\s+\d{4})/,
      // "2020" (year only)
      /(\d{4})/
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        return this.normalizeDateString(match[1]);
      }
    }

    return null;
  }

  /**
   * Parse GPA from education entry
   */
  private parseGPA(text: string): string | null {
    const gpaPatterns = [
      // "GPA: 3.8/4.0"
      /GPA:?\s*(\d\.\d+)(?:\/\d\.\d+)?/i,
      // "3.8 GPA"
      /(\d\.\d+)\s+GPA/i,
      // "Cumulative GPA: 3.8"
      /(?:Cumulative|Overall)\s+GPA:?\s*(\d\.\d+)/i
    ];

    for (const pattern of gpaPatterns) {
      const match = text.match(pattern);
      if (match) {
        const gpa = parseFloat(match[1]);
        if (gpa >= 0 && gpa <= 4.0) {
          return match[1];
        }
      }
    }

    return null;
  }

  /**
   * Parse honors and distinctions
   */
  private parseHonors(text: string): string | null {
    const honorPatterns = [
      // Common Latin honors
      /(Summa Cum Laude|Magna Cum Laude|Cum Laude)/i,
      // Other honors
      /(With Honors?|With Distinction|Dean'?s List|Honor Roll|Phi Beta Kappa|Valedictorian|Salutatorian)/i,
      // Academic achievements
      /(Academic Excellence|Outstanding Student|Merit Scholar)/i
    ];

    for (const pattern of honorPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Normalize degree names to standard format
   */
  private normalizeDegree(degree: string): string {
    const degreeMap: { [key: string]: string } = {
      'b.a.': 'Bachelor of Arts',
      'ba': 'Bachelor of Arts',
      'b.s.': 'Bachelor of Science',
      'bs': 'Bachelor of Science',
      'b.sc.': 'Bachelor of Science',
      'bsc': 'Bachelor of Science',
      'm.a.': 'Master of Arts',
      'ma': 'Master of Arts',
      'm.s.': 'Master of Science',
      'ms': 'Master of Science',
      'm.sc.': 'Master of Science',
      'msc': 'Master of Science',
      'm.b.a.': 'Master of Business Administration',
      'mba': 'Master of Business Administration',
      'ph.d.': 'Doctor of Philosophy',
      'phd': 'Doctor of Philosophy',
      'bachelor': 'Bachelor',
      'master': 'Master',
      'masters': 'Master',
      'doctorate': 'Doctor',
      'doctoral': 'Doctor'
    };

    const normalized = degreeMap[degree.toLowerCase().replace(/\s+/g, '')];
    return normalized || degree;
  }

  /**
   * Parse skills section
   */
  private parseSkillsSection(text: string): string[] {
    const skills = new Set<string>();
    const lines = text.split('\n');

    for (const line of lines) {
      const lineSkills = this.extractSkillsFromLine(line);
      lineSkills.forEach(skill => skills.add(skill));
    }

    return Array.from(skills);
  }

  /**
   * Extract skills from experience descriptions
   */
  private extractSkillsFromExperience(text: string): string[] {
    const skills = new Set<string>();

    // Find experience section
    const experienceSection = this.findSection(text, [
      'experience', 'employment', 'work history', 'professional experience'
    ]);

    if (experienceSection) {
      const lines = experienceSection.split('\n');

      for (const line of lines) {
        const lineSkills = this.extractSkillsFromLine(line);
        lineSkills.forEach(skill => skills.add(skill));
      }
    }

    return Array.from(skills);
  }

  /**
   * Extract skills from summary section
   */
  private extractSkillsFromSummary(text: string): string[] {
    const skills = new Set<string>();

    // Find summary/objective section
    const summarySection = this.findSection(text, [
      'summary', 'objective', 'profile', 'about', 'overview', 'professional summary'
    ]);

    if (summarySection) {
      const lines = summarySection.split('\n');

      for (const line of lines) {
        const lineSkills = this.extractSkillsFromLine(line);
        lineSkills.forEach(skill => skills.add(skill));
      }
    }

    return Array.from(skills);
  }

  /**
   * Extract skills from a single line of text
   */
  private extractSkillsFromLine(line: string): string[] {
    const skills: string[] = [];
    const cleanLine = line.trim();

    if (!cleanLine) return skills;

    // Check for comma-separated skills
    if (this.isSkillsList(cleanLine)) {
      const commaSeparated = cleanLine
        .split(/[,;|]/)
        .map(skill => skill.trim())
        .filter(skill => skill.length > 1 && skill.length < 50);

      for (const skill of commaSeparated) {
        const normalizedSkill = this.normalizeSkill(skill);
        if (normalizedSkill && this.isValidSkill(normalizedSkill)) {
          skills.push(normalizedSkill);
        }
      }
    }

    // Extract known technical skills
    const technicalSkills = this.extractTechnicalSkills(cleanLine);
    skills.push(...technicalSkills);

    // Extract programming languages
    const programmingLanguages = this.extractProgrammingLanguages(cleanLine);
    skills.push(...programmingLanguages);

    // Extract frameworks and libraries
    const frameworks = this.extractFrameworks(cleanLine);
    skills.push(...frameworks);

    // Extract tools and software
    const tools = this.extractTools(cleanLine);
    skills.push(...tools);

    return [...new Set(skills)]; // Remove duplicates
  }

  /**
   * Check if a line contains a list of skills
   */
  private isSkillsList(line: string): boolean {
    // Look for patterns that indicate skill lists
    const skillListIndicators = [
      /^[•·▪▫‣⁃\-*]\s*/, // Bullet points
      /,.*,/, // Multiple commas
      /;.*;/, // Multiple semicolons
      /\|.*\|/, // Multiple pipes
      /skills?:?/i, // Contains "skill" or "skills"
      /technologies?:?/i, // Contains "technology" or "technologies"
      /tools?:?/i, // Contains "tool" or "tools"
      /languages?:?/i // Contains "language" or "languages"
    ];

    return skillListIndicators.some(pattern => pattern.test(line));
  }

  /**
   * Extract technical skills using predefined patterns
   */
  private extractTechnicalSkills(text: string): string[] {
    const technicalSkills = [
      // Web Technologies
      'HTML', 'CSS', 'JavaScript', 'TypeScript', 'PHP', 'ASP.NET', 'JSP',
      // Databases
      'MySQL', 'PostgreSQL', 'MongoDB', 'SQLite', 'Oracle', 'SQL Server', 'Redis',
      // Cloud Platforms
      'AWS', 'Azure', 'Google Cloud', 'GCP', 'Heroku', 'DigitalOcean',
      // DevOps
      'Docker', 'Kubernetes', 'Jenkins', 'Git', 'GitHub', 'GitLab', 'CI/CD',
      // Operating Systems
      'Linux', 'Windows', 'macOS', 'Ubuntu', 'CentOS',
      // Methodologies
      'Agile', 'Scrum', 'Kanban', 'DevOps', 'TDD', 'BDD'
    ];

    const foundSkills: string[] = [];

    for (const skill of technicalSkills) {
      if (text.toLowerCase().includes(skill.toLowerCase())) {
        foundSkills.push(skill);
      }
    }

    return foundSkills;
  }

  /**
   * Extract programming languages
   */
  private extractProgrammingLanguages(text: string): string[] {
    const programmingLanguages = [
      'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'C',
      'Ruby', 'PHP', 'Swift', 'Kotlin', 'Go', 'Rust', 'Scala',
      'R', 'MATLAB', 'Perl', 'Objective-C', 'Dart', 'Elixir',
      'Haskell', 'Clojure', 'F#', 'VB.NET', 'PowerShell', 'Bash'
    ];

    const foundLanguages: string[] = [];

    for (const language of programmingLanguages) {
      // Use word boundaries to avoid partial matches
      const regex = new RegExp(`\\b${language.toLowerCase()}\\b`, 'i');
      if (regex.test(text)) {
        foundLanguages.push(language);
      }
    }

    return foundLanguages;
  }

  /**
   * Extract frameworks and libraries
   */
  private extractFrameworks(text: string): string[] {
    const frameworks = [
      // JavaScript Frameworks
      'React', 'Angular', 'Vue.js', 'Node.js', 'Express', 'Next.js', 'Nuxt.js',
      'jQuery', 'Bootstrap', 'Tailwind CSS', 'Material-UI', 'Ant Design',
      // Python Frameworks
      'Django', 'Flask', 'FastAPI', 'Pyramid', 'Tornado',
      // Java Frameworks
      'Spring', 'Spring Boot', 'Hibernate', 'Struts',
      // .NET Frameworks
      'ASP.NET', '.NET Core', 'Entity Framework', 'Blazor',
      // Mobile Frameworks
      'React Native', 'Flutter', 'Xamarin', 'Ionic',
      // Testing Frameworks
      'Jest', 'Mocha', 'Jasmine', 'Cypress', 'Selenium', 'JUnit', 'pytest'
    ];

    const foundFrameworks: string[] = [];

    for (const framework of frameworks) {
      const regex = new RegExp(`\\b${framework.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(text)) {
        foundFrameworks.push(framework);
      }
    }

    return foundFrameworks;
  }

  /**
   * Extract tools and software
   */
  private extractTools(text: string): string[] {
    const tools = [
      // Development Tools
      'Visual Studio Code', 'VS Code', 'IntelliJ IDEA', 'Eclipse', 'Sublime Text',
      'Atom', 'Vim', 'Emacs', 'WebStorm', 'PyCharm',
      // Design Tools
      'Photoshop', 'Illustrator', 'Figma', 'Sketch', 'Adobe XD', 'InVision',
      // Project Management
      'Jira', 'Trello', 'Asana', 'Monday.com', 'Notion', 'Confluence',
      // Communication
      'Slack', 'Microsoft Teams', 'Discord', 'Zoom',
      // Version Control
      'Git', 'SVN', 'Mercurial',
      // Databases
      'phpMyAdmin', 'MongoDB Compass', 'Robo 3T', 'DBeaver'
    ];

    const foundTools: string[] = [];

    for (const tool of tools) {
      const regex = new RegExp(`\\b${tool.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(text)) {
        foundTools.push(tool);
      }
    }

    return foundTools;
  }

  /**
   * Normalize skill name
   */
  private normalizeSkill(skill: string): string {
    return skill
      .replace(/^[•·▪▫‣⁃\-*]\s*/, '') // Remove bullet points
      .replace(/[()[\]{}]/g, '') // Remove brackets
      .trim()
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  /**
   * Validate if a string is a valid skill
   */
  private isValidSkill(skill: string): boolean {
    // Filter out common non-skills
    const invalidSkills = [
      'and', 'or', 'with', 'using', 'including', 'such as', 'like',
      'experience', 'knowledge', 'familiar', 'proficient', 'expert',
      'years', 'year', 'months', 'month', 'level', 'basic', 'advanced',
      'strong', 'excellent', 'good', 'solid', 'extensive', 'deep'
    ];

    const lowerSkill = skill.toLowerCase();

    // Check if it's in the invalid list
    if (invalidSkills.includes(lowerSkill)) {
      return false;
    }

    // Check minimum and maximum length
    if (skill.length < 2 || skill.length > 50) {
      return false;
    }

    // Check if it contains mostly letters (allow some numbers and special chars)
    const letterCount = (skill.match(/[a-zA-Z]/g) || []).length;
    const totalLength = skill.length;

    if (letterCount / totalLength < 0.5) {
      return false;
    }

    return true;
  }
}

// Export singleton instance
export const cvParser = new CVParser();