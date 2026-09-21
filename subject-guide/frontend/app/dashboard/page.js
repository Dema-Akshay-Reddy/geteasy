"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function DashboardPage() {
  const { getAuthHeaders, user } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSubjects: 0,
    totalDocuments: 0,
    queriesAsked: 0,
  });

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
        setStats((prev) => ({
          ...prev,
          totalSubjects: data.length,
        }));
      }
    } catch (error) {
      console.error("Failed to load subjects:", error);
    } finally {
      setLoading(false);
    }
  };

  function subjectIcon(name) {
    const value = name.toLowerCase();
    if (value.includes("operating")) return "⌘";
    if (value.includes("database")) return "◈";
    if (value.includes("machine")) return "✦";
    if (value.includes("network")) return "◎";
    if (value.includes("data structure")) return "◇";
    if (value.includes("artificial")) return "◉";
    if (value.includes("computer")) return "▣";
    if (value.includes("mathemat")) return "∑";
    return "◆";
  }

  return (
    <div>
      {/* Header */}
      <header className="border-b border-white/[0.06] bg-[#07090d]">
        <div className="px-8 py-6">
          <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-white/40">
            Welcome back, {user?.full_name || user?.email}
          </p>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-8">
        {/* Stats */}
        <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/[0.07] bg-[#0c0f15] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/40">Total Subjects</p>
                <p className="mt-2 text-3xl font-semibold text-white">{stats.totalSubjects}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-400/10 text-xl text-blue-300">
                📚
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-[#0c0f15] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/40">Documents</p>
                <p className="mt-2 text-3xl font-semibold text-white">{stats.totalDocuments}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-400/10 text-xl text-emerald-300">
                📄
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-[#0c0f15] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/40">Queries Asked</p>
                <p className="mt-2 text-3xl font-semibold text-white">{stats.queriesAsked}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-400/10 text-xl text-purple-300">
                💡
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-[#0c0f15] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/40">Mastery Score</p>
                <p className="mt-2 text-3xl font-semibold text-white">0%</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400/10 text-xl text-amber-300">
                ⭐
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-white">Quick Actions</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/dashboard/materials"
              className="group rounded-2xl border border-white/[0.07] bg-[#0c0f15] p-6 transition hover:border-white/[0.12] hover:bg-[#0f1219]"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-400/10 text-xl text-blue-300">
                    📁
                  </div>
                  <h3 className="text-base font-semibold text-white">Upload Materials</h3>
                  <p className="mt-1 text-sm text-white/40">
                    Add textbooks, notes, and practice papers
                  </p>
                </div>
                <span className="text-white/15 transition group-hover:translate-x-1 group-hover:text-white/60">
                  →
                </span>
              </div>
            </Link>

            <Link
              href="/dashboard/study"
              className="group rounded-2xl border border-white/[0.07] bg-[#0c0f15] p-6 transition hover:border-white/[0.12] hover:bg-[#0f1219]"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-400/10 text-xl text-emerald-300">
                    💡
                  </div>
                  <h3 className="text-base font-semibold text-white">Study Space</h3>
                  <p className="mt-1 text-sm text-white/40">
                    Ask questions and explore topics
                  </p>
                </div>
                <span className="text-white/15 transition group-hover:translate-x-1 group-hover:text-white/60">
                  →
                </span>
              </div>
            </Link>

            <Link
              href="/dashboard/analytics"
              className="group rounded-2xl border border-white/[0.07] bg-[#0c0f15] p-6 transition hover:border-white/[0.12] hover:bg-[#0f1219]"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-400/10 text-xl text-purple-300">
                    📊
                  </div>
                  <h3 className="text-base font-semibold text-white">View Analytics</h3>
                  <p className="mt-1 text-sm text-white/40">
                    Track your learning progress
                  </p>
                </div>
                <span className="text-white/15 transition group-hover:translate-x-1 group-hover:text-white/60">
                  →
                </span>
              </div>
            </Link>
          </div>
        </div>

        {/* Your Subjects */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Your Subjects</h2>
            <Link
              href="/dashboard/materials"
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              View all →
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-400/20 border-t-blue-400"></div>
            </div>
          ) : subjects.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.07] bg-[#0c0f15] p-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.025] text-2xl text-white/30">
                📚
              </div>
              <h3 className="text-base font-semibold text-white">No subjects yet</h3>
              <p className="mt-2 text-sm text-white/40">
                Upload your first document to get started
              </p>
              <Link
                href="/dashboard/materials"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
              >
                Upload Materials →
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {subjects.slice(0, 8).map((subject) => (
                <Link
                  key={subject.id}
                  href={`/dashboard/study?subject=${subject.id}`}
                  className="group rounded-2xl border border-white/[0.07] bg-[#0c0f15] p-6 transition hover:border-white/[0.12] hover:bg-[#0f1219]"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.04] text-xl text-white/60">
                      {subjectIcon(subject.name)}
                    </div>
                    <span className="text-white/15 transition group-hover:translate-x-1 group-hover:text-white/60">
                      →
                    </span>
                  </div>
                  <h3 className="mt-4 truncate text-sm font-semibold text-white">
                    {subject.name}
                  </h3>
                  <p className="mt-1 text-xs text-white/25">Click to study</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
