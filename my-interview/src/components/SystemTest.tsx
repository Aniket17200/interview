import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { geminiService } from '../services/geminiService';

interface SystemTestProps {
  onComplete: (audioSupported: boolean) => void;
  onBack: () => void;
}

export const SystemTest: React.FC<SystemTestProps> = ({ onComplete, onBack }) => {
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [isTestingSpeaker, setIsTestingSpeaker] = useState(false);
  const [micResult, setMicResult] = useState<'pending' | 'success' | 'failed'>('pending');
  const [speakerResult, setSpeakerResult] = useState<'pending' | 'success' | 'failed'>('pending');
  const [transcribedText, setTranscribedText] = useState('');
  const continueButtonRef = useRef<HTMLDivElement>(null);

  const testMicrophone = async () => {
    setIsTestingMic(true);
    setMicResult('pending');

    try {
      geminiService.startListening(
        (transcript: string) => {
          setTranscribedText(transcript);
          if (transcript.trim().length > 0) {
            setMicResult('success');
            geminiService.stopListening();
            setIsTestingMic(false);
          }
        },
        () => {
          setIsTestingMic(false);
          if (micResult === 'pending') {
            setMicResult('failed');
          }
        }
      );

      // Auto-stop after 10 seconds
      setTimeout(() => {
        if (isTestingMic) {
          geminiService.stopListening();
          setIsTestingMic(false);
          if (micResult === 'pending') {
            setMicResult('failed');
          }
        }
      }, 10000);

    } catch (error) {
      setMicResult('failed');
      setIsTestingMic(false);
    }
  };

  const testSpeaker = async () => {
    setIsTestingSpeaker(true);
    setSpeakerResult('pending');

    try {
      await geminiService.speak('Hello! This is a test of the text-to-speech system. The volume is set to maximum for clear audio. Can you hear this message clearly?');
      setSpeakerResult('success');
    } catch (error) {
      setSpeakerResult('failed');
    } finally {
      setIsTestingSpeaker(false);
    }
  };



  const stopMicTest = () => {
    geminiService.stopListening();
    setIsTestingMic(false);
  };

  // Scroll to continue button when both tests are completed
  useEffect(() => {
    if (micResult === 'success' && speakerResult === 'success') {
      setTimeout(() => {
        continueButtonRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 500);
    }
  }, [micResult, speakerResult]);

  const handleContinue = () => {
    const audioSupported = micResult === 'success' && speakerResult === 'success';
    console.log('System test results:', { audioSupported });
    onComplete(audioSupported);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #dbeafe 0%, #ffffff 50%, #e0e7ff 100%)',
      padding: '1.5rem',
      paddingBottom: '3rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      overflowY: 'auto'
    }}>
      <div style={{ maxWidth: '48rem', margin: '0 auto' }}>
        {/* Back Button */}
        <button
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            color: '#2563eb',
            marginBottom: '1.5rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          <ArrowLeft size={20} style={{ marginRight: '0.5rem' }} />
          Back to Setup
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem',
            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
          }}>
            <Volume2 style={{ width: '32px', height: '32px', color: 'white' }} />
          </div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem' }}>
            System Check
          </h1>
          <p style={{ color: '#4b5563' }}>
            Let's test your audio system for the best interview experience
          </p>
        </div>

        {/* Test Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Microphone Test */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '1rem',
            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 10px 10px -5px rgb(0 0 0 / 0.04)',
            border: '1px solid #dbeafe',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    backgroundColor: '#dbeafe',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '1rem'
                  }}>
                    <Mic style={{ width: '24px', height: '24px', color: '#2563eb' }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                      Microphone Test
                    </h3>
                    <p style={{ fontSize: '0.875rem', color: '#4b5563', margin: 0 }}>
                      Say "Hello, this is a test" - Fast and accurate recognition
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {micResult === 'success' && <CheckCircle style={{ width: '24px', height: '24px', color: '#22c55e' }} />}
                  {micResult === 'failed' && <XCircle style={{ width: '24px', height: '24px', color: '#ef4444' }} />}
                </div>
              </div>

              {transcribedText && (
                <div style={{
                  marginBottom: '1rem',
                  padding: '0.75rem',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '0.5rem'
                }}>
                  <p style={{ fontSize: '0.875rem', color: '#166534' }}>
                    <strong>Detected:</strong> "{transcribedText}"
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {!isTestingMic ? (
                  <button
                    onClick={testMicrophone}
                    disabled={micResult === 'success'}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0.5rem 1rem',
                      backgroundColor: micResult === 'success' ? '#9ca3af' : '#2563eb',
                      color: 'white',
                      borderRadius: '0.5rem',
                      border: 'none',
                      cursor: micResult === 'success' ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease-in-out',
                      opacity: micResult === 'success' ? 0.5 : 1
                    }}
                    onMouseOver={(e) => {
                      if (micResult !== 'success') {
                        e.currentTarget.style.backgroundColor = '#1d4ed8';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (micResult !== 'success') {
                        e.currentTarget.style.backgroundColor = '#2563eb';
                      }
                    }}
                  >
                    <Mic size={16} style={{ marginRight: '0.5rem' }} />
                    {micResult === 'success' ? 'Test Passed' : 'Test Microphone'}
                  </button>
                ) : (
                  <button
                    onClick={stopMicTest}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0.5rem 1rem',
                      backgroundColor: '#dc2626',
                      color: 'white',
                      borderRadius: '0.5rem',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease-in-out',
                      animation: 'pulse 2s infinite'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = '#b91c1c';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = '#dc2626';
                    }}
                  >
                    <MicOff size={16} style={{ marginRight: '0.5rem' }} />
                    Stop Recording
                  </button>
                )}
              </div>

              {isTestingMic && (
                <div style={{
                  marginTop: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '0.875rem',
                  color: '#2563eb'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#3b82f6',
                    borderRadius: '50%',
                    animation: 'pulse 2s infinite',
                    marginRight: '0.5rem'
                  }}></div>
                  Listening... Please speak now
                </div>
              )}
            </div>
          </div>

          {/* Speaker Test */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '1rem',
            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 10px 10px -5px rgb(0 0 0 / 0.04)',
            border: '1px solid #dbeafe',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    backgroundColor: '#dcfce7',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '1rem'
                  }}>
                    <Volume2 style={{ width: '24px', height: '24px', color: '#16a34a' }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                      Speaker Test
                    </h3>
                    <p style={{ fontSize: '0.875rem', color: '#4b5563', margin: 0 }}>
                      Test enhanced Indian English voice quality
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {speakerResult === 'success' && <CheckCircle style={{ width: '24px', height: '24px', color: '#22c55e' }} />}
                  {speakerResult === 'failed' && <XCircle style={{ width: '24px', height: '24px', color: '#ef4444' }} />}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={testSpeaker}
                  disabled={isTestingSpeaker || speakerResult === 'success'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.5rem 1rem',
                    backgroundColor: (isTestingSpeaker || speakerResult === 'success') ? '#9ca3af' : '#16a34a',
                    color: 'white',
                    borderRadius: '0.5rem',
                    border: 'none',
                    cursor: (isTestingSpeaker || speakerResult === 'success') ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    opacity: (isTestingSpeaker || speakerResult === 'success') ? 0.5 : 1
                  }}
                  onMouseOver={(e) => {
                    if (!isTestingSpeaker && speakerResult !== 'success') {
                      e.currentTarget.style.backgroundColor = '#15803d';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isTestingSpeaker && speakerResult !== 'success') {
                      e.currentTarget.style.backgroundColor = '#16a34a';
                    }
                  }}
                >
                  <Volume2 size={16} style={{ marginRight: '0.5rem' }} />
                  {isTestingSpeaker ? 'Playing...' : speakerResult === 'success' ? 'Test Passed' : 'Test Speaker'}
                </button>

                {speakerResult === 'pending' && !isTestingSpeaker && (
                  <button
                    onClick={() => setSpeakerResult('success')}
                    style={{
                      padding: '0.5rem 1rem',
                      border: '1px solid #16a34a',
                      color: '#16a34a',
                      backgroundColor: 'white',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease-in-out'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = '#f0fdf4';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = 'white';
                    }}
                  >
                    I heard it clearly
                  </button>
                )}
              </div>

              {isTestingSpeaker && (
                <div style={{
                  marginTop: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '0.875rem',
                  color: '#16a34a'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#22c55e',
                    borderRadius: '50%',
                    animation: 'pulse 2s infinite',
                    marginRight: '0.5rem'
                  }}></div>
                  Playing test audio...
                </div>
              )}
            </div>
          </div>


        </div>

        {/* Continue Button */}
        <div 
          ref={continueButtonRef}
          style={{ 
            marginTop: '3rem', 
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
          <button
            onClick={handleContinue}
            style={{
              padding: '0.75rem 2rem',
              background: 'linear-gradient(135deg, #2563eb 0%, #6366f1 100%)',
              color: 'white',
              borderRadius: '0.75rem',
              border: 'none',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #1d4ed8 0%, #4338ca 100%)';
              e.currentTarget.style.boxShadow = '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 10px 10px -5px rgb(0 0 0 / 0.04)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb 0%, #6366f1 100%)';
              e.currentTarget.style.boxShadow = '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Continue to Interview
          </button>

          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.75rem' }}>
            {micResult === 'success' && speakerResult === 'success'
              ? '✓ All audio systems ready! You can proceed with the interview.'
              : '⚠️ Some audio features may be limited. You can still continue with available functionality.'
            }
          </p>
        </div>
      </div>
    </div>
  );
};