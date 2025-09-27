import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI with error handling
let genAI: GoogleGenerativeAI;
let model: any;

try {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('⚠️ No Gemini API key found in environment variables');
  } else {
    console.log('✅ Gemini API key loaded, length:', apiKey.length);
  }
  
  genAI = new GoogleGenerativeAI(apiKey || '');
  
  // Try the latest model first, fallback to stable versions
  try {
    model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    console.log('📱 Using model: gemini-2.0-flash-exp');
  } catch (modelError) {
    console.warn('⚠️ gemini-2.0-flash-exp not available, trying gemini-1.5-flash...');
    try {
      model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      console.log('📱 Using model: gemini-1.5-flash');
    } catch (fallbackError) {
      console.warn('⚠️ gemini-1.5-flash not available, using gemini-pro...');
      model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      console.log('📱 Using model: gemini-pro');
    }
  }
} catch (initError) {
  console.error('❌ Failed to initialize Gemini AI:', initError);
}

export interface QuestionRequest {
  difficulty: 'easy' | 'medium' | 'hard';
  previousQuestions: string[];
  candidateProfile: {
    name: string;
    experience?: string;
    resumeText?: string;
  };
}

export interface EvaluationRequest {
  question: string;
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeSpent: number;
  maxTime: number;
}

// Quick test function for browser console
(window as any).testGeminiAPI = async () => {
  try {
    console.log('🧪 Quick Gemini API test...');
    const testModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const result = await testModel.generateContent('Say "Hello World" and nothing else.');
    const response = await result.response;
    const text = response.text();
    console.log('✅ Success:', text);
    return { success: true, response: text };
  } catch (error) {
    console.error('❌ Failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export class GeminiService {
  private static instance: GeminiService;
  private speechSynthesis: SpeechSynthesis;
  private speechRecognition: any;

  constructor() {
    this.speechSynthesis = window.speechSynthesis;
    this.initializeSpeechRecognition();
    this.initializeVoices();
  }

  private initializeVoices() {
    // Ensure voices are loaded
    if (this.speechSynthesis) {
      // Load voices if not already loaded
      if (this.speechSynthesis.getVoices().length === 0) {
        this.speechSynthesis.addEventListener('voiceschanged', () => {
          console.log('Voices loaded:', this.speechSynthesis.getVoices().length);
        });
      }
    }
  }

  static getInstance(): GeminiService {
    if (!GeminiService.instance) {
      GeminiService.instance = new GeminiService();
    }
    return GeminiService.instance;
  }

  private initializeSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      this.speechRecognition = new SpeechRecognition();
      
      // Optimized settings for fast, clear, and accurate recognition
      this.speechRecognition.continuous = true;
      this.speechRecognition.interimResults = true;
      this.speechRecognition.lang = 'en-IN';           // Indian English for better accent recognition
      this.speechRecognition.maxAlternatives = 3;      // More alternatives for better accuracy
      this.speechRecognition.serviceURI = null;        // Use default service for best performance
      
      // Enhanced recognition settings (if supported)
      if ('webkitSpeechRecognition' in window) {
        this.speechRecognition.webkitGrammarList = null;
        this.speechRecognition.webkitServiceURI = null;
      }
    }
  }

  async generateQuestion(request: QuestionRequest): Promise<string> {
    const resumeSkills = this.extractSkillsFromResume(request.candidateProfile.resumeText || '');
    const experienceLevel = this.analyzeExperienceLevel(request.candidateProfile.resumeText || '');
    const questionNumber = request.previousQuestions.length + 1;
    
    const resumeProjects = this.extractProjectsFromResume(request.candidateProfile.resumeText || '');
    const resumeCompanies = this.extractCompaniesFromResume(request.candidateProfile.resumeText || '');
    
    const prompt = `
You are conducting a technical interview. Generate a UNIQUE ${request.difficulty} level question based on the candidate's actual resume.

CANDIDATE PROFILE:
Name: ${request.candidateProfile.name}
Experience Level: ${experienceLevel}
Technical Skills: ${resumeSkills.slice(0, 8).join(', ')}
${resumeProjects.length > 0 ? `Recent Projects: ${resumeProjects.join(', ')}` : ''}
${resumeCompanies.length > 0 ? `Work Experience: ${resumeCompanies.join(', ')}` : ''}

RESUME CONTEXT:
${request.candidateProfile.resumeText ? request.candidateProfile.resumeText.substring(0, 500) + '...' : 'No detailed resume text available'}

PREVIOUS QUESTIONS (AVOID SIMILAR TOPICS):
${request.previousQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

QUESTION ${questionNumber}/6 REQUIREMENTS:
Difficulty: ${request.difficulty.toUpperCase()}
Focus Area: ${this.getQuestionRequirements(request.difficulty, questionNumber, resumeSkills)}

INSTRUCTIONS:
Generate ONE unique, personalized question that:
1. Tests ${request.difficulty}-level skills appropriate for their ${experienceLevel} experience
2. References technologies they actually know: ${resumeSkills.slice(0, 3).join(', ')}
3. Is completely different from previous questions (avoid similar topics/keywords)
4. Is practical and scenario-based, not theoretical
5. Could relate to their project experience if mentioned in resume
6. Matches their experience level (don't ask senior questions to juniors)

QUESTION STYLE:
- Start with context: "I see you have experience with [technology]..." or "Based on your work at [company]..."
- Make it conversational and personalized
- Focus on real-world application
- Encourage detailed explanations

Return ONLY the question text, no additional formatting.`;

    try {
      const result = await model.generateContent(prompt);
      const question = result.response.text().trim();
      
      if (this.isQuestionTooSimilar(question, request.previousQuestions)) {
        return this.getUniqueQuestion(request.difficulty, request.previousQuestions, resumeSkills);
      }
      
      return question;
    } catch (error) {
      return this.getUniqueQuestion(request.difficulty, request.previousQuestions, resumeSkills);
    }
  }

  private analyzeExperienceLevel(resumeText: string): string {
    const text = resumeText.toLowerCase();
    
    // Extract years of experience patterns
    const yearPatterns = [
      /(\d+)\+?\s*years?\s*of\s*experience/gi,
      /(\d+)\+?\s*years?\s*experience/gi,
      /experience.*?(\d+)\+?\s*years?/gi,
      /(\d+)\+?\s*yrs/gi
    ];
    
    const years: number[] = [];
    yearPatterns.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const year = parseInt(match[1]);
        if (year && year <= 20) { // Reasonable upper limit
          years.push(year);
        }
      }
    });
    
    // Get the highest years mentioned
    const maxYears = years.length > 0 ? Math.max(...years) : 0;
    
    // Analyze role levels and responsibilities
    const seniorKeywords = [
      'senior', 'lead', 'architect', 'principal', 'staff', 'director', 'manager',
      'team lead', 'tech lead', 'technical lead', 'head of', 'vp', 'cto', 'cio'
    ];
    
    const midKeywords = [
      'mid-level', 'intermediate', 'developer ii', 'engineer ii', 'associate',
      'full stack', 'fullstack', 'backend', 'frontend'
    ];
    
    const juniorKeywords = [
      'junior', 'entry', 'trainee', 'intern', 'graduate', 'fresher', 'beginner',
      'developer i', 'engineer i', 'associate developer'
    ];
    
    // Check for leadership and mentoring experience
    const leadershipKeywords = [
      'mentored', 'managed', 'supervised', 'coordinated', 'guided', 'trained',
      'onboarded', 'code review', 'architecture decisions', 'technical decisions'
    ];
    
    const hasLeadership = leadershipKeywords.some(keyword => text.includes(keyword));
    const hasSeniorRole = seniorKeywords.some(keyword => text.includes(keyword));
    const hasMidRole = midKeywords.some(keyword => text.includes(keyword));
    const hasJuniorRole = juniorKeywords.some(keyword => text.includes(keyword));
    
    // Determine experience level based on multiple factors
    if (maxYears >= 7 || hasSeniorRole || hasLeadership) {
      return `Senior (${maxYears > 0 ? maxYears + '+' : '7+'} years)`;
    } else if (maxYears >= 3 || hasMidRole) {
      return `Mid-level (${maxYears > 0 ? maxYears : '3-6'} years)`;
    } else if (hasJuniorRole || maxYears <= 2) {
      return `Junior (${maxYears > 0 ? maxYears : '0-2'} years)`;
    } else {
      // Default based on years if no clear role indicators
      if (maxYears >= 5) return `Senior (${maxYears}+ years)`;
      if (maxYears >= 2) return `Mid-level (${maxYears} years)`;
      return 'Entry-level';
    }
  }



  private isQuestionTooSimilar(newQuestion: string, previousQuestions: string[]): boolean {
    const newWords = newQuestion.toLowerCase().split(/\W+/).filter(w => w.length > 4);
    
    return previousQuestions.some(prevQ => {
      const prevWords = prevQ.toLowerCase().split(/\W+/).filter(w => w.length > 4);
      const commonWords = newWords.filter(word => prevWords.includes(word));
      return commonWords.length > 1; // Stricter similarity check
    });
  }

  async evaluateAnswer(request: EvaluationRequest): Promise<{ score: number; feedback: string }> {
    const timeEfficiency = (request.maxTime - request.timeSpent) / request.maxTime;
    
    const prompt = `
      You are a senior technical interviewer evaluating a candidate's response. Be professional but constructive.
      
      INTERVIEW CONTEXT:
      Question Difficulty: ${request.difficulty.toUpperCase()}
      Question: "${request.question}"
      Candidate's Answer: "${request.answer}"
      Time Management: Used ${request.timeSpent}s out of ${request.maxTime}s available
      
      EVALUATION CRITERIA (Rate 0-10):
      
      1. TECHNICAL ACCURACY (40% weight):
         - Correctness of technical concepts mentioned
         - Proper understanding of technologies/frameworks
         - Accuracy of implementation details
      
      2. COMPLETENESS & DEPTH (30% weight):
         - How thoroughly they addressed the question
         - Depth of explanation appropriate for ${request.difficulty} level
         - Coverage of important aspects
      
      3. COMMUNICATION & CLARITY (20% weight):
         - Clear explanation of concepts
         - Logical flow of thoughts
         - Professional communication style
      
      4. PRACTICAL APPLICATION (10% weight):
         - Real-world applicability
         - Best practices mentioned
         - Problem-solving approach
      
      SCORING GUIDELINES:
      - 9-10: Exceptional answer, senior-level understanding
      - 7-8: Strong answer with good technical depth
      - 5-6: Adequate answer, meets basic requirements
      - 3-4: Weak answer, missing key concepts
      - 1-2: Poor answer, significant gaps
      - 0: No meaningful response
      
      TIME BONUS/PENALTY:
      - Efficient use of time (under 80%): +0.5 points
      - Rushed answer (under 30% time): -0.5 points
      
      Provide evaluation in this EXACT format:
      Score: [number between 0-10]
      Feedback: [Professional, constructive feedback in 2-3 sentences that a senior developer would give]
      
      Be honest but encouraging. Focus on what they did well and one key area for improvement.
    `;

    try {
      console.log('🤖 Starting Gemini AI evaluation...');
      console.log('API Key present:', !!import.meta.env.VITE_GEMINI_API_KEY);
      console.log('Question:', request.question.substring(0, 100) + '...');
      console.log('Answer length:', request.answer.length);
      
      const result = await model.generateContent(prompt);
      console.log('✅ Gemini API call successful');
      
      const response = await result.response;
      const text = response.text();
      console.log('📝 Raw AI response:', text.substring(0, 200) + '...');
      
      const scoreMatch = text.match(/Score:\s*(\d+(?:\.\d+)?)/i);
      const feedbackMatch = text.match(/Feedback:\s*(.+)/is);
      
      let score = scoreMatch ? parseFloat(scoreMatch[1]) : 5;
      console.log('🎯 Extracted score:', score);
      
      // Apply time efficiency bonus/penalty
      if (timeEfficiency > 0.2 && timeEfficiency < 0.8) {
        score += 0.5; // Efficient time use
        console.log('⚡ Time efficiency bonus applied');
      } else if (timeEfficiency > 0.7) {
        score -= 0.5; // Too rushed
        console.log('⏰ Time penalty applied');
      }
      
      // Ensure score is within bounds
      score = Math.max(0, Math.min(10, score));
      
      const feedback = feedbackMatch ? feedbackMatch[1].trim() : 
        this.generateFallbackFeedback(request.answer, score);
      
      console.log('✅ Final evaluation:', { score, feedback: feedback.substring(0, 100) + '...' });
      return { score: Math.round(score * 10) / 10, feedback };
      
    } catch (error) {
      console.error('❌ Gemini AI evaluation error:', error);
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      
      // Check if it's an API key issue
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      console.log('API Key check:', { 
        hasKey: !!apiKey, 
        keyLength: apiKey?.length || 0,
        keyStart: apiKey?.substring(0, 10) || 'none'
      });
      
      if (!apiKey || apiKey === 'your_real_gemini_api_key_here') {
        throw new Error('Invalid API key. Please configure a valid Gemini API key.');
      }
      
      // For other errors, provide more detailed debugging info
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log('Detailed error analysis:', errorMessage);
      
      // Instead of throwing immediately, let's try a simpler prompt
      console.log('🔄 Attempting simplified evaluation...');
      try {
        const simplePrompt = `Rate this technical interview answer from 0-10 and provide brief feedback.

Question: ${request.question}
Answer: ${request.answer}

Format:
Score: [0-10]
Feedback: [Brief feedback]`;

        const simpleResult = await model.generateContent(simplePrompt);
        const simpleResponse = await simpleResult.response;
        const simpleText = simpleResponse.text();
        
        const simpleScoreMatch = simpleText.match(/Score:\s*(\d+(?:\.\d+)?)/i);
        const simpleFeedbackMatch = simpleText.match(/Feedback:\s*(.+)/is);
        
        const simpleScore = simpleScoreMatch ? parseFloat(simpleScoreMatch[1]) : 5;
        const simpleFeedback = simpleFeedbackMatch ? simpleFeedbackMatch[1].trim() : 
          'Thank you for your answer. Your response has been evaluated.';
        
        console.log('✅ Simplified evaluation successful:', { score: simpleScore, feedback: simpleFeedback.substring(0, 50) + '...' });
        return { score: Math.max(0, Math.min(10, simpleScore)), feedback: simpleFeedback };
        
      } catch (simpleError) {
        console.error('❌ Simplified evaluation also failed:', simpleError);
        
        // Final error handling with specific error types
        if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('invalid api key')) {
          throw new Error('Invalid Gemini API key. Please check your API key configuration.');
        } else if (errorMessage.includes('RATE_LIMIT_EXCEEDED') || errorMessage.includes('rate limit')) {
          throw new Error('Gemini API rate limit exceeded. Please wait a moment and try again.');
        } else if (errorMessage.includes('QUOTA_EXCEEDED') || errorMessage.includes('quota')) {
          throw new Error('Gemini API quota exceeded. Please check your API usage.');
        } else if (errorMessage.includes('PERMISSION_DENIED')) {
          throw new Error('Permission denied. Please check your API key permissions.');
        } else if (errorMessage.includes('NETWORK') || errorMessage.includes('fetch')) {
          throw new Error('Network error. Please check your internet connection and try again.');
        } else {
          throw new Error(`Gemini AI evaluation failed: ${errorMessage}`);
        }
      }
    }
  }

  // Test method to verify Gemini API connection
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🧪 Testing Gemini API connection...');
      console.log('Model:', 'gemini-2.0-flash-exp');
      console.log('API Key present:', !!import.meta.env.VITE_GEMINI_API_KEY);
      console.log('API Key length:', import.meta.env.VITE_GEMINI_API_KEY?.length || 0);
      
      const testPrompt = 'Say "Hello, API test successful!" and nothing else.';
      
      const result = await model.generateContent(testPrompt);
      const response = await result.response;
      const text = response.text();
      
      console.log('✅ API test response:', text);
      return { 
        success: true, 
        message: `API connection successful with gemini-2.0-flash-exp. Response: ${text.trim()}` 
      };
    } catch (error) {
      console.error('❌ API test failed:', error);
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack?.substring(0, 500) : 'No stack trace'
      });
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { 
        success: false, 
        message: `API test failed: ${errorMessage}` 
      };
    }
  }

  private generateFallbackFeedback(_answer: string, score: number): string {
    if (score >= 8) {
      return "Excellent response! You demonstrated strong technical understanding and provided a comprehensive answer.";
    } else if (score >= 6) {
      return "Good answer with solid technical foundation. Consider adding more specific examples or implementation details.";
    } else if (score >= 4) {
      return "Your answer shows basic understanding. Try to elaborate more on the technical concepts and provide concrete examples.";
    } else {
      return "Your response could benefit from more technical depth and specific details. Consider reviewing the core concepts.";
    }
  }





  async generateFinalSummary(candidate: any): Promise<string> {
    const totalScore = candidate.answers.reduce((sum: number, answer: any) => sum + answer.score, 0);
    const averageScore = candidate.answers.length > 0 ? totalScore / candidate.answers.length : 0;
    
    const performanceByDifficulty = {
      easy: candidate.answers.filter((a: any) => a.difficulty === 'easy'),
      medium: candidate.answers.filter((a: any) => a.difficulty === 'medium'),
      hard: candidate.answers.filter((a: any) => a.difficulty === 'hard')
    };
    
    const strengths = this.identifyStrengths(candidate.answers);
    const improvements = this.identifyImprovements(candidate.answers);
    
    const prompt = `
      You are a senior technical interviewer writing a professional interview summary report.
      
      CANDIDATE: ${candidate.name}
      INTERVIEW COMPLETION: ${candidate.answers.length}/6 questions answered
      OVERALL SCORE: ${averageScore.toFixed(1)}/10
      
      DETAILED PERFORMANCE BREAKDOWN:
      Easy Questions (${performanceByDifficulty.easy.length}): 
      ${performanceByDifficulty.easy.map((a: any) => `Score: ${a.score}/10`).join(', ') || 'None answered'}
      
      Medium Questions (${performanceByDifficulty.medium.length}):
      ${performanceByDifficulty.medium.map((a: any) => `Score: ${a.score}/10`).join(', ') || 'None answered'}
      
      Hard Questions (${performanceByDifficulty.hard.length}):
      ${performanceByDifficulty.hard.map((a: any) => `Score: ${a.score}/10`).join(', ') || 'None answered'}
      
      QUESTION TOPICS COVERED:
      ${candidate.answers.map((answer: any, index: number) => 
        `Q${index + 1} (${answer.difficulty}): ${answer.question.substring(0, 60)}... [Score: ${answer.score}/10]`
      ).join('\n')}
      
      IDENTIFIED STRENGTHS: ${strengths.join(', ')}
      AREAS FOR IMPROVEMENT: ${improvements.join(', ')}
      
      Write a professional interview summary (3-4 sentences) that includes:
      1. Overall performance assessment
      2. Key technical strengths demonstrated
      3. Main areas needing development
      4. Clear hiring recommendation with reasoning
      
      HIRING RECOMMENDATION SCALE:
      - Strong Hire (8.5-10): Exceptional candidate, exceeds requirements
      - Hire (7.0-8.4): Solid candidate, meets requirements well
      - Maybe (5.5-6.9): Borderline candidate, has potential but gaps exist
      - No Hire (0-5.4): Does not meet minimum requirements
      
      Write in a professional, constructive tone suitable for HR and hiring managers.
    `;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error('Error generating summary:', error);
      return this.generateFallbackSummary(candidate, averageScore);
    }
  }

  private identifyStrengths(answers: any[]): string[] {
    const strengths: string[] = [];
    const avgScore = answers.reduce((sum, a) => sum + a.score, 0) / answers.length;
    
    if (avgScore >= 8) strengths.push('Strong technical knowledge');
    if (answers.some(a => a.score >= 9)) strengths.push('Excellent problem-solving');
    if (answers.filter(a => a.score >= 7).length >= 4) strengths.push('Consistent performance');
    if (answers.some(a => a.difficulty === 'hard' && a.score >= 7)) strengths.push('Advanced technical skills');
    
    return strengths.length > 0 ? strengths : ['Basic technical understanding'];
  }

  private identifyImprovements(answers: any[]): string[] {
    const improvements: string[] = [];
    const avgScore = answers.reduce((sum, a) => sum + a.score, 0) / answers.length;
    
    if (avgScore < 6) improvements.push('Core technical concepts');
    if (answers.filter(a => a.score < 5).length >= 2) improvements.push('Fundamental knowledge gaps');
    if (answers.some(a => a.difficulty === 'easy' && a.score < 6)) improvements.push('Basic concepts mastery');
    if (answers.every(a => a.difficulty === 'hard' ? a.score < 6 : true)) improvements.push('Advanced problem-solving');
    
    return improvements.length > 0 ? improvements : ['Minor technical details'];
  }

  private generateFallbackSummary(candidate: any, averageScore: number): string {
    const recommendation = averageScore >= 8.5 ? 'Strong Hire' :
                          averageScore >= 7 ? 'Hire' :
                          averageScore >= 5.5 ? 'Maybe' : 'No Hire';
    
    return `${candidate.name} completed ${candidate.answers.length}/6 interview questions with an average score of ${averageScore.toFixed(1)}/10. ` +
           `The candidate demonstrated ${averageScore >= 7 ? 'strong' : averageScore >= 5 ? 'adequate' : 'limited'} technical knowledge across the assessed areas. ` +
           `Based on the overall performance, the recommendation is: ${recommendation}.`;
  }

  // Text-to-Speech with en-IN-PrabhatNeural voice - Optimized for clarity and volume
  speak(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (!this.speechSynthesis) {
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Get available voices
      const voices = this.speechSynthesis.getVoices();
      console.log('Available voices:', voices.map(v => `${v.name} (${v.lang})`));
      
      // Priority 1: Look for en-IN-PrabhatNeural specifically
      let selectedVoice = voices.find(voice => 
        voice.name.toLowerCase().includes('prabhat') && voice.lang.includes('en-IN')
      );
      
      // Priority 2: Other high-quality Indian English voices
      if (!selectedVoice) {
        selectedVoice = voices.find(voice => 
          voice.lang.includes('en-IN') && (
            voice.name.toLowerCase().includes('ravi') ||
            voice.name.toLowerCase().includes('heera') ||
            voice.name.toLowerCase().includes('neural') ||
            voice.name.toLowerCase().includes('enhanced')
          )
        );
      }
      
      // Priority 3: Any Indian English voice
      if (!selectedVoice) {
        selectedVoice = voices.find(voice => 
          voice.lang.includes('en-IN') || voice.lang.includes('hi-IN')
        );
      }
      
      // Priority 4: High-quality English voices
      if (!selectedVoice) {
        selectedVoice = voices.find(voice => 
          voice.lang.includes('en-') && (
            voice.name.toLowerCase().includes('neural') ||
            voice.name.toLowerCase().includes('enhanced') ||
            voice.name.toLowerCase().includes('premium')
          )
        );
      }
      
      // Priority 5: Any clear English voice
      if (!selectedVoice) {
        selectedVoice = voices.find(voice => 
          voice.lang.startsWith('en-') && !voice.name.toLowerCase().includes('novelty')
        );
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log('Using voice:', selectedVoice.name, '- Language:', selectedVoice.lang);
      } else {
        console.log('Using default system voice');
      }
      
      // Optimized settings for clear, loud speech
      utterance.rate = 0.85;        // Slightly slower for clarity
      utterance.pitch = 1.0;        // Natural pitch
      utterance.volume = 1.0;       // Maximum volume
      utterance.lang = 'en-IN';     // Indian English for better pronunciation
      
      utterance.onend = () => {
        console.log('Speech completed successfully');
        resolve();
      };
      
      utterance.onerror = (error) => {
        console.error('Speech synthesis error:', error);
        resolve();
      };
      
      // Ensure speech synthesis is ready and clear any pending speech
      if (this.speechSynthesis.speaking) {
        this.speechSynthesis.cancel();
        // Small delay to ensure cancellation is complete
        setTimeout(() => {
          this.speechSynthesis.speak(utterance);
        }, 100);
      } else {
        this.speechSynthesis.speak(utterance);
      }
    });
  }

  stopSpeaking(): void {
    if (this.speechSynthesis) {
      this.speechSynthesis.cancel();
    }
  }

  // Speech-to-Text with fast, clear, and accurate recognition - Optimized for Indian English
  startListening(onResult: (transcript: string, isFinal: boolean) => void, onEnd?: () => void): void {
    if (!this.speechRecognition) {
      throw new Error('Speech recognition not supported');
    }

    let isListening = true;
    let finalTranscript = '';
    let restartTimeout: number;
    let silenceTimeout: number;
    let hasSpokenRecently = false;
    let consecutiveErrors = 0;

    // Optimized timing for complete answer capture
    const SILENCE_THRESHOLD = 4000;     // Increased to 4 seconds for complete answers
    const RESTART_DELAY = 500;          // Slightly longer for stability
    const MAX_CONSECUTIVE_ERRORS = 3;   // Prevent infinite error loops

    const restart = () => {
      if (isListening && consecutiveErrors < MAX_CONSECUTIVE_ERRORS) {
        try {
          console.log('Restarting speech recognition for continuous listening...');
          this.speechRecognition.start();
          consecutiveErrors = 0; // Reset error count on successful start
        } catch (error) {
          console.log('Speech recognition restart failed:', error);
          consecutiveErrors++;
          
          if (consecutiveErrors < MAX_CONSECUTIVE_ERRORS && isListening) {
            // Exponential backoff for retries
            const delay = Math.min(2000, 500 * Math.pow(2, consecutiveErrors));
            restartTimeout = window.setTimeout(restart, delay);
          } else {
            console.log('Too many consecutive errors, stopping recognition');
            isListening = false;
            if (onEnd) onEnd();
          }
        }
      }
    };

    const handleSilence = () => {
      // Be more patient - only restart after longer silence if we have substantial content
      if (hasSpokenRecently && isListening && finalTranscript.trim().length > 0) {
        console.log('Extended silence detected with content, keeping session active...');
        // Don't restart immediately - let the user continue thinking
        // Only restart if they've been silent for a very long time
        if (finalTranscript.trim().length < 50) {
          // Short answer, might need more time
          console.log('Short answer detected, giving more time...');
          return;
        }
        
        // For longer answers, gentle restart to stay ready
        try {
          this.speechRecognition.stop();
        } catch (error) {
          console.log('Error stopping for restart:', error);
        }
      }
    };

    this.speechRecognition.onresult = (event: any) => {
      let interimTranscript = '';
      let newFinalTranscript = '';
      
      hasSpokenRecently = true;
      consecutiveErrors = 0; // Reset error count on successful recognition

      if (silenceTimeout) {
        clearTimeout(silenceTimeout);
      }

      // Process all results for better accuracy
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        
        // Use the most confident alternative if available
        let bestTranscript = result[0].transcript;
        let bestConfidence = result[0].confidence || 0;
        
        // Check other alternatives for better confidence
        for (let j = 1; j < result.length && j < 3; j++) {
          if (result[j] && result[j].confidence > bestConfidence) {
            bestTranscript = result[j].transcript;
            bestConfidence = result[j].confidence;
          }
        }
        
        if (result.isFinal) {
          newFinalTranscript += bestTranscript;
        } else {
          interimTranscript += bestTranscript;
        }
      }

      // Process final results - send only the new segment to prevent repetition
      if (newFinalTranscript) {
        const cleanTranscript = newFinalTranscript.trim();
        if (cleanTranscript && cleanTranscript.length > 0) {
          // Send only the new final segment, not the accumulated text
          onResult(cleanTranscript, true);
          console.log('New final segment:', cleanTranscript);
          
          // Update internal accumulator
          finalTranscript += (finalTranscript ? ' ' : '') + cleanTranscript;
          console.log('Internal total:', finalTranscript);
        }
        
        // Be more patient - longer silence timeout for complete answers
        const dynamicTimeout = finalTranscript.length < 100 ? SILENCE_THRESHOLD * 2 : SILENCE_THRESHOLD;
        silenceTimeout = window.setTimeout(handleSilence, dynamicTimeout);
      } 
      // Process interim results - send only for visual feedback
      else if (interimTranscript.trim() && interimTranscript.trim().length > 0) {
        // Send interim for visual feedback only
        onResult(interimTranscript.trim(), false);
        console.log('Interim preview:', interimTranscript.trim());
      }
    };

    this.speechRecognition.onend = () => {
      console.log('Speech recognition session ended, preparing to restart...');
      if (isListening) {
        restartTimeout = window.setTimeout(restart, RESTART_DELAY);
      } else if (onEnd) {
        onEnd();
      }
    };

    this.speechRecognition.onerror = (event: any) => {
      console.log('Speech recognition error:', event.error);
      consecutiveErrors++;
      
      // Handle different types of errors with optimized recovery
      switch (event.error) {
        case 'no-speech':
          // Quick restart for no-speech errors
          if (isListening && consecutiveErrors < MAX_CONSECUTIVE_ERRORS) {
            restartTimeout = window.setTimeout(restart, RESTART_DELAY);
          }
          break;
          
        case 'audio-capture':
          // Slightly longer delay for audio issues
          if (isListening && consecutiveErrors < MAX_CONSECUTIVE_ERRORS) {
            restartTimeout = window.setTimeout(restart, 800);
          }
          break;
          
        case 'not-allowed':
          // Permission denied - stop completely
          console.error('Microphone permission denied');
          isListening = false;
          if (onEnd) onEnd();
          break;
          
        case 'network':
          // Network issues - longer delay
          if (isListening && consecutiveErrors < MAX_CONSECUTIVE_ERRORS) {
            restartTimeout = window.setTimeout(restart, 1500);
          }
          break;
          
        case 'aborted':
          // Quick restart for aborted sessions
          if (isListening && consecutiveErrors < MAX_CONSECUTIVE_ERRORS) {
            restartTimeout = window.setTimeout(restart, RESTART_DELAY);
          }
          break;
          
        case 'service-not-allowed':
          // Service issues - stop completely
          console.error('Speech recognition service not allowed');
          isListening = false;
          if (onEnd) onEnd();
          break;
          
        default:
          // Generic error handling
          if (isListening && consecutiveErrors < MAX_CONSECUTIVE_ERRORS) {
            restartTimeout = window.setTimeout(restart, 1000);
          }
          break;
      }
      
      // Stop if too many consecutive errors
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        console.error('Too many speech recognition errors, stopping');
        isListening = false;
        if (onEnd) onEnd();
      }
    };

    this.speechRecognition.onstart = () => {
      console.log('Speech recognition active - listening for clear speech...');
      consecutiveErrors = 0; // Reset error count on successful start
    };

    // Enhanced stop function with better cleanup
    this.speechRecognition.stopListening = () => {
      console.log('Stopping speech recognition session...');
      isListening = false;
      hasSpokenRecently = false;
      consecutiveErrors = 0;
      
      // Clear all timeouts
      if (restartTimeout) {
        clearTimeout(restartTimeout);
        restartTimeout = 0;
      }
      if (silenceTimeout) {
        clearTimeout(silenceTimeout);
        silenceTimeout = 0;
      }
      
      try {
        this.speechRecognition.stop();
      } catch (error) {
        console.log('Error stopping speech recognition:', error);
      }
    };

    // Start the initial recognition with error handling
    console.log('Starting optimized speech recognition for Indian English...');
    try {
      this.speechRecognition.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      if (onEnd) onEnd();
    }
  }

  stopListening(): void {
    if (this.speechRecognition) {
      if (this.speechRecognition.stopListening) {
        this.speechRecognition.stopListening();
      } else {
        this.speechRecognition.stop();
      }
    }
  }

  private extractSkillsFromResume(resumeText: string): string[] {
    const skills: string[] = [];
    const text = resumeText.toLowerCase();
    
    // Comprehensive tech skills list organized by category
    const techSkills: { [category: string]: string[] } = {
      frontend: [
        'javascript', 'typescript', 'react', 'angular', 'vue', 'svelte', 'html', 'css', 
        'sass', 'scss', 'tailwind', 'bootstrap', 'jquery', 'webpack', 'vite', 'next.js', 
        'nuxt.js', 'gatsby', 'redux', 'mobx', 'zustand'
      ],
      backend: [
        'node.js', 'express', 'fastify', 'koa', 'python', 'django', 'flask', 'fastapi',
        'java', 'spring', 'php', 'laravel', 'symfony', 'ruby', 'rails', 'go', 'gin',
        'c#', '.net', 'asp.net', 'rust', 'actix'
      ],
      database: [
        'mongodb', 'mysql', 'postgresql', 'sqlite', 'redis', 'elasticsearch', 'cassandra',
        'dynamodb', 'firebase', 'supabase', 'prisma', 'sequelize', 'mongoose', 'typeorm'
      ],
      cloud: [
        'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'ansible', 'jenkins',
        'github actions', 'gitlab ci', 'heroku', 'vercel', 'netlify', 'cloudflare'
      ],
      tools: [
        'git', 'github', 'gitlab', 'bitbucket', 'jira', 'confluence', 'slack', 'teams',
        'figma', 'sketch', 'postman', 'insomnia', 'vs code', 'intellij', 'vim'
      ],
      testing: [
        'jest', 'mocha', 'chai', 'cypress', 'selenium', 'playwright', 'puppeteer',
        'junit', 'pytest', 'rspec', 'phpunit'
      ]
    };
    
    // Extract skills from all categories
    Object.values(techSkills).flat().forEach(skill => {
      // Check for exact matches and common variations
      const variations = [
        skill,
        skill.replace('.js', ''),
        skill.replace('-', ''),
        skill.replace('_', ''),
        skill.replace(' ', '')
      ];
      
      if (variations.some(variation => text.includes(variation))) {
        if (!skills.includes(skill)) {
          skills.push(skill);
        }
      }
    });
    
    // Also extract years of experience for each skill if mentioned
    const skillsWithExperience: string[] = [];
    skills.forEach(skill => {
      const experiencePattern = new RegExp(`(\\d+)\\+?\\s*years?.*${skill}|${skill}.*(\\d+)\\+?\\s*years?`, 'i');
      const match = resumeText.match(experiencePattern);
      if (match) {
        const years = match[1] || match[2];
        skillsWithExperience.push(`${skill} (${years}+ years)`);
      } else {
        skillsWithExperience.push(skill);
      }
    });
    
    return skillsWithExperience.length > 0 ? skillsWithExperience : ['javascript', 'react', 'node.js'];
  }

  private extractProjectsFromResume(resumeText: string): string[] {
    const projects: string[] = [];
    
    // Common project indicators
    const projectPatterns = [
      /project[s]?[:\-\s]*([^\n\r]{10,80})/gi,
      /built[:\-\s]*([^\n\r]{10,80})/gi,
      /developed[:\-\s]*([^\n\r]{10,80})/gi,
      /created[:\-\s]*([^\n\r]{10,80})/gi,
      /implemented[:\-\s]*([^\n\r]{10,80})/gi
    ];
    
    projectPatterns.forEach(pattern => {
      const matches = resumeText.matchAll(pattern);
      for (const match of matches) {
        const project = match[1]?.trim();
        if (project && project.length > 10 && project.length < 80) {
          // Clean up the project description
          const cleanProject = project
            .replace(/[^\w\s\-\.]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          
          if (cleanProject && !projects.includes(cleanProject)) {
            projects.push(cleanProject);
          }
        }
      }
    });
    
    return projects.slice(0, 3); // Return top 3 projects
  }

  private extractCompaniesFromResume(resumeText: string): string[] {
    const companies: string[] = [];
    const lines = resumeText.split('\n');
    
    // Common company indicators
    const companyPatterns = [
      /(?:at|@)\s+([A-Z][a-zA-Z\s&\.]{2,30})/g,
      /(?:company|employer|organization)[:\-\s]*([A-Z][a-zA-Z\s&\.]{2,30})/gi,
      /(?:worked|employed|position)\s+(?:at|with)\s+([A-Z][a-zA-Z\s&\.]{2,30})/gi
    ];
    
    // Look for company names in typical resume format
    lines.forEach(line => {
      // Skip lines that are too short or too long
      if (line.length < 5 || line.length > 100) return;
      
      companyPatterns.forEach(pattern => {
        const matches = line.matchAll(pattern);
        for (const match of matches) {
          const company = match[1]?.trim();
          if (company && company.length > 2 && company.length < 30) {
            // Filter out common non-company words
            const excludeWords = ['university', 'college', 'school', 'institute', 'department', 'team', 'group'];
            if (!excludeWords.some(word => company.toLowerCase().includes(word))) {
              if (!companies.includes(company)) {
                companies.push(company);
              }
            }
          }
        }
      });
    });
    
    return companies.slice(0, 2); // Return top 2 companies
  }
  
  private getQuestionRequirements(difficulty: string, questionNumber: number, skills: string[]): string {
    const requirements = {
      easy: [
        `Basic ${skills[0] || 'JavaScript'} concepts and syntax`,
        `HTML/CSS fundamentals and responsive design`,
        `Basic React components and props usage`,
        `Simple API calls and data handling`,
        `Git version control basics`,
        `Basic debugging and problem-solving`
      ],
      medium: [
        `${skills[0] || 'React'} hooks and state management`,
        `RESTful API design and implementation`,
        `Database queries and data modeling`,
        `Authentication and security basics`,
        `Performance optimization techniques`,
        `Testing strategies and implementation`
      ],
      hard: [
        `System design and architecture patterns`,
        `Scalability and performance at scale`,
        `Advanced ${skills[0] || 'JavaScript'} patterns`,
        `Microservices and distributed systems`,
        `DevOps and deployment strategies`,
        `Advanced security and best practices`
      ]
    };
    
    const reqs = requirements[difficulty as keyof typeof requirements] || requirements.medium;
    return reqs[(questionNumber - 1) % reqs.length];
  }
  
  private getUniqueQuestion(difficulty: string, previousQuestions: string[], skills: string[]): string {
    const uniqueQuestions = {
      easy: [
        `Explain how ${skills[0] || 'JavaScript'} closures work with a practical example.`,
        `How would you create a responsive navigation menu using HTML and CSS?`,
        `Describe the difference between synchronous and asynchronous code in ${skills[0] || 'JavaScript'}.`,
        `How would you handle form submission and validation in a web application?`,
        `Explain the concept of event delegation and when you would use it.`,
        `How do you debug ${skills[0] || 'JavaScript'} code in the browser?`
      ],
      medium: [
        `How would you implement user authentication using ${skills[1] || 'Node.js'} and JWT tokens?`,
        `Describe your approach to managing application state in a ${skills[0] || 'React'} application.`,
        `How would you optimize database queries for better performance?`,
        `Explain how you would implement real-time chat functionality.`,
        `How would you handle file uploads and storage in a web application?`,
        `Describe your testing strategy for a ${skills[0] || 'React'} application.`
      ],
      hard: [
        `Design a scalable e-commerce system that can handle Black Friday traffic.`,
        `How would you implement a content delivery network (CDN) strategy?`,
        `Describe your approach to implementing microservices communication.`,
        `How would you design a real-time analytics dashboard for millions of users?`,
        `Explain your strategy for database sharding and data consistency.`,
        `How would you implement a distributed caching system?`
      ]
    };
    
    const questions = uniqueQuestions[difficulty as keyof typeof uniqueQuestions] || uniqueQuestions.medium;
    
    for (const question of questions) {
      if (!this.isQuestionTooSimilar(question, previousQuestions)) {
        return question;
      }
    }
    
    return questions[Math.floor(Math.random() * questions.length)];
  }
}

export const geminiService = GeminiService.getInstance();