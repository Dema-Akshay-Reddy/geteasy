# GetEasy - Quick Start Guide

Get up and running with GetEasy in 5 minutes!

## 1. Prerequisites

Install these first:
- **Python 3.10+**: https://www.python.org/downloads/
- **Node.js 18+**: https://nodejs.org/
- **Docker Desktop**: https://www.docker.com/products/docker-desktop/
- **Groq API Key**: Get free key from https://console.groq.com/

## 2. Start Database

```powershell
# Start PostgreSQL with Docker
docker run --name subject-guide-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=subject_guide \
  -p 5432:5432 -d postgres:16

# Verify it's running
docker ps
```

## 3. Set Up Backend

```powershell
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
.\venv\Scripts\Activate.ps1

# Activate (Mac/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env

# Edit .env and add your Groq API key
notepad .env  # Windows
nano .env     # Mac/Linux
```

**Required .env values:**
```env
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost/subject_guide
GROQ_API_KEY=your_actual_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-20b
JWT_SECRET_KEY=your-secret-key-replace-this
```

**Start backend:**
```powershell
uvicorn app.main:app --reload
```

Backend runs at: http://localhost:8000
API docs at: http://localhost:8000/docs

## 4. Set Up Frontend

Open a new terminal:

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend runs at: http://localhost:3000

## 5. Use the Application

### First-Time Setup
1. Open http://localhost:3000
2. You'll see the welcome screen

### Upload Documents
1. Click "Choose files" or drag and drop your study materials
2. Supported formats: PDF, DOCX, PPTX, TXT
3. Click "Upload X files"
4. Wait for processing (first upload takes longer as embedding model initializes)

### Explore Features
Once documents are uploaded and subjects created:

#### **Topic Explainer**
1. Click on your subject from the sidebar
2. Select "Topic Explainer" tab
3. Enter topic: e.g., "Process Scheduling"
4. Choose level: Beginner / Intermediate / Advanced
5. Click "Explain Topic"

#### **Question Solver**
1. Select "Question Solver" tab
2. Enter your question or problem
3. Click "Solve Question"
4. Get step-by-step solution with exam tips

#### **Knowledge Map**
1. Select "Knowledge Map" tab
2. View recommended learning path
3. See topic relationships
4. Generate 4-step progressions for specific topics

#### **Analytics**
1. Select "Analytics" tab
2. View mastery percentage
3. Identify weak areas
4. Get study recommendations

#### **Export**
1. Click "Export Study Guide" button in header
2. Download comprehensive Markdown study guide

## Common Issues

### Backend won't start
- **Check**: Is PostgreSQL container running? `docker ps`
- **Fix**: Start it with `docker start subject-guide-db`

### "No materials found" error
- **Check**: Did documents upload successfully?
- **Fix**: Upload materials for the subject before querying

### Slow first upload
- **Normal**: First upload initializes embedding model (~200MB download)
- **Wait**: Subsequent uploads will be much faster

### Import errors in Python
- **Check**: Is virtual environment activated?
- **Fix**: Activate with `.\venv\Scripts\Activate.ps1` (Windows) or `source venv/bin/activate` (Mac/Linux)

## What to Try First

### 1. Upload a Textbook Chapter
Upload a PDF textbook chapter on any subject (OS, DBMS, ML, etc.)

### 2. Explain a Complex Topic
Use Topic Explainer with "Beginner" level to get simplified explanations

### 3. Solve a Question
Copy a homework question and get step-by-step solution

### 4. Generate Learning Path
View the Knowledge Map to see recommended topic sequence

### 5. Track Progress
Use different features and check Analytics to see your mastery growth

## Example Workflow

**Scenario**: Studying for Operating Systems exam

1. **Upload Materials**:
   - Textbook chapters (PDF)
   - Lecture notes (DOCX)
   - Past question papers (PDF)
   - Lab manuals (PDF)

2. **Start with Basics**:
   - Topic Explainer: "Introduction to Operating Systems" (Beginner)
   - Topic Explainer: "Process Management" (Intermediate)

3. **Practice Questions**:
   - Question Solver: "Explain the difference between process and thread"
   - Question Solver: "Solve: Given 3 processes with arrival times..."

4. **Structured Learning**:
   - Knowledge Map → Generate Progression for "CPU Scheduling"
   - Follow the 4-step plan: Theory → Examples → Practice → Quiz

5. **Track Progress**:
   - Analytics → View mastery levels
   - Analytics → Focus on weak areas

6. **Before Exam**:
   - Export Study Guide
   - Review key formulas and concepts
   - Practice more questions in weak areas

## Next Steps

- **Read full documentation**: [README.md](./README.md)
- **API reference**: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **Explore API**: http://localhost:8000/docs

## Tips for Best Results

1. **Upload Diverse Materials**: Mix textbooks, notes, and question papers
2. **Use Correct Levels**: Start with Beginner, progress to Advanced
3. **Practice Regularly**: Use Question Solver to track progress
4. **Follow Learning Paths**: Use Knowledge Map progressions
5. **Check Analytics**: Identify weak topics early
6. **Export Study Guides**: Create comprehensive review materials

## Getting Help

- **Backend Logs**: Check terminal running uvicorn
- **Frontend Logs**: Check browser console (F12)
- **Database Issues**: Check Docker logs: `docker logs subject-guide-db`
- **API Testing**: Use http://localhost:8000/docs to test endpoints directly

---

**Happy Learning with GetEasy! 🚀📚**
