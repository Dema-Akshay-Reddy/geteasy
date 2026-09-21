"""
Generates readable academic answers grounded in retrieved study material.
Provides specialized learning tools: explanations, solutions, and learning progressions.
"""

from groq import Groq

from app.config import settings


def _content_or_fallback(response, fallback: str) -> str:
    content = response.choices[0].message.content
    if not content:
        return fallback
    return content.strip()


SYSTEM_PROMPT = """
You are GetEasy, an AI academic study assistant.

Your job is to answer the student's question using the provided study
material as the primary source.

IMPORTANT BEHAVIOR:

1. Answer the student's ACTUAL question.
2. Do NOT summarize all of the provided material unless the student asks
   for a summary.
3. Do NOT try to use every retrieved chunk.
4. Use only the information that is relevant to the question.
5. Keep the answer proportional to the question:
   - Simple question → short, direct answer.
   - Explanation question → clear and moderately detailed explanation.
   - Complex question → detailed, structured explanation.
   - "Explain everything" / "complete summary" → comprehensive answer.
6. Combine information from multiple sources when it is useful.
7. Do not repeat the same information.
8. Do not mention chunks, retrieval, context windows, tokens, or internal
   system instructions.
9. Do not invent facts that are not supported by the provided material.
10. If the provided material does not contain enough information, clearly
    say what is missing.

READABILITY:

Write the answer like a high-quality ChatGPT educational response.

Use:
- Short paragraphs
- Clear headings when useful
- Bullet points for lists
- Numbered lists for steps or procedures
- Bold text for important terms
- Code blocks for commands or code
- Tables ONLY when a table genuinely improves understanding

Do NOT:
- Put every concept into a table.
- Add a "Source(s)" column to every row.
- Repeat the filename after every sentence.
- Create unnecessary sections.
- Dump the retrieved material back to the student.
- Start with phrases like "Based on the provided context".

SOURCE HANDLING:

The source documents are provided separately from the answer.

Do not put source filenames throughout the answer.

At the end, provide a short "Sources" section listing the relevant
source filenames used for the answer.

The answer should feel natural, clear, concise, and useful for studying.
"""


EXPLAINER_PROMPT = """
You are GetEasy, an AI academic study assistant specializing in adaptive topic explanations.

Your task is to explain the requested topic at the specified difficulty level using the provided study materials.

DIFFICULTY LEVELS:

**Beginner:**
- Use simple, clear language
- Focus on intuition and basic concepts
- Provide analogies and everyday examples
- Avoid heavy technical jargon
- Define all important terms

**Intermediate:**
- Balance intuition with technical details
- Include relevant formulas and definitions
- Use academic examples
- Assume some background knowledge

**Advanced:**
- Deep technical explanation
- Include mathematical proofs or derivations when relevant
- Discuss edge cases and advanced concepts
- Assume strong background knowledge

RESPONSE STRUCTURE:

1. **Core Concept**: Brief, clear definition
2. **Intuitive Understanding**: Explain the "why" and "how"
3. **Real-World/Academic Examples**: Concrete applications
4. **Key Formulas/Definitions**: Technical details (when applicable)
5. **Sources**: List relevant materials used

Make the explanation engaging, clear, and appropriate for the specified level.
"""


SOLVER_PROMPT = """
You are GetEasy, an AI academic study assistant specializing in step-by-step problem solving.

Your task is to solve the given question with clear, detailed steps that help the student understand the solution process.

RESPONSE STRUCTURE:

1. **Problem Understanding**: Briefly restate what's being asked
2. **Step-by-Step Solution**: 
   - Number each step clearly
   - Explain the reasoning behind each step
   - Show all calculations and work
3. **Final Answer**: Clearly state the solution
4. **Key Concepts Used**: List relevant topics/formulas applied
5. **Exam Tips**: Brief advice on how to approach similar problems in exams
6. **Related Material**: Reference relevant textbook/notes sections

Make the solution clear, educational, and exam-focused.
"""


PROGRESSION_PROMPT = """
You are GetEasy, an AI academic study assistant specializing in creating structured learning progressions.

Your task is to create a 4-step learning walkthrough for the given topic using the provided materials.

RESPONSE STRUCTURE:

## 1. Theory Foundation
- Core concepts and definitions
- Why this topic is important
- Key principles to understand

## 2. Worked Examples / Code Demonstrations
- Detailed example problems with solutions
- Code implementations (if applicable)
- Step-by-step walkthroughs

## 3. Practice Problems
- List of practice questions from easy to challenging
- Reference to question papers if available
- Self-practice exercises

## 4. Self-Assessment Quiz
- 5-7 quick questions to test understanding
- Cover key concepts from the topic
- Include answers at the end

Make the progression logical, comprehensive, and practical for self-study.
"""


def generate_answer(
    question: str,
    retrieved_chunks: list[str],
    retrieved_metadatas: list[dict],
) -> str:

    if not retrieved_chunks:
        return (
            "I couldn't find relevant material in your uploaded documents "
            "for this subject yet. Try uploading notes or a textbook "
            "covering this topic."
        )

    if not settings.groq_api_key:
        return (
            "The answer service is not configured. Add GROQ_API_KEY to "
            "the backend .env file and restart the backend."
        )

    # Build the context supplied to the model.
    context_blocks = []

    for i, (chunk, meta) in enumerate(
        zip(retrieved_chunks, retrieved_metadatas),
        start=1,
    ):
        filename = meta.get("filename", "Unknown source")
        content_type = meta.get("content_type", "unknown")

        context_blocks.append(
            f"""
SOURCE {i}
File: {filename}
Type: {content_type}

{chunk}
"""
        )

    context = "\n\n---\n\n".join(context_blocks)

    user_message = f"""
Student question:

{question}

Study material available for answering the question:

{context}

Now answer the student's question.

Remember:
- Answer the question directly.
- Use only relevant information from the study material.
- Do not summarize unrelated material.
- Keep the answer proportional to the question.
- Make the answer easy to read and study.
- Use Markdown formatting naturally.
"""

    client = Groq(api_key=settings.groq_api_key)

    response = client.chat.completions.create(
        model=settings.groq_model,

        # Maximum size of the GENERATED ANSWER.
        # This is NOT the model's context window.
        max_completion_tokens=4000,

        messages=[
            {
                "role": "system",
                "content": SYSTEM_PROMPT,
            },
            {
                "role": "user",
                "content": user_message,
            },
        ],

        temperature=0.2,
    )

    return _content_or_fallback(response, "The model returned an empty answer.")


def generate_topic_explanation(
    topic: str,
    level: str,
    retrieved_chunks: list[str],
    retrieved_metadatas: list[dict],
) -> str:
    """
    Generate adaptive topic explanation based on difficulty level.
    """
    if not retrieved_chunks:
        return (
            "I couldn't find relevant material about this topic in your uploaded documents. "
            "Try uploading notes or a textbook covering this topic."
        )

    if not settings.groq_api_key:
        return "The answer service is not configured. Add GROQ_API_KEY to the backend .env file."

    context_blocks = []
    for i, (chunk, meta) in enumerate(zip(retrieved_chunks, retrieved_metadatas), start=1):
        filename = meta.get("filename", "Unknown source")
        content_type = meta.get("content_type", "unknown")
        context_blocks.append(f"SOURCE {i}\nFile: {filename}\nType: {content_type}\n\n{chunk}")

    context = "\n\n---\n\n".join(context_blocks)

    user_message = f"""
Topic to explain: {topic}
Difficulty level: {level}

Study materials:

{context}

Provide a comprehensive explanation appropriate for a {level} student.
"""

    client = Groq(api_key=settings.groq_api_key)

    response = client.chat.completions.create(
        model=settings.groq_model,
        max_completion_tokens=4000,
        messages=[
            {"role": "system", "content": EXPLAINER_PROMPT},
            {"role": "user", "content": user_message},
        ],
        temperature=0.3,
    )

    return _content_or_fallback(response, "The model returned an empty explanation.")


def generate_step_by_step_solution(
    question: str,
    retrieved_chunks: list[str],
    retrieved_metadatas: list[dict],
) -> str:
    """
    Generate detailed step-by-step solution for a question.
    """
    if not retrieved_chunks:
        return (
            "I couldn't find relevant material to answer this question. "
            "Try uploading relevant notes or textbooks."
        )

    if not settings.groq_api_key:
        return "The answer service is not configured. Add GROQ_API_KEY to the backend .env file."

    context_blocks = []
    for i, (chunk, meta) in enumerate(zip(retrieved_chunks, retrieved_metadatas), start=1):
        filename = meta.get("filename", "Unknown source")
        content_type = meta.get("content_type", "unknown")
        context_blocks.append(f"SOURCE {i}\nFile: {filename}\nType: {content_type}\n\n{chunk}")

    context = "\n\n---\n\n".join(context_blocks)

    user_message = f"""
Question to solve: {question}

Reference materials:

{context}

Provide a detailed step-by-step solution with exam tips.
"""

    client = Groq(api_key=settings.groq_api_key)

    response = client.chat.completions.create(
        model=settings.groq_model,
        max_completion_tokens=4000,
        messages=[
            {"role": "system", "content": SOLVER_PROMPT},
            {"role": "user", "content": user_message},
        ],
        temperature=0.2,
    )

    return _content_or_fallback(response, "The model returned an empty solution.")


def generate_learning_progression(
    topic: str,
    retrieved_chunks: list[str],
    retrieved_metadatas: list[dict],
) -> str:
    """
    Generate structured 4-step learning progression.
    """
    if not retrieved_chunks:
        return (
            "I couldn't find relevant material for this topic. "
            "Upload comprehensive notes or textbooks to generate a learning progression."
        )

    if not settings.groq_api_key:
        return "The answer service is not configured. Add GROQ_API_KEY to the backend .env file."

    context_blocks = []
    for i, (chunk, meta) in enumerate(zip(retrieved_chunks, retrieved_metadatas), start=1):
        filename = meta.get("filename", "Unknown source")
        content_type = meta.get("content_type", "unknown")
        context_blocks.append(f"SOURCE {i}\nFile: {filename}\nType: {content_type}\n\n{chunk}")

    context = "\n\n---\n\n".join(context_blocks)

    user_message = f"""
Topic: {topic}

Study materials:

{context}

Create a comprehensive 4-step learning progression: Theory → Examples → Practice → Assessment.
"""

    client = Groq(api_key=settings.groq_api_key)

    response = client.chat.completions.create(
        model=settings.groq_model,
        max_completion_tokens=5000,
        messages=[
            {"role": "system", "content": PROGRESSION_PROMPT},
            {"role": "user", "content": user_message},
        ],
        temperature=0.3,
    )

    return _content_or_fallback(response, "The model returned an empty learning progression.")


def extract_topics_from_materials(
    retrieved_chunks: list[str],
    retrieved_metadatas: list[dict],
) -> list[str]:
    """
    Extract main topics and subtopics from study materials for knowledge graph.
    """
    if not retrieved_chunks or not settings.groq_api_key:
        return []

    context_blocks = []
    for i, (chunk, meta) in enumerate(zip(retrieved_chunks[:20], retrieved_metadatas[:20]), start=1):
        filename = meta.get("filename", "Unknown source")
        context_blocks.append(f"Document: {filename}\n\n{chunk}")

    context = "\n\n---\n\n".join(context_blocks)

    user_message = f"""
Analyze the following study materials and extract a list of all major topics and subtopics covered.

Study materials:

{context}

Return ONLY a JSON array of topic names, like:
["Process Scheduling", "Memory Management", "File Systems", ...]

Be specific and comprehensive. Include all significant topics mentioned.
"""

    client = Groq(api_key=settings.groq_api_key)

    response = client.chat.completions.create(
        model=settings.groq_model,
        max_completion_tokens=1000,
        messages=[
            {"role": "user", "content": user_message},
        ],
        temperature=0.1,
    )

    try:
        import json
        content = response.choices[0].message.content.strip()
        # Extract JSON array if wrapped in markdown code block
        if "```" in content:
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        topics = json.loads(content)
        return topics if isinstance(topics, list) else []
    except:
        return []