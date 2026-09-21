import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.models import TopicMastery, QuestionAttempt, Subject, User
from app.auth import get_current_user
from app.services.ownership import get_owned_subject

router = APIRouter(prefix="/analytics", tags=["analytics"])


class TrackMasteryRequest(BaseModel):
    subject_id: str
    topic: str
    mastery_level: str = "beginner"  # beginner, intermediate, advanced, mastered
    correct: bool = True


class TrackAttemptRequest(BaseModel):
    subject_id: str
    question: str
    is_correct: str = "unknown"  # correct, incorrect, unknown


@router.get("/{subject_id}")
def get_subject_analytics(subject_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Knowledge Gap & Analytics Engine - returns topic mastery percentages,
    weak areas, and practice question attempt scores.
    """
    subject = get_owned_subject(subject_id, current_user, db)
    
    # Get topic mastery data
    masteries = (
        db.query(TopicMastery)
        .filter(TopicMastery.subject_id == subject_id)
        .all()
    )
    
    # Calculate statistics
    topic_stats = []
    mastered_count = 0
    weak_areas = []
    
    for mastery in masteries:
        practice_count = int(mastery.practice_count)
        correct_count = int(mastery.correct_count)
        
        accuracy = (correct_count / practice_count * 100) if practice_count > 0 else 0
        
        topic_stats.append({
            "topic": mastery.topic,
            "mastery_level": mastery.mastery_level,
            "practice_count": practice_count,
            "correct_count": correct_count,
            "accuracy": round(accuracy, 1),
            "last_practiced": mastery.last_practiced,
        })
        
        if mastery.mastery_level == "mastered":
            mastered_count += 1
        
        if accuracy < 50 and practice_count >= 3:
            weak_areas.append({
                "topic": mastery.topic,
                "accuracy": round(accuracy, 1),
                "attempts": practice_count,
            })
    
    # Get question attempts
    attempts = (
        db.query(QuestionAttempt)
        .filter(QuestionAttempt.subject_id == subject_id)
        .order_by(QuestionAttempt.created_at.desc())
        .limit(20)
        .all()
    )
    
    attempt_stats = {
        "total": len(attempts),
        "correct": len([a for a in attempts if a.is_correct == "correct"]),
        "incorrect": len([a for a in attempts if a.is_correct == "incorrect"]),
        "unknown": len([a for a in attempts if a.is_correct == "unknown"]),
    }
    
    # Calculate overall mastery percentage
    total_topics = len(masteries)
    mastery_percentage = (mastered_count / total_topics * 100) if total_topics > 0 else 0
    
    return {
        "subject_id": subject_id,
        "subject_name": subject.name,
        "overall_mastery": round(mastery_percentage, 1),
        "mastered_topics": mastered_count,
        "total_topics": total_topics,
        "weak_areas": sorted(weak_areas, key=lambda x: x["accuracy"]),
        "topic_breakdown": topic_stats,
        "question_attempts": attempt_stats,
        "recommendations": _generate_recommendations(weak_areas, mastered_count, total_topics),
    }


@router.post("/track")
def track_mastery(req: TrackMasteryRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Track topic mastery progress and practice attempts.
    """
    get_owned_subject(req.subject_id, current_user, db)
    # Find existing mastery record
    mastery = (
        db.query(TopicMastery)
        .filter(
            TopicMastery.subject_id == req.subject_id,
            TopicMastery.topic == req.topic
        )
        .first()
    )
    
    if mastery:
        # Update existing record
        practice_count = int(mastery.practice_count) + 1
        correct_count = int(mastery.correct_count) + (1 if req.correct else 0)
        
        mastery.practice_count = str(practice_count)
        mastery.correct_count = str(correct_count)
        mastery.mastery_level = req.mastery_level
        mastery.last_practiced = datetime.datetime.utcnow()
    else:
        # Create new record
        mastery = TopicMastery(
            subject_id=req.subject_id,
            user_id=current_user.id,
            topic=req.topic,
            mastery_level=req.mastery_level,
            practice_count="1",
            correct_count="1" if req.correct else "0",
        )
        db.add(mastery)
    
    db.commit()
    db.refresh(mastery)
    
    practice_count = int(mastery.practice_count)
    correct_count = int(mastery.correct_count)
    accuracy = (correct_count / practice_count * 100) if practice_count > 0 else 0
    
    return {
        "topic": mastery.topic,
        "mastery_level": mastery.mastery_level,
        "practice_count": practice_count,
        "accuracy": round(accuracy, 1),
        "status": "updated",
    }


@router.get("/{subject_id}/progress")
def get_learning_progress(subject_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Get detailed learning progress over time for visualization.
    """
    get_owned_subject(subject_id, current_user, db)
    masteries = (
        db.query(TopicMastery)
        .filter(TopicMastery.subject_id == subject_id)
        .order_by(TopicMastery.created_at)
        .all()
    )
    
    attempts = (
        db.query(QuestionAttempt)
        .filter(QuestionAttempt.subject_id == subject_id)
        .order_by(QuestionAttempt.created_at)
        .all()
    )
    
    # Calculate progress timeline
    timeline = []
    for mastery in masteries:
        timeline.append({
            "date": mastery.created_at.isoformat(),
            "event": "topic_practice",
            "topic": mastery.topic,
            "level": mastery.mastery_level,
        })
    
    for attempt in attempts:
        timeline.append({
            "date": attempt.created_at.isoformat(),
            "event": "question_attempt",
            "result": attempt.is_correct,
        })
    
    # Sort by date
    timeline.sort(key=lambda x: x["date"])
    
    return {
        "subject_id": subject_id,
        "total_events": len(timeline),
        "timeline": timeline[-50:],  # Last 50 events
    }


def _generate_recommendations(weak_areas, mastered_count, total_topics):
    """
    Generate personalized study recommendations based on analytics.
    """
    recommendations = []
    
    if len(weak_areas) > 0:
        recommendations.append({
            "type": "focus_area",
            "priority": "high",
            "message": f"Focus on {weak_areas[0]['topic']} - current accuracy: {weak_areas[0]['accuracy']}%",
        })
    
    if mastered_count < total_topics * 0.5:
        recommendations.append({
            "type": "practice_more",
            "priority": "medium",
            "message": "Practice more topics to improve overall mastery",
        })
    
    if total_topics == 0:
        recommendations.append({
            "type": "start_learning",
            "priority": "high",
            "message": "Start by exploring key topics and practicing questions",
        })
    
    if mastered_count >= total_topics * 0.8:
        recommendations.append({
            "type": "exam_ready",
            "priority": "low",
            "message": "Great progress! Focus on review and practice questions",
        })
    
    return recommendations
