"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function AnalyticsPage() {
  const { getAuthHeaders } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      const response = await fetch(`${API_BASE}/subjects/me`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setSubjects(data);
        if (data.length > 0) {
          setSelectedSubject(data[0]);
          loadAnalytics(data[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to load subjects:", error);
    }
  };

  const loadAnalytics = async (subjectId) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/analytics/${subjectId}`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error("Failed to load analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectChange = (subjectId) => {
    const subject = subjects.find((s) => s.id === subjectId);
    setSelectedSubject(subject);
    loadAnalytics(subjectId);
  };

  return (
    <div>
      {/* Header */}
      <header className="border-b border-white/[0.06] bg-[#07090d]">
        <div className="px-8 py-6">
          <h1 className="text-2xl font-semibold text-white">Analytics</h1>
          <p className="mt-1 text-sm text-white/40">
            Track your learning progress and mastery
          </p>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-8">
        {subjects.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.07] bg-[#0c0f15] p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.025] text-2xl text-white/30">
              📊
            </div>
            <h3 className="text-base font-semibold text-white">No data yet</h3>
            <p className="mt-2 text-sm text-white/40">
              Start studying to see your analytics
            </p>
          </div>
        ) : (
          <>
            {/* Subject Selector */}
            <div className="mb-6">
              <label className="block text-xs font-medium text-white/60">Select Subject</label>
              <select
                value={selectedSubject?.id || ""}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className="mt-2 w-full max-w-xs rounded-lg border border-white/[0.08] bg-[#080a0f] px-4 py-2.5 text-sm text-white outline-none focus:border-blue-400/30"
              >
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-400/20 border-t-blue-400"></div>
              </div>
            ) : analytics ? (
              <>
                {/* Overview Stats */}
                <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-2xl border border-white/[0.07] bg-[#0c0f15] p-6">
                    <p className="text-sm text-white/40">Overall Mastery</p>
                    <p className="mt-2 text-3xl font-semibold text-white">
                      {analytics.overall_mastery || 0}%
                    </p>
                    <p className="mt-2 text-xs text-white/25">
                      Track your progress over time
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/[0.07] bg-[#0c0f15] p-6">
                    <p className="text-sm text-white/40">Mastered Topics</p>
                    <p className="mt-2 text-3xl font-semibold text-white">
                      {analytics.mastered_topics} / {analytics.total_topics}
                    </p>
                    <p className="mt-2 text-xs text-white/25">
                      Topics you've completed
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/[0.07] bg-[#0c0f15] p-6">
                    <p className="text-sm text-white/40">Questions Attempted</p>
                    <p className="mt-2 text-3xl font-semibold text-white">
                      {analytics.question_attempts?.total || 0}
                    </p>
                    <p className="mt-2 text-xs text-white/25">
                      Practice makes perfect
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/[0.07] bg-[#0c0f15] p-6">
                    <p className="text-sm text-white/40">Mastery Score</p>
                    <p className="mt-2 text-3xl font-semibold text-white">
                      {Math.round(analytics.overall_mastery || 0)}
                    </p>
                    <p className="mt-2 text-xs text-white/25">
                      Out of 100 points
                    </p>
                  </div>
                </div>

                {/* Weak Areas */}
                {analytics.weak_areas && analytics.weak_areas.length > 0 && (
                  <div className="mb-8">
                    <h2 className="mb-4 text-base font-semibold text-white">
                      Areas Need Focus
                    </h2>
                    <div className="space-y-3">
                      {analytics.weak_areas.map((area, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between rounded-xl border border-red-400/10 bg-red-400/[0.04] p-4"
                        >
                          <div>
                            <p className="text-sm font-medium text-white/70">{area.topic}</p>
                            <p className="mt-1 text-xs text-white/30">
                              {area.attempts} attempts
                            </p>
                          </div>
                          <span className="rounded-lg bg-red-400/10 px-3 py-1.5 text-xs font-medium text-red-300">
                            {area.accuracy}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {analytics.recommendations && analytics.recommendations.length > 0 && (
                  <div className="mb-8">
                    <h2 className="mb-4 text-base font-semibold text-white">
                      Recommendations
                    </h2>
                    <div className="space-y-3">
                      {analytics.recommendations.map((rec, index) => (
                        <div
                          key={index}
                          className="rounded-xl border border-white/[0.07] bg-[#0c0f15] p-4"
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                                rec.priority === "high"
                                  ? "bg-red-400/10 text-red-300"
                                  : rec.priority === "medium"
                                  ? "bg-amber-400/10 text-amber-300"
                                  : "bg-blue-400/10 text-blue-300"
                              }`}
                            >
                              {rec.priority === "high" ? "!" : rec.priority === "medium" ? "⚠" : "💡"}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-white/70">{rec.message}</p>
                              <p className="mt-1 text-xs capitalize text-white/30">
                                {rec.priority} priority
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {analytics.total_topics === 0 && (
                  <div className="rounded-2xl border border-white/[0.07] bg-[#0c0f15] p-12 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.025] text-2xl text-white/30">
                      📈
                    </div>
                    <h3 className="text-base font-semibold text-white">
                      Start learning to see analytics
                    </h3>
                    <p className="mt-2 text-sm text-white/40">
                      Use the Study Space to practice topics and solve questions
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-2xl border border-white/[0.07] bg-[#0c0f15] p-12 text-center">
                <p className="text-sm text-white/40">No analytics data available</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
