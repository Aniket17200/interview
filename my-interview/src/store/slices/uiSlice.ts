import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  activeTab: 'interviewee' | 'interviewer';
  showWelcomeBack: boolean;
  selectedCandidateId: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: UIState = {
  activeTab: 'interviewee',
  showWelcomeBack: false,
  selectedCandidateId: null,
  isLoading: false,
  error: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setActiveTab: (state, action: PayloadAction<'interviewee' | 'interviewer'>) => {
      state.activeTab = action.payload;
    },
    
    setShowWelcomeBack: (state, action: PayloadAction<boolean>) => {
      state.showWelcomeBack = action.payload;
    },
    
    setSelectedCandidateId: (state, action: PayloadAction<string | null>) => {
      state.selectedCandidateId = action.payload;
    },
    
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setActiveTab,
  setShowWelcomeBack,
  setSelectedCandidateId,
  setLoading,
  setError,
} = uiSlice.actions;

export default uiSlice.reducer;