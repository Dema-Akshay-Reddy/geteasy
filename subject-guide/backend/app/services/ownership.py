from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.models import Subject, User


def get_owned_subject(subject_id: str, current_user: User, db: Session) -> Subject:
    """Return a subject only when it belongs to the authenticated user."""
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    if subject.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this subject")
    return subject
