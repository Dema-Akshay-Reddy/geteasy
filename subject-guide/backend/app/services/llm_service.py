"""
Generates readable academic answers grounded in retrieved study material.
Provides specialized learning tools: explanations, solutions, and learning progressions.
"""

from groq import AsyncGroq, Groq
import json

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


QUESTION_GENERATOR_PROMPT = """
You are GetEasy, an AI academic study assistant specializing in generating practice questions.

Your task is to create high-quality practice questions based on the provided topic and difficulty level.

DIFFICULTY LEVELS:

**Beginner:**
- Focus on basic recall and understanding
- Simple applications of concepts
- Clear, straightforward questions

**Intermediate:**
- Require application and analysis
- Multi-step problems
- Connect multiple concepts

**Advanced:**
- Complex problem-solving
- Require synthesis and evaluation
- Real-world applications
- Edge cases and optimizations

QUESTION TYPES:

**MCQ (Multiple Choice Questions):**
Return a JSON array of objects with this exact structure:
[
  {
    "question": "Question text here",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": "Option B",
    "explanation": "Why this is correct and others are wrong"
  }
]

**Descriptive Questions:**
Return a JSON array of objects with this exact structure:
[
  {
    "question": "Question text here",
    "expected_answer": "Detailed rubric of what a good answer should include",
    "key_points": ["Point 1", "Point 2", "Point 3"],
    "difficulty_note": "What makes this question at this difficulty level"
  }
]

IMPORTANT:
- Generate exactly 5 questions
- Return ONLY valid JSON - no markdown, no explanations, no extra text
- Make questions relevant to the study materials provided
- Ensure difficulty matches the requested level
- Make MCQ distractors (wrong answers) plausible but clearly incorrect
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


async def generate_topic_explanation_async(
    topic: str,
    level: str,
    retrieved_chunks: list[str],
    retrieved_metadatas: list[dict],
) -> str:
    """
    Async version of generate_topic_explanation.
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


async def generate_step_by_step_solution_async(
    question: str,
    retrieved_chunks: list[str],
    retrieved_metadatas: list[dict],
) -> str:
    """
    Async version of generate_step_by_step_solution.
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


async def generate_questions_async(
    topic: str,
    question_type: str,
    difficulty: str,
    retrieved_chunks: list[str],
    retrieved_metadatas: list[dict],
) -> dict:
    """
    Generate practice questions asynchronously based on topic, type, and difficulty.
    Returns structured JSON data.
    """
    if not settings.groq_api_key:
        return {"error": "The answer service is not configured. Add GROQ_API_KEY to the backend .env file."}

    context_blocks = []
    for i, (chunk, meta) in enumerate(zip(retrieved_chunks[:15], retrieved_metadatas[:15]), start=1):
        filename = meta.get("filename", "Unknown source")
        content_type = meta.get("content_type", "unknown")
        context_blocks.append(f"SOURCE {i}\nFile: {filename}\nType: {content_type}\n\n{chunk}")

    context = "\n\n---\n\n".join(context_blocks) if context_blocks else "No study materials available."

    user_message = f"""
Topic: {topic}
Question Type: {question_type.upper()}
Difficulty: {difficulty}

Study materials:

{context}

Generate exactly 5 {question_type} questions at {difficulty} difficulty level.
Return ONLY valid JSON with no additional text or markdown formatting.
"""

    client = Groq(api_key=settings.groq_api_key)

    try:
        response = client.chat.completions.create(
            model=settings.groq_model,
            max_completion_tokens=3000,
            messages=[
                {"role": "system", "content": QUESTION_GENERATOR_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.7,  # Higher temperature for more varied questions
        )

        content = response.choices[0].message.content.strip()
        
        # Extract JSON if wrapped in markdown code block
        if "`" in content:
            content = content.split("`")[1]
            if content.startswith("json"):
                content = content[4:]
            content = content.strip()
        
        questions = json.loads(content)
        
        if not isinstance(questions, list):
            return {"error": "Invalid response format from LLM"}
        
        return {
            "topic": topic,
            "question_type": question_type,
            "difficulty": difficulty,
            "questions": questions,
            "count": len(questions)
        }
    
    except json.JSONDecodeError as e:
        return {"error": f"Failed to parse generated questions: {str(e)}"}
    except Exception as e:
        return {"error": f"Failed to generate questions: {str(e)}"}


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
[\"Process Scheduling\", \"Memory Management\", \"File Systems\", ...]

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
        content = response.choices[0].message.content.strip()
        # Extract JSON array if wrapped in markdown code block
        if "`" in content:
            content = content.split("`")[1]
            if content.startswith("json"):
                content = content[4:]
        topics = json.loads(content)
        return topics if isinstance(topics, list) else []
    except:
        return []


async def generate_learning_map_async(
    subject_name: str,
    retrieved_chunks: list[str],
    retrieved_metadatas: list[dict],
    target: str = "exam",
) -> dict:
    """
    Generate a structured learning map with topics, prerequis ites, and relationships.
    Returns nodes and edges for visualization.
    """
    if not settings.groq_api_key:
        return {"nodes": [], "edges": [], "error": "LLM service not configured"}
    
    if not retrieved_chunks:
        return {"nodes": [], "edges": [], "message": "Upload documents to generate learning map"}

    context_blocks = []
    for i, (chunk, meta) in enumerate(zip(retrieved_chunks[:15], retrieved_metadatas[:15]), start=1):
        filename = meta.get("filename", "Unknown source")
        context_blocks.append(f"SOURCE {i} ({filename}):\n{chunk}")

    context = "\n\n---\n\n".join(context_blocks)

    user_message = f"""
Subject: {subject_name}
Study goal: {target.replace("_", " ")}

Study materials:

{context}

Create a learning map showing:
1. All major topics in this subject
2. Prerequisites between topics (which topics must be learned before others)

Return ONLY valid JSON in this exact format:
{{
  \"nodes\": [
    {{\"id\": \"node_0\", \"label\": \"Topic Name\", \"type\": \"topic\"}},
    {{\"id\": \"node_1\", \"label\": \"Another Topic\", \"type\": \"topic\"}}
  ],
  \"edges\": [
    {{\"source\": \"node_0\", \"target\": \"node_1\", \"relationship\": \"prerequisite\"}}
  ]
}}

Ensure all source/target IDs reference actual node IDs.
Return ONLY the JSON - no markdown, no explanations.
"""

    client = AsyncGroq(api_key=settings.groq_api_key, timeout=30.0, max_retries=1)

    try:
        response = await client.chat.completions.create(
            model=settings.groq_model,
            max_completion_tokens=1400,
            messages=[
                {"role": "user", "content": user_message},
            ],
            temperature=0.2,
        )

        content = (response.choices[0].message.content or "").strip()
        if "```" in content:
            content = content.split("```", 2)[1]
            if content.lstrip().startswith("json"):
                content = content.lstrip()[4:]
        start, end = content.find("{"), content.rfind("}")
        map_data = json.loads(content[start:end + 1] if start >= 0 and end > start else content)

        raw_nodes = map_data.get("nodes") if isinstance(map_data, dict) else None
        if not isinstance(raw_nodes, list):
            return {"nodes": [], "edges": [], "error": "The model returned an invalid learning map."}

        nodes, id_map, seen_labels = [], {}, set()
        for raw in raw_nodes:
            if not isinstance(raw, dict):
                continue
            label = str(raw.get("label", "")).strip()
            old_id = str(raw.get("id", "")).strip()
            key = label.casefold()
            if not label or key in seen_labels:
                continue
            seen_labels.add(key)
            node_id = f"topic_{len(nodes) + 1}"
            if old_id:
                id_map[old_id] = node_id
            nodes.append({"id": node_id, "label": label[:100], "type": "topic"})

        edges = []
        raw_edges = map_data.get("edges", []) if isinstance(map_data, dict) else []
        for raw in raw_edges:
            if not isinstance(raw, dict):
                continue
            source, target_id = id_map.get(str(raw.get("source", ""))), id_map.get(str(raw.get("target", "")))
            if source and target_id and source != target_id and not any(e["source"] == source and e["target"] == target_id for e in edges):
                edges.append({"source": source, "target": target_id, "relationship": str(raw.get("relationship", "prerequisite"))[:40]})
        if not nodes:
            return {"nodes": [], "edges": [], "message": "No clear topics were found in these materials. Add a syllabus or notes with topic headings."}
        return {"nodes": nodes[:30], "edges": edges[:60]}
    
    except json.JSONDecodeError as e:
        return {"nodes": [], "edges": [], "error": f"Failed to parse learning map: {str(e)}"}
    except Exception as e:
        return {"nodes": [], "edges": [], "error": f"Failed to generate learning map: {str(e)}"}
