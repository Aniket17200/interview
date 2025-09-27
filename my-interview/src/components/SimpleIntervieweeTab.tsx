import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Upload, Mic, MicOff, Volume2, VolumeX, Send, Clock, ArrowLeft, Brain, X, Home } from 'lucide-react';
import type { RootState, AppDispatch } from '../store';
import { 
  setCurrentCandidate, 
  setCurrentQuestion,
  startTimer,
  stopTimer,
  updateTimer,
  resetInterview,
  startInterviewLocal,

  completeInterviewLocal,
  createCandidateAsync,
  completeInterviewAsync
} from '../store/slices/interviewSlice';

import { ResumeParser } from '../services/resumeParser';
import { geminiService } from '../services/geminiService';
import { SystemTest } from './SystemTest';
import type { Candidate, Question, Answer } from '../types';

const QUESTIONS_PER_INTERVIEW = 6;
const TIME_LIMITS = { easy: 20, medium: 60, hard: 120 };

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #dbeafe 0%, #ffffff 50%, #e0e7ff 100%)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  centerContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '1.5rem'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '1rem',
    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 10px 10px -5px rgb(0 0 0 / 0.04)',
    border: '1px solid #dbeafe',
    padding: '2rem',
    maxWidth: '32rem',
    width: '100%'
  },
  uploadArea: {
    border: '2px dashed #bfdbfe',
    borderRadius: '0.75rem',
    padding: '2rem',
    textAlign: 'center' as const,
    cursor: 'pointer',
    transition: 'all 0.3s ease-in-out',
    backgroundColor: 'white',
    marginBottom: '1rem'
  },
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.75rem 1.5rem',
    borderRadius: '0.75rem',
    fontWeight: '600',
    transition: 'all 0.2s ease-in-out',
    cursor: 'pointer',
    border: 'none',
    textDecoration: 'none',
    fontSize: '1rem'
  },
  buttonPrimary: {
    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    color: 'white',
    boxShadow: '0 4px 14px 0 rgb(37 99 235 / 0.39)'
  },
  input: {
    width: '100%',
    padding: '1rem',
    border: '2px solid #e5e7eb',
    borderRadius: '0.75rem',
    fontSize: '1rem',
    transition: 'all 0.2s ease-in-out',
    backgroundColor: 'white'
  },
  textarea: {
    width: '100%',
    padding: '1rem',
    border: '2px solid #e5e7eb',
    borderRadius: '0.75rem',
    fontSize: '1rem',
    transition: 'all 0.2s ease-in-out',
    backgroundColor: 'white',
    resize: 'none' as const,
    fontFamily: 'inherit'
  },
  errorBox: {
    marginTop: '1rem',
    padding: '1rem',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#991b1b',
    borderRadius: '0.75rem',
    display: 'flex',
    alignItems: 'center'
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '2rem'
  },
  iconContainer: {
    width: '80px',
    height: '80px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
    borderRadius: '50%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1rem',
    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'
  }
};

export const SimpleIntervieweeTab: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { 
    currentCandidate, 
    currentSessionId, 
    isInterviewActive, 
    currentQuestion, 
    timeRemaining, 
    isTimerRunning,
    isLoading,
    error 
  } = useSelector((state: RootState) => state.interview);

  // Debug logging
  console.log('SimpleIntervieweeTab render:', {
    currentCandidate: currentCandidate?.name,
    isInterviewActive,
    currentQuestion: currentQuestion?.text,
    currentSessionId
  });
  
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [collectedInfo, setCollectedInfo] = useState({ name: '', email: '', phone: '' });
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [showSystemTest, setShowSystemTest] = useState(false);
  const [systemTestCompleted, setSystemTestCompleted] = useState(false);
  const [showPatienceMessage, setShowPatienceMessage] = useState(false);
  const [hasAskedQuestion, setHasAskedQuestion] = useState(false);
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<number | undefined>(undefined);

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

  // Auto-start listening when question is ready
  useEffect(() => {
    if (currentQuestion && audioEnabled && !isListening && !isSpeaking && hasAskedQuestion) {
      const timer = setTimeout(() => {
        startAutoListening();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [currentQuestion, audioEnabled, isListening, isSpeaking, hasAskedQuestion]);

  // Handle microphone errors
  useEffect(() => {
    if (error && error.includes('microphone')) {
      setIsListening(false);
      setAudioEnabled(false);
    }
  }, [error]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isPDF = file.type === 'application/pdf' || fileName.endsWith('.pdf');
    const isDOCX = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx');
    
    if (!isPDF && !isDOCX) {
      console.error('Please upload a PDF or DOCX file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      console.error('File size too large. Please upload a file smaller than 10MB.');
      return;
    }

    try {
      const parsedData = await ResumeParser.parseFile(file);
      
      const candidateData: Omit<Candidate, 'id'> = {
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

      // Check for missing fields before creating candidate
      const missing = [];
      if (!candidateData.name) missing.push('name');
      if (!candidateData.email) missing.push('email');
      if (!candidateData.phone) missing.push('phone');
      
      if (missing.length === 0) {
        // All required fields present, try to create candidate in database
        try {
          const result = await dispatch(createCandidateAsync(candidateData));
          if (createCandidateAsync.fulfilled.match(result)) {
            // Candidate created successfully
            setMissingFields([]);
          } else {
            // Database failed, use local mode
            console.log('Database creation failed, using local mode');
            dispatch(setCurrentCandidate({ ...candidateData, id: Date.now().toString() }));
            setMissingFields([]);
          }
        } catch (dbError) {
          // Database error, fall back to local mode
          console.log('Database error, using local mode:', dbError);
          dispatch(setCurrentCandidate({ ...candidateData, id: Date.now().toString() }));
          setMissingFields([]);
        }
      } else {
        // Missing fields, set temporary candidate for info collection
        dispatch(setCurrentCandidate({ ...candidateData, id: 'temp' }));
        setMissingFields(missing);
        setCollectedInfo({
          name: candidateData.name,
          email: candidateData.email,
          phone: candidateData.phone
        });
      }

    } catch (err) {
      console.error('Resume parsing error:', err);
    } finally {
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleInfoSubmit = async () => {
    if (!collectedInfo.name || !collectedInfo.email || !collectedInfo.phone) {
      return;
    }

    if (!currentCandidate) return;

    try {
      // Create candidate with complete info
      const candidateData: Omit<Candidate, 'id'> = {
        ...currentCandidate,
        ...collectedInfo
      };

      const result = await dispatch(createCandidateAsync(candidateData));
      if (createCandidateAsync.fulfilled.match(result)) {
        setMissingFields([]);
      } else {
        // Database failed, use local mode
        console.log('Database creation failed, using local mode');
        dispatch(setCurrentCandidate({ ...candidateData, id: Date.now().toString() }));
        setMissingFields([]);
      }
    } catch (err) {
      console.error('Error creating candidate, using local mode:', err);
      // Fall back to local mode
      const candidateData: Candidate = {
        ...currentCandidate,
        ...collectedInfo,
        id: Date.now().toString()
      };
      dispatch(setCurrentCandidate(candidateData));
      setMissingFields([]);
    }
  };

  const handleStartInterview = async () => {
    if (!currentCandidate) return;

    // Check for real Gemini API key before starting
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_real_gemini_api_key_here') {
      alert('🔑 Gemini API Key Required\n\nTo ensure accurate AI evaluation of your answers, please:\n\n1. Get a free API key from Google AI Studio (https://makersuite.google.com/app/apikey)\n2. Add it to your .env file as VITE_GEMINI_API_KEY=your_actual_key\n3. Restart the application\n\nWithout a real API key, we cannot provide genuine AI-based scoring.');
      return;
    }

    console.log('Starting interview for candidate:', currentCandidate.name);
    console.log('✅ Gemini API key detected - real AI evaluation enabled');

    try {
      // Ensure candidate has a proper ID
      let candidateToUse = currentCandidate;
      if (currentCandidate.id === 'temp') {
        candidateToUse = { ...currentCandidate, id: Date.now().toString() };
        dispatch(setCurrentCandidate(candidateToUse));
      }

      // Start interview with AI evaluation enabled
      console.log('Starting interview with real AI evaluation');
      dispatch(startInterviewLocal());
      
      // Generate the first question
      await generateNextQuestionLocal();

    } catch (err) {
      console.error('Failed to start interview:', err);
    }
  };



  const generateNextQuestionLocal = async () => {
    console.log('Generating next question locally...');
    
    if (!currentCandidate) {
      console.error('No current candidate found');
      return;
    }

    const questionIndex = currentCandidate.currentQuestionIndex;
    console.log(`Question index: ${questionIndex}, Max questions: ${QUESTIONS_PER_INTERVIEW}`);
    
    if (questionIndex >= QUESTIONS_PER_INTERVIEW) {
      console.log('Interview complete, finishing...');
      await handleCompleteInterviewLocal();
      return;
    }

    let difficulty: 'easy' | 'medium' | 'hard';
    if (questionIndex < 2) difficulty = 'easy';
    else if (questionIndex < 4) difficulty = 'medium';
    else difficulty = 'hard';

    console.log(`Generating ${difficulty} question for index ${questionIndex}`);
    
    try {
      // Try Gemini API first, fallback to personalized questions
      let questionText: string;
      
      try {
        console.log('Attempting to generate question with Gemini API...');
        const previousQuestions = currentCandidate.answers.map((a: Answer) => a.question);
        
        questionText = await geminiService.generateQuestion({
          difficulty,
          previousQuestions,
          candidateProfile: { 
            name: currentCandidate.name,
            resumeText: currentCandidate.resumeText,
            experience: currentCandidate.experience
          }
        });
        console.log('Gemini API generated question:', questionText);
      } catch (apiError) {
        console.log('Gemini API not available, using personalized fallback question');
        questionText = getFallbackQuestion(difficulty, questionIndex);
      }

      const question: Question = {
        id: `q_${Date.now()}`,
        text: questionText,
        difficulty,
        maxTime: TIME_LIMITS[difficulty],
        category: 'full-stack'
      };

      console.log('Generated question:', question);

      dispatch(setCurrentQuestion(question));
      dispatch(startTimer());
      setHasAskedQuestion(false);
      await handleQuestionPresentation(question, questionIndex);

    } catch (err) {
      console.error('Failed to generate question:', err);
    }
  };

  const handleQuestionPresentation = async (question: Question, questionIndex: number) => {
    console.log('Presenting question:', question.text);
    console.log('Audio enabled:', audioEnabled);
    
    // Stop any existing listening to prevent feedback loops
    if (isListening) {
      geminiService.stopListening();
      setIsListening(false);
    }
    
    if (audioEnabled) {
      setIsSpeaking(true);
      try {
        const welcomeMessage = questionIndex === 0 
          ? `Hello ${currentCandidate?.name}! Welcome to your interview. Question 1: ${question.text}`
          : `Question ${questionIndex + 1}: ${question.text}`;
        console.log('Speaking message:', welcomeMessage);
        await geminiService.speak(welcomeMessage);
        setHasAskedQuestion(true);
      } catch (err) {
        console.error('TTS Error:', err);
        setHasAskedQuestion(true);
      } finally {
        setIsSpeaking(false);
        // Longer delay after TTS to prevent feedback and give user time to process
        setTimeout(() => {
          if (audioEnabled && !isListening && !isSpeaking) {
            console.log('Starting listening after TTS completed');
            startAutoListening();
          }
        }, 2000); // Increased to 2 seconds
      }
    } else {
      console.log('Audio disabled, showing question text only');
      setHasAskedQuestion(true);
      // Don't auto-start listening if audio is disabled
    }
  };

  const getFallbackQuestion = (difficulty: string, questionIndex: number): string => {
    // Get candidate skills for personalized questions
    const candidateSkills = currentCandidate?.skills || [];
    const hasReact = candidateSkills.some(skill => skill.toLowerCase().includes('react'));
    const hasNode = candidateSkills.some(skill => skill.toLowerCase().includes('node'));
    const hasDatabase = candidateSkills.some(skill => 
      skill.toLowerCase().includes('sql') || 
      skill.toLowerCase().includes('mongodb') || 
      skill.toLowerCase().includes('database')
    );
    
    const fallbackQuestions = {
      easy: [
        hasReact 
          ? "I see you have React experience. Can you explain what JSX is and how it differs from regular HTML?"
          : "Can you explain what JavaScript is and why it's used in web development?",
        
        candidateSkills.length > 0
          ? `I noticed you have experience with ${candidateSkills[0]}. How did you learn this technology and what projects have you used it in?`
          : "What is the difference between HTML and CSS, and how do they work together?",
        
        hasDatabase
          ? "You mentioned database experience. Can you explain the difference between SQL and NoSQL databases?"
          : "How do you create and use functions in JavaScript? Can you give me an example?",
        
        "Tell me about a challenging bug you encountered in your coding experience and how you solved it."
      ],
      medium: [
        hasReact 
          ? "Since you know React, can you explain the concept of state management and when you would use useState vs useEffect?"
          : "Explain the concept of components in modern web development and their benefits.",
        
        hasNode
          ? "I see you have Node.js experience. How would you handle asynchronous operations and what are Promises?"
          : "What is the difference between synchronous and asynchronous programming? Give me a practical example.",
        
        candidateSkills.length > 2
          ? `You have experience with multiple technologies: ${candidateSkills.slice(0, 3).join(', ')}. How do you decide which technology to use for a new project?`
          : "How would you handle user input validation in a web form? What are the security considerations?",
        
        hasDatabase
          ? "Describe how you would design a database schema for a simple e-commerce application with users, products, and orders."
          : "What are APIs and how would you integrate a third-party API into your web application?"
      ],
      hard: [
        candidateSkills.length > 0
          ? `Based on your experience with ${candidateSkills.slice(0, 2).join(' and ')}, how would you architect a scalable web application that could handle millions of users?`
          : "How would you design a scalable web application architecture that can handle high traffic?",
        
        hasReact && hasNode
          ? "You have full-stack experience. How would you implement real-time features like live chat or notifications in a React and Node.js application?"
          : "Explain how you would optimize the performance of a slow web application. What tools and techniques would you use?",
        
        hasDatabase
          ? "Describe your approach to database optimization and how you would handle data consistency in a distributed system."
          : "How would you implement a secure user authentication system? What are the key security considerations?",
        
        candidateSkills.length > 3
          ? `With your diverse skill set in ${candidateSkills.slice(0, 4).join(', ')}, how would you lead a technical team and make architectural decisions for a complex project?`
          : "How would you handle system monitoring, logging, and error tracking in a production web application?"
      ]
    };
    
    const questions = fallbackQuestions[difficulty as keyof typeof fallbackQuestions] || fallbackQuestions.medium;
    return questions[questionIndex % questions.length];
  };

  const retryPendingEvaluations = async () => {
    if (!currentCandidate) return;

    const pendingAnswers = currentCandidate.answers.filter((answer: Answer) => answer.score === -1);
    if (pendingAnswers.length === 0) return;

    console.log(`🔄 Retrying ${pendingAnswers.length} pending evaluations...`);
    
    const updatedAnswers = [...currentCandidate.answers];
    let hasUpdates = false;

    for (let i = 0; i < updatedAnswers.length; i++) {
      if (updatedAnswers[i].score === -1) {
        try {
          console.log(`🤖 Retrying evaluation for answer ${i + 1}...`);
          const evaluation = await geminiService.evaluateAnswer({
            question: updatedAnswers[i].question,
            answer: updatedAnswers[i].answer,
            difficulty: updatedAnswers[i].difficulty,
            timeSpent: updatedAnswers[i].timeSpent,
            maxTime: updatedAnswers[i].maxTime
          });
          
          updatedAnswers[i] = {
            ...updatedAnswers[i],
            score: evaluation.score,
            feedback: evaluation.feedback
          };
          hasUpdates = true;
          console.log(`✅ Successfully evaluated answer ${i + 1}: ${evaluation.score}/10`);
        } catch (error) {
          console.log(`❌ Failed to evaluate answer ${i + 1}:`, error);
          // Keep as pending for now
        }
      }
    }

    if (hasUpdates) {
      const updatedCandidate = {
        ...currentCandidate,
        answers: updatedAnswers
      };
      dispatch(setCurrentCandidate(updatedCandidate));
      console.log('✅ Updated candidate with new evaluations');
    }
  };

  const handleCompleteInterviewLocal = async () => {
    if (!currentCandidate) return;
    
    try {
      // Filter out pending evaluations (score = -1) for scoring calculation
      const evaluatedAnswers = currentCandidate.answers.filter((answer: Answer) => answer.score >= 0);
      const pendingAnswers = currentCandidate.answers.filter((answer: Answer) => answer.score === -1);
      
      const totalScore = evaluatedAnswers.reduce((sum: number, answer: Answer) => sum + answer.score, 0);
      const averageScore = evaluatedAnswers.length > 0 ? totalScore / evaluatedAnswers.length : 0;
      
      // Generate comprehensive summary
      let summary = `Interview completed successfully! 
      
📊 Overall Score: ${evaluatedAnswers.length > 0 ? averageScore.toFixed(1) + '/10' : 'Pending AI Evaluation'}
📝 Questions Answered: ${currentCandidate.answers.length}/6
⏱️ Interview Duration: Complete`;

      if (pendingAnswers.length > 0) {
        summary += `
⏳ Pending Evaluations: ${pendingAnswers.length} answer(s) awaiting AI scoring`;
      }

      if (evaluatedAnswers.length > 0) {
        summary += `
🎯 Performance Level: ${averageScore >= 8 ? 'Excellent' : averageScore >= 6 ? 'Good' : averageScore >= 4 ? 'Fair' : 'Needs Improvement'}

The candidate demonstrated ${averageScore >= 7 ? 'strong' : averageScore >= 5 ? 'adequate' : 'basic'} technical knowledge across different difficulty levels.`;
      } else {
        summary += `

🔄 All answers are currently being processed by AI evaluation. Scores will be available shortly.`;
      }

      // Try to store in Supabase first, fallback to local
      try {
        if (currentSessionId && currentCandidate.id !== 'temp') {
          console.log('Attempting to save interview results to Supabase...');
          const result = await dispatch(completeInterviewAsync({ 
            sessionId: currentSessionId, 
            score: averageScore, 
            summary 
          }));
          
          if (completeInterviewAsync.fulfilled.match(result)) {
            console.log('✅ Interview results saved to Supabase successfully!');
            return;
          }
        }
      } catch (dbError) {
        console.log('Supabase storage failed, using local storage:', dbError);
      }

      // Fallback to local storage
      console.log('💾 Saving interview results locally...');
      dispatch(completeInterviewLocal({
        score: averageScore,
        summary: summary
      }));
      
      console.log('✅ Interview completed and stored locally!');
      
      // Start background retry for pending evaluations
      const pendingCount = currentCandidate.answers.filter((answer: Answer) => answer.score === -1).length;
      if (pendingCount > 0) {
        console.log(`🔄 Starting background retry for ${pendingCount} pending evaluations...`);
        setTimeout(() => {
          retryPendingEvaluations();
        }, 3000); // Retry after 3 seconds
      }
      
    } catch (err) {
      console.error('Failed to complete interview:', err);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!currentQuestion || !currentCandidate) return;

    if (isListening) {
      geminiService.stopListening();
      setIsListening(false);
    }

    if (isSpeaking) {
      geminiService.stopSpeaking();
      setIsSpeaking(false);
    }

    dispatch(stopTimer());
    
    const timeSpent = currentQuestion.maxTime - timeRemaining;
    const finalAnswer = currentAnswer.trim() || 'No answer provided';
    
    if (audioEnabled && finalAnswer !== 'No answer provided') {
      // Stop listening during acknowledgment to prevent feedback
      if (isListening) {
        geminiService.stopListening();
        setIsListening(false);
      }
      
      setIsAcknowledging(true);
      try {
        const acknowledgment = await generateAcknowledgment(finalAnswer);
        console.log('Speaking acknowledgment:', acknowledgment);
        await geminiService.speak(acknowledgment);
        
        // Professional pause after acknowledgment
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        console.error('Error acknowledging answer:', err);
      } finally {
        setIsAcknowledging(false);
      }
    }
    
    try {
      let evaluation;
      
      // Always require real Gemini AI evaluation - no dummy scores
      try {
        console.log('🤖 Evaluating answer with Gemini AI...');
        evaluation = await geminiService.evaluateAnswer({
          question: currentQuestion.text,
          answer: finalAnswer,
          difficulty: currentQuestion.difficulty,
          timeSpent,
          maxTime: currentQuestion.maxTime
        });
        console.log('✅ Gemini AI evaluation completed:', evaluation);
      } catch (apiError) {
        console.error('❌ Gemini AI evaluation failed:', apiError);
        
        // Check if we have a real API key
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey || apiKey === 'your_real_gemini_api_key_here') {
          alert('🔑 Gemini API Key Required\n\nTo ensure accurate AI evaluation of your answers, please:\n\n1. Get a free API key from Google AI Studio (https://makersuite.google.com/app/apikey)\n2. Add it to your .env file as VITE_GEMINI_API_KEY=your_actual_key\n3. Restart the application\n\nWithout a real API key, we cannot provide genuine AI-based scoring.');
          return; // Don't submit without real evaluation
        }
        
        // If API key exists but call failed, retry once then allow submission with pending status
        console.log('🔄 Retrying Gemini AI evaluation...');
        try {
          // Wait a moment and retry
          await new Promise(resolve => setTimeout(resolve, 2000));
          evaluation = await geminiService.evaluateAnswer({
            question: currentQuestion.text,
            answer: finalAnswer,
            difficulty: currentQuestion.difficulty,
            timeSpent,
            maxTime: currentQuestion.maxTime
          });
          console.log('✅ Gemini AI evaluation succeeded on retry:', evaluation);
        } catch (retryError) {
          console.error('❌ Gemini AI evaluation failed on retry:', retryError);
          // Allow submission but mark as pending evaluation
          evaluation = {
            score: -1, // Special marker for pending evaluation
            feedback: 'Answer submitted successfully. AI evaluation pending - will be processed shortly.'
          };
          console.log('📝 Answer submitted with pending evaluation status');
        }
      }

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

      // Store locally and continue (database integration disabled for now)
      const updatedCandidate = {
        ...currentCandidate,
        answers: [...currentCandidate.answers, answer],
        currentQuestionIndex: currentCandidate.currentQuestionIndex + 1
      };
      
      dispatch(setCurrentCandidate(updatedCandidate));
      setCurrentAnswer('');
      setHasAskedQuestion(false);
      
      // Continue with next question or complete interview
      if (updatedCandidate.currentQuestionIndex >= QUESTIONS_PER_INTERVIEW) {
        await handleCompleteInterviewLocal();
      } else {
        await generateNextQuestionLocal();
      }

    } catch (err) {
      console.error('Failed to submit answer:', err);
    }
  };





  const startAutoListening = () => {
    if (!audioEnabled || isListening || isSpeaking || isAcknowledging) {
      console.log('Cannot start listening:', { audioEnabled, isListening, isSpeaking, isAcknowledging });
      return;
    }
    
    console.log('Starting auto listening...');
    try {
      setIsListening(true);
      
      let finalTranscriptAccumulator = '';
      
      geminiService.startListening(
        (transcript: string, isFinal: boolean) => {
          const cleanTranscript = transcript.trim();
          
          // Handle repeat requests
          const repeatKeywords = ['repeat', 'again', 'say again', 'can you repeat', 'repeat question'];
          const isRepeatRequest = repeatKeywords.some(keyword => 
            cleanTranscript.toLowerCase().includes(keyword.toLowerCase())
          );
          
          if (isRepeatRequest && currentQuestion && isFinal) {
            handleRepeatQuestion();
            return;
          }
          
          // Handle final transcripts only - this prevents repetition
          if (isFinal && cleanTranscript.length > 0) {
            console.log('Final speech segment received:', cleanTranscript);
            setShowPatienceMessage(false);
            
            // Accumulate only final results
            finalTranscriptAccumulator += (finalTranscriptAccumulator ? ' ' : '') + cleanTranscript;
            
            // Update the answer with clean, final transcript
            setCurrentAnswer(finalTranscriptAccumulator);
            console.log('Clean final answer:', finalTranscriptAccumulator);
          } 
          // For interim results, just show we're listening (no text updates)
          else if (!isFinal && cleanTranscript.length > 0) {
            setShowPatienceMessage(false);
            console.log('Interim speech detected (not saved)');
          }
        },
        () => {
          console.log('Speech recognition session ended');
          setIsListening(false);
          // Reset accumulator for next session
          finalTranscriptAccumulator = '';
        }
      );
    } catch (err) {
      setIsListening(false);
      console.error('Microphone access failed. Please check permissions.');
    }
  };

  const handleVoiceToggle = () => {
    if (isListening) {
      geminiService.stopListening();
      setIsListening(false);
    } else {
      if (audioEnabled) {
        startAutoListening();
      } else {
        console.error('Audio not enabled. Please test your system first.');
      }
    }
  };

  const handleRepeatQuestion = async () => {
    if (currentQuestion && audioEnabled) {
      setIsSpeaking(true);
      try {
        await geminiService.speak(`I'll repeat the question: ${currentQuestion.text}`);
      } catch (err) {
        console.error('Error speaking question:', err);
      } finally {
        setIsSpeaking(false);
        setTimeout(() => {
          if (audioEnabled && !isListening) {
            startAutoListening();
          }
        }, 300);
      }
    }
  };

  const generateAcknowledgment = async (answer: string): Promise<string> => {
    // Generate natural acknowledgments based on answer length and content
    const answerLength = answer.trim().length;
    const hasCodeMention = /\b(function|class|component|api|database|server|code|implement|algorithm)\b/i.test(answer);
    const hasTechnicalTerms = /\b(react|javascript|node|express|mongodb|sql|html|css|async|promise)\b/i.test(answer);
    
    let acknowledgments: string[] = [];
    
    if (answerLength > 200) {
      acknowledgments = [
        "Thank you for that detailed explanation.",
        "I appreciate the comprehensive answer you provided.",
        "That was a thorough response, thank you.",
        "Thank you for walking me through your approach in detail."
      ];
    } else if (answerLength > 100) {
      acknowledgments = [
        "Thank you for that answer.",
        "I understand your approach, thank you.",
        "That's a good explanation, thank you.",
        "Thank you for sharing your thoughts on that."
      ];
    } else if (answerLength > 50) {
      acknowledgments = [
        "Thank you for your response.",
        "I see, thank you.",
        "Understood, thank you.",
        "Thank you for that."
      ];
    } else {
      acknowledgments = [
        "Thank you.",
        "I see, thank you.",
        "Understood.",
        "Thank you for your answer."
      ];
    }
    
    // Add technical context if applicable
    if (hasTechnicalTerms && answerLength > 100) {
      const technicalAcknowledgments = [
        "Thank you for explaining the technical details.",
        "I appreciate you covering the technical aspects.",
        "Thank you for the technical breakdown.",
        "That's a solid technical explanation, thank you."
      ];
      acknowledgments = [...acknowledgments, ...technicalAcknowledgments];
    }
    
    if (hasCodeMention && answerLength > 150) {
      const codeAcknowledgments = [
        "Thank you for discussing the implementation approach.",
        "I appreciate you explaining the coding aspects.",
        "Thank you for walking through the development process.",
        "That's helpful insight into the implementation, thank you."
      ];
      acknowledgments = [...acknowledgments, ...codeAcknowledgments];
    }
    
    // Return a random acknowledgment
    return acknowledgments[Math.floor(Math.random() * acknowledgments.length)];
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
    setHasAskedQuestion(false);
    setIsAcknowledging(false);
  };

  const handleSystemTestComplete = (audioSupported: boolean) => {
    setAudioEnabled(audioSupported);
    setSystemTestCompleted(true);
    setShowSystemTest(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (showSystemTest) {
    return (
      <SystemTest 
        onComplete={handleSystemTestComplete}
        onBack={() => setShowSystemTest(false)}
      />
    );
  }

  // Interview Results Screen
  if (currentCandidate && currentCandidate.status === 'completed') {
    const totalScore = currentCandidate.answers.reduce((sum: number, answer: Answer) => sum + answer.score, 0);
    const averageScore = currentCandidate.answers.length > 0 ? totalScore / currentCandidate.answers.length : 0;
    
    const getPerformanceLevel = (score: number) => {
      if (score >= 8.5) return { level: 'Excellent', color: '#059669', bg: '#d1fae5' };
      if (score >= 7) return { level: 'Good', color: '#0369a1', bg: '#dbeafe' };
      if (score >= 5.5) return { level: 'Fair', color: '#d97706', bg: '#fef3c7' };
      return { level: 'Needs Improvement', color: '#dc2626', bg: '#fee2e2' };
    };
    
    const performance = getPerformanceLevel(averageScore);
    
    return (
      <div style={styles.container}>
        <div style={styles.centerContainer}>
          <div style={{ ...styles.card, maxWidth: '48rem', textAlign: 'center' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <button
                onClick={handleBackToUpload}
                style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb' }}
              >
                <ArrowLeft size={20} style={{ marginRight: '0.5rem' }} />
                New Interview
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
                title="Go to Home"
              >
                <Home size={20} />
              </button>
            </div>

            {/* Success Icon */}
            <div style={{
              width: '100px',
              height: '100px',
              background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
              borderRadius: '50%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.5rem',
              boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'
            }}>
              <Brain style={{ width: '50px', height: '50px', color: 'white' }} />
            </div>

            {/* Results Header */}
            <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem' }}>
              Interview Complete! 🎉
            </h1>
            <p style={{ fontSize: '1.25rem', color: '#4b5563', marginBottom: '2rem' }}>
              Thank you {currentCandidate.name}, here are your results
            </p>

            {/* Overall Score */}
            <div style={{
              padding: '2rem',
              borderRadius: '1rem',
              backgroundColor: performance.bg,
              border: `2px solid ${performance.color}20`,
              marginBottom: '2rem'
            }}>
              <div style={{ fontSize: '4rem', fontWeight: 'bold', color: performance.color, marginBottom: '0.5rem' }}>
                {averageScore.toFixed(1)}/10
              </div>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                color: performance.color,
                marginBottom: '0.5rem'
              }}>
                {performance.level}
              </div>
              <p style={{ color: '#4b5563', fontSize: '1rem' }}>
                Overall Interview Performance
              </p>
            </div>

            {/* Detailed Breakdown */}
            <div style={{ textAlign: 'left', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
                📊 Detailed Performance Breakdown
              </h3>
              
              <div style={{ display: 'grid', gap: '1rem' }}>
                {currentCandidate.answers.map((answer: Answer, index: number) => (
                  <div key={answer.questionId} style={{
                    padding: '1.5rem',
                    borderRadius: '0.75rem',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          backgroundColor: answer.difficulty === 'easy' ? '#dbeafe' : answer.difficulty === 'medium' ? '#fef3c7' : '#fee2e2',
                          color: answer.difficulty === 'easy' ? '#1d4ed8' : answer.difficulty === 'medium' ? '#d97706' : '#dc2626'
                        }}>
                          {answer.difficulty.toUpperCase()}
                        </span>
                        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                          Question {index + 1}
                        </span>
                      </div>
                      <div style={{
                        fontSize: '1.25rem',
                        fontWeight: 'bold',
                        color: answer.score >= 8 ? '#059669' : answer.score >= 6 ? '#0369a1' : answer.score >= 4 ? '#d97706' : '#dc2626'
                      }}>
                        {answer.score.toFixed(1)}/10
                      </div>
                    </div>
                    
                    <p style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '0.75rem', fontWeight: '500' }}>
                      Q: {answer.question}
                    </p>
                    
                    <p style={{ fontSize: '0.875rem', color: '#4b5563', marginBottom: '0.75rem' }}>
                      A: {answer.answer.length > 150 ? `${answer.answer.substring(0, 150)}...` : answer.answer}
                    </p>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#6b7280' }}>
                      <span>Time: {answer.timeSpent}s / {answer.maxTime}s</span>
                      <span>{answer.feedback}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem'
            }}>
              <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: '0.75rem' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#059669' }}>
                  {currentCandidate.answers.length}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#065f46' }}>Questions Answered</div>
              </div>
              
              <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#eff6ff', borderRadius: '0.75rem' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0369a1' }}>
                  {currentCandidate.answers.filter(a => a.score >= 7).length}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#0c4a6e' }}>Strong Answers</div>
              </div>
              
              <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#fef3c7', borderRadius: '0.75rem' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#d97706' }}>
                  {Math.round(currentCandidate.answers.reduce((sum, a) => sum + a.timeSpent, 0) / 60)}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#92400e' }}>Minutes Total</div>
              </div>
            </div>

            {/* AI Summary */}
            {currentCandidate.summary && (
              <div style={{
                padding: '1.5rem',
                backgroundColor: '#f8fafc',
                borderRadius: '0.75rem',
                border: '1px solid #e2e8f0',
                marginBottom: '2rem',
                textAlign: 'left'
              }}>
                <h4 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
                  🤖 AI Interview Summary
                </h4>
                <p style={{ color: '#4b5563', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                  {currentCandidate.summary}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                onClick={handleBackToUpload}
                style={{
                  ...styles.button,
                  ...styles.buttonPrimary,
                  backgroundColor: '#059669',
                  boxShadow: '0 4px 14px 0 rgb(5 150 105 / 0.39)'
                }}
              >
                Take Another Interview
              </button>
              <button
                onClick={() => {
                  // Switch to interviewer tab to see results
                  window.dispatchEvent(new CustomEvent('switchToInterviewer'));
                }}
                style={{
                  ...styles.button,
                  backgroundColor: '#f8fafc',
                  color: '#374151',
                  border: '1px solid #e2e8f0'
                }}
              >
                View in Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentCandidate) {
    return (
      <div style={styles.container}>
        <div style={styles.centerContainer}>
          <div style={{ ...styles.card, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
              <button
                onClick={() => window.location.reload()}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
                title="Go to Home"
              >
                <Home size={20} />
              </button>
            </div>

            <div style={styles.header}>
              <div style={styles.iconContainer}>
                <Brain style={{ width: '40px', height: '40px', color: 'white' }} />
              </div>
              <h1 style={{ fontSize: '2.25rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.75rem' }}>
                AI Interview Assistant
              </h1>
              <p style={{ fontSize: '1.125rem', color: '#4b5563' }}>
                Upload your resume to begin your personalized interview experience
              </p>
            </div>

            <div 
              style={styles.uploadArea}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload style={{ 
                width: '64px', 
                height: '64px', 
                color: '#60a5fa', 
                margin: '0 auto 1rem auto',
                display: 'block'
              }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
                {isLoading ? 'Processing your resume...' : 'Upload Your Resume'}
              </h3>
              <p style={{ color: '#4b5563', marginBottom: '1rem' }}>
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

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            
            {error && (
              <div style={styles.errorBox}>
                <div style={{ width: '8px', height: '8px', backgroundColor: '#ef4444', borderRadius: '50%', marginRight: '0.75rem' }}></div>
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (missingFields.length > 0) {
    return (
      <div style={styles.container}>
        <div style={styles.centerContainer}>
          <div style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <button
                onClick={handleBackToUpload}
                style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb' }}
              >
                <ArrowLeft size={20} style={{ marginRight: '0.5rem' }} />
                Back to Upload
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
                title="Go to Home"
              >
                <Home size={20} />
              </button>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                backgroundColor: '#dbeafe', 
                borderRadius: '50%', 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                marginBottom: '1rem' 
              }}>
                <Brain style={{ width: '24px', height: '24px', color: '#2563eb' }} />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem' }}>
                Complete Your Profile
              </h2>
              <p style={{ color: '#4b5563' }}>
                We need a few more details to personalize your interview
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {missingFields.includes('name') && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={collectedInfo.name}
                    onChange={(e) => setCollectedInfo(prev => ({ ...prev, name: e.target.value }))}
                    style={styles.input}
                    placeholder="Enter your full name"
                  />
                </div>
              )}
              {missingFields.includes('email') && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={collectedInfo.email}
                    onChange={(e) => setCollectedInfo(prev => ({ ...prev, email: e.target.value }))}
                    style={styles.input}
                    placeholder="Enter your email address"
                  />
                </div>
              )}
              {missingFields.includes('phone') && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={collectedInfo.phone}
                    onChange={(e) => setCollectedInfo(prev => ({ ...prev, phone: e.target.value }))}
                    style={styles.input}
                    placeholder="Enter your phone number"
                  />
                </div>
              )}
              
              <button
                onClick={handleInfoSubmit}
                style={{ ...styles.button, ...styles.buttonPrimary, width: '100%' }}
              >
                Continue to Interview Setup
              </button>
            </div>

            {error && (
              <div style={styles.errorBox}>
                <div style={{ width: '8px', height: '8px', backgroundColor: '#ef4444', borderRadius: '50%', marginRight: '0.75rem' }}></div>
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!isInterviewActive) {
    return (
      <div style={styles.container}>
        <div style={styles.centerContainer}>
          <div style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <button
                onClick={handleBackToUpload}
                style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb' }}
              >
                <ArrowLeft size={20} style={{ marginRight: '0.5rem' }} />
                Back to Profile
              </button>
              <button
                onClick={handleBackToUpload}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
                title="Exit Interview"
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={styles.iconContainer}>
                <Brain style={{ width: '32px', height: '32px', color: 'white' }} />
              </div>
              <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem' }}>
                Ready to Begin?
              </h2>
              <p style={{ color: '#4b5563' }}>
                Your personalized AI interview is about to start
              </p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontWeight: '600', color: '#111827', marginBottom: '1rem', display: 'flex', alignItems: 'center' }}>
                <Volume2 style={{ width: '20px', height: '20px', color: '#2563eb', marginRight: '0.5rem' }} />
                Audio Features
              </h4>
              
              {!systemTestCompleted ? (
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#4b5563', marginBottom: '1rem' }}>
                    Test your microphone and speakers for the best interview experience
                  </p>
                  <button
                    onClick={() => setShowSystemTest(true)}
                    style={{ ...styles.button, ...styles.buttonPrimary, width: '100%', marginBottom: '0.5rem' }}
                  >
                    <Mic style={{ width: '20px', height: '20px', marginRight: '0.5rem' }} />
                    Test Audio System
                  </button>
                  <button
                    onClick={() => setSystemTestCompleted(true)}
                    style={{ width: '100%', fontSize: '0.875rem', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Skip audio test (text only)
                  </button>
                </div>
              ) : (
                <div style={{
                  padding: '1rem',
                  borderRadius: '0.75rem',
                  border: '2px solid',
                  borderColor: audioEnabled ? '#bbf7d0' : '#e5e7eb',
                  backgroundColor: audioEnabled ? '#f0fdf4' : '#f9fafb'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {audioEnabled ? (
                        <Volume2 style={{ width: '20px', height: '20px', color: '#16a34a', marginRight: '0.5rem' }} />
                      ) : (
                        <VolumeX style={{ width: '20px', height: '20px', color: '#6b7280', marginRight: '0.5rem' }} />
                      )}
                      <span style={{ fontWeight: '500', color: audioEnabled ? '#166534' : '#374151' }}>
                        {audioEnabled ? 'Audio System Ready' : 'Text Input Only'}
                      </span>
                    </div>
                    <button
                      onClick={() => setShowSystemTest(true)}
                      style={{ fontSize: '0.875rem', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      Retest
                    </button>
                  </div>
                  {audioEnabled && (
                    <p style={{ fontSize: '0.875rem', color: '#15803d', marginTop: '0.5rem' }}>
                      ✓ Voice input and text-to-speech enabled
                    </p>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={handleStartInterview}
              disabled={isLoading || !systemTestCompleted}
              style={{
                ...styles.button,
                ...styles.buttonPrimary,
                width: '100%',
                fontSize: '1.125rem',
                opacity: (isLoading || !systemTestCompleted) ? 0.5 : 1,
                cursor: (isLoading || !systemTestCompleted) ? 'not-allowed' : 'pointer'
              }}
            >
              {isLoading ? 'Preparing Interview...' : 'Start Interview'}
            </button>
            
            {!systemTestCompleted && (
              <p style={{ fontSize: '0.875rem', color: '#6b7280', textAlign: 'center', marginTop: '0.75rem' }}>
                Please complete the audio test to continue
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', ...styles.container }}>
      {/* Header */}
      <div style={{ 
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', 
        borderBottom: '1px solid #e2e8f0', 
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -1px rgb(0 0 0 / 0.06)',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{ padding: '1rem 1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '1rem',
                boxShadow: '0 4px 14px 0 rgb(59 130 246 / 0.39)'
              }}>
                <Brain style={{ width: '24px', height: '24px', color: 'white' }} />
              </div>
              <div>
                <h2 style={{ 
                  fontSize: '1.25rem', 
                  fontWeight: '700', 
                  color: '#1e293b', 
                  margin: 0,
                  letterSpacing: '-0.025em'
                }}>
                  AI Interview Assistant
                </h2>
                <p style={{ 
                  color: '#3b82f6', 
                  fontWeight: '500', 
                  margin: 0,
                  fontSize: '0.875rem'
                }}>
                  Question {currentCandidate.currentQuestionIndex + 1} of {QUESTIONS_PER_INTERVIEW}
                </p>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {currentQuestion && (
                <>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '12px',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    boxShadow: '0 2px 4px 0 rgb(0 0 0 / 0.1)',
                    backgroundColor: timeRemaining <= 10 ? '#fef2f2' : '#eff6ff',
                    color: timeRemaining <= 10 ? '#dc2626' : '#2563eb',
                    border: '1px solid',
                    borderColor: timeRemaining <= 10 ? '#fecaca' : '#bfdbfe',
                    animation: timeRemaining <= 10 ? 'pulse 1s infinite' : 'none'
                  }}>
                    <Clock size={16} />
                    {formatTime(timeRemaining)}
                  </div>
                  {isSpeaking && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 1rem',
                      borderRadius: '12px',
                      backgroundColor: '#f0fdf4',
                      color: '#16a34a',
                      border: '1px solid #bbf7d0',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}>
                      <Volume2 size={16} style={{ animation: 'pulse 2s infinite' }} />
                      {hasAskedQuestion ? 'AI Speaking...' : 'Asking Question...'}
                    </div>
                  )}
                  {isAcknowledging && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 1rem',
                      borderRadius: '12px',
                      backgroundColor: '#e0f2fe',
                      color: '#0369a1',
                      border: '1px solid #7dd3fc',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}>
                      <Volume2 size={16} style={{ animation: 'pulse 2s infinite' }} />
                      Acknowledging...
                    </div>
                  )}
                  {isListening && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 1rem',
                      borderRadius: '12px',
                      backgroundColor: '#fef3c7',
                      color: '#d97706',
                      border: '1px solid #fcd34d',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}>
                      <Mic size={16} style={{ animation: 'pulse 2s infinite' }} />
                      Listening patiently...
                    </div>
                  )}
                </>
              )}
              
              <button
                onClick={handleBackToUpload}
                style={{
                  padding: '0.5rem',
                  color: '#64748b',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out'
                }}
                title="Exit Interview"
                onMouseOver={(e) => {
                  e.currentTarget.style.color = '#dc2626';
                  e.currentTarget.style.backgroundColor = '#fef2f2';
                  e.currentTarget.style.borderColor = '#fecaca';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.color = '#64748b';
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
        {/* Current Question */}
        {currentQuestion && (
          <div style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: 'white',
            padding: '1.5rem',
            borderRadius: '1rem',
            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <span style={{
                fontSize: '0.875rem',
                fontWeight: 'bold',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px'
              }}>
                Current Question
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {hasAskedQuestion && (
                  <button
                    onClick={handleRepeatQuestion}
                    disabled={!audioEnabled || isSpeaking || isAcknowledging}
                    style={{
                      padding: '0.5rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      border: 'none',
                      borderRadius: '50%',
                      color: 'white',
                      cursor: (audioEnabled && !isSpeaking && !isAcknowledging) ? 'pointer' : 'not-allowed',
                      opacity: (audioEnabled && !isSpeaking && !isAcknowledging) ? 1 : 0.5,
                      transition: 'all 0.2s ease-in-out'
                    }}
                    title="Repeat question (or say 'repeat question')"
                    onMouseOver={(e) => {
                      if (audioEnabled && !isSpeaking && !isAcknowledging) {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                      }
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                    }}
                  >
                    <Volume2 size={18} />
                  </button>
                )}
              </div>
            </div>
            <p style={{ fontSize: '1.125rem', fontWeight: '500', lineHeight: '1.6', margin: 0 }}>
              {currentQuestion.text}
            </p>
            {audioEnabled && (
              <div style={{
                marginTop: '1rem',
                padding: '0.75rem',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '0.5rem'
              }}>
                <p style={{ fontSize: '0.875rem', color: 'rgba(219, 234, 254, 1)', margin: 0 }}>
                  💡 Say "repeat question" to hear it again
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Answer Input */}
      {currentQuestion && (
        <div style={{ 
          borderTop: '1px solid #e2e8f0', 
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', 
          padding: '1.5rem' 
        }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <div style={{ position: 'relative' }}>
                <textarea
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  placeholder={isListening ? "🎤 Listening... Speak clearly or type here" : audioEnabled ? "Voice ready - Speak or type your answer" : "Type your answer here"}
                  style={{ 
                    ...styles.textarea, 
                    minHeight: '120px',
                    paddingRight: audioEnabled ? '3rem' : '1rem',
                    borderColor: isListening ? '#fbbf24' : '#e5e7eb',
                    boxShadow: isListening ? '0 0 0 3px rgb(251 191 36 / 0.1)' : 'none'
                  }}
                  rows={4}
                />
                {audioEnabled && (
                  <div style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    {isListening ? (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        color: '#d97706'
                      }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          backgroundColor: '#f59e0b',
                          borderRadius: '50%',
                          animation: 'pulse 2s infinite'
                        }}></div>
                        <Mic size={16} />
                      </div>
                    ) : (
                      <Mic size={16} style={{ color: '#9ca3af' }} />
                    )}
                  </div>
                )}
              </div>
              
              {audioEnabled && (
                <div style={{
                  marginTop: '0.75rem',
                  padding: '1rem',
                  backgroundColor: isListening ? '#fef3c7' : '#f0f9ff',
                  borderRadius: '0.75rem',
                  border: '1px solid',
                  borderColor: isListening ? '#fcd34d' : '#bae6fd'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <Volume2 size={20} style={{ 
                      color: isListening ? '#d97706' : '#0284c7',
                      marginTop: '0.125rem',
                      animation: isListening ? 'pulse 2s infinite' : 'none'
                    }} />
                    <div>
                      <div style={{ 
                        fontSize: '0.875rem', 
                        fontWeight: '600', 
                        color: isListening ? '#92400e' : '#0c4a6e',
                        marginBottom: '0.25rem'
                      }}>
                        {isListening 
                          ? '🎤 Listening patiently...'
                          : '🎧 Voice input ready'
                        }
                      </div>
                      <div style={{ 
                        fontSize: '0.75rem', 
                        color: isListening ? '#a16207' : '#0369a1',
                        lineHeight: '1.4'
                      }}>
                        {isListening 
                          ? '🎤 I\'m actively listening and capturing your complete answer. Speak naturally with pauses - I\'ll wait for you to finish. Click the microphone when you\'re completely done speaking.'
                          : '🎙️ Click the microphone to start voice input. I\'ll capture your complete answer including pauses. Click again when finished speaking.'
                        }
                      </div>
                      {showPatienceMessage && (
                        <div style={{
                          marginTop: '0.5rem',
                          padding: '0.5rem',
                          backgroundColor: '#e0f2fe',
                          borderRadius: '0.5rem',
                          fontSize: '0.75rem',
                          color: '#0c4a6e',
                          fontStyle: 'italic'
                        }}>
                          ✨ No rush! I'm designed to wait for natural thinking pauses. Continue when you're ready.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                onClick={handleSubmitAnswer}
                disabled={isLoading || !currentAnswer.trim()}
                style={{
                  ...styles.button,
                  ...styles.buttonPrimary,
                  padding: '1rem',
                  opacity: (isLoading || !currentAnswer.trim()) ? 0.5 : 1,
                  cursor: (isLoading || !currentAnswer.trim()) ? 'not-allowed' : 'pointer',
                  minWidth: '60px'
                }}
                title="Submit answer"
              >
                <Send size={24} />
              </button>
              
              {audioEnabled && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    onClick={handleVoiceToggle}
                    style={{
                      padding: '1rem',
                      borderRadius: '0.75rem',
                      border: '2px solid',
                      borderColor: isListening ? '#10b981' : '#e5e7eb',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      backgroundColor: isListening ? '#d1fae5' : '#f9fafb',
                      color: isListening ? '#065f46' : '#374151',
                      minWidth: '60px',
                      position: 'relative',
                      animation: isListening ? 'pulse 2s infinite' : 'none'
                    }}
                    title={isListening ? 'Click to stop listening' : 'Click to start voice input'}
                  >
                    {isListening ? <MicOff size={24} /> : <Mic size={24} />}
                    {isListening && (
                      <div style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '-8px',
                        width: '16px',
                        height: '16px',
                        backgroundColor: '#ef4444',
                        borderRadius: '50%',
                        animation: 'pulse 1s infinite'
                      }} />
                    )}
                  </button>
                  {isListening && (
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#065f46',
                      textAlign: 'center',
                      fontWeight: '500',
                      animation: 'pulse 2s infinite'
                    }}>
                      🎤 Listening...
                      <br />
                      Speak your complete answer
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginTop: '1rem', 
            fontSize: '0.875rem' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {currentAnswer.trim().length > 0 && (
                <span style={{
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '12px',
                  fontWeight: '500',
                  border: '1px solid #bfdbfe'
                }}>
                  {currentAnswer.trim().split(' ').length} words
                </span>
              )}
              {audioEnabled && (
                <span style={{ color: isListening ? '#d97706' : '#16a34a', fontSize: '0.75rem' }}>
                  {isListening ? '🎤 Listening...' : '✓ Voice ready'}
                </span>
              )}
              {!audioEnabled && (
                <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                  Text input only
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#6b7280', fontSize: '0.75rem' }}>
              <span>
                <kbd style={{ 
                  padding: '0.25rem 0.5rem', 
                  backgroundColor: '#f1f5f9', 
                  borderRadius: '4px', 
                  fontSize: '0.75rem',
                  border: '1px solid #e2e8f0'
                }}>
                  Ctrl+Enter
                </kbd> to submit
              </span>
              {audioEnabled && (
                <span>
                  Say "repeat question" to hear again
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#fef2f2',
          borderTop: '1px solid #fecaca'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#991b1b' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ width: '8px', height: '8px', backgroundColor: '#ef4444', borderRadius: '50%', marginRight: '0.75rem' }}></div>
              {error}
            </div>
            <button
              onClick={() => console.log('Clear error')}
              style={{
                background: 'none',
                border: 'none',
                color: '#991b1b',
                cursor: 'pointer',
                fontSize: '1.2rem'
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};