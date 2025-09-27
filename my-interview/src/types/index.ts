export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  resumeFile?: File;
  resumeText?: string;
  skills?: string[];
  experience?: string;
  education?: string;
  score: number;
  summary: string;
  status: 'pending' | 'in-progress' | 'completed';
  startTime?: Date;
  endTime?: Date;
  currentQuestionIndex: number;
  answers: Answer[];
  isPaused: boolean;
}

export interface Answer {
  questionId: string;
  question: string;
  answer: string;
  timeSpent: number;
  maxTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  score: number;
  feedback: string;
}

export interface Question {
  id: string;
  text: string;
  difficulty: 'easy' | 'medium' | 'hard';
  maxTime: number;
  category: string;
}

export interface InterviewState {
  currentCandidate: Candidate | null;
  candidates: Candidate[];
  currentSessionId: string | null;
  currentQuestionId: string | null;
  isInterviewActive: boolean;
  currentQuestion: Question | null;
  timeRemaining: number;
  isTimerRunning: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AppState {
  interview: InterviewState;
  ui: {
    activeTab: 'interviewee' | 'interviewer';
    showWelcomeBack: boolean;
    selectedCandidateId: string | null;
  };
}