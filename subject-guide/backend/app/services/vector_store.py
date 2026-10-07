"""
Wraps ChromaDB for persistent, metadata-filtered storage of academic content.

Uses sentence-transformers locally for embeddings.
"""

import os
import uuid

# Disable Chroma telemetry
os.environ.setdefault("ANONYMIZED_TELEMETRY", "False")

import chromadb
from chromadb.segment.impl.metadata import sqlite as chroma_sqlite
from chromadb.utils import embedding_functions

from app.config import settings


# ============================================================
# ChromaDB SQLite seq_id compatibility patch
# ============================================================

_orig_decode_seq_id = getattr(chroma_sqlite, "_decode_seq_id", None)


def _decode_seq_id(seq_id_bytes):
    """
    Chroma 0.5.x expects seq_id to sometimes be bytes,
    while SQLite can return it as an int.

    Handle both cases safely.
    """

    # SQLite returned an integer directly
    if isinstance(seq_id_bytes, int):
        return seq_id_bytes

    # SQLite returned a memoryview
    if isinstance(seq_id_bytes, memoryview):
        seq_id_bytes = seq_id_bytes.tobytes()

    # Handle NULL
    if seq_id_bytes is None:
        return 0

    # Normal Chroma behavior for bytes
    return _orig_decode_seq_id(seq_id_bytes)


# Monkey-patch Chroma's decoder (only exists on chroma 0.5.x;
# the patch is unnecessary on newer versions where the attribute is absent)
if _orig_decode_seq_id is not None:
    chroma_sqlite._decode_seq_id = _decode_seq_id


# ============================================================
# Chroma Client
# ============================================================

_client = chromadb.PersistentClient(
    path=settings.chroma_persist_dir
)


# ============================================================
# Embedding Model
# ============================================================
# Prefer sentence-transformers (torch) when installed. On small
# free-tier hosts (e.g. Render 512MB) torch does not fit, so fall
# back to chromadb's DefaultEmbeddingFunction — the same
# all-MiniLM-L6-v2 model running via ONNX (384 dims, no torch).
try:
    _embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name="all-MiniLM-L6-v2"
    )
except Exception:  # sentence-transformers/torch not installed
    _embedding_fn = embedding_functions.DefaultEmbeddingFunction()


# ============================================================
# Collection
# ============================================================

_collection = _client.get_or_create_collection(
    name="academic_content",
    embedding_function=_embedding_fn,
)


# ============================================================
# Add chunks
# ============================================================

def add_chunks(
    chunks: list[str],
    subject_id: str,
    document_id: str,
    filename: str,
    content_type: str,
) -> list[str]:
    """
    Embeds and stores chunks with metadata.

    Returns:
        list[str]: Chroma IDs used for the chunks.
    """

    # Don't try to embed an empty document
    if not chunks:
        return []

    ids = [
        str(uuid.uuid4())
        for _ in chunks
    ]

    metadatas = [
        {
            "subject_id": str(subject_id),
            "document_id": str(document_id),
            "filename": str(filename),
            "content_type": str(content_type),
        }
        for _ in chunks
    ]

    _collection.add(
        documents=chunks,
        metadatas=metadatas,
        ids=ids,
    )

    return ids


# ============================================================
# Query
# ============================================================

def query(
    question: str,
    subject_id: str,
    top_k: int = 5,
    content_type: str | None = None,
) -> dict:
    """
    Retrieves the most relevant chunks for a question,
    scoped to a subject.
    """

    empty = {
        "documents": [[]],
        "metadatas": [[]],
    }

    try:
        count = _collection.count()

        if count == 0:
            return empty

        where = {
            "subject_id": str(subject_id)
        }

        if content_type:
            where = {
                "$and": [
                    {
                        "subject_id": str(subject_id)
                    },
                    {
                        "content_type": str(content_type)
                    },
                ]
            }

        results = _collection.query(
            query_texts=[question],
            n_results=min(top_k, count),
            where=where,
        )

        return results

    except Exception as e:
        print(f"Chroma query error: {e}")
        return empty