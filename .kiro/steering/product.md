---
inclusion: always
---

# Product Overview

Job Application Autofill is a Chrome extension that automatically fills job application forms with stored user profile data. The extension helps job seekers streamline their application process by intelligently detecting and populating form fields.

## Core Features
- **Profile Management**: Store personal information, work experience, education, and skills
- **CV/Resume Parsing**: Upload and extract data from PDF and DOCX files using `mammoth` and `pdf-parse`
- **Smart Form Detection**: Automatically identify job application forms across websites
- **Selective Autofill**: Toggle autofill functionality on/off per session
- **Cross-tab Coordination**: Maintain consistent state across multiple browser tabs

## Architecture Principles
- **Privacy First**: All data stored locally using Chrome storage APIs, no external servers
- **Non-intrusive**: Only activate on user interaction, respect website functionality
- **Fail Gracefully**: Continue working even if some form fields can't be detected
- **Performance Conscious**: Minimize content script impact on page load times

## User Experience Guidelines
- **Minimal Setup**: Quick profile creation with optional CV upload for enhanced data
- **Visual Feedback**: Clear status indicators for autofill state and form detection
- **User Control**: Always allow manual override and editing of filled data
- **Accessibility**: Support keyboard navigation and screen readers in popup interface

## Technical Constraints
- **Manifest V3**: Use service workers, no persistent background pages
- **Content Security Policy**: Handle CSP restrictions on target websites
- **Cross-origin Limitations**: Work within browser security model
- **File Processing**: Handle large CV files efficiently in browser environment

## Development Rules
- **Data Validation**: Always validate form field matches before filling
- **Error Handling**: Log errors for debugging but never break page functionality
- **Storage Efficiency**: Minimize storage usage, implement data cleanup
- **Testing**: Test across major job sites (LinkedIn, Indeed, company career pages)
- **Permissions**: Request minimal necessary permissions, explain usage to users