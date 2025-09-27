import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { FallbackParser } from './fallbackParser';

// Set up PDF.js worker with a more reliable CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

export interface ParsedResumeData {
  name?: string;
  email?: string;
  phone?: string;
  rawText: string;
  skills?: string[];
  experience?: string;
  education?: string;
}

export class ResumeParser {
  static async parseFile(file: File): Promise<ParsedResumeData> {
    console.log('Parsing file:', file.name, 'Type:', file.type, 'Size:', file.size);
    
    let rawText = '';

    try {
      // Check file type by extension as well as MIME type
      const fileName = file.name.toLowerCase();
      const isPDF = file.type === 'application/pdf' || fileName.endsWith('.pdf');
      const isDOCX = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx');

      if (isPDF) {
        console.log('Parsing as PDF...');
        try {
          rawText = await this.parsePDF(file);
        } catch (pdfError) {
          console.warn('PDF parsing failed, trying fallback method:', pdfError);
          // Try fallback method
          try {
            rawText = await FallbackParser.parseAsText(file);
            console.log('Fallback parsing succeeded');
          } catch (fallbackError) {
            console.error('Both PDF parsing methods failed:', fallbackError);
            throw new Error('Unable to parse PDF file. Please try converting it to a different format or ensure it\'s not password-protected.');
          }
        }
      } else if (isDOCX) {
        console.log('Parsing as DOCX...');
        rawText = await this.parseDOCX(file);
      } else {
        throw new Error(`Unsupported file type: ${file.type}. Please upload a PDF or DOCX file.`);
      }

      console.log('Extracted text length:', rawText.length);
      if (rawText.length < 10) {
        throw new Error('The file appears to be empty or corrupted. Please try a different file.');
      }

      return this.extractContactInfo(rawText);
    } catch (error) {
      console.error('Error parsing resume:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to parse resume. Please check the file format and try again.');
    }
  }

  private static async parsePDF(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      console.log('PDF ArrayBuffer size:', arrayBuffer.byteLength);
      
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
        cMapPacked: true,
      });
      
      const pdf = await loadingTask.promise;
      console.log('PDF loaded, pages:', pdf.numPages);
      
      let text = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        try {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => {
              if (item.str) {
                return item.str;
              }
              return '';
            })
            .join(' ');
          text += pageText + '\n';
          console.log(`Page ${i} text length:`, pageText.length);
        } catch (pageError) {
          console.warn(`Error parsing page ${i}:`, pageError);
          // Continue with other pages
        }
      }

      return text.trim();
    } catch (error) {
      console.error('PDF parsing error:', error);
      throw new Error('Failed to parse PDF. The file might be corrupted or password-protected.');
    }
  }

  private static async parseDOCX(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      console.log('DOCX ArrayBuffer size:', arrayBuffer.byteLength);
      
      const result = await mammoth.extractRawText({ arrayBuffer });
      console.log('DOCX text length:', result.value.length);
      
      if (result.messages && result.messages.length > 0) {
        console.warn('DOCX parsing messages:', result.messages);
      }
      
      return result.value;
    } catch (error) {
      console.error('DOCX parsing error:', error);
      throw new Error('Failed to parse DOCX file. The file might be corrupted.');
    }
  }

  private static extractContactInfo(text: string): ParsedResumeData {
    const result: ParsedResumeData = { rawText: text };

    // Extract email
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emailMatch = text.match(emailRegex);
    if (emailMatch) {
      result.email = emailMatch[0];
    }

    // Extract phone number
    const phoneRegex = /(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g;
    const phoneMatch = text.match(phoneRegex);
    if (phoneMatch) {
      result.phone = phoneMatch[0];
    }

    // Extract name (this is more complex and might need refinement)
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    
    // Look for name in first few lines
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i].trim();
      
      // Skip lines that look like contact info or common resume headers
      if (
        line.includes('@') || 
        line.match(/^\+?[\d\s\-\(\)]+$/) ||
        line.toLowerCase().includes('resume') ||
        line.toLowerCase().includes('curriculum') ||
        line.length < 2 ||
        line.length > 50
      ) {
        continue;
      }

      // Look for lines that might be names (2-4 words, proper case)
      const words = line.split(/\s+/);
      if (words.length >= 2 && words.length <= 4) {
        const isLikelyName = words.every(word => 
          word.length > 1 && 
          word[0] === word[0].toUpperCase() &&
          /^[A-Za-z\s\-'\.]+$/.test(word)
        );
        
        if (isLikelyName) {
          result.name = line;
          break;
        }
      }
    }

    // Extract skills
    result.skills = this.extractSkills(text);
    
    // Extract experience summary
    result.experience = this.extractExperience(text);
    
    // Extract education
    result.education = this.extractEducation(text);

    return result;
  }

  private static extractSkills(text: string): string[] {
    const skillKeywords = [
      'react', 'javascript', 'typescript', 'node.js', 'nodejs', 'express', 'mongodb', 'mysql',
      'postgresql', 'python', 'java', 'html', 'css', 'sass', 'redux', 'vue', 'angular',
      'docker', 'kubernetes', 'aws', 'azure', 'git', 'github', 'rest', 'api', 'graphql',
      'firebase', 'next.js', 'nuxt', 'webpack', 'vite', 'tailwind', 'bootstrap'
    ];
    
    const foundSkills: string[] = [];
    const lowerText = text.toLowerCase();
    
    skillKeywords.forEach(skill => {
      if (lowerText.includes(skill)) {
        foundSkills.push(skill);
      }
    });
    
    return [...new Set(foundSkills)]; // Remove duplicates
  }

  private static extractExperience(text: string): string {
    const experienceKeywords = ['experience', 'work', 'employment', 'career', 'professional'];
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (experienceKeywords.some(keyword => line.includes(keyword))) {
        // Get next few lines as experience summary
        const experienceLines = lines.slice(i, i + 5).join(' ');
        return experienceLines.substring(0, 300);
      }
    }
    
    return '';
  }

  private static extractEducation(text: string): string {
    const educationKeywords = ['education', 'degree', 'university', 'college', 'bachelor', 'master', 'phd'];
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (educationKeywords.some(keyword => line.includes(keyword))) {
        // Get next few lines as education summary
        const educationLines = lines.slice(i, i + 3).join(' ');
        return educationLines.substring(0, 200);
      }
    }
    
    return '';
  }
}