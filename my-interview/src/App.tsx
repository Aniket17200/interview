import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { useDispatch, useSelector } from 'react-redux';
import { Users, MessageSquare } from 'lucide-react';
import { store, persistor } from './store';
import type { RootState } from './store';
import { setActiveTab, setShowWelcomeBack } from './store/slices/uiSlice';
import { SimpleIntervieweeTab } from './components/SimpleIntervieweeTab';
import { InterviewerTab } from './components/InterviewerTab';
import { WelcomeBackModal } from './components/WelcomeBackModal';

const AppContent: React.FC = () => {
  const dispatch = useDispatch();
  const { activeTab } = useSelector((state: RootState) => state.ui);
  const { currentCandidate } = useSelector((state: RootState) => state.interview);

  useEffect(() => {
    // Check for unfinished interview on app load
    if (currentCandidate && currentCandidate.status === 'in-progress' && currentCandidate.isPaused) {
      dispatch(setShowWelcomeBack(true));
    }
    
    // Ensure we start on the interviewee tab (upload page)
    dispatch(setActiveTab('interviewee'));
  }, [currentCandidate, dispatch]);

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      background: 'linear-gradient(135deg, #dbeafe 0%, #ffffff 50%, #e0e7ff 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      <header style={{ 
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -1px rgb(0 0 0 / 0.06)',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <div style={{ 
          maxWidth: '1280px', 
          margin: '0 auto', 
          padding: '0 1rem'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            height: '64px' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <h1 style={{ 
                fontSize: '1.5rem', 
                fontWeight: 'bold', 
                color: '#1e293b',
                margin: 0,
                letterSpacing: '-0.025em'
              }}>
                AI Interview Assistant
              </h1>
            </div>
            
            {/* Tab Navigation */}
            <nav style={{ display: 'flex', gap: '0.25rem' }}>
              <button
                onClick={() => dispatch(setActiveTab('interviewee'))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  fontWeight: '500',
                  transition: 'all 0.2s ease-in-out',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: activeTab === 'interviewee' ? '#eff6ff' : 'transparent',
                  color: activeTab === 'interviewee' ? '#1d4ed8' : '#4b5563'
                }}
                onMouseOver={(e) => {
                  if (activeTab !== 'interviewee') {
                    e.currentTarget.style.backgroundColor = '#f1f5f9';
                    e.currentTarget.style.color = '#1e293b';
                  }
                }}
                onMouseOut={(e) => {
                  if (activeTab !== 'interviewee') {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#4b5563';
                  }
                }}
              >
                <MessageSquare size={20} />
                Interviewee
              </button>
              <button
                onClick={() => dispatch(setActiveTab('interviewer'))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  fontWeight: '500',
                  transition: 'all 0.2s ease-in-out',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: activeTab === 'interviewer' ? '#eff6ff' : 'transparent',
                  color: activeTab === 'interviewer' ? '#1d4ed8' : '#4b5563'
                }}
                onMouseOver={(e) => {
                  if (activeTab !== 'interviewer') {
                    e.currentTarget.style.backgroundColor = '#f1f5f9';
                    e.currentTarget.style.color = '#1e293b';
                  }
                }}
                onMouseOut={(e) => {
                  if (activeTab !== 'interviewer') {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#4b5563';
                  }
                }}
              >
                <Users size={20} />
                Interviewer
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'interviewee' ? <SimpleIntervieweeTab /> : <InterviewerTab />}
      </main>

      {/* Welcome Back Modal */}
      <WelcomeBackModal />
    </div>
  );
};

function App() {
  return (
    <Provider store={store}>
      <PersistGate 
        loading={
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100vh',
            background: 'linear-gradient(135deg, #dbeafe 0%, #ffffff 50%, #e0e7ff 100%)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}>
            <div style={{ 
              fontSize: '1.125rem', 
              color: '#374151',
              fontWeight: '500'
            }}>
              Loading...
            </div>
          </div>
        } 
        persistor={persistor}
      >
        <AppContent />
      </PersistGate>
    </Provider>
  );
}

export default App;
