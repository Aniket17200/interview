# Supabase Database Setup

This document provides instructions for setting up the Supabase database for the AI Interview Assistant.

## Prerequisites

1. A Supabase account (sign up at https://supabase.com)
2. A new Supabase project created

## Database Setup

### Step 1: Create the Database Schema

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `supabase-schema.sql` into the SQL Editor
4. Click "Run" to execute the schema creation

### Step 2: Verify Tables

After running the schema, you should see the following tables in your database:

- `candidates` - Stores candidate information and resume data
- `interview_sessions` - Tracks interview sessions and progress
- `questions` - Stores interview questions asked during sessions
- `answers` - Stores candidate answers and evaluations
- `assessments` - Stores final interview assessments

### Step 3: Configure Environment Variables

Make sure your `.env` file contains the correct Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GEMINI_API_KEY=your-gemini-api-key
```

## Database Features

### Row Level Security (RLS)

The database is configured with Row Level Security policies that allow:
- Public access for creating and reading data (suitable for demo purposes)
- In production, you should modify these policies for proper access control

### Real-time Subscriptions

The application uses Supabase real-time subscriptions to:
- Update candidate information in real-time
- Sync interview session progress
- Provide live updates to the interviewer dashboard

### Automatic Timestamps

Tables automatically maintain `created_at` and `updated_at` timestamps using database triggers.

## Data Flow

1. **Resume Upload**: Candidate data is parsed and stored in the `candidates` table
2. **Interview Start**: A new session is created in `interview_sessions`
3. **Questions**: Each question is saved to the `questions` table
4. **Answers**: Candidate responses are stored in `answers` with evaluation scores
5. **Completion**: Final assessment is saved to `assessments` table

## Monitoring and Analytics

You can use Supabase's built-in analytics to monitor:
- Number of candidates registered
- Interview completion rates
- Average scores by difficulty level
- Session duration statistics

## Backup and Recovery

Supabase automatically handles:
- Daily backups of your database
- Point-in-time recovery
- High availability and redundancy

## Security Considerations

For production deployment:

1. **Update RLS Policies**: Implement proper row-level security
2. **API Key Management**: Use environment-specific API keys
3. **Data Validation**: Add additional validation rules
4. **Audit Logging**: Enable audit logs for compliance

## Troubleshooting

### Common Issues

1. **Connection Errors**: Verify your Supabase URL and API key
2. **Permission Denied**: Check RLS policies and API key permissions
3. **Schema Errors**: Ensure all tables were created successfully

### Useful SQL Queries

```sql
-- Check candidate count
SELECT COUNT(*) FROM candidates;

-- View recent interview sessions
SELECT * FROM interview_sessions ORDER BY created_at DESC LIMIT 10;

-- Get average scores by difficulty
SELECT 
  difficulty,
  AVG(score) as avg_score,
  COUNT(*) as question_count
FROM answers a
JOIN questions q ON a.question_id = q.id
GROUP BY difficulty;

-- View candidate dashboard
SELECT * FROM candidate_dashboard;
```

## Support

For issues with Supabase setup:
1. Check the Supabase documentation: https://supabase.com/docs
2. Visit the Supabase community: https://github.com/supabase/supabase/discussions
3. Review the application logs for specific error messages