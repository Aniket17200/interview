import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Clock, User, FileText } from 'lucide-react';
import type { RootState } from '../store';
import { setShowWelcomeBack } from '../store/slices/uiSlice';
import { resumeInterview, resetInterview } from '../store/slices/interviewSlice';

const modalStyles = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    padding: '1rem'
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '1rem',
    boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    maxWidth: '28rem',
    width: '100%',
    padding: '1.5rem'
  },
  iconContainer: {
    width: '64px',
    height: '64px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1rem auto'
  },
  button: {
    flex: 1,
    padding: '0.5rem 1rem',
    borderRadius: '0.5rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    textAlign: 'center' as const,
    border: 'none'
  }
};

export const WelcomeBackModal: React.FC = () => {
  const dispatch = useDispatch();
  const { showWelcomeBack } = useSelector((state: RootState) => state.ui);
  const { currentCandidate } = useSelector((state: RootState) => state.interview);

  if (!showWelcomeBack || !currentCandidate) return null;

  const handleResume = () => {
    dispatch(resumeInterview());
    dispatch(setShowWelcomeBack(false));
  };

  const handleStartOver = () => {
    dispatch(resetInterview());
    dispatch(setShowWelcomeBack(false));
  };



  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.modal}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={modalStyles.iconContainer}>
            <Clock size={32} style={{ color: 'white' }} />
          </div>
          <h2 style={{ 
            fontSize: '1.5rem', 
            fontWeight: 'bold', 
            color: '#111827', 
            marginBottom: '0.5rem' 
          }}>
            Welcome Back!
          </h2>
          <p style={{ color: '#4b5563' }}>
            We found an unfinished interview session. Would you like to continue where you left off?
          </p>
        </div>

        <div style={{
          backgroundColor: '#f9fafb',
          borderRadius: '0.5rem',
          padding: '1rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <User size={20} style={{ color: '#6b7280' }} />
            <div>
              <p style={{ fontWeight: '500', margin: 0 }}>{currentCandidate.name}</p>
              <p style={{ fontSize: '0.875rem', color: '#4b5563', margin: 0 }}>{currentCandidate.email}</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <FileText size={16} style={{ color: '#6b7280' }} />
            <span style={{ fontSize: '0.875rem' }}>
              Question {currentCandidate.currentQuestionIndex + 1} of 6
            </span>
          </div>
          
          <div style={{ fontSize: '0.875rem', color: '#4b5563' }}>
            {currentCandidate.answers.length} questions completed
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={handleStartOver}
            style={{
              ...modalStyles.button,
              border: '1px solid #d1d5db',
              color: '#374151',
              backgroundColor: 'white'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#f9fafb';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
            }}
          >
            Start Over
          </button>
          <button
            onClick={handleResume}
            style={{
              ...modalStyles.button,
              backgroundColor: '#2563eb',
              color: 'white'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#1d4ed8';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#2563eb';
            }}
          >
            Continue Interview
          </button>
        </div>
      </div>
    </div>
  );
};