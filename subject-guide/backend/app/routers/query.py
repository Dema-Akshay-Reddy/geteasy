from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.services import vector_store, llm_service
from app.database import get_db
from app.models.models import QuestionAttempt, User
from app.auth import get_current_user
from app.services.ownership import get_owned_subject

router = APIRouter(prefix="/query", tags=["query"])


class QueryRequest(BaseModel):
    subject_id: str
    question: str
    content_type: str | None = None
    top_k: int = 10


class ExplainRequest(BaseModel):
    subject_id: str
    topic: str
    level: str = "intermediate"


class SolveRequest(BaseModel):
    subject_id: str
    question: str


class ProgressionRequest(BaseModel):
    subject_id: str
    topic: str


class CorrelationRequest(BaseModel):
    subject_ids: list[str]
    topic: str


class GenerateQuestionsRequest(BaseModel):
    subject_id: str
    topic: str
    question_type: str
    difficulty: str


@router.post("")
def ask(req: QueryRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Basic Q&A endpoint - returns answer based on retrieved materials."""
    get_owned_subject(req.subject_id, current_user, db)
    results = vector_store.query(
        question=req.question,
        subject_id=req.subject_id,
        top_k=req.top_k,
        content_type=req.content_type,
    )

    retrieved_chunks = results["documents"][0] if results["documents"] else []
    retrieved_metadatas = results["metadatas"][0] if results["metadatas"] else []

    try:
        answer = llm_service.generate_answer(
            question=req.question,
            retrieved_chunks=retrieved_chunks,
            retrieved_metadatas=retrieved_metadatas,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Language model request failed: {e}")

    sources = list({m.get("filename") for m in retrieved_metadatas})

    return {
        "answer": answer,
        "sources": sources,
        "chunks_used": len(retrieved_chunks),
    }


@router.post("/explain")
async def explain_topic(req: ExplainRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Adaptive Topic Explainer with async support."""
    if req.level not in ["beginner", "intermediate", "advanced"]:
        raise HTTPException(status_code=400, detail="Level must be beginner, intermediate, or advanced")
    
    get_owned_subject(req.subject_id, current_user, db)
    results = vector_store.query(
        question=f"Explain {req.topic}",
        subject_id=req.subject_id,
        top_k=15,
    )

    retrieved_chunks = results["documents"][0] if results["documents"] else []
    retrieved_metadatas = results["metadatas"][0] if results["metadatas"] else []

    try:
        explanation = await llm_service.generate_topic_explanation_async(
            topic=req.topic,
            level=req.level,
            retrieved_chunks=retrieved_chunks,
            retrieved_metadatas=retrieved_metadatas,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Language model request failed: {e}")

    sources = list({m.get("filename") for m in retrieved_metadatas})

    return {
        "topic": req.topic,
        "level": req.level,
        "explanation": explanation,
        "sources": sources,
        "chunks_used": len(retrieved_chunks),
    }


@router.post("/solve")
async def solve_question(req: SolveRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Step-by-Step Question Solver with async support."""
    get_owned_subject(req.subject_id, current_user, db)
    results = vector_store.query(
        question=req.question,
        subject_id=req.subject_id,
        top_k=12,
    )

    retrieved_chunks = results["documents"][0] if results["documents"] else []
    retrieved_metadatas = results["metadatas"][0] if results["metadatas"] else []

    try:
        solution = await llm_service.generate_step_by_step_solution_async(
            question=req.question,
            retrieved_chunks=retrieved_chunks,
            retrieved_metadatas=retrieved_metadatas,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Language model request failed: {e}")

    sources = list({m.get("filename") for m in retrieved_metadatas})

    attempt = QuestionAttempt(
        subject_id=req.subject_id,
        user_id=current_user.id,
        question=req.question,
        solution_provided=solution,
        is_correct="unknown",
    )
    db.add(attempt)
    db.commit()

    return {
        "question": req.question,
        "solution": solution,
        "sources": sources,
        "chunks_used": len(retrieved_chunks),
    }


@router.post("/progression")
def learning_progression(req: ProgressionRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Structured Learning Progression Generator."""
    get_owned_subject(req.subject_id, current_user, db)
    results = vector_store.query(
        question=f"Complete guide to {req.topic}",
        subject_id=req.subject_id,
        top_k=20,
    )

    retrieved_chunks = results["documents"][0] if results["documents"] else []
    retrieved_metadatas = results["metadatas"][0] if results["metadatas"] else []

    try:
        progression = llm_service.generate_learning_progression(
            topic=req.topic,
            retrieved_chunks=retrieved_chunks,
            retrieved_metadatas=retrieved_metadatas,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Language model request failed: {e}")

    sources = list({m.get("filename") for m in retrieved_metadatas})

    return {
        "topic": req.topic,
        "progression": progression,
        "sources": sources,
        "chunks_used": len(retrieved_chunks),
    }


@router.post("/generate-questions")
async def generate_questions(
    req: GenerateQuestionsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Question Bank Generator - generates practice questions based on topic and difficulty.
    Supports MCQ (multiple choice) and Descriptive question types.
    """
    if req.question_type not in ["mcq", "descriptive"]:
        raise HTTPException(status_code=400, detail="Question type must be 'mcq' or 'descriptive'")
    
    if req.difficulty not in ["beginner", "intermediate", "advanced"]:
        raise HTTPException(status_code=400, detail="Difficulty must be 'beginner', 'intermediate', or 'advanced'")
    
    get_owned_subject(req.subject_id, current_user, db)
    
    results = vector_store.query(
        question=f"Questions and examples about {req.topic}",
        subject_id=req.subject_id,
        top_k=15,
    )
    
    retrieved_chunks = results["documents"][0] if results["documents"] else []
    retrieved_metadatas = results["metadatas"][0] if results["metadatas"] else []
    
    try:
        result = await llm_service.generate_questions_async(
            topic=req.topic,
            question_type=req.question_type,
            difficulty=req.difficulty,
            retrieved_chunks=retrieved_chunks,
            retrieved_metadatas=retrieved_metadatas,
        )
        
        if "error" in result:
            raise HTTPException(status_code=502, detail=result["error"])
        
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to generate questions: {str(e)}")


@router.post("/correlate")
def correlate_subjects(req: CorrelationRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Find how a topic connects across two or more subjects."""
    subject_ids = list(dict.fromkeys(req.subject_ids))
    if len(subject_ids) < 2:
        raise HTTPException(status_code=400, detail="Choose at least two subjects to compare")
    if len(subject_ids) > 5:
        raise HTTPException(status_code=400, detail="Choose no more than five subjects to compare")

    sources = []
    context = []
    for subject_id in subject_ids:
        subject = get_owned_subject(subject_id, current_user, db)
        result = vector_store.query(question=req.topic, subject_id=subject_id, top_k=5)
        chunks = result["documents"][0] if result["documents"] else []
        metadata = result["metadatas"][0] if result["metadatas"] else []
        if chunks:
            context.extend([f"[{subject.name}] {chunk}" for chunk in chunks])
            sources.extend({f"{subject.name}: {item.get('filename', 'Untitled material')}" for item in metadata})

    if not context:
        raise HTTPException(status_code=404, detail="No matching material was found in the selected subjects")

    answer = llm_service.generate_answer(
        question=(f"Compare and connect the topic '{req.topic}' across the selected subjects. "
                  "Explain shared ideas, important differences, and how understanding one subject helps with another."),
        retrieved_chunks=context,
        retrieved_metadatas=[],
    )
    return {"topic": req.topic, "correlation": answer, "sources": sorted(sources), "chunks_used": len(context)}
