import uuid
import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Enum, Boolean
from sqlalchemy.orm import relationship
import enum

from app.database import Base


def gen_uuid():
    return str(uuid.uuid4())


class ContentType(str, enum.Enum):
    notes = "notes"
    textbook = "textbook"
    questions = "questions"
    labs = "labs"
    other = "other"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    subjects = relationship("Subject", back_populates="owner")


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)  # e.g. "DBMS", "Operating Systems"
    owner_id = Column(
        String,
        ForeignKey("users.id"),
        nullable=True
    )
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    owner = relationship("User", back_populates="subjects")
    documents = relationship("Document", back_populates="subject")


class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=gen_uuid)
    subject_id = Column(String, ForeignKey("subjects.id"))
    filename = Column(String, nullable=False)
    content_type = Column(Enum(ContentType), default=ContentType.other)
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)
    chunk_count = Column(String, default="0")

    subject = relationship("Subject", back_populates="documents")


class Chunk(Base):
    """
    Metadata record for a chunk of text that also lives in ChromaDB.
    We keep a lightweight Postgres row for querying/joins, while the
    actual embedding + text lives in the vector store.
    """
    __tablename__ = "chunks"

    id = Column(String, primary_key=True, default=gen_uuid)
    document_id = Column(String, ForeignKey("documents.id"))
    chroma_id = Column(String, nullable=False)  # id used in the Chroma collection
    text_preview = Column(Text)  # first ~200 chars, for quick display
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class TopicMastery(Base):
    """
    Tracks a student's understanding level for specific topics within a subject.
    Used for analytics and personalized learning paths.
    """
    __tablename__ = "topic_mastery"

    id = Column(String, primary_key=True, default=gen_uuid)
    subject_id = Column(String, ForeignKey("subjects.id"))
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    topic = Column(String, nullable=False)
    mastery_level = Column(String, default="beginner")  # beginner, intermediate, advanced, mastered
    practice_count = Column(String, default="0")
    correct_count = Column(String, default="0")
    last_practiced = Column(DateTime, default=datetime.datetime.utcnow)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class QuestionAttempt(Base):
    """
    Tracks student question-solving attempts for analytics and progress tracking.
    """
    __tablename__ = "question_attempts"

    id = Column(String, primary_key=True, default=gen_uuid)
    subject_id = Column(String, ForeignKey("subjects.id"))
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    question = Column(Text, nullable=False)
    solution_provided = Column(Text)
    is_correct = Column(String, default="unknown")  # correct, incorrect, unknown
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
