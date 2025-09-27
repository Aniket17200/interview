# AI-Powered Interview Assistant

A React-based interview assistant that uses Google's Gemini AI for real-time question generation, answer evaluation, and text-to-speech/speech-to-text capabilities.

## Features

### 🎯 Core Functionality
- **Resume Upload & Parsing**: Supports PDF and DOCX files with automatic contact info extraction
- **AI-Powered Questions**: Dynamic question generation based on full-stack development roles
- **Real-time Evaluation**: Instant AI feedback and scoring for each answer
- **Timed Interviews**: Progressive difficulty with time limits (Easy: 20s, Medium: 60s, Hard: 120s)
- **Dual Interface**: Separate views for interviewees and interviewers

### 🎤 Voice Features
- **Text-to-Speech**: AI reads questions aloud
- **Speech-to-Text**: Voice input for answers using Web Speech API
- **Real-time Audio Controls**: Toggle audio on/off during interviews

### 💾 Data Persistence
- **Local Storage**: All interview data persists across browser sessions
- **Resume Capability**: Welcome back modal for unfinished interviews
- **Progress Tracking**: Complete interview state management

### 📊 Dashboard Features
- **Candidate Management**: View all candidates with scores and summaries
- **Search & Sort**: Filter candidates by name/email, sort by score/date/name
- **Detailed Views**: Complete interview history with Q&A and AI feedback
- **Performance Analytics**: Score breakdowns by difficulty level

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **State Management**: Redux Toolkit + Redux Persist
- **Styling**: Tailwind CSS
- **AI Integration**: Google Gemini API
- **File Processing**: PDF.js + Mammoth.js
- **Icons**: Lucide React
- **Voice**: Web Speech API

## Setup Instructions

### 1. Prerequisites
- Node.js 16+ and npm
- Google Gemini API key

### 2. Installation

```bash
# Clone the repository
git clone <repository-url>
cd my-interview

# Install dependencies
npm install
```

### 3. Environment Configuration

```bash
# Copy the environment template
cp .env.example .env

# Edit .env and add your Gemini API key
VITE_GEMINI_API_KEY=your_actual_api_key_here
```

**Get your Gemini API key:**
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy and paste it into your `.env` file

### 4. Run the Application

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Usage Guide

### For Interviewees

1. **Upload Resume**: Click to upload PDF or DOCX resume
2. **Complete Profile**: Fill in any missing contact information
3. **Start Interview**: Begin the 6-question assessment
4. **Answer Questions**: Type or use voice input for responses
5. **Track Progress**: Monitor time limits and question difficulty
6. **View Results**: Get AI feedback and final score

### For Interviewers

1. **View Dashboard**: See all candidates sorted by performance
2. **Search Candidates**: Filter by name or email
3. **Review Details**: Click any candidate to see full interview
4. **Analyze Performance**: Review Q&A history and AI feedback
5. **Export Data**: All data is stored locally and persists

## Interview Structure

- **6 Questions Total**: 2 Easy → 2 Medium → 2 Hard
- **Time Limits**: 
  - Easy: 20 seconds
  - Medium: 60 seconds  
  - Hard: 120 seconds
- **Auto-Submit**: Questions auto-submit when time expires
- **AI Scoring**: Each answer scored 0-10 with detailed feedback
- **Final Summary**: Comprehensive AI-generated candidate assessment

## Voice Features

### Text-to-Speech
- Toggle audio on/off before starting
- AI reads each question aloud
- Adjustable speech rate and volume

### Speech-to-Text
- Click microphone icon to start voice input
- Supports continuous speech recognition
- Automatic transcription to text input

## Data Storage

All interview data is stored locally in your browser:
- **Candidate profiles** and contact information
- **Complete Q&A history** with timestamps
- **AI scores and feedback** for each question
- **Interview progress** and session state
- **Resume files** (metadata only)

## Browser Compatibility

- **Chrome/Edge**: Full support including voice features
- **Firefox**: Full support, limited voice recognition
- **Safari**: Full support, limited voice recognition
- **Mobile**: Responsive design, limited voice features

## Troubleshooting

### Common Issues

**API Key Errors:**
- Ensure your Gemini API key is correctly set in `.env`
- Check API key permissions and quotas

**Voice Features Not Working:**
- Enable microphone permissions in browser
- Use HTTPS or localhost for speech recognition
- Check browser compatibility for Web Speech API

**Resume Upload Issues:**
- Ensure file is PDF or DOCX format
- Check file size (recommended < 10MB)
- Verify file is not corrupted

**Data Not Persisting:**
- Check browser storage permissions
- Ensure localStorage is enabled
- Clear browser cache if issues persist

## Development

### Project Structure
```
src/
├── components/          # React components
├── services/           # API and utility services
├── store/             # Redux store and slices
├── types/             # TypeScript type definitions
└── styles/            # CSS and styling
```

### Key Services
- **GeminiService**: AI integration for questions and evaluation
- **ResumeParser**: PDF/DOCX file processing and text extraction
- **Redux Store**: State management with persistence

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review browser console for errors
3. Ensure all dependencies are installed
4. Verify API key configuration