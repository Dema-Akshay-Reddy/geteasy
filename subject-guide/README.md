# GetEasy Installation Guide

This guide installs and runs GetEasy locally on Windows. The application source is in `subject-guide/`.

## Requirements

Install these tools before setup:

- Python 3.10 or newer
- Node.js 18 or newer (includes npm)
- Docker Desktop, running with its engine started
- A Groq API key from [Groq Console](https://console.groq.com/)

## 1. Start PostgreSQL

Open PowerShell in this repository folder and start a PostgreSQL container:

```powershell
docker run --name subject-guide-db -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=subject_guide -p 5432:5432 -d postgres:16
```

If you already created the container, start it instead:

```powershell
docker start subject-guide-db
```

Check that the database is running:

```powershell
docker ps
```

## 2. Install and configure the backend

In PowerShell, run:

```powershell
cd .\subject-guide\backend
python -m venv venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
Copy-Item .env.example .env
notepad .env
```

In `backend/.env`, set the database URL and your Groq key. Replace the JWT secret with a long random value:

```ini
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/subject_guide
GROQ_API_KEY=paste-your-groq-api-key-here
GROQ_MODEL=openai/gpt-oss-20b
JWT_SECRET_KEY=replace-with-a-long-random-secret
```

Save the file, return to the backend PowerShell window, and run:

```powershell
python -m uvicorn app.main:app --reload
```

Keep this window open. The backend API documentation is at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

## 3. Install and run the frontend

Open a second PowerShell window in the repository folder and run:

```powershell
cd .\subject-guide\frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 4. Create an account and start studying

1. Register an account in the app, then sign in.
2. Open **Materials** and upload study files in PDF, DOCX, PPTX, or TXT format.
3. Open **Study** to explain topics or solve questions based on your materials.

The first document upload can take longer because the embedding model is downloaded and initialized.

## Starting the app later

Start Docker Desktop, then open PowerShell windows for the backend and frontend:

```powershell
# Database (run once per start of Docker Desktop)
docker start subject-guide-db
```

```powershell
# Backend
cd .\subject-guide\backend
.\venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload
```

```powershell
# Frontend, in a separate PowerShell window
cd .\subject-guide\frontend
npm run dev
```

## Troubleshooting

- **Docker connection error:** Open Docker Desktop and wait for the engine to start, then run `docker start subject-guide-db`.
- **Container name already in use during initial setup:** The container already exists; use `docker start subject-guide-db`.
- **PowerShell blocks activation:** Run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` in that window, then activate the virtual environment again.
- **Python import errors:** Confirm the virtual environment is active and reinstall with `python -m pip install -r requirements.txt` from `subject-guide/backend`.
- **Frontend cannot reach the API:** Confirm the backend is running at `http://127.0.0.1:8000`.
- **AI request errors:** Check that `GROQ_API_KEY` in `subject-guide/backend/.env` is valid, then restart the backend.

Do not commit or share `backend/.env`; it contains secrets.

For application features and API details, see [`subject-guide/README.md`](subject-guide/README.md).
