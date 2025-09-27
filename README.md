# 🎯 AI-Powered Interview Assistant

> A modern, intelligent interview platform powered by Google's Gemini AI with real-time speech recognition, dynamic question generation, and comprehensive candidate evaluation.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20App-blue?style=for-the-badge)](https://my-interview-mm4117g1e-sam17202s-projects.vercel.app)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-black?style=for-the-badge&logo=github)](https://github.com/Aniket17200/interview)

## 🌟 Features

### 🎯 **Smart Interview System**
- **📄 Resume Upload & Parsing** - Supports PDF and DOCX with automatic contact extraction
- **🤖 AI-Powered Questions** - Dynamic question generation based on candidate's resume and skills
- **⚡ Real-time Evaluation** - Instant AI feedback and scoring (0-10 scale)
- **⏱️ Intelligent Timing** - Progressive difficulty with generous time limits
- **👥 Dual Interface** - Separate optimized views for interviewees and interviewers

### 🎤 **Advanced Voice Features**
- **🔊 Text-to-Speech** - AI reads questions with natural voice
- **🎙️ Speech-to-Text** - Voice input with real-time transcription
- **🎛️ Audio Controls** - Toggle voice features on/off anytime
- **🔧 System Check** - Built-in microphone and speaker testing

### 💾 **Robust Data Management**
- **� ️ Supabase Integration** - Secure cloud database storage
- **🔄 Auto-Save** - Progress automatically saved during interviews
- **📊 Analytics Dashboard** - Comprehensive candidate performance tracking
- **🔍 Advanced Search** - Filter and sort candidates by multiple criteria

### 📱 **Modern User Experience**
- **📱 Responsive Design** - Works perfectly on desktop, tablet, and mobile
- **🎨 Beautiful UI** - Clean, professional interface with smooth animations
- **♿ Accessibility** - Screen reader friendly and keyboard navigation
- **🌐 Cross-Browser** - Compatible with all modern browsers

## 🚀 **Live Demo**

**Try it now:** [https://my-interview-mm4117g1e-sam17202s-projects.vercel.app](https://my-interview-mm4117g1e-sam17202s-projects.vercel.app)

## 🛠️ **Tech Stack**

| Category | Technologies |
|----------|-------------|
| **Frontend** | React 18, TypeScript, Vite |
| **Styling** | Tailwind CSS, Lucide Icons |
| **State Management** | Redux Toolkit, Redux Persist |
| **Database** | Supabase (PostgreSQL) |
| **AI Integration** | Google Gemini API |
| **File Processing** | PDF.js, Mammoth.js |
| **Voice** | Web Speech API |
| **Deployment** | Vercel |

## 📋 **Prerequisites**

Before you begin, ensure you have:

- **Node.js** 16+ and npm installed
- **Google Gemini API key** ([Get one here](https://makersuite.google.com/app/apikey))
- **Supabase account** ([Sign up here](https://supabase.com))

## ⚡ **Quick Start**

### 1. **Clone the Repository**

```bash
git clone https://github.com/Aniket17200/interview.git
cd interview/my-interview
```

### 2. **Install Dependencies**

```bash
npm install
```

### 3. **Environment Setup**

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Add your API keys to `.env`:

```env
# Google Gemini AI API Key
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. **Get Your API Keys**

#### **Google Gemini API Key:**
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Copy the generated key to your `.env` file

#### **Supabase Setup:**
1. Create account at [Supabase](https://supabase.com)
2. Create a new project
3. Go to Settings → API
4. Copy the Project URL and anon/public key to your `.env` file
5. Run the database setup:

```bash
npm run setup-db
```

### 5. **Start Development Server**

```bash
npm run dev
```

Visit `http://localhost:5173` to see your app! 🎉

## 📖 **Usage Guide**

### 👤 **For Candidates (Interviewees)**

1. **📄 Upload Resume** - Drag & drop or click to upload PDF/DOCX
2. **✏️ Complete Profile** - Fill in any missing contact information  
3. **🔧 System Check** - Test your microphone and speakers
4. **🎯 Start Interview** - Begin the 6-question assessment
5. **💬 Answer Questions** - Type or speak your responses
6. **📊 View Results** - Get detailed AI feedback and scores

### 👨‍💼 **For Interviewers**

1. **📊 Dashboard Overview** - See all candidates with scores and status
2. **🔍 Search & Filter** - Find candidates by name, email, or score
3. **📋 Review Details** - Click any candidate for complete interview history
4. **📈 Analyze Performance** - Review Q&A, scores, and AI feedback
5. **📤 Export Data** - Download candidate data and reports

## 🎯 **Interview Structure**

| Phase | Questions | Time Limit | Description |
|-------|-----------|------------|-------------|
| **Easy** | 2 questions | 90 seconds each | Basic concepts and fundamentals |
| **Medium** | 2 questions | 3 minutes each | Practical application and problem-solving |
| **Hard** | 2 questions | 5 minutes each | Advanced scenarios and system design |

### **Scoring System**
- Each answer scored **0-10** by AI
- **Detailed feedback** provided for every response
- **Final summary** with strengths and improvement areas
- **Overall score** calculated as average across all questions

## 🎤 **Voice Features**

### **Text-to-Speech**
- 🔊 AI reads questions with natural pronunciation
- 🎛️ Adjustable speech rate and volume
- 🌍 Enhanced Indian English voice support

### **Speech-to-Text**
- 🎙️ Click microphone to start voice input
- ⚡ Real-time transcription as you speak
- 🔄 Automatic punctuation and formatting
- 🛑 Click again to stop and review

## 💾 **Data Storage & Security**

- **🔒 Secure Storage** - All data encrypted in Supabase
- **🔄 Auto-Backup** - Progress saved automatically every 30 seconds
- **📱 Cross-Device** - Access your data from any device
- **🗑️ Data Control** - Delete your data anytime
- **🔐 Privacy First** - No data shared with third parties

## 🌐 **Browser Compatibility**

| Browser | Support Level | Voice Features |
|---------|---------------|----------------|
| **Chrome/Edge** | ✅ Full Support | ✅ Complete |
| **Firefox** | ✅ Full Support | ⚠️ Limited Speech Recognition |
| **Safari** | ✅ Full Support | ⚠️ Limited Speech Recognition |
| **Mobile Browsers** | ✅ Responsive | ⚠️ Basic Voice Support |

## 🔧 **Troubleshooting**

### **Common Issues & Solutions**

<details>
<summary><strong>🔑 API Key Errors</strong></summary>

- Verify your Gemini API key is correctly set in `.env`
- Check API key has proper permissions
- Ensure you haven't exceeded API quotas
- Try regenerating the API key if issues persist

</details>

<details>
<summary><strong>🎤 Voice Features Not Working</strong></summary>

- Enable microphone permissions in browser
- Use HTTPS or localhost (required for speech recognition)
- Check browser compatibility table above
- Test with the built-in system check feature

</details>

<details>
<summary><strong>📄 Resume Upload Issues</strong></summary>

- Ensure file is PDF or DOCX format
- Check file size is under 10MB
- Verify file isn't password protected or corrupted
- Try a different file format if issues persist

</details>

<details>
<summary><strong>💾 Database Connection Issues</strong></summary>

- Verify Supabase URL and keys in `.env`
- Check your Supabase project is active
- Run `npm run setup-db` to initialize database
- Check browser console for specific error messages

</details>

## 🏗️ **Development**

### **Project Structure**
```
src/
├── components/          # React components
│   ├── IntervieweeTab.tsx    # Candidate interface
│   ├── InterviewerTab.tsx    # Interviewer dashboard
│   └── SystemTest.tsx        # Audio system testing
├── services/           # API and utility services
│   ├── geminiService.ts      # AI integration
│   ├── supabaseClient.ts     # Database client
│   └── resumeParser.ts       # File processing
├── store/             # Redux store and slices
│   ├── slices/              # State management
│   └── index.ts             # Store configuration
├── types/             # TypeScript definitions
└── assets/            # Static assets
```

### **Available Scripts**

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run preview         # Preview production build

# Database
npm run setup-db        # Initialize Supabase database

# Code Quality
npm run lint            # Run ESLint
npm run type-check      # Run TypeScript checks
```

### **Contributing**

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

## 📄 **License**

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🤝 **Support & Contact**

- **🐛 Bug Reports**: [Open an issue](https://github.com/Aniket17200/interview/issues)
- **💡 Feature Requests**: [Start a discussion](https://github.com/Aniket17200/interview/discussions)
- **📧 Email**: [Contact Developer](mailto:your-email@example.com)

## 🙏 **Acknowledgments**

- **Google Gemini AI** for powerful language processing
- **Supabase** for excellent database and authentication services
- **Vercel** for seamless deployment and hosting
- **React Community** for amazing tools and libraries

---

<div align="center">

**⭐ Star this repository if you found it helpful!**

Made with ❤️ by [Aniket](https://github.com/Aniket17200)

</div>
