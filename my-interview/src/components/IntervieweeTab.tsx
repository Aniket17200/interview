import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Upload, Mic, MicOff, Volume2, VolumeX, Send, Clock, ArrowLeft, Sparkles, Brain, Timer, X, Home } from 'lucide-react';
import type { RootState } from '../store';
import { 
  setCurrentCandidate, 
  updateCandidateInfo, 
  startInterviewAsync, 
  setCurrentQuestion,
  startTimer,
  stopTimer,
  updateTimer,
  submitAnswerAsync,
  completeInterviewAsync,
  resetInterview
} from '../store/slices/interviewSlice';
import { setLoading, setError } from '../store/slices/uiSlice';
import { ResumeParser } from '../services/resumeParser';
import { geminiService } from '../services/geminiService';
import { SystemTest } from './SystemTest';
import type { Candidate, Question, Answer } from '../types';

const QUESTIONS_PER_INTERVIEW = 6;
const TIME_LIMITS = { easy: 90, medium: 180, hard: 300 };

export const IntervieweeTab: React.FC = () => {
  const dispatch = useDispatch();
  const { currentCandidate, isInterviewActive, currentQuestion, timeRemaining, isTimerRunning, currentSessionId } = useSelector((state: RootState) => state.interview);
  const { isLoading, error } = useSelector((state: RootState) => state.ui);
  
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [collectedInfo, setCollectedInfo] = useState({ name: '', email: '', phone: '' });
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [showSystemTest, setShowSystemTest] = useState(false);
  const [systemTestCompleted, setSystemTestCompleted] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Timer effect
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = window.setInterval(() => {
        dispatch(updateTimer());
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isTimerRunning, dispatch]);

  // Auto-submit when timer reaches 0
  useEffect(() => {
    if (timeRemaining === 0 && isTimerRunning && currentQuestion) {
      handleSubmitAnswer();
    }
  }, [timeRemaining, isTimerRunning, currentQuestion]);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentCandidate?.answers, currentQuestion]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Ctrl/Cmd + Enter to submit answer
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && currentQuestion && currentAnswer.trim()) {
        event.preventDefault();
        handleSubmitAnswer();
      }
      // Escape to stop listening
      if (event.key === 'Escape' && isListening) {
        geminiService.stopListening();
        setIsListening(false);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [currentQuestion, currentAnswer, isListening]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const fileName = file.name.toLowerCase();
    const isPDF = file.type === 'application/pdf' || fileName.endsWith('.pdf');
    const isDOCX = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx');
    
    if (!isPDF && !isDOCX) {
      dispatch(setError('Please upload a PDF or DOCX file. Current file type: ' + file.type));
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      dispatch(setError('File size too large. Please upload a file smaller than 10MB.'));
      return;
    }

    dispatch(setLoading(true));
    dispatch(setError(null));

    try {
      console.log('Starting file upload for:', file.name);
      const parsedData = await ResumeParser.parseFile(file);
      
      const candidate: Candidate = {
        id: Date.now().toString(),
        name: parsedData.name || '',
        email: parsedData.email || '',
        phone: parsedData.phone || '',
        resumeFile: file,
        resumeText: parsedData.rawText,
        skills: parsedData.skills,
        experience: parsedData.experience,
        education: parsedData.education,
        score: 0,
        summary: '',
        status: 'pending',
        currentQuestionIndex: 0,
        answers: [],
        isPaused: false,
      };

      dispatch(setCurrentCandidate(candidate));
      
      // Check for missing fields
      const missing = [];
      if (!candidate.name) missing.push('name');
      if (!candidate.email) missing.push('email');
      if (!candidate.phone) missing.push('phone');
      
      setMissingFields(missing);
      setCollectedInfo({
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone
      });

    } catch (err) {
      console.error('File upload error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to parse resume';
      dispatch(setError(errorMessage));
    } finally {
      dispatch(setLoading(false));
      // Reset the file input
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleInfoSubmit = () => {
    if (!collectedInfo.name || !collectedInfo.email || !collectedInfo.phone) {
      dispatch(setError('Please fill in all required fields'));
      return;
    }

    dispatch(updateCandidateInfo(collectedInfo));
    setMissingFields([]);
    dispatch(setError(null));
  };

  const handleStartInterview = async () => {
    if (!currentCandidate) return;

    dispatch(setLoading(true));
    dispatch(startInterviewAsync(currentCandidate.id) as any);

    try {
      await generateNextQuestion();
    } catch (err) {
      dispatch(setError('Failed to start interview'));
      dispatch(setLoading(false));
    }
  };

  const generateNextQuestion = async () => {
    if (!currentCandidate) return;

    const questionIndex = currentCandidate.currentQuestionIndex;
    if (questionIndex >= QUESTIONS_PER_INTERVIEW) {
      await handleCompleteInterview();
      return;
    }

    // Determine difficulty based on question index
    let difficulty: 'easy' | 'medium' | 'hard';
    if (questionIndex < 2) difficulty = 'easy';
    else if (questionIndex < 4) difficulty = 'medium';
    else difficulty = 'hard';

    const previousQuestions = currentCandidate.answers.map((a: Answer) => a.question);
    
    try {
      const questionText = await geminiService.generateQuestion({
        difficulty,
        previousQuestions,
        candidateProfile: { 
          name: currentCandidate.name,
          resumeText: currentCandidate.resumeText,
          experience: currentCandidate.experience
        }
      });

      const question: Question = {
        id: `q_${Date.now()}`,
        text: questionText,
        difficulty,
        maxTime: TIME_LIMITS[difficulty],
        category: 'full-stack'
      };

      dispatch(setCurrentQuestion(question));
      dispatch(startTimer());
      dispatch(setLoading(false));

      // Speak the question if audio is enabled
      if (audioEnabled) {
        setIsSpeaking(true);
        try {
          await geminiService.speak(`Question ${questionIndex + 1}: ${questionText}`);
        } catch (err) {
          console.error('Error speaking question:', err);
        } finally {
          setIsSpeaking(false);
        }
      }

    } catch (err) {
      dispatch(setError('Failed to generate question'));
      dispatch(setLoading(false));
    }
  };

  const handleSubmitAnswer = async () => {
    if (!currentQuestion || !currentCandidate) return;

    // Stop listening if currently active
    if (isListening) {
      geminiService.stopListening();
      setIsListening(false);
    }

    // Stop speaking if currently active
    if (isSpeaking) {
      geminiService.stopSpeaking();
      setIsSpeaking(false);
    }

    dispatch(stopTimer());
    dispatch(setLoading(true));

    const timeSpent = currentQuestion.maxTime - timeRemaining;
    const finalAnswer = currentAnswer.trim() || 'No answer provided';
    
    try {
      console.log('Submitting answer:', finalAnswer);
      const evaluation = await geminiService.evaluateAnswer({
        question: currentQuestion.text,
        answer: finalAnswer,
        difficulty: currentQuestion.difficulty,
        timeSpent,
        maxTime: currentQuestion.maxTime
      });

      const answer: Answer = {
        questionId: currentQuestion.id,
        question: currentQuestion.text,
        answer: finalAnswer,
        timeSpent,
        maxTime: currentQuestion.maxTime,
        difficulty: currentQuestion.difficulty,
        score: evaluation.score,
        feedback: evaluation.feedback
      };

      dispatch(submitAnswerAsync({ 
        questionId: currentQuestion.id, 
        answer, 
        sessionId: currentSessionId! 
      }) as any);
      setCurrentAnswer('');

      // Generate next question
      await generateNextQuestion();

    } catch (err) {
      console.error('Error submitting answer:', err);
      dispatch(setError('Failed to submit answer'));
      dispatch(setLoading(false));
    }
  };

  const handleCompleteInterview = async () => {
    if (!currentCandidate) return;

    dispatch(setLoading(true));

    try {
      const summary = await geminiService.generateFinalSummary(currentCandidate);
      const totalScore = currentCandidate.answers.reduce((sum: number, answer: Answer) => sum + answer.score, 0);
      const averageScore = currentCandidate.answers.length > 0 ? totalScore / currentCandidate.answers.length : 0;

      dispatch(completeInterviewAsync({ 
        sessionId: currentSessionId!, 
        score: averageScore, 
        summary 
      }) as any);
      dispatch(setLoading(false));

    } catch (err) {
      dispatch(setError('Failed to complete interview'));
      dispatch(setLoading(false));
    }
  };

  const handleVoiceToggle = () => {
    if (isListening) {
      geminiService.stopListening();
      setIsListening(false);
    } else {
      try {
        setIsListening(true);
        geminiService.startListening(
          (transcript: string) => {
            const cleanTranscript = transcript.trim();
            
            // Check if user is asking to repeat the question
            const repeatKeywords = ['repeat', 'again', 'say again', 'can you repeat', 'repeat question'];
            const isRepeatRequest = repeatKeywords.some(keyword => 
              cleanTranscript.toLowerCase().includes(keyword.toLowerCase())
            );
            
            if (isRepeatRequest && currentQuestion) {
              handleRepeatQuestion();
            } else {
              // Add the transcript to the current answer
              setCurrentAnswer(prev => {
                const newAnswer = prev ? prev + ' ' + cleanTranscript : cleanTranscript;
                return newAnswer;
              });
            }
          },
          () => {
            setIsListening(false);
          }
        );
      } catch (err) {
        setIsListening(false);
        dispatch(setError('Speech recognition failed. Please ensure microphone permissions are enabled.'));
      }
    }
  };

  const handleRepeatQuestion = async () => {
    if (currentQuestion && audioEnabled) {
      setIsSpeaking(true);
      try {
        await geminiService.speak(currentQuestion.text);
      } catch (err) {
        console.error('Error speaking question:', err);
      } finally {
        setIsSpeaking(false);
      }
    }
  };

  const handleBackToUpload = () => {
    dispatch(resetInterview());
    setCurrentAnswer('');
    setIsListening(false);
    setIsSpeaking(false);
    setMissingFields([]);
    setCollectedInfo({ name: '', email: '', phone: '' });
    setAudioEnabled(false);
    setShowSystemTest(false);
    setSystemTestCompleted(false);
  };

  const handleSystemTestComplete = (audioSupported: boolean) => {
    setAudioEnabled(audioSupported);
    setSystemTestCompleted(true);
    setShowSystemTest(false);
  };

  const handleStartSystemTest = () => {
    setShowSystemTest(true);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Show system test if requested
  if (showSystemTest) {
    return (
      <SystemTest 
        onComplete={handleSystemTestComplete}
        onBack={() => setShowSystemTest(false)}
      />
    );
  }

  if (!currentCandidate) {
    return (
      <div className="min-h-screen bg-gradient-main">
        <div className="flex flex-col items-center justify-center min-h-screen p-6">
          <div className="max-w-lg w-full">
            {/* Header with Home button */}
            <div className="flex justify-end mb-6">
              <button
                onClick={() => window.location.reload()}
                className="flex items-center text-gray-500 hover:text-gray-700 transition-colors"
                title="Go to Home"
              >
                <Home size={20} />
              </button>
            </div>

            {/* Header */}
            <div className="text-center mb-6">
              <div style={{
                width: '80px',
                height: '80px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.5rem',
                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 10px 10px -5px rgb(0 0 0 / 0.04)'
              }}>
                <Brain style={{ width: '40px', height: '40px', color: 'white' }} />
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-3">AI Interview Assistant</h1>
              <p className="text-lg text-gray-600">Upload your resume to begin your personalized interview experience</p>
            </div>

            {/* Upload Card */}
            <div className="card">
              <div className="p-6">
                <div 
                  className="upload-area"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="relative">
                    <Upload style={{ 
                      width: '64px', 
                      height: '64px', 
                      color: '#60a5fa', 
                      margin: '0 auto 1rem auto',
                      display: 'block'
                    }} />
                    {isLoading && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div style={{
                          width: '64px',
                          height: '64px',
                          border: '4px solid #bfdbfe',
                          borderTop: '4px solid #2563eb',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }}></div>
                      </div>
                    )}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {isLoading ? 'Processing your resume...' : 'Upload Your Resume'}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {isLoading ? 'Please wait while we analyze your document' : 'Drag and drop or click to select your file'}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{ width: '8px', height: '8px', backgroundColor: '#4ade80', borderRadius: '50%', marginRight: '0.5rem' }}></div>
                      PDF Files
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{ width: '8px', height: '8px', backgroundColor: '#60a5fa', borderRadius: '50%', marginRight: '0.5rem' }}></div>
                      DOCX Files
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{ width: '8px', height: '8px', backgroundColor: '#a78bfa', borderRadius: '50%', marginRight: '0.5rem' }}></div>
                      Max 10MB
                    </span>
                  </div>
                </div>
                
                {/* Features */}
                <div className="mt-4 grid grid-cols-3 gap-4">
                  <div style={{ textAlign: 'center', padding: '0.75rem', backgroundColor: '#eff6ff', borderRadius: '0.5rem' }}>
                    <Sparkles style={{ width: '24px', height: '24px', color: '#2563eb', margin: '0 auto 0.5rem auto' }} />
                    <p style={{ fontSize: '0.75rem', fontWeight: '500', color: '#1e40af' }}>AI-Powered</p>
                    <p style={{ fontSize: '0.75rem', color: '#1d4ed8' }}>Smart questions</p>
                  </div>
                  <div style={{ textAlign: 'center', padding: '0.75rem', backgroundColor: '#f0fdf4', borderRadius: '0.5rem' }}>
                    <Volume2 style={{ width: '24px', height: '24px', color: '#16a34a', margin: '0 auto 0.5rem auto' }} />
                    <p style={{ fontSize: '0.75rem', fontWeight: '500', color: '#166534' }}>Voice Support</p>
                    <p style={{ fontSize: '0.75rem', color: '#15803d' }}>Speech & TTS</p>
                  </div>
                  <div style={{ textAlign: 'center', padding: '0.75rem', backgroundColor: '#faf5ff', borderRadius: '0.5rem' }}>
                    <Timer style={{ width: '24px', height: '24px', color: '#9333ea', margin: '0 auto 0.5rem auto' }} />
                    <p style={{ fontSize: '0.75rem', fontWeight: '500', color: '#7c3aed' }}>Real-time</p>
                    <p style={{ fontSize: '0.75rem', color: '#8b5cf6' }}>Instant feedback</p>
                  </div>
                </div>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                  {error}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (missingFields.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="flex flex-col items-center justify-center min-h-screen p-6">
          <div className="max-w-md w-full">
            {/* Header with Back and Close buttons */}
            <div className="flex justify-between items-center mb-6">
              <button
                onClick={handleBackToUpload}
                className="flex items-center text-blue-600 hover:text-blue-800 transition-colors group"
              >
                <ArrowLeft size={20} className="mr-2 group-hover:-translate-x-1 transition-transform" />
                Back to Upload
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center text-gray-500 hover:text-gray-700 transition-colors"
                title="Go to Home"
              >
                <Home size={20} />
              </button>
            </div>

            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
                <Brain className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Profile</h2>
              <p className="text-gray-600">We need a few more details to personalize your interview</p>
            </div>

            {/* Form Card */}
            <div className="bg-white rounded-2xl shadow-xl border border-blue-100 p-8">
              <div className="space-y-6">
                {missingFields.includes('name') && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                    <input
                      type="text"
                      value={collectedInfo.name}
                      onChange={(e) => setCollectedInfo(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Enter your full name"
                    />
                  </div>
                )}
                {missingFields.includes('email') && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                    <input
                      type="email"
                      value={collectedInfo.email}
                      onChange={(e) => setCollectedInfo(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Enter your email address"
                    />
                  </div>
                )}
                {missingFields.includes('phone') && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={collectedInfo.phone}
                      onChange={(e) => setCollectedInfo(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Enter your phone number"
                    />
                  </div>
                )}
                
                <button
                  onClick={handleInfoSubmit}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 px-6 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
                >
                  Continue to Interview Setup
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                  {error}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!isInterviewActive) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="flex flex-col items-center justify-center min-h-screen p-6">
          <div className="max-w-lg w-full">
            {/* Header with Back and Close buttons */}
            <div className="flex justify-between items-center mb-6">
              <button
                onClick={handleBackToUpload}
                className="flex items-center text-blue-600 hover:text-blue-800 transition-colors group"
              >
                <ArrowLeft size={20} className="mr-2 group-hover:-translate-x-1 transition-transform" />
                Back to Profile
              </button>
              <button
                onClick={handleBackToUpload}
                className="flex items-center text-gray-500 hover:text-gray-700 transition-colors"
                title="Exit Interview"
              >
                <X size={20} />
              </button>
            </div>

            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full mb-4">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Ready to Begin?</h2>
              <p className="text-gray-600">Your personalized AI interview is about to start</p>
            </div>

            {/* Interview Details Card */}
            <div className="bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden mb-6">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6">
                <h3 className="text-xl font-bold text-white mb-2">Interview Overview</h3>
                <p className="text-blue-100">Tailored questions based on your resume</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="text-center p-4 bg-green-50 rounded-xl">
                    <div className="text-2xl font-bold text-green-600">6</div>
                    <div className="text-sm text-green-700">Questions Total</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-xl">
                    <div className="text-2xl font-bold text-blue-600">3</div>
                    <div className="text-sm text-blue-700">Difficulty Levels</div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="font-medium text-green-800">Easy Questions (2)</span>
                    <span className="text-sm text-green-600">20 seconds each</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <span className="font-medium text-yellow-800">Medium Questions (2)</span>
                    <span className="text-sm text-yellow-600">60 seconds each</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <span className="font-medium text-red-800">Hard Questions (2)</span>
                    <span className="text-sm text-red-600">120 seconds each</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Audio Settings */}
            <div className="bg-white rounded-2xl shadow-xl border border-blue-100 p-6 mb-6">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                <Volume2 className="w-5 h-5 text-blue-600 mr-2" />
                Audio Features
              </h4>
              
              {!systemTestCompleted ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 mb-4">
                    Test your microphone and speakers for the best interview experience
                  </p>
                  <button
                    onClick={handleStartSystemTest}
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    <Mic size={20} />
                    Test Audio System
                  </button>
                  <button
                    onClick={() => setSystemTestCompleted(true)}
                    className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Skip audio test (text only)
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className={`p-4 rounded-xl border-2 ${
                    audioEnabled 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {audioEnabled ? (
                          <Volume2 className="w-5 h-5 text-green-600 mr-2" />
                        ) : (
                          <VolumeX className="w-5 h-5 text-gray-500 mr-2" />
                        )}
                        <span className={`font-medium ${
                          audioEnabled ? 'text-green-800' : 'text-gray-700'
                        }`}>
                          {audioEnabled ? 'Audio System Ready' : 'Text Input Only'}
                        </span>
                      </div>
                      <button
                        onClick={handleStartSystemTest}
                        className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        Retest
                      </button>
                    </div>
                    {audioEnabled && (
                      <p className="text-sm text-green-600 mt-2">
                        ✓ Voice input and text-to-speech enabled
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Start Button */}
            <button
              onClick={handleStartInterview}
              disabled={isLoading || !systemTestCompleted}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-6 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-bold text-lg shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent mr-3"></div>
                  Preparing Interview...
                </div>
              ) : (
                'Start Interview'
              )}
            </button>
            
            {!systemTestCompleted && (
              <p className="text-sm text-gray-500 text-center mt-3">
                Please complete the audio test to continue
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-blue-100 shadow-lg">
        <div className="p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mr-4">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Interview in Progress
                </h2>
                <p className="text-blue-600 font-medium">
                  Question {currentCandidate.currentQuestionIndex + 1} of {QUESTIONS_PER_INTERVIEW}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {currentQuestion && (
                <>
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold shadow-sm ${
                    timeRemaining <= 10 
                      ? 'bg-red-100 text-red-700 animate-pulse border-2 border-red-200' 
                      : 'bg-blue-100 text-blue-700 border-2 border-blue-200'
                  }`}>
                    <Clock size={18} />
                    {formatTime(timeRemaining)}
                  </div>
                  {isSpeaking && (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-green-700 border-2 border-green-200">
                      <Volume2 size={18} className="animate-pulse" />
                      AI Speaking...
                    </div>
                  )}
                  <span className={`px-3 py-1 rounded-full text-sm font-bold shadow-sm ${
                    currentQuestion.difficulty === 'easy' ? 'bg-green-100 text-green-700 border-2 border-green-200' :
                    currentQuestion.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-200' :
                    'bg-red-100 text-red-700 border-2 border-red-200'
                  }`}>
                    {currentQuestion.difficulty.toUpperCase()}
                  </span>
                </>
              )}
              
              {/* Exit Button */}
              <button
                onClick={handleBackToUpload}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-all duration-200"
                title="Exit Interview"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Previous Q&As */}
        {currentCandidate.answers.map((answer: Answer, index: number) => (
          <div key={answer.questionId} className="space-y-3">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-2xl border border-blue-200">
              <div className="flex justify-between items-start mb-3">
                <span className="text-sm font-bold text-blue-800 bg-blue-200 px-3 py-1 rounded-full">
                  Question {index + 1}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  answer.difficulty === 'easy' ? 'bg-green-200 text-green-800' :
                  answer.difficulty === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                  'bg-red-200 text-red-800'
                }`}>
                  {answer.difficulty.toUpperCase()}
                </span>
              </div>
              <p className="text-gray-800 font-medium">{answer.question}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <p className="text-gray-800 mb-4">{answer.answer}</p>
              <div className="flex justify-between items-center text-sm">
                <span className={`font-semibold px-3 py-1 rounded-full ${
                  answer.score >= 8 ? 'bg-green-100 text-green-700' :
                  answer.score >= 6 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  Score: {answer.score}/10
                </span>
                <span className="text-gray-600">
                  Time: {formatTime(answer.timeSpent)}/{formatTime(answer.maxTime)}
                </span>
              </div>
              {answer.feedback && (
                <div className="mt-4 p-4 bg-blue-50 rounded-xl border-l-4 border-blue-400">
                  <p className="text-sm text-blue-800">
                    <strong className="text-blue-900">AI Feedback:</strong> {answer.feedback}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Current Question */}
        {currentQuestion && (
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-2xl text-white shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <span className="text-sm font-bold bg-white bg-opacity-20 px-3 py-1 rounded-full">
                Current Question
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRepeatQuestion}
                  disabled={!audioEnabled || isSpeaking}
                  className="p-2 bg-white bg-opacity-20 rounded-full hover:bg-opacity-30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  title="Repeat question (or say 'repeat question')"
                >
                  <Volume2 size={18} />
                </button>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  currentQuestion.difficulty === 'easy' ? 'bg-green-500 text-white' :
                  currentQuestion.difficulty === 'medium' ? 'bg-yellow-500 text-white' :
                  'bg-red-500 text-white'
                }`}>
                  {currentQuestion.difficulty.toUpperCase()}
                </span>
              </div>
            </div>
            <p className="text-lg font-medium leading-relaxed">{currentQuestion.text}</p>
            {audioEnabled && (
              <div className="mt-4 p-3 bg-white bg-opacity-10 rounded-lg">
                <p className="text-sm text-blue-100">
                  💡 Say "repeat question" to hear it again
                </p>
              </div>
            )}
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Answer Input */}
      {currentQuestion && (
        <div className="border-t border-blue-100 bg-white p-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <textarea
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder={isListening ? "🎤 Listening... Speak your answer or say 'repeat question'" : "Type your answer here or use voice input..."}
                className="w-full p-4 border-2 border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-800"
                rows={4}
              />
              {isListening && (
                <div className="flex items-center gap-3 mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-red-700">
                    Recording... Say "repeat question" to hear it again
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleVoiceToggle}
                className={`p-4 rounded-xl transition-all duration-200 ${
                  isListening 
                    ? 'bg-red-100 text-red-700 animate-pulse shadow-lg' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title={isListening ? 'Stop listening' : 'Start voice input'}
              >
                {isListening ? <MicOff size={24} /> : <Mic size={24} />}
              </button>
              <button
                onClick={handleSubmitAnswer}
                disabled={isLoading || (!currentAnswer.trim() && !isListening)}
                className="p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                title="Submit answer"
              >
                <Send size={24} />
              </button>
            </div>
          </div>
          <div className="flex justify-between items-center mt-4 text-sm">
            <span className="text-gray-600">
              {currentAnswer.trim().length > 0 && (
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                  {currentAnswer.trim().split(' ').length} words
                </span>
              )}
            </span>
            <span className="text-gray-500">
              <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Ctrl+Enter</kbd> to submit • 
              <kbd className="px-2 py-1 bg-gray-100 rounded text-xs ml-1">Esc</kbd> to stop listening
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border-t border-red-200">
          <div className="flex items-center text-red-800">
            <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
            {error}
          </div>
        </div>
      )}
    </div>
  );
};