import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Search, Eye, Clock, User, Mail, Phone, RefreshCw, TrendingUp, Award, Users, BarChart3, Star, Target } from 'lucide-react';
import type { RootState, AppDispatch } from '../store';
import { setSelectedCandidateId } from '../store/slices/uiSlice';
import { loadCandidatesAsync } from '../store/slices/interviewSlice';
import type { Candidate, Answer } from '../types';

const styles = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    background: 'linear-gradient(135deg, #dbeafe 0%, #ffffff 50%, #e0e7ff 100%)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  header: {
    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
    borderBottom: '1px solid #e2e8f0',
    padding: '1rem'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '1rem',
    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05)',
    border: '1px solid #e2e8f0',
    padding: '1.5rem',
    margin: '1rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out'
  },
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.5rem 1rem',
    borderRadius: '0.5rem',
    fontWeight: '500',
    transition: 'all 0.2s ease-in-out',
    cursor: 'pointer',
    border: '1px solid #e2e8f0',
    backgroundColor: 'white',
    color: '#374151'
  },
  input: {
    padding: '0.5rem 1rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    transition: 'all 0.2s ease-in-out'
  }
};

export const InterviewerTab: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { candidates, isLoading, error } = useSelector((state: RootState) => state.interview);
  const { selectedCandidateId } = useSelector((state: RootState) => state.ui);

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'score' | 'name' | 'date'>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Load candidates on component mount
  useEffect(() => {
    dispatch(loadCandidatesAsync());
  }, [dispatch]);

  const handleRefresh = () => {
    dispatch(loadCandidatesAsync());
  };

  const selectedCandidate = candidates.find((c: Candidate) => c.id === selectedCandidateId);

  const filteredAndSortedCandidates = candidates
    .filter((candidate: Candidate) =>
      candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a: Candidate, b: Candidate) => {
      let comparison = 0;

      switch (sortBy) {
        case 'score':
          comparison = a.score - b.score;
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          const aDate = a.endTime || a.startTime || new Date(0);
          const bDate = b.endTime || b.startTime || new Date(0);
          comparison = new Date(aDate).getTime() - new Date(bDate).getTime();
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });



  const getScoreColor = (score: number) => {
    if (score === -1) return 'text-blue-600'; // Pending evaluation
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatScore = (score: number) => {
    if (score === -1) return 'Pending';
    return `${score}/10`;
  };

  // Calculate comprehensive analytics
  const calculateAnalytics = () => {
    const completedCandidates = candidates.filter(c => c.status === 'completed' && c.score >= 0);
    const totalCandidates = candidates.length;
    const inProgressCandidates = candidates.filter(c => c.status === 'in-progress').length;
    
    if (completedCandidates.length === 0) {
      return {
        totalCandidates,
        completedCandidates: 0,
        inProgressCandidates,
        averageScore: 0,
        maxScore: 0,
        minScore: 0,
        topPerformer: null,
        scoreDistribution: { excellent: 0, good: 0, fair: 0, poor: 0 },
        difficultyStats: { easy: 0, medium: 0, hard: 0 },
        recentTrend: 'stable'
      };
    }

    const scores = completedCandidates.map(c => c.score);
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const topPerformer = completedCandidates.find(c => c.score === maxScore);

    // Score distribution
    const scoreDistribution = {
      excellent: completedCandidates.filter(c => c.score >= 8).length,
      good: completedCandidates.filter(c => c.score >= 6 && c.score < 8).length,
      fair: completedCandidates.filter(c => c.score >= 4 && c.score < 6).length,
      poor: completedCandidates.filter(c => c.score < 4).length
    };

    // Difficulty statistics
    const allAnswers = completedCandidates.flatMap(c => c.answers || []);
    const difficultyStats = {
      easy: allAnswers.filter(a => a.difficulty === 'easy' && a.score >= 0).length,
      medium: allAnswers.filter(a => a.difficulty === 'medium' && a.score >= 0).length,
      hard: allAnswers.filter(a => a.difficulty === 'hard' && a.score >= 0).length
    };

    // Recent trend (last 5 vs previous 5)
    const sortedByDate = [...completedCandidates].sort((a, b) => 
      new Date(b.endTime || b.startTime || 0).getTime() - new Date(a.endTime || a.startTime || 0).getTime()
    );
    const recent5 = sortedByDate.slice(0, 5);
    const previous5 = sortedByDate.slice(5, 10);
    
    let recentTrend = 'stable';
    if (recent5.length >= 3 && previous5.length >= 3) {
      const recentAvg = recent5.reduce((sum, c) => sum + c.score, 0) / recent5.length;
      const previousAvg = previous5.reduce((sum, c) => sum + c.score, 0) / previous5.length;
      if (recentAvg > previousAvg + 0.5) recentTrend = 'improving';
      else if (recentAvg < previousAvg - 0.5) recentTrend = 'declining';
    }

    return {
      totalCandidates,
      completedCandidates: completedCandidates.length,
      inProgressCandidates,
      averageScore,
      maxScore,
      minScore,
      topPerformer,
      scoreDistribution,
      difficultyStats,
      recentTrend
    };
  };

  const analytics = calculateAnalytics();

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (selectedCandidate) {
    return (
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              onClick={() => dispatch(setSelectedCandidateId(null))}
              style={{
                color: '#2563eb',
                fontWeight: '500',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              ← Back to Dashboard
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.875rem',
                fontWeight: '500',
                backgroundColor: selectedCandidate.status === 'completed' ? '#dcfce7' :
                  selectedCandidate.status === 'in-progress' ? '#dbeafe' : '#fef3c7',
                color: selectedCandidate.status === 'completed' ? '#166534' :
                  selectedCandidate.status === 'in-progress' ? '#1d4ed8' : '#92400e'
              }}>
                {selectedCandidate.status}
              </span>
              {selectedCandidate.status === 'completed' && (
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: selectedCandidate.score === -1 ? '#2563eb' :
                    selectedCandidate.score >= 8 ? '#16a34a' :
                    selectedCandidate.score >= 6 ? '#ca8a04' : '#dc2626'
                }}>
                  {selectedCandidate.score === -1 ? 'Evaluating...' : `${selectedCandidate.score.toFixed(1)}/10`}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Candidate Info */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4">{selectedCandidate.name}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-gray-500" />
                <span>{selectedCandidate.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={16} className="text-gray-500" />
                <span>{selectedCandidate.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-gray-500" />
                <span>Started: {formatDate(selectedCandidate.startTime)}</span>
              </div>
            </div>

            {selectedCandidate.status === 'completed' && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">AI Summary</h3>
                <p className="text-gray-700">{selectedCandidate.summary}</p>
              </div>
            )}
          </div>

          {/* Interview Progress */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-xl font-semibold mb-4">Interview Details</h3>

            {selectedCandidate.answers.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No questions answered yet</p>
            ) : (
              <div className="space-y-6">
                {selectedCandidate.answers.map((answer: Answer, index: number) => (
                  <div key={answer.questionId} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm font-medium">
                          Q{index + 1}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${answer.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                            answer.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                          }`}>
                          {answer.difficulty.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>Time: {formatTime(answer.timeSpent)}/{formatTime(answer.maxTime)}</span>
                        <span className={`font-semibold ${getScoreColor(answer.score)}`}>
                          {formatScore(answer.score)}
                        </span>
                      </div>
                    </div>

                    <div className="mb-3">
                      <h4 className="font-medium text-gray-900 mb-2">Question:</h4>
                      <p className="text-gray-700 bg-gray-50 p-3 rounded">{answer.question}</p>
                    </div>

                    <div className="mb-3">
                      <h4 className="font-medium text-gray-900 mb-2">Answer:</h4>
                      <p className="text-gray-700 bg-gray-50 p-3 rounded">{answer.answer}</p>
                    </div>

                    {answer.feedback && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">AI Feedback:</h4>
                        <p className={`text-gray-700 p-3 rounded border-l-4 ${
                          answer.score === -1 
                            ? 'bg-yellow-50 border-yellow-400' 
                            : 'bg-blue-50 border-blue-400'
                        }`}>
                          {answer.feedback}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#1e293b',
            margin: 0
          }}>
            Interview Dashboard
          </h2>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              style={{
                ...styles.button,
                backgroundColor: isLoading ? '#f3f4f6' : 'white',
                cursor: isLoading ? 'not-allowed' : 'pointer'
              }}
              title="Refresh candidates"
            >
              <RefreshCw
                size={16}
                style={{
                  marginRight: '0.5rem',
                  animation: isLoading ? 'spin 1s linear infinite' : 'none'
                }}
              />
              Refresh
            </button>
            <div style={{ position: 'relative' }}>
              <Search
                size={20}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9ca3af'
                }}
              />
              <input
                type="text"
                placeholder="Search candidates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  ...styles.input,
                  paddingLeft: '2.5rem',
                  width: '250px'
                }}
              />
            </div>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field as 'score' | 'name' | 'date');
                setSortOrder(order as 'asc' | 'desc');
              }}
              style={styles.input}
            >
              <option value="score-desc">Score (High to Low)</option>
              <option value="score-asc">Score (Low to High)</option>
              <option value="name-asc">Name (A to Z)</option>
              <option value="name-desc">Name (Z to A)</option>
              <option value="date-desc">Date (Newest)</option>
              <option value="date-asc">Date (Oldest)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Analytics Dashboard */}
      {analytics.completedCandidates > 0 && (
        <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0' }}>
          {/* Key Metrics */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '1rem', 
            marginBottom: '1.5rem' 
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '1rem',
              borderRadius: '0.75rem',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>Total Interviews</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', margin: '0.25rem 0 0 0' }}>
                    {analytics.totalCandidates}
                  </p>
                </div>
                <Users style={{ width: '24px', height: '24px', color: '#3b82f6' }} />
              </div>
            </div>

            <div style={{
              backgroundColor: 'white',
              padding: '1rem',
              borderRadius: '0.75rem',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>Average Score</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', margin: '0.25rem 0 0 0' }}>
                    {analytics.averageScore.toFixed(1)}/10
                  </p>
                </div>
                <BarChart3 style={{ width: '24px', height: '24px', color: '#10b981' }} />
              </div>
            </div>

            <div style={{
              backgroundColor: 'white',
              padding: '1rem',
              borderRadius: '0.75rem',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>Highest Score</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', margin: '0.25rem 0 0 0' }}>
                    {analytics.maxScore.toFixed(1)}/10
                  </p>
                </div>
                <Award style={{ width: '24px', height: '24px', color: '#f59e0b' }} />
              </div>
            </div>

            <div style={{
              backgroundColor: 'white',
              padding: '1rem',
              borderRadius: '0.75rem',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>Performance Trend</p>
                  <p style={{ 
                    fontSize: '1rem', 
                    fontWeight: 'bold', 
                    color: analytics.recentTrend === 'improving' ? '#10b981' : 
                           analytics.recentTrend === 'declining' ? '#ef4444' : '#6b7280',
                    margin: '0.25rem 0 0 0',
                    textTransform: 'capitalize'
                  }}>
                    {analytics.recentTrend}
                  </p>
                </div>
                <TrendingUp style={{ 
                  width: '24px', 
                  height: '24px', 
                  color: analytics.recentTrend === 'improving' ? '#10b981' : 
                         analytics.recentTrend === 'declining' ? '#ef4444' : '#6b7280'
                }} />
              </div>
            </div>
          </div>

          {/* Top Performer & Score Distribution */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* Top Performer */}
            {analytics.topPerformer && (
              <div style={{
                backgroundColor: 'white',
                padding: '1rem',
                borderRadius: '0.75rem',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <Star style={{ width: '20px', height: '20px', color: '#f59e0b', marginRight: '0.5rem' }} />
                  <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                    Top Performer
                  </h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                      {analytics.topPerformer.name}
                    </p>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
                      {analytics.topPerformer.email}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f59e0b', margin: 0 }}>
                      {analytics.maxScore.toFixed(1)}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>out of 10</p>
                  </div>
                </div>
              </div>
            )}

            {/* Score Distribution */}
            <div style={{
              backgroundColor: 'white',
              padding: '1rem',
              borderRadius: '0.75rem',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem' }}>
                <Target style={{ width: '20px', height: '20px', color: '#3b82f6', marginRight: '0.5rem' }} />
                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                  Score Distribution
                </h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.875rem', color: '#16a34a' }}>Excellent (8-10)</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                    {analytics.scoreDistribution.excellent}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.875rem', color: '#ca8a04' }}>Good (6-8)</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                    {analytics.scoreDistribution.good}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.875rem', color: '#ea580c' }}>Fair (4-6)</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                    {analytics.scoreDistribution.fair}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.875rem', color: '#dc2626' }}>Poor (0-4)</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                    {analytics.scoreDistribution.poor}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Candidates List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
        {error && (
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '0.5rem',
            margin: '1rem 0'
          }}>
            <p style={{ color: '#991b1b', fontWeight: '500' }}>Error loading candidates</p>
            <p style={{ color: '#7f1d1d', fontSize: '0.875rem' }}>{error}</p>
            <button
              onClick={handleRefresh}
              style={{
                ...styles.button,
                marginTop: '1rem',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none'
              }}
            >
              Try Again
            </button>
          </div>
        )}

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <RefreshCw size={48} style={{ margin: '0 auto 1rem auto', color: '#3b82f6', animation: 'spin 1s linear infinite' }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: '500', color: '#111827', marginBottom: '0.5rem' }}>
              Loading candidates...
            </h3>
            <p style={{ color: '#6b7280' }}>Please wait while we fetch the latest data</p>
          </div>
        ) : filteredAndSortedCandidates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <User size={48} style={{ margin: '0 auto 1rem auto', color: '#9ca3af' }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: '500', color: '#111827', marginBottom: '0.5rem' }}>
              No candidates found
            </h3>
            <p style={{ color: '#6b7280' }}>
              {searchTerm ? 'Try adjusting your search terms' : 'Candidates will appear here after they complete interviews'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {filteredAndSortedCandidates.map((candidate: Candidate) => (
              <div
                key={candidate.id}
                style={styles.card}
                onClick={() => dispatch(setSelectedCandidateId(candidate.id))}
                onMouseOver={(e) => {
                  e.currentTarget.style.boxShadow = '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 10px 10px -5px rgb(0 0 0 / 0.04)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.boxShadow = '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                        {candidate.name}
                      </h3>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        backgroundColor: candidate.status === 'completed' ? '#dcfce7' :
                          candidate.status === 'in-progress' ? '#dbeafe' : '#fef3c7',
                        color: candidate.status === 'completed' ? '#166534' :
                          candidate.status === 'in-progress' ? '#1d4ed8' : '#92400e'
                      }}>
                        {candidate.status}
                      </span>
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '0.5rem',
                      fontSize: '0.875rem',
                      color: '#4b5563',
                      marginBottom: '0.75rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Mail size={14} />
                        <span>{candidate.email}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Phone size={14} />
                        <span>{candidate.phone}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Clock size={14} />
                        <span>{formatDate(candidate.startTime || candidate.endTime)}</span>
                      </div>
                    </div>

                    {/* Enhanced Performance Metrics */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
                      gap: '0.75rem', 
                      fontSize: '0.875rem',
                      marginBottom: '0.75rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span style={{ color: '#6b7280' }}>Progress:</span>
                        <span style={{ fontWeight: '600', color: '#111827' }}>
                          {candidate.answers.length}/6
                        </span>
                      </div>
                      
                      {candidate.status === 'completed' && candidate.score >= 0 && (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <span style={{ color: '#6b7280' }}>Overall:</span>
                            <span style={{
                              fontWeight: '600',
                              color: candidate.score >= 8 ? '#16a34a' :
                                candidate.score >= 6 ? '#ca8a04' : '#dc2626'
                            }}>
                              {candidate.score.toFixed(1)}/10
                            </span>
                          </div>
                          
                          {/* Difficulty breakdown */}
                          {(() => {
                            const easyScores = candidate.answers.filter(a => a.difficulty === 'easy' && a.score >= 0);
                            const mediumScores = candidate.answers.filter(a => a.difficulty === 'medium' && a.score >= 0);
                            const hardScores = candidate.answers.filter(a => a.difficulty === 'hard' && a.score >= 0);
                            
                            return (
                              <>
                                {easyScores.length > 0 && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <span style={{ color: '#6b7280' }}>Easy:</span>
                                    <span style={{ fontWeight: '600', color: '#16a34a' }}>
                                      {(easyScores.reduce((sum, a) => sum + a.score, 0) / easyScores.length).toFixed(1)}
                                    </span>
                                  </div>
                                )}
                                
                                {mediumScores.length > 0 && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <span style={{ color: '#6b7280' }}>Medium:</span>
                                    <span style={{ fontWeight: '600', color: '#ca8a04' }}>
                                      {(mediumScores.reduce((sum, a) => sum + a.score, 0) / mediumScores.length).toFixed(1)}
                                    </span>
                                  </div>
                                )}
                                
                                {hardScores.length > 0 && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <span style={{ color: '#6b7280' }}>Hard:</span>
                                    <span style={{ fontWeight: '600', color: '#dc2626' }}>
                                      {(hardScores.reduce((sum, a) => sum + a.score, 0) / hardScores.length).toFixed(1)}
                                    </span>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </>
                      )}
                      
                      {candidate.status === 'completed' && candidate.answers.some(a => a.score === -1) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <span style={{ color: '#6b7280' }}>Pending:</span>
                          <span style={{ fontWeight: '600', color: '#3b82f6' }}>
                            {candidate.answers.filter(a => a.score === -1).length}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Skills Tags */}
                    {candidate.skills && candidate.skills.length > 0 && (
                      <div style={{ 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: '0.25rem', 
                        marginBottom: '0.5rem' 
                      }}>
                        {candidate.skills.slice(0, 4).map((skill, index) => (
                          <span
                            key={index}
                            style={{
                              fontSize: '0.75rem',
                              padding: '0.125rem 0.375rem',
                              backgroundColor: '#f3f4f6',
                              color: '#374151',
                              borderRadius: '0.25rem',
                              border: '1px solid #e5e7eb'
                            }}
                          >
                            {skill}
                          </span>
                        ))}
                        {candidate.skills.length > 4 && (
                          <span style={{
                            fontSize: '0.75rem',
                            padding: '0.125rem 0.375rem',
                            color: '#6b7280'
                          }}>
                            +{candidate.skills.length - 4} more
                          </span>
                        )}
                      </div>
                    )}

                    {candidate.summary && (
                      <p style={{
                        fontSize: '0.875rem',
                        color: '#4b5563',
                        marginTop: '0.5rem',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {candidate.summary}
                      </p>
                    )}
                  </div>

                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    gap: '0.5rem', 
                    marginLeft: '1rem',
                    minWidth: '80px'
                  }}>
                    {candidate.status === 'completed' && candidate.score >= 0 ? (
                      <>
                        <div style={{
                          fontSize: '1.75rem',
                          fontWeight: 'bold',
                          color: candidate.score >= 8 ? '#16a34a' :
                            candidate.score >= 6 ? '#ca8a04' : '#dc2626',
                          lineHeight: 1
                        }}>
                          {candidate.score.toFixed(1)}
                        </div>
                        <div style={{
                          fontSize: '0.75rem',
                          color: '#6b7280',
                          textAlign: 'center',
                          lineHeight: 1
                        }}>
                          {candidate.score >= 8.5 ? 'Excellent' :
                           candidate.score >= 7 ? 'Good' :
                           candidate.score >= 5.5 ? 'Fair' : 'Poor'}
                        </div>
                        {candidate.score === analytics.maxScore && analytics.maxScore > 0 && (
                          <Star size={16} style={{ color: '#f59e0b' }} />
                        )}
                      </>
                    ) : candidate.status === 'completed' ? (
                      <div style={{
                        fontSize: '1rem',
                        fontWeight: '600',
                        color: '#3b82f6',
                        textAlign: 'center'
                      }}>
                        Evaluating...
                      </div>
                    ) : (
                      <div style={{
                        fontSize: '0.875rem',
                        color: '#6b7280',
                        textAlign: 'center'
                      }}>
                        In Progress
                      </div>
                    )}
                    <Eye size={16} style={{ color: '#9ca3af' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};