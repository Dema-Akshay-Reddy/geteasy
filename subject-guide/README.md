# GetEasy Academic Learning Platform

A comprehensive AI-powered learning platform that provides intelligent document processing, adaptive topic explanations, step-by-step question solving, knowledge graphs, learning paths, analytics, and personalized study guides.

## Features

### Core Learning Tools
- **Adaptive Topic Explainer**: Level-appropriate explanations (beginner/intermediate/advanced) with examples and formulas
- **Step-by-Step Question Solver**: Detailed solutions with exam tips and material references
- **Learning Progression Generator**: 4-step structured learning paths (Theory → Examples → Practice → Assessment)
- **Knowledge Graph**: Visual topic relationships and prerequisite mapping
- **Learning Path Roadmap**: Personalized study plans based on exam/comprehensive/quick-review targets

### Document Management
- **Intelligent Processing**: Automatic categorization (textbook, lecture notes, question papers, lab manuals, syllabus)
- **Multi-Format Support**: PDF, DOCX, PPTX, TXT
- **Automatic Organization**: Subject detection and organization from content
- **Vector Storage**: ChromaDB with semantic search and metadata filtering

### Analytics & Progress Tracking
- **Mastery Analytics**: Track topic understanding with accuracy percentages
- **Weak Area Identification**: Automatically identify topics needing focus
- **Progress Timeline**: Visualize learning journey over time
- **Personalized Recommendations**: AI-driven study suggestions

### Export & Sharing
- **Study Guide Export**: Generate comprehensive Markdown study guides
- **Progress Summaries**: Export topic mastery data in JSON format

## Technology Stack

- **Frontend**: Next.js 14 (App Router), Tailwind CSS, React Markdown
- **Backend**: FastAPI, SQLAlchemy, Pydantic
- **Database**: PostgreSQL (with psycopg)
- **Vector Store**: ChromaDB with persistent storage
- **Embeddings**: Sentence-Transformers (all-MiniLM-L6-v2)
- **LLM**: Groq API (configurable model)

## Prerequisites

Install the following before starting:

- Python 3.10 or newer
- Node.js 18 or newer
- Docker Desktop
- A Groq API key from [GroqCloud](https://console.groq.com/)

### Docker Desktop on Windows

Docker Desktop uses WSL 2. If Docker reports that WSL is not installed, open **PowerShell as Administrator** and run:

```powershell
wsl --install --no-distribution
```

Restart Windows, open Docker Desktop, and wait until it shows **Engine running**. This does not install Ubuntu.

## Setup (Windows)

The commands below use a temporary `S:` drive mapping to keep paths short. This avoids Windows path-length failures while installing PyTorch and the embedding dependencies.

Open PowerShell and run:

```powershell
subst S: C:\Users\<your-user>\Downloads\subject-guide-starter\subject-guide
S:
```

Replace `<your-user>` with your Windows username, or substitute the actual absolute path to this project.

### 1. Start PostgreSQL

Make sure Docker Desktop is running, then run:

```powershell
docker run --name subject-guide-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=subject_guide -p 5432:5432 -d postgres:16
```

Confirm that it is running:

```powershell
docker ps
```

On future runs, start the existing container instead:

```powershell
docker start subject-guide-db
```

### 2. Configure the backend

```powershell
S:
cd \backend
python -m venv venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
notepad .env
```

Set these values in `backend/.env`:

```ini
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/subject_guide
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=openai/gpt-oss-20b
JWT_SECRET_KEY=replace-with-a-long-random-string
```

Do not commit or share the `.env` file or your API key.

Start the backend and leave this PowerShell window open:

```powershell
python -m uvicorn app.main:app --reload
```

Open [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) to view the API documentation.

### 3. Run the frontend

Open a **third** PowerShell window:

```powershell
S:
cd \frontend
npm.cmd install
npm.cmd run dev
```

Open [http://localhost:3000](http://localhost:3000).

The application will automatically handle subject creation when you upload documents - no need to manually create subjects or users!

## Using the Application

### Home Screen
1. **Upload Documents**: Drag and drop files or folders, or use the file picker
2. **Auto-Organization**: Documents are automatically categorized and organized by subject
3. **View Results**: See upload status, subject assignment, and chunk creation

### Subject Workspace

Once you select a subject, access five powerful tabs:

#### 1. Topic Explainer
- Enter any topic from your materials
- Select difficulty level (Beginner/Intermediate/Advanced)
- Get tailored explanations with:
  - Theory and intuition
  - Real-world examples
  - Key formulas and definitions
  - Source citations

#### 2. Question Solver
- Paste or type any question
- Receive detailed step-by-step solutions
- Get exam tips and scoring advice
- See references to relevant material sections

#### 3. Knowledge Map
- **Learning Path**: View recommended topic sequence
- **Knowledge Graph**: Explore topic relationships
- **Progression Generator**: Create 4-step learning plans
  - Theory Foundation
  - Worked Examples/Code
  - Practice Problems
  - Self-Assessment Quiz

#### 4. Analytics
- **Overall Mastery**: See percentage across all topics
- **Mastered Topics**: Track completed subjects
- **Weak Areas**: Identify topics needing focus
- **Recommendations**: Get personalized study advice
- **Question Stats**: View attempt history and accuracy

#### 5. Documents
- View all uploaded materials
- See document types and status
- Track chunk counts

### Export Study Guide
- Click the "Export Study Guide" button
- Download a comprehensive Markdown file with:
  - Topic overview with your progress
  - Key concepts and formulas
  - Solved questions
  - All source materials

## API Endpoints

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete API reference.

### Quick Reference

**Document Upload:**
```bash
POST /documents/upload
```

**Topic Explanation:**
```bash
POST /query/explain
Body: {
  "subject_id": "uuid",
  "topic": "Process Scheduling",
  "level": "intermediate"
}
```

**Question Solving:**
```bash
POST /query/solve
Body: {
  "subject_id": "uuid",
  "question": "Explain the Banker's Algorithm"
}
```

**Learning Progression:**
```bash
POST /query/progression
Body: {
  "subject_id": "uuid",
  "topic": "Memory Management"
}
```

**Knowledge Graph:**
```bash
GET /subjects/{subject_id}/graph
```

**Learning Path:**
```bash
POST /subjects/{subject_id}/learning-path
Body: { "target": "exam" }
```

**Analytics:**
```bash
GET /analytics/{subject_id}
```

**Export Study Guide:**
```bash
GET /export/{subject_id}/markdown
```

## Troubleshooting

### Docker Desktop cannot start

Verify that Docker Desktop is open and its engine is running. If WSL is missing, use the WSL command in the prerequisites section and restart Windows.

### PowerShell blocks virtual-environment activation

Run the following in the current PowerShell window, then activate the environment again:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\venv\Scripts\Activate.ps1
```

### `ModuleNotFoundError` after installing dependencies

The installation was interrupted or run from the wrong Python environment. Activate the virtual environment and run:

```powershell
python -m pip install -r requirements.txt
```

Do not cancel the command while large packages such as PyTorch and `sentence-transformers` are installing.

### Groq reports that a model is unavailable

Use this model in `backend/.env` and restart the backend:

```ini
GROQ_MODEL=openai/gpt-oss-20b
```

### Upload fails with content errors

The document may be corrupted or password-protected. Try:
- Exporting to PDF from the original application
- Removing password protection
- Converting to a supported format

### Empty responses from Topic Explainer or Solver

Ensure relevant documents are uploaded for the subject. The AI needs source material to generate accurate responses.

### Knowledge Graph shows no topics

Upload comprehensive materials (textbooks, complete lecture notes, syllabus) to generate topic relationships.

### Analytics shows no data

Use the Topic Explainer and Question Solver features to build mastery tracking data. Analytics requires interaction history.

## Development Notes

### Database Models
- **User**: Basic user management (authentication coming soon)
- **Subject**: Auto-created from document content
- **Document**: Stores file metadata and categorization
- **Chunk**: Links to ChromaDB embeddings
- **TopicMastery**: Tracks learning progress per topic
- **QuestionAttempt**: Logs question-solving history

### Vector Store
- **Location**: `./chroma_data` (configurable via `CHROMA_PERSIST_DIR`)
- **Embedding Model**: `all-MiniLM-L6-v2` (384 dimensions)
- **Chunk Size**: 800 characters with 150-character overlap
- **Metadata**: subject_id, document_id, filename, content_type

### LLM Configuration
- **Provider**: Groq API
- **Default Model**: `openai/gpt-oss-20b`
- **Temperature**: 0.2 for Q&A, 0.3 for explanations
- **Max Tokens**: 4000-5000 depending on task

### API Features
- Automatic CORS configuration for `http://localhost:3000`
- Pydantic request/response validation
- FastAPI automatic OpenAPI docs at `/docs`
- Proper error handling with HTTP status codes

### Frontend Architecture
- App Router with client components
- Tailwind CSS for styling
- React Markdown with remark-gfm for content rendering
- State management with React hooks
- Tabbed interface for organized features

## Deployment Considerations

Before deploying to production:

1. **Security**:
   - Implement proper user authentication
   - Use environment-specific secrets
   - Enable HTTPS
   - Configure CORS for production domain

2. **Database**:
   - Use managed PostgreSQL (AWS RDS, Azure Database, etc.)
   - Implement database migrations with Alembic
   - Set up regular backups

3. **Vector Store**:
   - Consider cloud vector databases for scale
   - Implement backup strategy for ChromaDB data
   - Monitor disk space usage

4. **LLM**:
   - Monitor API usage and costs
   - Implement rate limiting
   - Cache common queries
   - Consider multiple model support

5. **Performance**:
   - Add Redis for session management
   - Implement CDN for static assets
   - Optimize chunk retrieval strategies
   - Add request queueing for heavy operations

## Contributing

We welcome contributions! Areas for improvement:

- User authentication and authorization
- Collaborative learning features
- Video lecture processing
- Flashcard generation
- Practice test creation
- Mobile application
- Advanced analytics and visualizations
- Multi-language support

## License

MIT License - See LICENSE file for details

## Support & Documentation

- **Full API Documentation**: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **GitHub Issues**: Report bugs and request features
- **API Reference**: http://localhost:8000/docs (when running locally)

---

**Built for students, by educators and AI specialists.**

*GetEasy - Making academic learning intelligent, personalized, and effective.*
