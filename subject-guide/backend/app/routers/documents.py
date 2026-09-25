import os
import tempfile

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Document, ContentType, Subject, User
from app.services.subject_detector import detect_subject
from app.services import document_processor, vector_store
from app.auth import get_current_user
from app.services.ownership import get_owned_subject

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    subject_id: str | None = Form(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # --------------------------------------------------
    # 1. SAVE UPLOADED FILE TEMPORARILY
    # --------------------------------------------------

    if not file.filename:
        raise HTTPException(status_code=400, detail="A filename is required.")

    suffix = os.path.splitext(file.filename)[1] or ".bin"

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    # --------------------------------------------------
    # 2. EXTRACT TEXT
    # --------------------------------------------------

    try:
        text = document_processor.extract_text(
            tmp_path,
            file.filename
        )

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    except Exception as e:
        # Catch any unexpected errors during extraction
        raise HTTPException(
            status_code=400,
            detail=f"Failed to process file. Ensure it's a valid PDF, DOCX, PPTX, or TXT file. Error: {str(e)}"
        )

    finally:
        os.unlink(tmp_path)

    # --------------------------------------------------
    # 3. CHECK THAT TEXT WAS EXTRACTED
    # --------------------------------------------------

    if not text.strip():
        raise HTTPException(
            status_code=400,
            detail="No extractable text found in file."
        )

    # --------------------------------------------------
    # 4. DETECT SUBJECT FROM DOCUMENT CONTENT
    # --------------------------------------------------

    # A chosen destination avoids a slow classifier call and keeps related
    # materials together. Auto-detect remains available for hands-off uploads.
    subject = None
    if subject_id:
        subject = get_owned_subject(subject_id, current_user, db)
        subject_name = subject.name
    else:
        subject_name = detect_subject(text)
        if not subject_name:
            raise HTTPException(status_code=400, detail="Could not determine subject from document.")

        # Reuse the user's existing subject, including common short-name
        # variants, instead of splitting one course across duplicate folders.
        normalize = lambda value: " ".join(value.casefold().replace("&", "and").split())
        aliases = {
            "dbms": "database management systems",
            "database systems": "database management systems",
            "os": "operating systems",
            "ds": "data structures",
            "ai": "artificial intelligence",
            "ml": "machine learning",
        }
        detected_key = aliases.get(normalize(subject_name), normalize(subject_name))
        for existing in db.query(Subject).filter(Subject.owner_id == current_user.id).all():
            existing_key = aliases.get(normalize(existing.name), normalize(existing.name))
            if existing_key == detected_key:
                subject = existing
                break

    # --------------------------------------------------
    # 6. CREATE SUBJECT IF IT DOESN'T EXIST
    # --------------------------------------------------

    if not subject:
        subject = Subject(
            name=subject_name,
            owner_id=current_user.id
        )

        db.add(subject)

        # Generate the UUID
        db.flush()

    # --------------------------------------------------
    # 7. DETERMINE DOCUMENT TYPE
    # --------------------------------------------------

    content_type = document_processor.guess_content_type(
        file.filename,
        text
    )
    
    # Map content_type to ContentType enum
    content_type_mapping = {
        "textbook": ContentType.other,
        "lecture_notes": ContentType.notes,
        "question_paper": ContentType.questions,
        "lab_manual": ContentType.labs,
        "syllabus": ContentType.other,
    }
    
    db_content_type = content_type_mapping.get(content_type, ContentType.other)

    # --------------------------------------------------
    # 8. SPLIT DOCUMENT INTO CHUNKS
    # --------------------------------------------------

    chunks = document_processor.chunk_text(text)

    if not chunks:
        raise HTTPException(
            status_code=400,
            detail="Could not create chunks from document."
        )

    # --------------------------------------------------
    # 9. CREATE DOCUMENT
    # --------------------------------------------------

    doc = Document(
        subject_id=subject.id,
        filename=file.filename,
        content_type=db_content_type,
        chunk_count=str(len(chunks)),
    )

    db.add(doc)

    # Generate document UUID
    db.flush()

    # --------------------------------------------------
    # 10. ADD CHUNKS TO VECTOR STORE, THEN COMMIT
    # --------------------------------------------------

    try:
        vector_store.add_chunks(
            chunks=chunks,
            subject_id=str(subject.id),
            document_id=str(doc.id),
            filename=file.filename,
            content_type=str(content_type),
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Embedding failed: {e}",
        )

    db.commit()

    db.refresh(subject)
    db.refresh(doc)

    # --------------------------------------------------
    # 12. RETURN RESULT
    # --------------------------------------------------

    return {
        "subject_id": subject.id,
        "subject_name": subject.name,
        "document_id": doc.id,
        "filename": doc.filename,
        "content_type": content_type,
        "chunks_created": len(chunks),
    }


@router.get("/subject/{subject_id}")
def list_documents(
    subject_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_owned_subject(subject_id, current_user, db)
    docs = (
        db.query(Document)
        .filter(Document.subject_id == subject_id)
        .all()
    )

    return [
        {
            "id": d.id,
            "filename": d.filename,
            "content_type": d.content_type,
            "uploaded_at": d.uploaded_at,
            "chunk_count": d.chunk_count,
        }
        for d in docs
    ]
