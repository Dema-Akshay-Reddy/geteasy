from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app.routers import documents, query, subjects, analytics, export, auth

# Creates tables if they don't exist. Fine for Week 1-2;
# switch to Alembic migrations once the schema stabilizes.
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="GetEasy Academic Learning Platform API",
    description="AI-powered learning platform with RAG-based Q&A, topic explanations, and progress tracking",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        settings.frontend_origin
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(subjects.router)
app.include_router(documents.router)
app.include_router(query.router)
app.include_router(analytics.router)
app.include_router(export.router)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "GetEasy Academic Learning Platform"}
