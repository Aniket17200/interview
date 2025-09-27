# 🧪 Test Interview Flow

## ✅ **Quick Test Steps:**

### **1. Start the App**
```bash
npm run dev
```

### **2. Complete Interview Flow**

#### **Step 1: Upload Resume**
- Go to Interviewee tab
- Upload any PDF or DOCX file (or skip if you don't have one)
- Fill in: Name, Email, Phone

#### **Step 2: Start Interview**
- Click "Start Interview" button
- **Expected**: Console shows debug messages
- **Expected**: Question appears on screen

#### **Step 3: Answer Questions**
- Type any answer in the text box
- Click Submit (or press Enter)
- **Expected**: Next question appears
- **Expected**: Timer resets for new question

#### **Step 4: Complete Interview**
- Answer all 6 questions
- **Expected**: Final score and summary appear
- **Expected**: Interview marked as completed

#### **Step 5: Check Dashboard**
- Switch to "Interviewer" tab
- **Expected**: Your completed interview appears in the list
- **Expected**: Can click to view details

## 🔍 **Debug Information to Check:**

### **Console Messages (F12):**
```
SimpleIntervieweeTab render: {
  currentCandidate: "Your Name",
  isInterviewActive: true,
  currentQuestion: "Can you explain what JavaScript is...",
  currentSessionId: "local_1234567890"
}

Starting interview for candidate: Your Name
Starting interview in local mode
Generating next question locally...
Question index: 0, Max questions: 6
Generating easy question for index 0
Using fallback question (Gemini API disabled for testing)
Generated question: {
  id: "q_1234567890",
  text: "Can you explain what JavaScript is and why it's used in web development?",
  difficulty: "easy",
  maxTime: 20,
  category: "full-stack"
}
Presenting question: Can you explain what JavaScript is and why it's used in web development?
```

## 🎯 **Expected Questions:**

### **Easy Questions (20 seconds each):**
1. "Can you explain what JavaScript is and why it's used in web development?"
2. "What is the difference between HTML and CSS?"

### **Medium Questions (60 seconds each):**
3. "Explain the concept of React components and how they work."
4. "What is the difference between synchronous and asynchronous programming?"

### **Hard Questions (120 seconds each):**
5. "How would you design a scalable web application architecture?"
6. "Explain how you would optimize the performance of a slow web application."

## ✅ **Success Indicators:**

### **Interview Working When:**
- ✅ Questions appear immediately after clicking "Start Interview"
- ✅ Timer counts down (20s → 60s → 120s based on difficulty)
- ✅ Can type and submit answers
- ✅ Progress through all 6 questions
- ✅ Final score appears (0-10 scale)
- ✅ Interview appears in Interviewer dashboard

### **Audio Features (Optional):**
- ✅ Questions are spoken aloud (if audio enabled)
- ✅ Can use voice input (if microphone enabled)
- ✅ Natural acknowledgments after answers

## 🐛 **Common Issues & Solutions:**

### **Issue: No Questions Appear**
- **Check**: Console for error messages
- **Solution**: Refresh page and try again
- **Fallback**: Questions should work without any APIs

### **Issue: Timer Not Working**
- **Check**: Timer should count down from 20/60/120 seconds
- **Solution**: Questions auto-submit when timer reaches 0

### **Issue: Can't Submit Answers**
- **Check**: Text area should be enabled during questions
- **Solution**: Type any text and click Submit button

### **Issue: Interview Doesn't Complete**
- **Check**: Should automatically finish after 6 questions
- **Solution**: Manually refresh if stuck

## 🚀 **Performance Test:**

### **Speed Benchmarks:**
- **Question Generation**: < 1 second (using fallbacks)
- **Answer Submission**: Instant (local storage)
- **Interview Completion**: < 2 seconds
- **Dashboard Update**: Instant

### **Offline Capability:**
- ✅ Works without internet connection
- ✅ Works without Gemini API key
- ✅ Works without Supabase database
- ✅ All data stored locally in browser

---

## 🎉 **Success Criteria:**

**The interview is working correctly if you can:**
1. ✅ Start an interview and see the first question
2. ✅ Answer all 6 questions with different difficulties
3. ✅ Get a final score and summary
4. ✅ See the completed interview in the dashboard

**This confirms the entire application is functional and ready for use!**