import { supabase } from './supabaseClient';
import type { DatabaseCandidate, DatabaseInterviewSession, DatabaseQuestion, DatabaseAnswer, DatabaseAssessment } from './supabaseClient';
import type { Candidate, Question, Answer } from '../types';

export class DatabaseService {
  private static instance: DatabaseService;

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  // Helper function to sanitize strings for database storage
  private sanitizeString(str: string | undefined): string {
    if (!str) return '';
    
    // Remove or escape problematic characters
    return str
      .replace(/\\/g, '\\\\')  // Escape backslashes
      .replace(/\u0000/g, '')  // Remove null bytes
      .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') // Remove control characters
      .trim();
  }

  // Candidate Operations
  async createCandidate(candidateData: Omit<Candidate, 'id'>): Promise<string> {
    try {
      // Sanitize all string fields
      const sanitizedData = {
        name: this.sanitizeString(candidateData.name),
        email: this.sanitizeString(candidateData.email),
        phone: this.sanitizeString(candidateData.phone),
        resume_data: {
          resumeText: this.sanitizeString(candidateData.resumeText),
          skills: candidateData.skills || [],
          experience: this.sanitizeString(candidateData.experience),
          education: this.sanitizeString(candidateData.education),
          status: candidateData.status,
          score: candidateData.score || 0,
          summary: this.sanitizeString(candidateData.summary)
        }
      };

      const { data, error } = await supabase
        .from('candidates')
        .insert(sanitizedData)
        .select('id')
        .single();

      if (error) {
        console.error('Error creating candidate:', error);
        throw new Error(`Failed to create candidate: ${error.message}`);
      }

      return data.id;
    } catch (err) {
      console.error('Database operation failed:', err);
      throw new Error(`Failed to create candidate: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  async updateCandidate(id: string, updates: Partial<Candidate>): Promise<void> {
    const updateData: any = {};
    
    if (updates.name) updateData.name = updates.name;
    if (updates.email) updateData.email = updates.email;
    if (updates.phone) updateData.phone = updates.phone;
    
    if (updates.resumeText || updates.skills || updates.experience || updates.education || 
        updates.status !== undefined || updates.score !== undefined || updates.summary) {
      // Get current resume_data first
      const { data: current } = await supabase
        .from('candidates')
        .select('resume_data')
        .eq('id', id)
        .single();

      const currentResumeData = current?.resume_data || {};
      
      updateData.resume_data = {
        ...currentResumeData,
        ...(updates.resumeText && { resumeText: updates.resumeText }),
        ...(updates.skills && { skills: updates.skills }),
        ...(updates.experience && { experience: updates.experience }),
        ...(updates.education && { education: updates.education }),
        ...(updates.status !== undefined && { status: updates.status }),
        ...(updates.score !== undefined && { score: updates.score }),
        ...(updates.summary && { summary: updates.summary })
      };
    }

    updateData.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('candidates')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Error updating candidate:', error);
      throw new Error(`Failed to update candidate: ${error.message}`);
    }
  }

  async getCandidate(id: string): Promise<Candidate | null> {
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      console.error('Error fetching candidate:', error);
      throw new Error(`Failed to fetch candidate: ${error.message}`);
    }

    return this.mapDatabaseCandidateToCandidate(data);
  }

  async getAllCandidates(): Promise<Candidate[]> {
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching candidates:', error);
      throw new Error(`Failed to fetch candidates: ${error.message}`);
    }

    return data.map(this.mapDatabaseCandidateToCandidate);
  }

  // Interview Session Operations
  async createInterviewSession(candidateId: string): Promise<string> {
    const { data, error } = await supabase
      .from('interview_sessions')
      .insert({
        candidate_id: candidateId,
        status: 'in_progress',
        current_question_index: 0,
        start_time: new Date().toISOString(),
        session_data: {
          questions_completed: 0,
          total_questions: 6,
          current_difficulty: 'easy'
        }
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating interview session:', error);
      throw new Error(`Failed to create interview session: ${error.message}`);
    }

    return data.id;
  }

  async updateInterviewSession(sessionId: string, updates: {
    status?: 'in_progress' | 'completed' | 'paused';
    current_question_index?: number;
    total_score?: number;
    session_data?: any;
  }): Promise<void> {
    const updateData: any = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    if (updates.status === 'completed') {
      updateData.end_time = new Date().toISOString();
    }

    const { error } = await supabase
      .from('interview_sessions')
      .update(updateData)
      .eq('id', sessionId);

    if (error) {
      console.error('Error updating interview session:', error);
      throw new Error(`Failed to update interview session: ${error.message}`);
    }
  }

  async getInterviewSession(sessionId: string): Promise<DatabaseInterviewSession | null> {
    const { data, error } = await supabase
      .from('interview_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('Error fetching interview session:', error);
      throw new Error(`Failed to fetch interview session: ${error.message}`);
    }

    return data;
  }

  async getActiveSessionForCandidate(candidateId: string): Promise<DatabaseInterviewSession | null> {
    const { data, error } = await supabase
      .from('interview_sessions')
      .select('*')
      .eq('candidate_id', candidateId)
      .eq('status', 'in_progress')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('Error fetching active session:', error);
      return null;
    }

    return data;
  }

  // Question Operations
  async saveQuestion(sessionId: string, question: Question): Promise<string> {
    const { data, error } = await supabase
      .from('questions')
      .insert({
        session_id: sessionId,
        question_text: question.text,
        difficulty: question.difficulty,
        question_type: question.category,
        time_limit: question.maxTime,
        asked_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error saving question:', error);
      throw new Error(`Failed to save question: ${error.message}`);
    }

    return data.id;
  }

  async getQuestionsForSession(sessionId: string): Promise<DatabaseQuestion[]> {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('session_id', sessionId)
      .order('asked_at', { ascending: true });

    if (error) {
      console.error('Error fetching questions:', error);
      throw new Error(`Failed to fetch questions: ${error.message}`);
    }

    return data;
  }

  // Answer Operations
  async saveAnswer(questionId: string, answer: Answer): Promise<string> {
    const { data, error } = await supabase
      .from('answers')
      .insert({
        question_id: questionId,
        answer_text: answer.answer,
        score: answer.score,
        time_taken: answer.timeSpent,
        evaluation_data: {
          feedback: answer.feedback,
          difficulty: answer.difficulty,
          maxTime: answer.maxTime
        },
        submitted_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error saving answer:', error);
      throw new Error(`Failed to save answer: ${error.message}`);
    }

    return data.id;
  }

  async getAnswersForSession(sessionId: string): Promise<DatabaseAnswer[]> {
    const { data, error } = await supabase
      .from('answers')
      .select(`
        *,
        questions!inner(session_id)
      `)
      .eq('questions.session_id', sessionId)
      .order('submitted_at', { ascending: true });

    if (error) {
      console.error('Error fetching answers:', error);
      throw new Error(`Failed to fetch answers: ${error.message}`);
    }

    return data;
  }

  // Assessment Operations
  async saveAssessment(sessionId: string, finalScore: number, assessmentData: any): Promise<string> {
    const { data, error } = await supabase
      .from('assessments')
      .insert({
        session_id: sessionId,
        final_score: finalScore,
        assessment_data: assessmentData,
        generated_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error saving assessment:', error);
      throw new Error(`Failed to save assessment: ${error.message}`);
    }

    return data.id;
  }

  async getAssessment(sessionId: string): Promise<DatabaseAssessment | null> {
    const { data, error } = await supabase
      .from('assessments')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('Error fetching assessment:', error);
      throw new Error(`Failed to fetch assessment: ${error.message}`);
    }

    return data;
  }

  // Utility Methods
  private mapDatabaseCandidateToCandidate(dbCandidate: DatabaseCandidate): Candidate {
    const resumeData = dbCandidate.resume_data || {};
    
    return {
      id: dbCandidate.id,
      name: dbCandidate.name,
      email: dbCandidate.email,
      phone: dbCandidate.phone,
      resumeText: resumeData.resumeText || '',
      skills: resumeData.skills || [],
      experience: resumeData.experience || '',
      education: resumeData.education || '',
      score: resumeData.score || 0,
      summary: resumeData.summary || '',
      status: resumeData.status || 'pending',
      currentQuestionIndex: 0,
      answers: [],
      isPaused: false,
      resumeFile: undefined // File objects can't be stored in DB
    };
  }

  // Real-time subscriptions
  subscribeToCandidate(candidateId: string, callback: (candidate: Candidate) => void) {
    return supabase
      .channel(`candidate-${candidateId}`)
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'candidates',
          filter: `id=eq.${candidateId}`
        }, 
        (payload) => {
          const candidate = this.mapDatabaseCandidateToCandidate(payload.new as DatabaseCandidate);
          callback(candidate);
        }
      )
      .subscribe();
  }

  subscribeToInterviewSession(sessionId: string, callback: (session: DatabaseInterviewSession) => void) {
    return supabase
      .channel(`session-${sessionId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'interview_sessions',
          filter: `id=eq.${sessionId}`
        }, 
        (payload) => {
          callback(payload.new as DatabaseInterviewSession);
        }
      )
      .subscribe();
  }
}

export const databaseService = DatabaseService.getInstance();