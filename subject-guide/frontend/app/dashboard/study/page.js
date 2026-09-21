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
  const [graph, setGraph] = useState(null);
  const [progressionTopic, setProgressionTopic] = useState("");
  const [progression, setProgression] = useState(null);
  const [progressing, setProgressing] = useState(false);
  const [correlationTopic, setCorrelationTopic] = useState("");
  const [comparisonIds, setComparisonIds] = useState([]);
  const [correlation, setCorrelation] = useState(null);
  const [correlating, setCorrelating] = useState(false);

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
    try {
      const [pathData, graphData] = await Promise.all([
        requestJson(`${API_BASE}/subjects/${activeSubject.id}/learning-path`, { method: "POST", body: JSON.stringify({ target: pathTarget }) }),
        requestJson(`${API_BASE}/subjects/${activeSubject.id}/graph`),
      ]);
      setLearningPath(pathData);
      setGraph(graphData);
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
                  <div><h3 className="text-sm font-semibold text-white">Learning Path & Knowledge Map</h3><p className="mt-1 text-xs text-white/30">Turn your uploaded course material into an ordered study plan.</p>
                    <div className="mt-5 flex flex-wrap gap-3"><select value={pathTarget} onChange={(e) => setPathTarget(e.target.value)} className="rounded-lg border border-white/[0.08] bg-[#080a0f] px-3 py-2 text-sm text-white"><option value="exam">Exam preparation</option><option value="comprehensive">Comprehensive study</option><option value="quick_review">Quick review</option></select><button onClick={loadLearningMap} disabled={pathLoading} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-30">{pathLoading ? "Building..." : "Build learning map"}</button></div>
                  </div>
                  {learningPath?.path?.length > 0 && <div><p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/30">Recommended sequence</p><div className="space-y-2">{learningPath.path.map((item) => <div key={item.order} className="flex gap-4 rounded-xl border border-white/[0.06] bg-[#080a0f] p-4"><span className="text-blue-300">{item.order}</span><div><p className="text-sm text-white">{item.topic}</p><p className="mt-1 text-xs text-white/30">Estimated {item.estimated_hours} hours</p></div></div>)}</div></div>}
                  {graph?.nodes?.length > 0 && <div><p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/30">Topic relationships</p><div className="flex flex-wrap gap-2">{graph.nodes.map((node) => <span key={node.id} className="rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1.5 text-xs text-blue-200">{node.label}</span>)}</div></div>}
                  <div className="border-t border-white/[0.06] pt-6"><p className="text-sm font-semibold text-white">Four-step progression</p><div className="mt-4 flex gap-3"><input value={progressionTopic} onChange={(e) => setProgressionTopic(e.target.value)} placeholder="Topic to practise" className="min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-[#080a0f] px-3 py-2 text-sm text-white"/><button onClick={handleProgression} disabled={progressing || !progressionTopic.trim()} className="rounded-lg border border-white/[0.1] px-4 py-2 text-xs text-white disabled:opacity-30">{progressing ? "Generating..." : "Generate"}</button></div>{progression && <div className="mt-4 rounded-xl bg-[#080a0f] p-5"><FormattedAnswer text={progression.progression}/></div>}</div>
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
