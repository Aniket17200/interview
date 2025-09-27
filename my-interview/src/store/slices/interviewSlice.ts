import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Candidate, Question, Answer, InterviewState } from '../../types';
import { databaseService } from '../../services/databaseService';

const initialState: InterviewState = {
  currentCandidate: null,
  candidates: [],
  currentSessionId: null,
  currentQuestionId: null,
  isInterviewActive: false,
  currentQuestion: null,
  timeRemaining: 0,
  isTimerRunning: false,
  isLoading: false,
  error: null,
};

// Async thunks for database operations
export const createCandidateAsync = createAsyncThunk(
  'interview/createCandidate',
  async (candidateData: Omit<Candidate, 'id'>) => {
    const candidateId = await databaseService.createCandidate(candidateData);
    const candidate = await databaseService.getCandidate(candidateId);
    return candidate;
  }
);

export const updateCandidateAsync = createAsyncThunk(
  'interview/updateCandidate',
  async ({ id, updates }: { id: string; updates: Partial<Candidate> }) => {
    await databaseService.updateCandidate(id, updates);
    const candidate = await databaseService.getCandidate(id);
    return candidate;
  }
);

export const loadCandidatesAsync = createAsyncThunk(
  'interview/loadCandidates',
  async () => {
    return await databaseService.getAllCandidates();
  }
);

export const startInterviewAsync = createAsyncThunk(
  'interview/startInterview',
  async (candidateId: string) => {
    const sessionId = await databaseService.createInterviewSession(candidateId);
    return { candidateId, sessionId };
  }
);

export const saveQuestionAsync = createAsyncThunk(
  'interview/saveQuestion',
  async ({ sessionId, question }: { sessionId: string; question: Question }) => {
    const questionId = await databaseService.saveQuestion(sessionId, question);
    return { questionId, question };
  }
);

export const submitAnswerAsync = createAsyncThunk(
  'interview/submitAnswer',
  async ({ questionId, answer, sessionId }: { questionId: string; answer: Answer; sessionId: string }) => {
    await databaseService.saveAnswer(questionId, answer);
    
    // Update session progress
    const session = await databaseService.getInterviewSession(sessionId);
    if (session) {
      await databaseService.updateInterviewSession(sessionId, {
        current_question_index: session.current_question_index + 1,
        session_data: {
          ...session.session_data,
          questions_completed: session.current_question_index + 1
        }
      });
    }
    
    return answer;
  }
);

export const completeInterviewAsync = createAsyncThunk(
  'interview/completeInterview',
  async ({ sessionId, score, summary }: { sessionId: string; score: number; summary: string }) => {
    // Update session as completed
    await databaseService.updateInterviewSession(sessionId, {
      status: 'completed',
      total_score: score
    });
    
    // Save final assessment
    await databaseService.saveAssessment(sessionId, score, { summary });
    
    return { score, summary };
  }
);

const interviewSlice = createSlice({
  name: 'interview',
  initialState,
  reducers: {
    setCurrentCandidate: (state, action: PayloadAction<Candidate>) => {
      state.currentCandidate = action.payload;
    },
    
    updateCandidateInfo: (state, action: PayloadAction<Partial<Candidate>>) => {
      if (state.currentCandidate) {
        state.currentCandidate = { ...state.currentCandidate, ...action.payload };
      }
    },

    setCurrentQuestion: (state, action: PayloadAction<Question>) => {
      state.currentQuestion = action.payload;
      state.timeRemaining = action.payload.maxTime;
    },

    setCurrentQuestionId: (state, action: PayloadAction<string>) => {
      state.currentQuestionId = action.payload;
    },

    startTimer: (state) => {
      state.isTimerRunning = true;
    },

    stopTimer: (state) => {
      state.isTimerRunning = false;
    },

    updateTimer: (state) => {
      if (state.isTimerRunning && state.timeRemaining > 0) {
        state.timeRemaining -= 1;
      }
    },

    pauseInterview: (state) => {
      state.isTimerRunning = false;
      if (state.currentCandidate) {
        state.currentCandidate.isPaused = true;
      }
    },

    resumeInterview: (state) => {
      if (state.currentCandidate) {
        state.currentCandidate.isPaused = false;
      }
    },

    startInterviewLocal: (state) => {
      state.isInterviewActive = true;
      state.currentSessionId = `local_${Date.now()}`;
      if (state.currentCandidate) {
        state.currentCandidate.status = 'in-progress';
        state.currentCandidate.startTime = new Date();
        state.currentCandidate.isPaused = false;
      }
    },

    submitAnswerLocal: (state, action: PayloadAction<Answer>) => {
      state.isTimerRunning = false;
      if (state.currentCandidate) {
        state.currentCandidate.answers.push(action.payload);
        state.currentCandidate.currentQuestionIndex += 1;
      }
    },

    completeInterviewLocal: (state, action: PayloadAction<{ score: number; summary: string }>) => {
      if (state.currentCandidate) {
        state.currentCandidate.status = 'completed';
        state.currentCandidate.endTime = new Date();
        state.currentCandidate.score = action.payload.score;
        state.currentCandidate.summary = action.payload.summary;
        
        // Add to candidates list if not already there
        const existingIndex = state.candidates.findIndex(c => c.id === state.currentCandidate!.id);
        if (existingIndex >= 0) {
          state.candidates[existingIndex] = state.currentCandidate;
        } else {
          state.candidates.push(state.currentCandidate);
        }
      }
      
      state.isInterviewActive = false;
      state.currentQuestion = null;
      state.timeRemaining = 0;
      state.currentSessionId = null;
      state.currentQuestionId = null;
    },

    resetInterview: (state) => {
      state.currentCandidate = null;
      state.currentSessionId = null;
      state.currentQuestionId = null;
      state.isInterviewActive = false;
      state.currentQuestion = null;
      state.timeRemaining = 0;
      state.isTimerRunning = false;
      state.error = null;
    },

    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Create Candidate
    builder
      .addCase(createCandidateAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createCandidateAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          state.currentCandidate = action.payload;
          const existingIndex = state.candidates.findIndex(c => c.id === action.payload!.id);
          if (existingIndex >= 0) {
            state.candidates[existingIndex] = action.payload;
          } else {
            state.candidates.push(action.payload);
          }
        }
      })
      .addCase(createCandidateAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to create candidate';
      });

    // Update Candidate
    builder
      .addCase(updateCandidateAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateCandidateAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          state.currentCandidate = action.payload;
          const existingIndex = state.candidates.findIndex(c => c.id === action.payload!.id);
          if (existingIndex >= 0) {
            state.candidates[existingIndex] = action.payload;
          }
        }
      })
      .addCase(updateCandidateAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to update candidate';
      });

    // Load Candidates
    builder
      .addCase(loadCandidatesAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadCandidatesAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.candidates = action.payload;
      })
      .addCase(loadCandidatesAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to load candidates';
      });

    // Start Interview
    builder
      .addCase(startInterviewAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(startInterviewAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentSessionId = action.payload.sessionId;
        state.isInterviewActive = true;
        if (state.currentCandidate) {
          state.currentCandidate.status = 'in-progress';
          state.currentCandidate.startTime = new Date();
          state.currentCandidate.isPaused = false;
        }
      })
      .addCase(startInterviewAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to start interview';
      });

    // Save Question
    builder
      .addCase(saveQuestionAsync.fulfilled, (state, action) => {
        state.currentQuestionId = action.payload.questionId;
      });

    // Submit Answer
    builder
      .addCase(submitAnswerAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(submitAnswerAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isTimerRunning = false;
        if (state.currentCandidate) {
          state.currentCandidate.answers.push(action.payload);
          state.currentCandidate.currentQuestionIndex += 1;
        }
      })
      .addCase(submitAnswerAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to submit answer';
      });

    // Complete Interview
    builder
      .addCase(completeInterviewAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(completeInterviewAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        if (state.currentCandidate) {
          state.currentCandidate.status = 'completed';
          state.currentCandidate.endTime = new Date();
          state.currentCandidate.score = action.payload.score;
          state.currentCandidate.summary = action.payload.summary;
          
          // Update candidate in the list
          const existingIndex = state.candidates.findIndex(c => c.id === state.currentCandidate!.id);
          if (existingIndex >= 0) {
            state.candidates[existingIndex] = state.currentCandidate;
          } else {
            state.candidates.push(state.currentCandidate);
          }
        }
        
        state.isInterviewActive = false;
        state.currentQuestion = null;
        state.timeRemaining = 0;
        state.currentSessionId = null;
        state.currentQuestionId = null;
      })
      .addCase(completeInterviewAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to complete interview';
      });
  },
});

export const {
  setCurrentCandidate,
  updateCandidateInfo,
  setCurrentQuestion,
  setCurrentQuestionId,
  startTimer,
  stopTimer,
  updateTimer,
  pauseInterview,
  resumeInterview,
  startInterviewLocal,
  submitAnswerLocal,
  completeInterviewLocal,
  resetInterview,
  clearError,
} = interviewSlice.actions;

export default interviewSlice.reducer;