-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create candidates table
CREATE TABLE IF NOT EXISTS candidates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    resume_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create interview_sessions table
CREATE TABLE IF NOT EXISTS interview_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('in_progress', 'completed', 'paused')) DEFAULT 'in_progress',
    current_question_index INTEGER DEFAULT 0,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    total_score NUMERIC(5,2),
    session_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')) NOT NULL,
    question_type TEXT NOT NULL,
    time_limit INTEGER NOT NULL,
    asked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create answers table
CREATE TABLE IF NOT EXISTS answers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    answer_text TEXT NOT NULL,
    score NUMERIC(5,2) NOT NULL,
    time_taken INTEGER NOT NULL,
    evaluation_data JSONB DEFAULT '{}',
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create assessments table
CREATE TABLE IF NOT EXISTS assessments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
    final_score NUMERIC(5,2) NOT NULL,
    assessment_data JSONB DEFAULT '{}',
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_candidate_id ON interview_sessions(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_status ON interview_sessions(status);
CREATE INDEX IF NOT EXISTS idx_questions_session_id ON questions(session_id);
CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers(question_id);
CREATE INDEX IF NOT EXISTS idx_assessments_session_id ON assessments(session_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_candidates_updated_at BEFORE UPDATE ON candidates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interview_sessions_updated_at BEFORE UPDATE ON interview_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow public access for creating candidates and sessions
CREATE POLICY "Allow public insert on candidates" ON candidates
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public select on candidates" ON candidates
    FOR SELECT USING (true);

CREATE POLICY "Allow public update on candidates" ON candidates
    FOR UPDATE USING (true);

CREATE POLICY "Allow public insert on interview_sessions" ON interview_sessions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public select on interview_sessions" ON interview_sessions
    FOR SELECT USING (true);

CREATE POLICY "Allow public update on interview_sessions" ON interview_sessions
    FOR UPDATE USING (true);

CREATE POLICY "Allow public insert on questions" ON questions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public select on questions" ON questions
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert on answers" ON answers
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public select on answers" ON answers
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert on assessments" ON assessments
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public select on assessments" ON assessments
    FOR SELECT USING (true);

-- Create a view for candidate dashboard
CREATE OR REPLACE VIEW candidate_dashboard AS
SELECT 
    c.id,
    c.name,
    c.email,
    c.phone,
    c.created_at,
    COALESCE(s.status, 'not_started') as interview_status,
    s.total_score,
    s.start_time as interview_start_time,
    s.end_time as interview_end_time,
    (c.resume_data->>'score')::numeric as resume_score
FROM candidates c
LEFT JOIN interview_sessions s ON c.id = s.candidate_id
ORDER BY c.created_at DESC;