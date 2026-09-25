"use client";

import { Suspense, useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import { useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function StudyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-400/20 border-t-blue-400"></div>
        </div>
      }
    >
      <StudyPageContent />
    </Suspense>
  );
}

function StudyPageContent() {
  const { getAuthHeaders } = useAuth();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const [subjects, setSubjects] = useState([]);
  const [activeSubject, setActiveSubject] = useState(null);
  const [activeTab, setActiveTab] = useState("explainer");

  // Explainer state
  const [explainTopic, setExplainTopic] = useState("");
  const [explainLevel, setExplainLevel] = useState("intermediate");
  const [explanation, setExplanation] = useState(null);
  const [explaining, setExplaining] = useState(false);

  // Solver state
  const [question, setQuestion] = useState("");
  const [solution, setSolution] = useState(null);
  const [solving, setSolving] = useState(false);
  const [pathTarget, setPathTarget] = useState("exam");
  const [learningPath, setLearningPath] = useState(null);
  const [pathLoading, setPathLoading] = useState(false);
  const [progressionTopic, setProgressionTopic] = useState("");
  const [progression, setProgression] = useState(null);
  const [progressing, setProgressing] = useState(false);
  const [correlationTopic, setCorrelationTopic] = useState("");
  const [comparisonIds, setComparisonIds] = useState([]);
  const [correlation, setCorrelation] = useState(null);
  const [correlating, setCorrelating] = useState(false);
  // Question Bank state
  const [qbTopic, setQbTopic] = useState("");
  const [qbType, setQbType] = useState("mcq");
  const [qbDifficulty, setQbDifficulty] = useState("intermediate");
  const [qbQuestions, setQbQuestions] = useState(null);
  const [qbGenerating, setQbGenerating] = useState(false);


  useEffect(() => {
    loadSubjects();
  }, []);

  useEffect(() => {
    const subjectId = searchParams.get("subject");
    if (subjectId && subjects.length > 0) {
      const subject = subjects.find((s) => s.id === subjectId);
      if (subject) setActiveSubject(subject);
    }
  }, [searchParams, subjects]);

  useEffect(() => {
    setLearningPath(null);
  }, [activeSubject?.id]);

  const loadSubjects = async () => {
    try {
      const response = await fetch(`${API_BASE}/subjects/me`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setSubjects(data);
        if (data.length > 0 && !activeSubject) {
          setActiveSubject(data[0]);
        }
      }
    } catch (error) {
      console.error("Failed to load subjects:", error);
    }
  };

  const handleExplain = async () => {
    if (!explainTopic.trim() || !activeSubject || explaining) return;

    setExplaining(true);
    setExplanation(null);

    try {
      const response = await fetch(`${API_BASE}/query/explain`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          subject_id: activeSubject.id,
          topic: explainTopic.trim(),
          level: explainLevel,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to generate explanation");
      }

      const data = await response.json();
      setExplanation(data);
      showToast("Explanation generated successfully", "success");
    } catch (err) {
      const errorMsg = `Failed to generate explanation: ${err.message}`;
      setExplanation({
        explanation: `⚠️ ${errorMsg}`,
      });
      showToast(errorMsg, "error");
    } finally {
      setExplaining(false);
    }
  };

  const handleSolve = async () => {
    if (!question.trim() || !activeSubject || solving) return;

    setSolving(true);
    setSolution(null);

    try {
      const response = await fetch(`${API_BASE}/query/solve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          subject_id: activeSubject.id,
          question: question.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to generate solution");
      }

      const data = await response.json();
      setSolution(data);
      showToast("Solution generated successfully", "success");
    } catch (err) {
      const errorMsg = `Failed to generate solution: ${err.message}`;
      setSolution({
        solution: `⚠️ ${errorMsg}`,
      });
      showToast(errorMsg, "error");
    } finally {
      setSolving(false);
    }
  };

  const requestJson = async (url, options = {}) => {
    const response = await fetch(url, { headers: { "Content-Type": "application/json", ...getAuthHeaders() }, ...options });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || "Request failed");
    return data;
  };

  const loadLearningMap = async () => {
    if (!activeSubject || pathLoading) return;
    setPathLoading(true);
    setLearningPath(null);
    try {
      const pathData = await requestJson(`${API_BASE}/subjects/${activeSubject.id}/learning-path`, { method: "POST", body: JSON.stringify({ target: pathTarget }) });
      setLearningPath(pathData);
      if (pathData.error) showToast(pathData.error, "error");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setPathLoading(false);
    }
  };

  const handleProgression = async () => {
    if (!activeSubject || !progressionTopic.trim() || progressing) return;
    setProgressing(true);
    try {
      setProgression(await requestJson(`${API_BASE}/query/progression`, { method: "POST", body: JSON.stringify({ subject_id: activeSubject.id, topic: progressionTopic.trim() }) }));
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setProgressing(false);
    }
  };

  const handleCorrelation = async () => {
    if (!correlationTopic.trim() || comparisonIds.length < 2 || correlating) return;
    setCorrelating(true);
    try {
      setCorrelation(await requestJson(`${API_BASE}/query/correlate`, { method: "POST", body: JSON.stringify({ subject_ids: comparisonIds, topic: correlationTopic.trim() }) }));
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setCorrelating(false);
    }
  };

  const exportStudyGuide = async () => {
    if (!activeSubject) return;
    try {
      const response = await fetch(`${API_BASE}/export/${activeSubject.id}/markdown`, { headers: getAuthHeaders() });
      if (!response.ok) throw new Error("Could not export the study guide");
      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${activeSubject.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-study-guide.md`;
      link.click();
      URL.revokeObjectURL(link.href);
      showToast("Study guide downloaded", "success");
    } catch (error) { showToast(error.message, "error"); }
  };


  const handleGenerateQuestions = async () => {
    if (!qbTopic.trim() || !activeSubject || qbGenerating) return;

    setQbGenerating(true);
    setQbQuestions(null);

    try {
      const response = await fetch(`${API_BASE}/query/generate-questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          subject_id: activeSubject.id,
          topic: qbTopic.trim(),
          question_type: qbType,
          difficulty: qbDifficulty,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to generate questions");
      }

      const data = await response.json();
      setQbQuestions(data);
      showToast(`Generated ${data.questions?.length || 0} questions successfully`, "success");
    } catch (err) {
      const errorMsg = `Failed to generate questions: ${err.message}`;
      showToast(errorMsg, "error");
      setQbQuestions({ questions: [], error: errorMsg });
    } finally {
      setQbGenerating(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <header className="border-b border-white/[0.06] bg-[#07090d]">
        <div className="flex items-center justify-between gap-4 px-8 py-6">
          <div>
          <h1 className="text-2xl font-semibold text-white">Study Space</h1>
          <p className="mt-1 text-sm text-white/40">
            Interactive learning tools powered by AI
          </p>
          </div>
          {activeSubject && <button onClick={exportStudyGuide} className="rounded-lg border border-white/[0.1] px-4 py-2 text-xs font-medium text-white/75 hover:bg-white/[0.05]">Export Study Guide</button>}
        </div>
      </header>

      {/* Main Content */}
      <div className="p-8">
        {subjects.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.07] bg-[#0c0f15] p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.025] text-2xl text-white/30">
              📚
            </div>
            <h3 className="text-base font-semibold text-white">No subjects yet</h3>
            <p className="mt-2 text-sm text-white/40">
              Upload your study materials to start learning
            </p>
          </div>
        ) : (
          <>
            {/* Subject Selector */}
            <div className="mb-6">
              <label className="block text-xs font-medium text-white/60">Active Subject</label>
              <select
                value={activeSubject?.id || ""}
                onChange={(e) => {
                  const subject = subjects.find((s) => s.id === e.target.value);
                  setActiveSubject(subject);
                }}
                className="mt-2 w-full max-w-xs rounded-lg border border-white/[0.08] bg-[#080a0f] px-4 py-2.5 text-sm text-white outline-none focus:border-blue-400/30"
              >
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tabs */}
            <div className="mb-6 flex gap-2 border-b border-white/[0.06] pb-px">
              <button
                onClick={() => setActiveTab("explainer")}
                className={`border-b-2 px-4 py-3 text-sm font-medium transition ${
                  activeTab === "explainer"
                    ? "border-blue-400 text-white"
                    : "border-transparent text-white/40 hover:text-white/70"
                }`}
              >
                💡 Topic Explainer
              </button>
              <button
                onClick={() => setActiveTab("solver")}
                className={`border-b-2 px-4 py-3 text-sm font-medium transition ${
                  activeTab === "solver"
                    ? "border-blue-400 text-white"
                    : "border-transparent text-white/40 hover:text-white/70"
                }`}
              >
                🎯 Question Solver
              </button>
              <button onClick={() => setActiveTab("map")} className={`border-b-2 px-4 py-3 text-sm font-medium transition ${activeTab === "map" ? "border-blue-400 text-white" : "border-transparent text-white/40 hover:text-white/70"}`}>🗺️ Learning Map</button>
              <button onClick={() => setActiveTab("connect")} className={`border-b-2 px-4 py-3 text-sm font-medium transition ${activeTab === "connect" ? "border-blue-400 text-white" : "border-transparent text-white/40 hover:text-white/70"}`}>🔗 Connect Subjects</button>
              <button onClick={() => setActiveTab("questionbank")} className={`border-b-2 px-4 py-3 text-sm font-medium transition ${activeTab === "questionbank" ? "border-blue-400 text-white" : "border-transparent text-white/40 hover:text-white/70"}`}>?? Question Bank</button>
            </div>

            {/* Tab Content */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#0c0f15]">
              {activeTab === "explainer" && (
                <div className="p-6">
                  <h3 className="text-sm font-semibold text-white">Topic Explainer</h3>
                  <p className="mt-1 text-xs text-white/30">
                    Get explanations adapted to your knowledge level
                  </p>

                  <div className="mt-6 space-y-4">
                    <div>
                      <label className="text-xs font-medium text-white/60">Topic</label>
                      <input
                        type="text"
                        value={explainTopic}
                        onChange={(e) => setExplainTopic(e.target.value)}
                        placeholder="e.g., Process Scheduling, Binary Trees..."
                        className="mt-2 w-full rounded-lg border border-white/[0.08] bg-[#080a0f] px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-blue-400/30"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleExplain();
                        }}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-white/60">Level</label>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {["beginner", "intermediate", "advanced"].map((lvl) => (
                          <button
                            key={lvl}
                            onClick={() => setExplainLevel(lvl)}
                            className={`rounded-lg border px-4 py-2.5 text-xs font-medium capitalize transition ${
                              explainLevel === lvl
                                ? "border-blue-400/30 bg-blue-400/10 text-blue-300"
                                : "border-white/[0.08] bg-white/[0.02] text-white/40 hover:bg-white/[0.04]"
                            }`}
                          >
                            {lvl}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleExplain}
                      disabled={!explainTopic.trim() || explaining}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      {explaining ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                          Generating...
                        </>
                      ) : (
                        <>Explain Topic →</>
                      )}
                    </button>
                  </div>

                  {explanation && (
                    <div className="mt-8 border-t border-white/[0.06] pt-6">
                      <div className="rounded-xl bg-[#080a0f] p-5">
                        <FormattedAnswer text={explanation.explanation} />
                      </div>

                      {explanation.sources?.length > 0 && (
                        <div className="mt-4">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/20">
                            Sources
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {explanation.sources.map((source, index) => (
                              <span
                                key={index}
                                className="rounded-lg border border-white/[0.06] bg-white/[0.025] px-3 py-1.5 text-[11px] text-white/35"
                              >
                                {source}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "solver" && (
                <div className="p-6">
                  <h3 className="text-sm font-semibold text-white">Question Solver</h3>
                  <p className="mt-1 text-xs text-white/30">
                    Get step-by-step solutions with exam tips
                  </p>

                  <div className="mt-6 space-y-4">
                    <div>
                      <label className="text-xs font-medium text-white/60">Question</label>
                      <textarea
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="Enter your question or problem here..."
                        rows={6}
                        className="mt-2 w-full resize-none rounded-lg border border-white/[0.08] bg-[#080a0f] px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-blue-400/30"
                      />
                    </div>

                    <button
                      onClick={handleSolve}
                      disabled={!question.trim() || solving}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      {solving ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                          Solving...
                        </>
                      ) : (
                        <>Solve Question →</>
                      )}
                    </button>
                  </div>

                  {solution && (
                    <div className="mt-8 border-t border-white/[0.06] pt-6">
                      <div className="rounded-xl bg-[#080a0f] p-5">
                        <FormattedAnswer text={solution.solution} />
                      </div>

                      {solution.sources?.length > 0 && (
                        <div className="mt-4">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/20">
                            Sources
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {solution.sources.map((source, index) => (
                              <span
                                key={index}
                                className="rounded-lg border border-white/[0.06] bg-white/[0.025] px-3 py-1.5 text-[11px] text-white/35"
                              >
                                {source}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {activeTab === "map" && (
                <div className="p-6 space-y-8">
                  <div><h3 className="text-sm font-semibold text-white">Learning Path & Knowledge Map</h3><p className="mt-1 text-xs text-white/30">Build a prerequisite map from this subject’s uploaded material.</p>
                    <div className="mt-5 flex flex-wrap gap-3"><select value={pathTarget} onChange={(e) => setPathTarget(e.target.value)} className="rounded-lg border border-white/[0.08] bg-[#080a0f] px-3 py-2 text-sm text-white"><option value="exam">Exam preparation</option><option value="comprehensive">Comprehensive study</option><option value="quick_review">Quick review</option></select><button onClick={loadLearningMap} disabled={pathLoading} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-30">{pathLoading ? "Building..." : "Build learning map"}</button></div>
                  </div>
                  {pathLoading && <div className="rounded-xl border border-white/[0.06] bg-[#080a0f] p-5 text-sm text-white/50">Reading this subject’s materials and arranging topics by prerequisites…</div>}
                  {!pathLoading && learningPath && (
                    learningPath.nodes?.length ? <div>
                      <div className="mb-3 flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wider text-white/40">Topics to study</p><span className="text-[11px] text-white/30">{learningPath.nodes.length} topics · {learningPath.edges?.length || 0} prerequisites</span></div>
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{learningPath.nodes.map((node, index) => {
                        const prerequisites = (learningPath.edges || []).filter((edge) => edge.target === node.id).map((edge) => learningPath.nodes.find((candidate) => candidate.id === edge.source)?.label).filter(Boolean);
                        return <div key={node.id} className="rounded-xl border border-blue-400/15 bg-[#080a0f] p-4"><div className="flex items-start gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-400/10 text-xs font-semibold text-blue-200">{index + 1}</span><div><p className="text-sm font-medium text-white">{node.label}</p>{prerequisites.length > 0 && <p className="mt-2 text-xs leading-5 text-white/40">Learn first: {prerequisites.join(", ")}</p>}</div></div></div>;
                      })}</div>
                      {learningPath.edges?.length > 0 && <div className="mt-5 rounded-xl border border-white/[0.06] bg-[#080a0f] p-4"><p className="mb-3 text-xs font-semibold text-white/60">Prerequisite links</p><div className="flex flex-wrap gap-2">{learningPath.edges.map((edge, index) => { const from = learningPath.nodes.find((node) => node.id === edge.source)?.label; const to = learningPath.nodes.find((node) => node.id === edge.target)?.label; return from && to ? <span key={`${edge.source}-${edge.target}-${index}`} className="rounded-lg bg-white/[0.04] px-3 py-2 text-xs text-white/60">{from} <span className="px-1 text-blue-300">→</span> {to}</span> : null; })}</div></div>}
                    </div> : <div className="rounded-xl border border-white/[0.06] bg-[#080a0f] p-5 text-sm text-white/45">{learningPath.message || learningPath.error || "No topics could be mapped yet. Add a syllabus or notes for this subject, then try again."}</div>
                  )}
                  <div className="border-t border-white/[0.06] pt-6"><p className="text-sm font-semibold text-white">Four-step progression</p><div className="mt-4 flex gap-3"><input value={progressionTopic} onChange={(e) => setProgressionTopic(e.target.value)} placeholder="Topic to practise" className="min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-[#080a0f] px-3 py-2 text-sm text-white"/><button onClick={handleProgression} disabled={progressing || !progressionTopic.trim()} className="rounded-lg border border-white/[0.1] px-4 py-2 text-xs text-white disabled:opacity-30">{progressing ? "Generating..." : "Generate"}</button></div>{progression && <div className="mt-4 rounded-xl bg-[#080a0f] p-5"><FormattedAnswer text={progression.progression}/></div>}</div>
                </div>
              )}
              {activeTab === "questionbank" && (
                <div className="p-6">
                  <h3 className="text-sm font-semibold text-white">Question Bank Generator</h3>
                  <p className="mt-1 text-xs text-white/30">
                    Generate practice questions with AI-powered difficulty levels
                  </p>

                  <div className="mt-6 space-y-4">
                    <div>
                      <label className="mb-2 block text-xs font-medium text-white/60">Topic</label>
                      <input
                        type="text"
                        value={qbTopic}
                        onChange={(e) => setQbTopic(e.target.value)}
                        placeholder="e.g., probability distributions, quantum mechanics"
                        className="w-full rounded-lg border border-white/[0.08] bg-[#080a0f] px-4 py-3 text-sm text-white placeholder-white/20"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-xs font-medium text-white/60">Question Type</label>
                        <select
                          value={qbType}
                          onChange={(e) => setQbType(e.target.value)}
                          className="w-full rounded-lg border border-white/[0.08] bg-[#080a0f] px-4 py-3 text-sm text-white"
                        >
                          <option value="mcq">Multiple Choice (MCQ)</option>
                          <option value="descriptive">Descriptive/Theory</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-medium text-white/60">Difficulty Level</label>
                        <select
                          value={qbDifficulty}
                          onChange={(e) => setQbDifficulty(e.target.value)}
                          className="w-full rounded-lg border border-white/[0.08] bg-[#080a0f] px-4 py-3 text-sm text-white"
                        >
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                        </select>
                      </div>
                    </div>

                    <button
                      onClick={handleGenerateQuestions}
                      disabled={qbGenerating || !qbTopic.trim()}
                      className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-30"
                    >
                      {qbGenerating ? "Generating questions..." : "Generate Questions"}
                    </button>

                    {qbQuestions && qbQuestions.questions && qbQuestions.questions.length > 0 && (
                      <div className="mt-8 border-t border-white/[0.06] pt-6">
                        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/30">
                          {qbType === "mcq" ? "Multiple Choice Questions" : "Descriptive Questions"}
                        </p>

                        <div className="space-y-6">
                          {qbQuestions.questions.map((q, idx) => (
                            <div key={idx} className="rounded-xl border border-white/[0.06] bg-[#080a0f] p-5">
                              <div className="mb-4">
                                <span className="text-xs font-semibold text-blue-400">Q{idx + 1}</span>
                                <p className="mt-2 text-sm font-medium text-white">{q.question}</p>
                              </div>

                              {qbType === "mcq" && q.options && (
                                <div className="space-y-2">
                                  {q.options.map((option, optIdx) => {
                                    const label = String.fromCharCode(65 + optIdx); // A, B, C, D
                                    const isCorrect = q.correct_answer === label;
                                    return (
                                      <div
                                        key={optIdx}
                                        className={`rounded-lg border px-4 py-2.5 text-sm ${
                                          isCorrect
                                            ? "border-green-500/30 bg-green-500/10 text-green-200"
                                            : "border-white/[0.06] bg-[#0c0f15] text-white/70"
                                        }`}
                                      >
                                        <span className="font-semibold">{label}.</span> {option}
                                        {isCorrect && <span className="ml-2 text-xs">? Correct</span>}
                                      </div>
                                    );
                                  })}

                                  {q.explanation && (
                                    <div className="mt-4 rounded-lg border border-blue-400/20 bg-blue-400/5 p-4">
                                      <p className="text-xs font-semibold text-blue-300">Explanation:</p>
                                      <p className="mt-2 text-sm text-white/70">{q.explanation}</p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {qbType === "descriptive" && (
                                <div className="space-y-4">
                                  {q.expected_answer && (
                                    <div>
                                      <p className="text-xs font-semibold text-white/50">Expected Answer:</p>
                                      <p className="mt-2 text-sm text-white/80">{q.expected_answer}</p>
                                    </div>
                                  )}

                                  {q.key_points && q.key_points.length > 0 && (
                                    <div>
                                      <p className="text-xs font-semibold text-white/50">Key Points to Cover:</p>
                                      <ul className="mt-2 space-y-1">
                                        {q.key_points.map((point, pointIdx) => (
                                          <li key={pointIdx} className="flex gap-2 text-sm text-white/70">
                                            <span className="text-blue-400">?</span>
                                            <span>{point}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {q.difficulty_note && (
                                    <div className="rounded-lg border border-purple-400/20 bg-purple-400/5 p-3">
                                      <p className="text-xs text-purple-200">{q.difficulty_note}</p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {q.difficulty && (
                                <div className="mt-4 flex items-center gap-2">
                                  <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/50">
                                    Difficulty: {q.difficulty}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {qbQuestions.sources && qbQuestions.sources.length > 0 && (
                          <p className="mt-6 text-xs text-white/30">
                            Sources: {qbQuestions.sources.join(" ? ")}
                          </p>
                        )}
                      </div>
                    )}

                    {qbQuestions && qbQuestions.error && (
                      <div className="mt-6 rounded-lg border border-red-400/20 bg-red-400/10 p-4">
                        <p className="text-sm text-red-200">{qbQuestions.error}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {activeTab === "connect" && (
                <div className="p-6"><h3 className="text-sm font-semibold text-white">Cross-subject connections</h3><p className="mt-1 text-xs text-white/30">Compare a concept across at least two of your subjects using your own uploaded materials.</p><input value={correlationTopic} onChange={(e) => setCorrelationTopic(e.target.value)} placeholder="e.g., probability, normalization, optimization" className="mt-5 w-full rounded-lg border border-white/[0.08] bg-[#080a0f] px-4 py-3 text-sm text-white"/><div className="mt-4 grid gap-2 sm:grid-cols-2">{subjects.map((subject) => <label key={subject.id} className="flex items-center gap-3 rounded-lg border border-white/[0.06] p-3 text-sm text-white/70"><input type="checkbox" checked={comparisonIds.includes(subject.id)} onChange={() => setComparisonIds((current) => current.includes(subject.id) ? current.filter((id) => id !== subject.id) : [...current, subject.id])}/>{subject.name}</label>)}</div><button onClick={handleCorrelation} disabled={correlating || comparisonIds.length < 2 || !correlationTopic.trim()} className="mt-5 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-30">{correlating ? "Comparing..." : "Compare subjects"}</button>{correlation && <div className="mt-6 rounded-xl bg-[#080a0f] p-5"><FormattedAnswer text={correlation.correlation}/>{correlation.sources?.length > 0 && <p className="mt-4 text-xs text-white/30">Sources: {correlation.sources.join(" • ")}</p>}</div>}</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function FormattedAnswer({ text }) {
  if (!text) {
    return <p className="text-sm text-white/40">No answer was returned.</p>;
  }

  return (
    <div className="prose prose-invert max-w-none text-sm leading-7">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="mb-4 mt-2 text-2xl font-bold text-white">{children}</h1>,
          h2: ({ children }) => <h2 className="mb-3 mt-7 text-xl font-semibold text-white">{children}</h2>,
          h3: ({ children }) => <h3 className="mb-2 mt-5 text-lg font-semibold text-white">{children}</h3>,
          p: ({ children }) => <p className="mb-4 leading-7 text-white/65">{children}</p>,
          ul: ({ children }) => <ul className="mb-4 ml-6 list-disc space-y-2 text-white/65">{children}</ul>,
          ol: ({ children }) => <ol className="mb-4 ml-6 list-decimal space-y-2 text-white/65">{children}</ol>,
          li: ({ children }) => <li className="pl-1">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
          code: ({ children }) => (
            <code className="rounded-md bg-white/[0.07] px-1.5 py-0.5 text-[13px] text-blue-200">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="my-5 overflow-x-auto rounded-xl border border-white/[0.06] bg-[#05070a] p-4 text-[13px] leading-6">
              {children}
            </pre>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
