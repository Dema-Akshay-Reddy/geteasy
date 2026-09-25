from groq import Groq

from app.config import settings


KEYWORD_SUBJECTS = [
    ("Linux Programming", ["bash", "shell script", "awk", "sed", "grep", "chmod", "linux command"]),
    ("Operating Systems", ["process scheduling", "deadlock", "paging", "semaphore", "virtual memory", "banker's"]),
    ("Database Management Systems", ["sql", "normalization", "relational", "transaction", "erd", "dbms"]),
    ("Machine Learning", ["gradient descent", "supervised learning", "neural network", "overfitting", "feature"]),
    ("Computer Networks", ["tcp", "udp", "osi model", "routing", "ip address", "http"]),
    ("Data Structures", ["linked list", "binary tree", "stack", "queue", "hash table", "algorithm"]),
    ("Artificial Intelligence", ["heuristic", "knowledge representation", "expert system", "search tree"]),
    ("Mathematics", ["integral", "derivative", "theorem", "matrix", "probability"]),
    ("Python Programming", ["def ", "python", "pandas", "numpy"]),
    ("Java Programming", ["public class", "system.out", "java"]),
    ("Web Development", ["html", "css", "javascript", "react", "http request"]),
]


def _fallback_subject(text: str) -> str:
    sample = text.lower()
    scored = []
    for name, keywords in KEYWORD_SUBJECTS:
        score = sum(1 for keyword in keywords if keyword in sample)
        scored.append((score, name))
    scored.sort(reverse=True)
    if scored and scored[0][0] >= 2:
        return scored[0][1]
    return "General Studies"


def detect_subject(text: str) -> str:
    sample = text[:16000]
    fallback = _fallback_subject(text)

    # Skip the network-backed classifier when the local keyword rules have a
    # clear match. This keeps routine uploads quick and reserves the LLM for
    # mixed or unfamiliar material.
    lowered = sample.lower()
    ranked = sorted(
        ((sum(1 for keyword in keywords if keyword in lowered), name) for name, keywords in KEYWORD_SUBJECTS),
        reverse=True,
    )
    if ranked and ranked[0][0] >= 2 and (len(ranked) == 1 or ranked[0][0] > ranked[1][0]):
        return ranked[0][1]

    if not settings.groq_api_key:
        return fallback

    prompt = f"""
You are an academic subject classifier for a study application.

Your job is to identify the MOST SPECIFIC academic subject represented by
the study material.

IMPORTANT:
- Classify based ONLY on the CONTENT.
- NEVER use the filename.
- Do NOT automatically classify Linux-related material as Operating Systems.
- Prefer a specific subject over a broad subject.

Use these rules:

1. Return "Linux Programming" when the material primarily covers:
   - Linux commands
   - Bash / shell scripting
   - shell programs
   - awk
   - sed
   - grep
   - file and directory commands
   - permissions
   - users and groups
   - pipes and redirection
   - shell scripting
   - Linux utilities
   - Linux programming exercises
   - Linux command-line programming

2. Return "Operating Systems" when the material primarily covers:
   - processes
   - process scheduling
   - CPU scheduling
   - process states
   - PCB
   - threads
   - synchronization
   - semaphores
   - deadlocks
   - Banker's algorithm
   - memory management
   - paging
   - segmentation
   - page replacement
   - virtual memory
   - file system concepts
   - OS architecture
   - system calls as OS concepts

3. If Linux commands or shell scripting are the main focus,
   choose "Linux Programming" even if the material also mentions
   operating-system concepts.

4. If theoretical operating-system concepts are the main focus,
   choose "Operating Systems" even if examples use Linux.

5. Other possible subjects include:
   - Database Management Systems
   - Machine Learning
   - Computer Networks
   - Data Structures
   - Artificial Intelligence
   - Computer Organization
   - Mathematics
   - Web Development
   - Java Programming
   - Python Programming

Return ONLY ONE subject name.
Do not explain your answer.
Do not return Markdown.
Do not return multiple subjects.

Study material:

{sample}
"""

    try:
        client = Groq(api_key=settings.groq_api_key)
        response = client.chat.completions.create(
            model=settings.groq_model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
        )
        subject = (response.choices[0].message.content or "").strip().strip(" .:-")
        if not subject or "\n" in subject or len(subject) > 80:
            return fallback
        return subject
    except Exception:
        return fallback
