# GetEasy - Startup & Testing Guide

## Prerequisites Checklist

### Backend Requirements
- [ ] Python 3.8+ installed
- [ ] Virtual environment activated
- [ ] Dependencies installed (`pip install -r requirements.txt`)
- [ ] `.env` file configured

### Frontend Requirements
- [ ] Node.js 16+ installed
- [ ] Dependencies installed (`npm install`)
- [ ] `.env.local` file configured

---

## Backend Setup

### 1. Environment Configuration

Create `backend/.env` file with the following:

```env
# Database
DATABASE_URL=sqlite:///./test.db

# API Keys
GROQ_API_KEY=your_groq_api_key_here

# JWT Configuration
JWT_SECRET_KEY=your-super-secret-jwt-key-change-this-in-production
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=10080

# CORS
FRONTEND_ORIGIN=http://localhost:3000

# ChromaDB
ANONYMIZED_TELEMETRY=False
```

### 2. Start Backend Server

```powershell
cd backend
.\myenv\Scripts\Activate.ps1  # or .\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**Expected Output:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

### 3. Verify Backend Health

Open browser to: `http://127.0.0.1:8000/docs`

You should see FastAPI Swagger documentation with these endpoints:
- POST `/auth/register`
- POST `/auth/token`
- GET `/auth/me`
- POST `/documents/upload`
- GET `/documents/`
- POST `/query/explain`
- POST `/query/solve`
- GET `/subjects/`
- GET `/subjects/{subject_id}/analytics`

---

## Frontend Setup

### 1. Environment Configuration

Create `frontend/.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

### 2. Start Frontend Server

```powershell
cd frontend
npm run dev
```

**Expected Output:**
```
   ▲ Next.js 14.x.x
   - Local:        http://localhost:3000
   - Ready in xxxms
```

### 3. Access Application

Open browser to: `http://localhost:3000`

---

## End-to-End Testing Checklist

### Test 1: Registration Flow
- [ ] Navigate to `http://localhost:3000/register`
- [ ] Fill in email, username, password
- [ ] Click "Sign Up"
- [ ] **Expected:** Success toast appears, redirected to login page

**Troubleshooting:**
- If "Failed to fetch": Backend not running
- If CORS error: Check backend CORS configuration
- If "User already exists": Use different email/username

---

### Test 2: Login Flow
- [ ] Navigate to `http://localhost:3000/login`
- [ ] Enter credentials from Test 1
- [ ] Click "Sign In"
- [ ] **Expected:** Success toast appears, redirected to `/dashboard`

**Troubleshooting:**
- If "Invalid credentials": Check username/password
- If "Failed to fetch": Backend not running
- If stuck on login page: Check browser console for errors

---

### Test 3: Protected Routes
- [ ] While logged in, navigate to `/dashboard`
- [ ] **Expected:** Dashboard loads with sidebar showing Materials, Study, Analytics
- [ ] Open new incognito window
- [ ] Try accessing `/dashboard` without logging in
- [ ] **Expected:** Redirected to `/login`

---

### Test 4: Document Upload
- [ ] Go to `/dashboard/materials`
- [ ] Click "Choose Files" and select PDF(s)
- [ ] Select subject from dropdown
- [ ] Click "Upload All"
- [ ] **Expected:** 
  - Progress bar shows upload progress
  - Success toast appears
  - Documents appear in "Uploaded Documents" list

**Troubleshooting:**
- If 413 error: File too large (check backend limits)
- If "Subject required": Ensure subject is selected
- If upload fails: Check backend logs for processing errors

---

### Test 5: Topic Explainer
- [ ] Go to `/dashboard/study`
- [ ] Ensure you have uploaded documents
- [ ] Select a subject
- [ ] Enter a topic (e.g., "photosynthesis", "calculus limits")
- [ ] Click "Explain"
- [ ] **Expected:**
  - Loading spinner appears
  - Explanation displays with markdown formatting
  - Success toast appears

**Troubleshooting:**
- If "No documents": Upload documents first
- If timeout: Check GROQ_API_KEY is valid
- If generic error: Check backend logs for LLM errors

---

### Test 6: Question Solver
- [ ] Go to `/dashboard/study` → "Question Solver" tab
- [ ] Select a subject
- [ ] Enter a question
- [ ] Click "Solve"
- [ ] **Expected:**
  - Loading spinner appears
  - Answer displays with step-by-step solution
  - Success toast appears

---

### Test 7: Analytics
- [ ] Go to `/dashboard/analytics`
- [ ] **Expected:**
  - Total documents count displays
  - Subjects count displays
  - Documents by subject chart shows
  - Recent activity list shows uploaded documents

---

### Test 8: Logout
- [ ] Click "Logout" in sidebar
- [ ] **Expected:**
  - Redirected to `/login`
  - Cannot access `/dashboard` anymore
  - Token removed from localStorage

---

## Common Issues & Solutions

### Issue: "Failed to fetch" on all API calls

**Cause:** Backend not running or wrong URL

**Solution:**
1. Verify backend is running on `http://127.0.0.1:8000`
2. Check `frontend/.env.local` has correct `NEXT_PUBLIC_API_URL`
3. Try accessing `http://127.0.0.1:8000/docs` directly

---

### Issue: CORS Error in Console

**Cause:** Frontend origin not allowed by backend

**Solution:**
1. Check `backend/.env` has `FRONTEND_ORIGIN=http://localhost:3000`
2. Restart backend server
3. Clear browser cache

---

### Issue: 401 Unauthorized on protected routes

**Cause:** Token expired or invalid

**Solution:**
1. Logout and login again
2. Check browser localStorage has `token` key
3. Verify JWT_SECRET_KEY matches between registration and login

---

### Issue: Document upload succeeds but no documents shown

**Cause:** Database or vector store error

**Solution:**
1. Check backend logs for errors
2. Verify `backend/chroma_data` directory exists
3. Check SQLite database file exists (`backend/test.db`)

---

### Issue: LLM responses fail or timeout

**Cause:** Invalid GROQ_API_KEY or rate limiting

**Solution:**
1. Verify GROQ_API_KEY in `backend/.env`
2. Test API key at https://console.groq.com
3. Check rate limits haven't been exceeded

---

### Issue: Toasts don't appear

**Cause:** ToastProvider not wrapping app

**Solution:**
1. Verify `frontend/app/layout.js` has `<ToastProvider>` wrapping children
2. Check browser console for React errors
3. Hard refresh browser (Ctrl+Shift+R)

---

## Development Tips

### Hot Reload
Both servers support hot reload:
- **Backend:** Changes to `.py` files auto-reload uvicorn
- **Frontend:** Changes to `.js` files trigger Fast Refresh

### Viewing Logs
- **Backend:** Terminal running uvicorn shows request logs
- **Frontend:** Browser DevTools Console (F12)

### Database Inspection
```powershell
cd backend
sqlite3 test.db
.tables
SELECT * FROM users;
.quit
```

### Reset Everything
```powershell
# Stop both servers (Ctrl+C)

# Backend - delete database and vector store
cd backend
Remove-Item test.db -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force chroma_data

# Frontend - clear Next.js cache
cd frontend
Remove-Item -Recurse -Force .next

# Restart both servers
```

---

## API Testing with curl/PowerShell

### Register User
```powershell
$body = @{
    email = "test@example.com"
    username = "testuser"
    password = "password123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:8000/auth/register" -Method POST -Body $body -ContentType "application/json"
```

### Login (Get Token)
```powershell
$formData = @{
    username = "testuser"
    password = "password123"
}

$response = Invoke-RestMethod -Uri "http://127.0.0.1:8000/auth/token" -Method POST -Body $formData -ContentType "application/x-www-form-urlencoded"
$token = $response.access_token
```

### Get User Info
```powershell
$headers = @{
    Authorization = "Bearer $token"
}

Invoke-RestMethod -Uri "http://127.0.0.1:8000/auth/me" -Method GET -Headers $headers
```

---

## Success Criteria

✅ **All tests pass**
✅ **No console errors**
✅ **Toasts appear for all operations**
✅ **Loading states show during async operations**
✅ **Protected routes redirect properly**
✅ **Documents upload and process correctly**
✅ **LLM responses generate successfully**
✅ **Analytics display accurate data**

---

## Next Steps After Verification

1. **Security Hardening**
   - Change JWT_SECRET_KEY to strong random value
   - Use PostgreSQL instead of SQLite for production
   - Add rate limiting
   - Implement refresh tokens

2. **Performance Optimization**
   - Add caching for expensive queries
   - Optimize document chunking
   - Implement pagination

3. **Features**
   - Add document deletion
   - Implement chat history
   - Add more subjects
   - Export analytics reports

4. **Testing**
   - Add unit tests
   - Add integration tests
   - Add E2E tests with Playwright

---

**Last Updated:** December 2024
**Version:** 1.0.0
