# Resume-Based Question Generation System

## Overview
The interview application uses advanced AI-powered question generation that analyzes the candidate's resume content to create personalized, relevant technical questions using Gemini AI.

## How It Works

### ✅ **Resume Content Analysis**
The system performs comprehensive analysis of uploaded resumes:

#### **1. Skill Extraction**
- **Comprehensive Tech Stack**: Analyzes 100+ technologies across categories
- **Experience Mapping**: Extracts years of experience for each skill
- **Skill Categories**: Frontend, Backend, Database, Cloud, Tools, Testing
- **Variations Handling**: Recognizes different naming conventions (React.js, ReactJS, React)

#### **2. Experience Level Analysis**
- **Years Extraction**: Finds experience patterns like "5+ years", "3 years experience"
- **Role Analysis**: Identifies senior, mid-level, junior roles and responsibilities
- **Leadership Indicators**: Detects mentoring, management, and technical leadership experience
- **Multi-factor Assessment**: Combines years, roles, and responsibilities for accurate leveling

#### **3. Project & Company Extraction**
- **Project Identification**: Finds project descriptions and achievements
- **Company History**: Extracts work experience and employers
- **Context Building**: Uses project and company info for question personalization

### ✅ **AI-Powered Question Generation**
Using Gemini AI with detailed prompts that include:

#### **Personalization Elements**
```
CANDIDATE PROFILE:
- Name: [Candidate Name]
- Experience Level: Senior (7+ years) / Mid-level (3-6 years) / Junior (0-2 years)
- Technical Skills: React (5+ years), Node.js, MongoDB, AWS, Docker...
- Recent Projects: E-commerce platform, Real-time chat app...
- Work Experience: Google, Microsoft, Startup XYZ...
- Resume Context: [First 500 characters of resume for context]
```

#### **Question Requirements**
- **Difficulty Matching**: Questions appropriate for candidate's experience level
- **Technology Focus**: Uses technologies they actually know
- **Uniqueness**: Avoids repeating similar topics from previous questions
- **Practical Scenarios**: Real-world application rather than theoretical
- **Conversational Style**: Personalized and engaging

### ✅ **Fallback System**
When Gemini AI is unavailable, intelligent fallback questions based on:
- **Extracted Skills**: Personalized questions using their actual tech stack
- **Experience Level**: Appropriate difficulty for their background
- **Project Context**: References their mentioned projects and experience

## Technical Implementation

### **Enhanced Skill Extraction**
```typescript
// Comprehensive skill categories with variations
const techSkills = {
  frontend: ['javascript', 'typescript', 'react', 'angular', 'vue', 'svelte', ...],
  backend: ['node.js', 'express', 'python', 'django', 'java', 'spring', ...],
  database: ['mongodb', 'mysql', 'postgresql', 'redis', 'elasticsearch', ...],
  cloud: ['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', ...],
  // ... more categories
};

// Extract with experience years
skills.forEach(skill => {
  const experiencePattern = /(\d+)\+?\s*years?.*${skill}|${skill}.*(\d+)\+?\s*years?/i;
  const match = resumeText.match(experiencePattern);
  if (match) {
    skillsWithExperience.push(`${skill} (${years}+ years)`);
  }
});
```

### **Advanced Experience Analysis**
```typescript
// Multi-factor experience assessment
const analyzeExperienceLevel = (resumeText: string) => {
  // Extract years from patterns
  const yearPatterns = [
    /(\d+)\+?\s*years?\s*of\s*experience/gi,
    /(\d+)\+?\s*years?\s*experience/gi,
    /experience.*?(\d+)\+?\s*years?/gi
  ];
  
  // Analyze role levels
  const seniorKeywords = ['senior', 'lead', 'architect', 'principal', 'manager'];
  const leadershipKeywords = ['mentored', 'managed', 'supervised', 'coordinated'];
  
  // Combine factors for accurate assessment
  return determineLevel(maxYears, hasLeadership, hasSeniorRole);
};
```

### **Personalized Question Prompts**
```typescript
const prompt = `
Generate a UNIQUE ${difficulty} level question based on the candidate's actual resume.

CANDIDATE PROFILE:
Name: ${name}
Experience Level: ${experienceLevel}
Technical Skills: ${skills.slice(0, 8).join(', ')}
Recent Projects: ${projects.join(', ')}
Work Experience: ${companies.join(', ')}

INSTRUCTIONS:
1. Reference technologies they actually know: ${skills.slice(0, 3).join(', ')}
2. Match their experience level (${experienceLevel})
3. Make it conversational: "I see you have experience with..."
4. Focus on real-world application
5. Avoid repeating previous topics

Return ONLY the question text.
`;
```

## Question Examples

### **For React Developer with 3+ Years**
- **Generic**: "Explain React hooks"
- **Personalized**: "I see you have 3+ years of React experience. Can you walk me through how you've used useEffect in your projects, and describe a specific scenario where you had to optimize re-renders?"

### **For Full-Stack Developer at Startup**
- **Generic**: "What is REST API?"
- **Personalized**: "Based on your full-stack experience at [Startup], how would you design a scalable API architecture for a growing user base, and what challenges have you faced with API performance?"

### **For Senior Developer with Leadership**
- **Generic**: "Explain system design"
- **Personalized**: "Given your senior role and experience mentoring developers, how would you approach architecting a microservices system for a team of 10 developers, and what technical decisions would you delegate vs. make yourself?"

## Benefits

### ✅ **Highly Relevant Questions**
- Questions match candidate's actual skills and experience
- No irrelevant questions about unknown technologies
- Appropriate difficulty for their level

### ✅ **Engaging Interview Experience**
- Conversational and personalized approach
- References their actual work and projects
- Encourages detailed, experience-based answers

### ✅ **Accurate Assessment**
- Tests skills they claim to have
- Difficulty matches their experience level
- Real-world scenarios they can relate to

### ✅ **Comprehensive Coverage**
- Covers their full tech stack
- Progressive difficulty throughout interview
- Avoids repetition across questions

## Configuration

### **Resume Upload Requirements**
- **Supported Formats**: PDF, DOCX
- **Content Analysis**: Automatic parsing and skill extraction
- **Privacy**: Resume content used only for question generation

### **AI Integration**
- **Primary**: Gemini AI for advanced question generation
- **Fallback**: Intelligent skill-based questions when AI unavailable
- **Personalization**: Always uses extracted resume data

### **Question Progression**
- **Questions 1-2**: Easy level, basic concepts from their skills
- **Questions 3-4**: Medium level, practical application
- **Questions 5-6**: Hard level, system design and advanced topics

The system ensures every interview is uniquely tailored to the candidate's background, creating a more engaging and accurate assessment experience! 🎯✨

## Sample Question Generation Flow

```
1. Upload Resume → Parse Content
   ↓
2. Extract Skills: ["React (5+ years)", "Node.js", "MongoDB", "AWS"]
   ↓
3. Analyze Experience: "Senior (7+ years) with leadership experience"
   ↓
4. Generate AI Prompt with personalized context
   ↓
5. Gemini AI creates unique question:
   "I see you have extensive React experience and leadership background. 
   How would you guide a junior developer through implementing a complex 
   state management solution in a React application with multiple data sources?"
   ↓
6. Deliver personalized, relevant question to candidate
```

This creates a truly personalized interview experience that feels natural and relevant to each candidate's unique background! 🚀