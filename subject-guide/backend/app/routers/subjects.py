from fastapi import APIRouter, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.models import Subject, Document, User
from app.services import vector_store, llm_service
from app.auth import get_current_user
from app.services.ownership import get_owned_subject

router = APIRouter(prefix="/subjects", tags=["subjects"])


class SubjectCreate(BaseModel):
    name: str


class LearningPathRequest(BaseModel):
    target: str = "exam"  # exam, comprehensive, quick_review


@router.post("")
def create_subject(payload: SubjectCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    subject = Subject(name=payload.name.strip(), owner_id=current_user.id)
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return {"id": subject.id, "name": subject.name}


@router.get("/user/{owner_id}")
def list_subjects(owner_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Only allow users to see their own subjects
    if owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view these subjects")
    
    subjects = db.query(Subject).filter(Subject.owner_id == owner_id).all()
    return [{"id": s.id, "name": s.name} for s in subjects]


@router.get("/me")
def list_my_subjects(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get all subjects for the current user."""
    subjects = db.query(Subject).filter(Subject.owner_id == current_user.id).all()
    return [{"id": s.id, "name": s.name} for s in subjects]


@router.get("/{subject_id}")
def get_subject_details(subject_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Get detailed information about a subject including document count and types.
    """
    subject = get_owned_subject(subject_id, current_user, db)
    
    documents = db.query(Document).filter(Document.subject_id == subject_id).all()
    
    doc_types = {}
    for doc in documents:
        content_type = str(doc.content_type)
        doc_types[content_type] = doc_types.get(content_type, 0) + 1
    
    return {
        "id": subject.id,
        "name": subject.name,
        "document_count": len(documents),
        "document_types": doc_types,
        "created_at": subject.created_at,
    }


@router.get("/{subject_id}/graph")
def get_knowledge_graph(subject_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Knowledge Graph Endpoint - returns nodes (topics, subtopics) and edges
    (prerequisites, related concepts) parsed from subject materials.
    """
    subject = get_owned_subject(subject_id, current_user, db)
    
    # Retrieve comprehensive materials from the subject
    results = vector_store.query(
        question=f"Overview of all topics in {subject.name}",
        subject_id=subject_id,
        top_k=30,
    )
    
    retrieved_chunks = results["documents"][0] if results["documents"] else []
    retrieved_metadatas = results["metadatas"][0] if results["metadatas"] else []
    
    if not retrieved_chunks:
        return {
            "subject_id": subject_id,
            "subject_name": subject.name,
            "nodes": [],
            "edges": [],
            "message": "Upload documents to generate knowledge graph"
        }
    
    # Extract topics from materials
    topics = llm_service.extract_topics_from_materials(retrieved_chunks, retrieved_metadatas)
    
    # Create nodes
    nodes = []
    for i, topic in enumerate(topics):
        nodes.append({
            "id": f"node_{i}",
            "label": topic,
            "type": "topic",
        })
    
    # Create edges based on topic relationships
    # Simplified version - in production, use LLM to determine actual prerequisites
    edges = []
    for i in range(len(nodes) - 1):
        # Connect sequential topics
        edges.append({
            "source": f"node_{i}",
            "target": f"node_{i+1}",
            "relationship": "leads_to",
        })
    
    return {
        "subject_id": subject_id,
        "subject_name": subject.name,
        "nodes": nodes,
        "edges": edges,
    }


@router.post("/{subject_id}/learning-path")
async def generate_learning_path(
    subject_id: str,
    req: LearningPathRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Learning Path Roadmap - generates an AI-powered structured roadmap with nodes and edges.
    Uses Groq API to create a visual learning map with prerequisites and relationships.
    """
    subject = get_owned_subject(subject_id, current_user, db)
    
    if req.target not in {"exam", "comprehensive", "quick_review"}:
        raise HTTPException(status_code=400, detail="Target must be exam, comprehensive, or quick_review")

    # Retrieve materials without blocking other API requests while embeddings run.
    query_text = f"Complete syllabus and topic order for {subject.name}"
    if req.target == "exam":
        query_text = f"Important exam topics for {subject.name}"
    elif req.target == "quick_review":
        query_text = f"Key concepts summary for {subject.name}"
    
    results = await run_in_threadpool(
        vector_store.query,
        question=query_text,
        subject_id=subject_id,
        top_k=15,
    )
    
    retrieved_chunks = results["documents"][0] if results["documents"] else []
    retrieved_metadatas = results["metadatas"][0] if results["metadatas"] else []
    
    if not retrieved_chunks:
        return {
            "subject_id": subject_id,
            "subject_name": subject.name,
            "target": req.target,
            "nodes": [],
            "edges": [],
            "message": "Upload syllabus or course materials to generate learning path"
        }
    
    # Use the async LLM service to generate learning map
    map_data = await llm_service.generate_learning_map_async(
        subject_name=subject.name,
        retrieved_chunks=retrieved_chunks,
        retrieved_metadatas=retrieved_metadatas,
        target=req.target,
    )
    
    return {
        "subject_id": subject_id,
        "subject_name": subject.name,
        "target": req.target,
        "nodes": map_data.get("nodes", []),
        "edges": map_data.get("edges", []),
        "message": map_data.get("message", ""),
        "error": map_data.get("error", "")
    }
