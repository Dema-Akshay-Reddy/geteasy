# GetEasy Academic Learning Platform - API Documentation

## Overview

GetEasy is a comprehensive AI-powered academic learning platform that provides intelligent document processing, RAG-based Q&A, adaptive topic explanations, knowledge graphs, analytics, and personalized learning paths.

---

## Core Features

### 1. Document Processing & Tagging

Automatically processes and categorizes uploaded academic materials.

**Endpoint:** `POST /documents/upload`

**Supported Formats:** PDF, DOCX, PPTX, TXT

**Document Categories:**
- `textbook`: Comprehensive reference materials
- `lecture_notes`: Class notes and slides
- `question_paper`: Exam questions and practice problems
- `lab_manual`: Practical lab exercises
- `syllabus`: Course outline and curriculum

**Request:**
```bash
curl -X POST http://localhost:8000/documents/upload \
  -F "file=@/path/to/document.pdf"
```

**Response:**
```json
{
  "subject_id": "uuid",
  "subject_name": "Operating Systems",
  "document_id": "uuid",
  "filename": "os_notes.pdf",
  "content_type": "lecture_notes",
  "chunks_created": 45
}
```

**Features:**
- Automatic subject detection from content
- Structural metadata extraction (filename, page numbers)
- Vector embeddings with content-type tags for filtered retrieval
- Automatic subject creation/organization

---

### 2. Adaptive Topic Explainer

Provides level-appropriate explanations adapted to student knowledge level.

**Endpoint:** `POST /query/explain`

**Levels:** `beginner`, `intermediate`, `advanced`

**Request:**
```json
{
  "subject_id": "uuid",
  "topic": "Process Scheduling",
  "level": "intermediate"
}
```

**Response:**
```json
{
  "topic": "Process Scheduling",
  "level": "intermediate",
  "explanation": "# Process Scheduling\n\n## Core Concept\n...",
  "sources": ["os_textbook.pdf", "lecture_notes.pdf"],
  "chunks_used": 12
}
```

**Output Structure:**
- Theory & intuition adapted to chosen level
- Real-world / academic examples
- Key formulas / technical definitions
- Sources cited from uploaded materials

---

### 3. Step-by-Step Question Solver

Provides detailed solutions with exam tips and material references.

**Endpoint:** `POST /query/solve`

**Request:**
```json
{
  "subject_id": "uuid",
  "question": "Explain the Banker's Algorithm with an example"
}
```

**Response:**
```json
{
  "question": "Explain the Banker's Algorithm with an example",
  "solution": "## Problem Understanding\n...\n## Step-by-Step Solution\n...",
  "sources": ["os_textbook.pdf"],
  "chunks_used": 8
}
```

**Output Includes:**
- Problem understanding
- Step-by-step solution with reasoning
- Final answer
- Key concepts used
- Exam tips for similar problems
- Related material references

---

### 4. Structured Learning Progression

Generates a 4-step learning walkthrough: Theory → Examples → Practice → Assessment

**Endpoint:** `POST /query/progression`

**Request:**
```json
{
  "subject_id": "uuid",
  "topic": "Memory Management"
}
```

**Response:**
```json
{
  "topic": "Memory Management",
  "progression": "## 1. Theory Foundation\n...\n## 2. Worked Examples\n...",
  "sources": ["os_textbook.pdf", "lecture_notes.pdf"],
  "chunks_used": 20
}
```

**Progression Steps:**
1. **Theory Foundation:** Core concepts and principles
2. **Worked Examples / Code Demonstrations:** Detailed examples with solutions
3. **Practice Problems:** Curated practice questions
4. **Self-Assessment Quiz:** 5-7 questions to test understanding

---

### 5. Knowledge Graph & Prerequisites

Returns topic relationships and prerequisite mappings.

**Endpoint:** `GET /subjects/{subject_id}/graph`

**Response:**
```json
{
  "subject_id": "uuid",
  "subject_name": "Operating Systems",
  "nodes": [
    {
      "id": "node_0",
      "label": "Process Management",
      "type": "topic"
    }
  ],
  "edges": [
    {
      "source": "node_0",
      "target": "node_1",
      "relationship": "leads_to"
    }
  ]
}
```

**Features:**
- Topic and subtopic identification
- Prerequisite relationships
- Related concept connections
- Parsed from uploaded materials

---

### 6. Learning Path Roadmap

Generates personalized study roadmaps based on target and syllabus.

**Endpoint:** `POST /subjects/{subject_id}/learning-path`

**Request:**
```json
{
  "target": "exam"
}
```

**Targets:** `exam`, `comprehensive`, `quick_review`

**Response:**
```json
{
  "subject_id": "uuid",
  "subject_name": "Operating Systems",
  "target": "exam",
  "path": [
    {
      "order": 1,
      "topic": "Introduction to OS",
      "estimated_hours": 4,
      "status": "not_started"
    }
  ],
  "total_topics": 12
}
```

---

### 7. Knowledge Gap & Analytics

Tracks mastery, identifies weak areas, and provides recommendations.

**Endpoint:** `GET /analytics/{subject_id}`

**Response:**
```json
{
  "subject_id": "uuid",
  "subject_name": "Operating Systems",
  "overall_mastery": 65.5,
  "mastered_topics": 8,
  "total_topics": 12,
  "weak_areas": [
    {
      "topic": "Deadlock Prevention",
      "accuracy": 45.0,
      "attempts": 5
    }
  ],
  "topic_breakdown": [
    {
      "topic": "Process Scheduling",
      "mastery_level": "advanced",
      "practice_count": 10,
      "correct_count": 9,
      "accuracy": 90.0,
      "last_practiced": "2024-01-15T10:30:00"
    }
  ],
  "question_attempts": {
    "total": 45,
    "correct": 35,
    "incorrect": 8,
    "unknown": 2
  },
  "recommendations": [
    {
      "type": "focus_area",
      "priority": "high",
      "message": "Focus on Deadlock Prevention - current accuracy: 45%"
    }
  ]
}
```

**Track Mastery:**

**Endpoint:** `POST /analytics/track`

```json
{
  "subject_id": "uuid",
  "topic": "Process Scheduling",
  "mastery_level": "advanced",
  "correct": true
}
```

---

### 8. Study Guide Export

Generates downloadable Markdown study guides with formulas, notes, and solved questions.

**Endpoint:** `GET /export/{subject_id}/markdown`

**Response:** Plain text Markdown file

**Includes:**
- Topic overview with progress
- Key concepts and formulas extracted from materials
- Your progress statistics
- Recently solved questions
- List of all study materials used

**Download:**
```bash
curl -X GET http://localhost:8000/export/{subject_id}/markdown \
  -o study_guide.md
```

**Summary Export:**

**Endpoint:** `GET /export/{subject_id}/summary`

Returns JSON summary of all topics and mastery status.

---

## Subjects Management

### Create Subject

**Endpoint:** `POST /subjects`

```json
{
  "name": "Operating Systems",
  "owner_id": "user_uuid"
}
```

### List User Subjects

**Endpoint:** `GET /subjects/user/{owner_id}`

### Get Subject Details

**Endpoint:** `GET /subjects/{subject_id}`

**Response:**
```json
{
  "id": "uuid",
  "name": "Operating Systems",
  "document_count": 15,
  "document_types": {
    "notes": 5,
    "textbook": 3,
    "questions": 7
  },
  "created_at": "2024-01-01T00:00:00"
}
```

---

## Documents Management

### List Subject Documents

**Endpoint:** `GET /documents/subject/{subject_id}`

**Response:**
```json
[
  {
    "id": "uuid",
    "filename": "os_chapter1.pdf",
    "content_type": "textbook",
    "uploaded_at": "2024-01-01T00:00:00",
    "chunk_count": "25"
  }
]
```

---

## Basic Q&A

For general questions without specialized endpoints.

**Endpoint:** `POST /query`

```json
{
  "subject_id": "uuid",
  "question": "What is deadlock?",
  "content_type": "textbook",
  "top_k": 10
}
```

**Optional Filters:**
- `content_type`: Filter by document type (notes, textbook, questions, labs)
- `top_k`: Number of chunks to retrieve (default: 10)

---

## Database Models

### Subject
- Automatically created from uploaded documents
- Contains multiple documents
- Links to users (optional)

### Document
- Stores metadata about uploaded files
- Categorized by content type
- Tracks chunk count

### TopicMastery
- Tracks learning progress per topic
- Stores mastery level: beginner → intermediate → advanced → mastered
- Records practice attempts and accuracy

### QuestionAttempt
- Logs all question-solving attempts
- Stores questions and solutions
- Tracks correctness for analytics

---

## Vector Store

**Engine:** ChromaDB with persistent storage

**Embedding Model:** `all-MiniLM-L6-v2` (SentenceTransformers)

**Chunk Strategy:**
- Sliding window: 800 characters per chunk
- Overlap: 150 characters
- Sentence boundary snapping

**Metadata Filtering:**
- `subject_id`: Scope retrieval to specific subject
- `content_type`: Filter by document category
- `filename`: Track source documents
- `document_id`: Link to database records

---

## LLM Configuration

**Provider:** Groq API

**Model:** Configurable via `GROQ_MODEL` environment variable

**Temperature:**
- Q&A: 0.2 (factual, consistent)
- Explanations: 0.3 (slightly more creative)
- Topic extraction: 0.1 (deterministic)

**Max Tokens:** 4000-5000 depending on task

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql+psycopg://user:password@localhost/dbname

# Vector Store
CHROMA_PERSIST_DIR=./chroma_data

# LLM
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-20b

# Auth (future use)
JWT_SECRET_KEY=your_secret_key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# CORS
FRONTEND_ORIGIN=http://localhost:3000
```

---

## Running the Application

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Run server
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

Access the application at: http://localhost:3000

API documentation: http://localhost:8000/docs

---

## Frontend Features

### 1. Document Upload
- Drag-and-drop interface
- Multiple file and folder upload
- Real-time upload progress
- Automatic subject organization
- Upload results with detailed feedback

### 2. Subject Sidebar
- Visual subject cards with icons
- Document count per subject
- One-click subject switching
- Active subject highlighting

### 3. Topic Explainer Tab
- Topic input with autocomplete
- Difficulty level selector (Beginner/Intermediate/Advanced)
- Formatted markdown responses
- Source citations
- Examples and formulas

### 4. Question Solver Tab
- Multi-line question input
- Step-by-step solution display
- Exam tips integration
- Material references
- Solution history

### 5. Knowledge Map Tab
- Visual learning path display
- Topic prerequisite graph
- 4-step progression generator
- Estimated learning hours
- Topic status tracking

### 6. Analytics Tab
- Overall mastery percentage
- Mastered topics count
- Question attempt statistics
- Weak area identification
- Personalized recommendations
- Progress over time

### 7. Document Manager Tab
- Document list with metadata
- Content type indicators
- Upload timestamps
- Chunk count display

### 8. Export Functionality
- One-click Markdown export
- Study guide generation
- Progress summary
- Solved questions included

---

## API Response Format

All API endpoints follow consistent patterns:

**Success Response:**
```json
{
  "data_field": "value",
  "sources": ["file1.pdf", "file2.pdf"],
  "chunks_used": 10
}
```

**Error Response:**
```json
{
  "detail": "Error message describing what went wrong"
}
```

**HTTP Status Codes:**
- `200`: Success
- `400`: Bad request (invalid input)
- `404`: Resource not found
- `500`: Server error

---

## Performance Considerations

### Chunking Strategy
- Default: 800 characters with 150-character overlap
- Adjustable based on content type
- Sentence-boundary snapping for coherence

### Vector Search
- Top-K retrieval: 5-30 chunks depending on task
- Metadata filtering reduces search space
- ChromaDB persistent storage for fast queries

### LLM Token Management
- Context window awareness
- Chunk selection optimization
- Response length limits based on task type

---

## Future Enhancements

1. **User Authentication:** JWT-based auth with user isolation
2. **Collaborative Learning:** Share subjects and notes with classmates
3. **Advanced Analytics:** Spaced repetition recommendations
4. **Mobile App:** Native iOS/Android applications
5. **Flashcard Generation:** Auto-generate flashcards from notes
6. **Video Integration:** Process lecture recordings
7. **Practice Test Generator:** Create full practice exams
8. **Citation Management:** Export references in standard formats

---

## Troubleshooting

### No Results from Query
- **Issue:** Empty results or "No materials found"
- **Solution:** Ensure documents are uploaded and processed for the subject
- **Check:** Vector store has chunks for the subject_id

### Upload Failures
- **Issue:** Upload returns 400 error
- **Solution:** Check file format (PDF, DOCX, PPTX, TXT only)
- **Check:** File is not corrupted or password-protected

### Slow Response Times
- **Issue:** API takes too long to respond
- **Solution:** Reduce `top_k` parameter in queries
- **Check:** Vector store disk space and ChromaDB performance

### Subject Detection Errors
- **Issue:** Documents classified into wrong subject
- **Solution:** Ensure document has clear subject identifiers in content
- **Check:** Subject detector prompt and thresholds

---

## Contributing

We welcome contributions! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request with detailed description

---

## License

MIT License - See LICENSE file for details

---

## Support

For issues and questions:
- GitHub Issues: [repository-url]/issues
- Email: support@geteasy.edu
- Documentation: [repository-url]/docs

---

**Built with:** FastAPI, Next.js, ChromaDB, Groq, PostgreSQL, Tailwind CSS
