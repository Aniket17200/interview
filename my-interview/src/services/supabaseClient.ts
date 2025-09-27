import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database Types
export interface DatabaseCandidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  resume_data: any;
  created_at: string;
  updated_at: string;
}

export interface DatabaseInterviewSession {
  id: string;
  candidate_id: string;
  status: 'in_progress' | 'completed' | 'paused';
  current_question_index: number;
  start_time: string;
  end_time?: string;
  total_score?: number;
  session_data: any;
  created_at: string;
  updated_at: string;
}

export interface DatabaseQuestion {
  id: string;
  session_id: string;
  question_text: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question_type: string;
  time_limit: number;
  asked_at: string;
}

export interface DatabaseAnswer {
  id: string;
  question_id: string;
  answer_text: string;
  score: number;
  time_taken: number;
  evaluation_data: any;
  submitted_at: string;
}

export interface DatabaseAssessment {
  id: string;
  session_id: string;
  final_score: number;
  assessment_data: any;
  generated_at: string;
}