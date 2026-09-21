from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Subject, TopicMastery, QuestionAttempt, User
from app.services import vector_store, llm_service
from app.auth import get_current_user
from app.services.ownership import get_owned_subject

router = APIRouter(prefix="/export", tags=["export"])


@router.get("/{subject_id}/markdown", response_class=PlainTextResponse)
def export_study_guide(subject_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Study Guide Export - generates a downloadable Markdown summary containing
    key formulas, topic notes, and solved questions.
    """
    subject = get_owned_subject(subject_id, current_user, db)
    
    # Retrieve comprehensive materials
    results = vector_store.query(
        question=f"Complete study guide for {subject.name}",
        subject_id=subject_id,
        top_k=50,
    )
    
    retrieved_chunks = results["documents"][0] if results["documents"] else []
    retrieved_metadatas = results["metadatas"][0] if results["metadatas"] else []
    
    if not retrieved_chunks:
        return f"# {subject.name} - Study Guide\n\nNo materials uploaded yet. Upload documents to generate a study guide."
    
    # Get mastery data
    masteries = (
        db.query(TopicMastery)
        .filter(TopicMastery.subject_id == subject_id)
        .all()
    )
    
    # Get solved questions
    attempts = (
        db.query(QuestionAttempt)
        .filter(QuestionAttempt.subject_id == subject_id)
        .order_by(QuestionAttempt.created_at.desc())
        .limit(10)
        .all()
    )
    
    # Build markdown document
    markdown = f"""# {subject.name} - Study Guide

**Generated:** {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M')}

---

## Table of Contents

1. [Topic Overview](#topic-overview)
2. [Key Concepts & Formulas](#key-concepts--formulas)
3. [Your Progress](#your-progress)
4. [Solved Questions](#solved-questions)
5. [Study Materials](#study-materials)

---

## Topic Overview

"""
    
    # Add topics from mastery data
    if masteries:
        markdown += "### Your Learning Progress\n\n"
        markdown += "| Topic | Mastery Level | Practice Count | Accuracy |\n"
        markdown += "|-------|---------------|----------------|----------|\n"
        
        for mastery in masteries:
            practice_count = int(mastery.practice_count)
            correct_count = int(mastery.correct_count)
            accuracy = (correct_count / practice_count * 100) if practice_count > 0 else 0
            
            markdown += f"| {mastery.topic} | {mastery.mastery_level} | {practice_count} | {accuracy:.1f}% |\n"
        
        markdown += "\n"
    else:
        markdown += "Track your progress by practicing topics and questions.\n\n"
    
    # Extract topics from materials
    topics = llm_service.extract_topics_from_materials(retrieved_chunks[:30], retrieved_metadatas[:30])
    
    if topics:
        markdown += "### Key Topics Covered\n\n"
        for i, topic in enumerate(topics[:20], start=1):
            markdown += f"{i}. **{topic}**\n"
        markdown += "\n"
    
    markdown += "---\n\n## Key Concepts & Formulas\n\n"
    
    # Add key concepts from materials
    # Extract from chunks that contain formulas or definitions
    formula_chunks = [
        chunk for chunk in retrieved_chunks[:20]
        if any(indicator in chunk.lower() for indicator in ["formula", "equation", "=", "theorem", "definition"])
    ]
    
    if formula_chunks:
        for i, chunk in enumerate(formula_chunks[:10], start=1):
            # Get first 200 chars as preview
            preview = chunk[:300] + "..." if len(chunk) > 300 else chunk
            markdown += f"### Concept {i}\n\n{preview}\n\n"
    else:
        markdown += "Upload textbooks and lecture notes to extract key concepts and formulas.\n\n"
    
    markdown += "---\n\n## Your Progress\n\n"
    
    # Add statistics
    mastered = len([m for m in masteries if m.mastery_level == "mastered"])
    total = len(masteries)
    
    markdown += f"- **Topics Mastered:** {mastered} / {total}\n"
    markdown += f"- **Questions Attempted:** {len(attempts)}\n"
    markdown += f"- **Overall Progress:** {(mastered/total*100 if total > 0 else 0):.1f}%\n\n"
    
    markdown += "---\n\n## Solved Questions\n\n"
    
    # Add solved questions
    if attempts:
        for i, attempt in enumerate(attempts[:10], start=1):
            markdown += f"### Question {i}\n\n"
            markdown += f"**Q:** {attempt.question}\n\n"
            
            if attempt.solution_provided:
                # Limit solution length for export
                solution = attempt.solution_provided[:500] + "..." if len(attempt.solution_provided) > 500 else attempt.solution_provided
                markdown += f"**Solution:**\n\n{solution}\n\n"
            
            markdown += f"**Status:** {attempt.is_correct}\n\n"
            markdown += "---\n\n"
    else:
        markdown += "Solve questions using the Question Solver to see them here.\n\n"
    
    markdown += "## Study Materials\n\n"
    
    # List unique sources
    sources = list({m.get("filename") for m in retrieved_metadatas})
    
    if sources:
        markdown += "### Documents Used\n\n"
        for i, source in enumerate(sources, start=1):
            markdown += f"{i}. {source}\n"
    else:
        markdown += "No documents uploaded yet.\n"
    
    markdown += "\n---\n\n"
    markdown += f"*Generated by GetEasy Academic Learning Platform*\n"
    markdown += f"*Subject: {subject.name}*\n"
    
    return markdown


@router.get("/{subject_id}/summary")
def export_topic_summary(subject_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Quick JSON export of all topics and their current mastery status.
    """
    subject = get_owned_subject(subject_id, current_user, db)
    
    masteries = (
        db.query(TopicMastery)
        .filter(TopicMastery.subject_id == subject_id)
        .all()
    )
    
    topics = []
    for mastery in masteries:
        practice_count = int(mastery.practice_count)
        correct_count = int(mastery.correct_count)
        accuracy = (correct_count / practice_count * 100) if practice_count > 0 else 0
        
        topics.append({
            "topic": mastery.topic,
            "mastery_level": mastery.mastery_level,
            "practice_count": practice_count,
            "correct_count": correct_count,
            "accuracy": round(accuracy, 1),
            "last_practiced": mastery.last_practiced.isoformat() if mastery.last_practiced else None,
        })
    
    return {
        "subject_id": subject_id,
        "subject_name": subject.name,
        "export_date": __import__('datetime').datetime.now().isoformat(),
        "topics": topics,
        "total_topics": len(topics),
        "mastered_topics": len([t for t in topics if t["mastery_level"] == "mastered"]),
    }
