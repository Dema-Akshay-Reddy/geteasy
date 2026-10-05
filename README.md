# GetEasy --- Installation & Setup Guide

GetEasy is a full-stack AI-powered study assistant for uploading study
materials, explaining topics, solving questions, generating learning
paths, viewing knowledge maps and analytics, and exporting study guides.

This README explains how to install and run the website locally.

## 1. Prerequisites

Install:

-   Python 3.10+
-   Node.js 18+
-   npm
-   Docker Desktop
-   Git
-   A Groq API key

Verify:

``` bash
python --version
node --version
npm --version
docker --version
git --version
```

## 2. Clone the Repository

``` bash
git clone https://github.com/kushal7xn/GetEasy-week3-4.git
cd GetEasy-week3-4
git checkout forui
cd subject-guide
```

The application contains:

``` text
subject-guide/
├── backend/
│   ├── app/
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── app/
│   ├── public/
│   └── package.json
└── README.md
```

Architecture:

``` text
Browser
   |
   v
Next.js Frontend :3000
   |
   v
FastAPI Backend :8000
   |------ PostgreSQL :5432
   |------ ChromaDB
   `------ Groq API
```

## 3. Start PostgreSQL

Make sure Docker Desktop is running.

``` bash
docker run --name subject-guide-db ^
  -e POSTGRES_USER=postgres ^
  -e POSTGRES_PASSWORD=postgres ^
  -e POSTGRES_DB=subject_guide ^
  -p 5432:5432 ^
  -d postgres:16
```

For macOS/Linux, use:

``` bash
docker run --name subject-guide-db   -e POSTGRES_USER=postgres   -e POSTGRES_PASSWORD=postgres   -e POSTGRES_DB=subject_guide   -p 5432:5432   -d postgres:16
```

Check:

``` bash
docker ps
```

If the container already exists:

``` bash
docker start subject-guide-db
```

## 4. Backend Setup

Open a terminal:

``` bash
cd subject-guide/backend
python -m venv venv
```

### Windows PowerShell

``` powershell
.env\Scripts\Activate.ps1
```

If PowerShell blocks activation:

``` cmd
venv\Scriptsctivate
```

### macOS/Linux

``` bash
source venv/bin/activate
```

Install dependencies:

``` bash
pip install -r requirements.txt
```

## 5. Configure Backend

Create `.env` from `.env.example`.

Windows:

``` powershell
Copy-Item .env.example .env
```

macOS/Linux:

``` bash
cp .env.example .env
```

Use:

``` env
DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/subject_guide

CHROMA_PERSIST_DIR=./chroma_data
ANONYMIZED_TELEMETRY=False

GROQ_API_KEY=YOUR_GROQ_API_KEY
GROQ_MODEL=openai/gpt-oss-20b

JWT_SECRET_KEY=CHANGE_THIS_TO_A_LONG_RANDOM_SECRET
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

FRONTEND_ORIGIN=http://localhost:3000
```

Replace `YOUR_GROQ_API_KEY` with your real Groq API key.

Do not commit `.env` to GitHub.

## 6. Start Backend

From `subject-guide/backend`:

``` bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend:

``` text
http://127.0.0.1:8000
```

Swagger API documentation:

``` text
http://127.0.0.1:8000/docs
```

Keep this terminal running.

## 7. Frontend Setup

Open a new terminal:

``` bash
cd subject-guide/frontend
npm install
```

Create:

``` text
frontend/.env.local
```

Add:

``` env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Start the frontend:

``` bash
npm run dev
```

Open:

``` text
http://localhost:3000
```

## 8. Verify the Installation

### Backend

Open:

``` text
http://127.0.0.1:8000/docs
```

FastAPI Swagger should appear.

### Frontend

Open:

``` text
http://localhost:3000
```

### Application test

1.  Register a new account.
2.  Log in.
3.  Open the dashboard.
4.  Upload a PDF, DOCX or PPTX.
5.  Select a subject.
6.  Try Topic Explainer.
7.  Try Question Solver.
8.  Check Analytics.
9.  Try Knowledge Map.
10. Try Study Guide Export.

A valid `GROQ_API_KEY` is required for the AI features.

## 9. Supported Documents

GetEasy supports common study-material formats including:

``` text
PDF
DOCX
PPTX
```

The first upload can be slower because the embedding model may need to
initialize/download.

## 10. Starting the Project Later

After the initial installation:

### Terminal 1

``` bash
docker start subject-guide-db
```

### Terminal 2

``` bash
cd subject-guide/backend
```

Windows:

``` powershell
.env\Scripts\Activate.ps1
```

Then:

``` bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Terminal 3

``` bash
cd subject-guide/frontend
npm run dev
```

Open:

``` text
http://localhost:3000
```

## 11. Common Problems

### `python` is not recognized

Install Python and enable the PATH option during installation.

### `npm` is not recognized

Install Node.js and restart the terminal.

### PostgreSQL connection error

Check:

``` bash
docker ps
```

If necessary:

``` bash
docker start subject-guide-db
```

Confirm:

``` env
DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/subject_guide
```

### `Failed to fetch`

Make sure the backend is running on:

``` text
http://127.0.0.1:8000
```

and the frontend has:

``` env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Restart Next.js after changing `.env.local`.

### CORS error

Backend `.env` should contain:

``` env
FRONTEND_ORIGIN=http://localhost:3000
```

Restart FastAPI after changing it.

### AI request fails

Check:

``` env
GROQ_API_KEY=your_actual_key
```

and verify that the selected Groq model is available to your account.

### Port 8000 is busy

Use another backend port:

``` bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

Then change:

``` env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8001
```

### Port 3000 is busy

Run:

``` bash
npm run dev -- -p 3001
```

Then change the backend CORS setting to:

``` env
FRONTEND_ORIGIN=http://localhost:3001
```

## 12. Stop the Application

Stop frontend/backend with:

``` text
Ctrl + C
```

Stop PostgreSQL:

``` bash
docker stop subject-guide-db
```

## 13. Production Build

Frontend:

``` bash
cd subject-guide/frontend
npm run build
npm run start
```

Backend:

``` bash
cd subject-guide/backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

For production, use hosted PostgreSQL, HTTPS, secure secrets, restricted
CORS, and your hosting provider's environment variables.

## 14. Security

Never commit:

``` text
.env
.env.local
```

Never expose:

``` text
GROQ_API_KEY
JWT_SECRET_KEY
DATABASE_URL
```

Use a strong random JWT secret in production.

## Quick Start

If Python, Node.js and Docker are already installed:

``` bash
git clone https://github.com/kushal7xn/GetEasy-week3-4.git
cd GetEasy-week3-4
git checkout forui
cd subject-guide
```

Start PostgreSQL:

``` bash
docker start subject-guide-db
```

Backend:

``` bash
cd backend
python -m venv venv
```

Windows:

``` powershell
.env\Scripts\Activate.ps1
```

Then:

``` bash
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend in a new terminal:

``` bash
cd subject-guide/frontend
npm install
npm run dev
```

Open:

``` text
http://localhost:3000
```

## GetEasy

Upload your materials → Understand topics → Solve questions → Follow
learning paths → Track progress → Export your study guide.
