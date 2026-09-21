"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function MaterialsPage() {
  const { getAuthHeaders } = useAuth();
  const { showToast } = useToast();
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [results, setResults] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [documentsBySubject, setDocumentsBySubject] = useState({});

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
        const documentEntries = await Promise.all(data.map(async (subject) => {
          const docsResponse = await fetch(`${API_BASE}/documents/subject/${subject.id}`, { headers: getAuthHeaders() });
          return [subject.id, docsResponse.ok ? await docsResponse.json() : []];
        }));
        setDocumentsBySubject(Object.fromEntries(documentEntries));
      }
    } catch (error) {
      console.error("Failed to load subjects:", error);
    }
  };

  function addFiles(newFiles) {
    const incoming = Array.from(newFiles);
    if (!incoming.length) return;

    setFiles((current) => {
      const existingKeys = new Set(
        current.map((file) => `${file.name}-${file.size}-${file.lastModified}`)
      );
      const unique = incoming.filter(
        (file) => !existingKeys.has(`${file.name}-${file.size}-${file.lastModified}`)
      );
      return [...current, ...unique];
    });
  }

  function handleFileChange(event) {
    addFiles(event.target.files);
    event.target.value = "";
  }

  function handleFolderChange(event) {
    addFiles(event.target.files);
    event.target.value = "";
  }

  function handleDragOver(event) {
    event.preventDefault();
    setDragging(true);
  }

  function handleDragLeave(event) {
    event.preventDefault();
    setDragging(false);
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    addFiles(event.dataTransfer.files);
  }

  function removeFile(index) {
    setFiles((current) => current.filter((_, i) => i !== index));
  }

  function clearFiles() {
    if (uploading) return;
    setFiles([]);
    setResults([]);
    setUploadProgress({});
  }

  async function handleUploadAll() {
    if (!files.length || uploading) return;

    setUploading(true);
    setResults([]);
    setUploadProgress({});

    const successfulResults = [];
    const failedResults = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      setUploadProgress((prev) => ({
        ...prev,
        [file.name]: { status: "uploading", progress: 0 },
      }));

      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await fetch(`${API_BASE}/documents/upload`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: formData,
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          const detail = data.detail;
          const message = typeof detail === "string" ? detail : "Upload failed";
          throw new Error(message);
        }

        successfulResults.push({ ...data, status: "success", filename: file.name });
        
        setUploadProgress((prev) => ({
          ...prev,
          [file.name]: { status: "success", progress: 100 },
        }));

        showToast(`${file.name} uploaded successfully`, "success");
      } catch (err) {
        failedResults.push({
          filename: file.name,
          status: "error",
          error: err.message,
        });
        
        setUploadProgress((prev) => ({
          ...prev,
          [file.name]: { status: "error", progress: 0 },
        }));

        showToast(`Failed to upload ${file.name}: ${err.message}`, "error");
      }

      setResults([...successfulResults, ...failedResults]);
    }

    setUploading(false);
    setFiles([]);
    
    // Reload subjects after upload
    loadSubjects();
    
    if (successfulResults.length > 0) {
      showToast(`Successfully uploaded ${successfulResults.length} file(s)`, "success");
    }
  }

  function formatSize(bytes) {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  function fileIcon(filename) {
    const ext = filename.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return "📕";
    if (ext === "doc" || ext === "docx") return "📘";
    if (ext === "ppt" || ext === "pptx") return "📙";
    if (ext === "txt") return "📄";
    return "📁";
  }

  function getContentTypeBadge(type) {
    const badges = {
      textbook: { label: "Textbook", color: "blue" },
      lecture_notes: { label: "Lecture Notes", color: "emerald" },
      question_paper: { label: "Question Paper", color: "purple" },
      lab_manual: { label: "Lab Manual", color: "amber" },
      syllabus: { label: "Syllabus", color: "pink" },
    };

    const badge = badges[type] || { label: type, color: "gray" };
    
    const colorClasses = {
      blue: "bg-blue-400/10 text-blue-300",
      emerald: "bg-emerald-400/10 text-emerald-300",
      purple: "bg-purple-400/10 text-purple-300",
      amber: "bg-amber-400/10 text-amber-300",
      pink: "bg-pink-400/10 text-pink-300",
      gray: "bg-white/[0.05] text-white/40",
    };

    return (
      <span className={`rounded-lg px-2.5 py-1 text-xs font-medium ${colorClasses[badge.color]}`}>
        {badge.label}
      </span>
    );
  }

  return (
    <div>
      {/* Header */}
      <header className="border-b border-white/[0.06] bg-[#07090d]">
        <div className="px-8 py-6">
          <h1 className="text-2xl font-semibold text-white">Materials</h1>
          <p className="mt-1 text-sm text-white/40">
            Upload and manage your study materials
          </p>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-8">
        {/* Upload Area */}
        <div className="mb-8 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0c0f15]">
          <div className="border-b border-white/[0.06] px-6 py-5">
            <h2 className="text-sm font-semibold text-white">Upload Documents</h2>
            <p className="mt-1 text-xs text-white/30">
              Supported: PDF, DOCX, PPTX, TXT
            </p>
          </div>

          <div className="p-6">
            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`rounded-xl border-2 border-dashed p-12 transition ${
                dragging
                  ? "border-blue-400 bg-blue-400/[0.05]"
                  : "border-white/[0.08] bg-[#080a0f]"
              }`}
            >
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.035] text-3xl text-white/50">
                  ↑
                </div>

                <h3 className="mt-5 text-sm font-medium text-white">
                  Drop your files or folder here
                </h3>
                <p className="mt-2 text-xs text-white/25">
                  or choose from your computer
                </p>

                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <label
                    htmlFor="file-picker"
                    className="cursor-pointer rounded-lg bg-white px-4 py-2.5 text-xs font-semibold text-black transition hover:bg-white/90"
                  >
                    Choose Files
                  </label>

                  <label
                    htmlFor="folder-picker"
                    className="cursor-pointer rounded-lg border border-white/[0.1] bg-white/[0.03] px-4 py-2.5 text-xs font-medium text-white/70 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    📁 Choose Folder
                  </label>
                </div>

                <input
                  id="file-picker"
                  type="file"
                  multiple
                  accept=".pdf,.docx,.pptx,.txt"
                  className="hidden"
                  onChange={handleFileChange}
                />

                <input
                  id="folder-picker"
                  type="file"
                  webkitdirectory=""
                  directory=""
                  multiple
                  className="hidden"
                  onChange={handleFolderChange}
                />
              </div>
            </div>

            {/* File Queue */}
            {files.length > 0 && (
              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-white">
                      {files.length} {files.length === 1 ? "file" : "files"} selected
                    </p>
                  </div>
                  {!uploading && (
                    <button
                      onClick={clearFiles}
                      className="text-xs text-white/25 transition hover:text-white/60"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {files.map((file, index) => {
                    const progress = uploadProgress[file.name];
                    return (
                      <div
                        key={`${file.name}-${file.lastModified}-${index}`}
                        className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-xl">
                          {fileIcon(file.name)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-white/70">
                            {file.name}
                          </p>
                          <p className="mt-0.5 text-[10px] text-white/25">
                            {formatSize(file.size)}
                          </p>
                          
                          {progress && (
                            <div className="mt-2">
                              {progress.status === "uploading" && (
                                <div className="flex items-center gap-2">
                                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                                    <div className="h-full w-1/2 animate-pulse rounded-full bg-blue-400"></div>
                                  </div>
                                  <span className="text-[10px] text-blue-300">Uploading...</span>
                                </div>
                              )}
                              {progress.status === "success" && (
                                <span className="text-[10px] text-emerald-300">✓ Uploaded</span>
                              )}
                              {progress.status === "error" && (
                                <span className="text-[10px] text-red-300">✗ Failed</span>
                              )}
                            </div>
                          )}
                        </div>

                        {!uploading && (
                          <button
                            onClick={() => removeFile(index)}
                            className="flex h-8 w-8 items-center justify-center rounded-md text-white/20 transition hover:bg-white/[0.05] hover:text-white"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={handleUploadAll}
                  disabled={uploading}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      Upload {files.length} {files.length === 1 ? "file" : "files"} →
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Upload Results */}
        {results.length > 0 && (
          <div className="mb-8 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0c0f15]">
            <div className="border-b border-white/[0.06] px-6 py-5">
              <p className="text-sm font-semibold text-white">Upload Results</p>
              <p className="mt-1 text-xs text-white/25">
                {results.filter((r) => r.status === "success").length} successful,{" "}
                {results.filter((r) => r.status === "error").length} failed
              </p>
            </div>

            <div className="divide-y divide-white/[0.05]">
              {results.map((result, index) => (
                <div key={index} className="flex items-center gap-4 px-6 py-4">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                      result.status === "success"
                        ? "bg-emerald-400/10 text-emerald-300"
                        : "bg-red-400/10 text-red-300"
                    }`}
                  >
                    {result.status === "success" ? "✓" : "✗"}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-white/70">
                      {result.filename}
                    </p>
                    {result.status === "success" ? (
                      <div className="mt-1 flex items-center gap-2">
                        <p className="text-[11px] text-white/30">
                          {result.subject_name}
                        </p>
                        {getContentTypeBadge(result.content_type)}
                      </div>
                    ) : (
                      <p className="mt-1 text-[11px] text-red-300/60">{result.error}</p>
                    )}
                  </div>

                  {result.status === "success" && (
                    <span className="hidden rounded-lg bg-white/[0.04] px-3 py-1.5 text-[10px] text-white/30 sm:block">
                      {result.chunks_created} chunks
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Your Subjects & Documents */}
        {subjects.length > 0 && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Your Subjects</h2>
              <span className="text-xs text-white/25">
                {subjects.length} {subjects.length === 1 ? "subject" : "subjects"}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {subjects.map((subject) => (
                <div
                  key={subject.id}
                  className="rounded-2xl border border-white/[0.07] bg-[#0c0f15] p-5"
                >
                  <h3 className="text-sm font-semibold text-white">{subject.name}</h3>
                  <p className="mt-1 text-xs text-white/25">
                    {(documentsBySubject[subject.id] || []).length} uploaded document{(documentsBySubject[subject.id] || []).length === 1 ? "" : "s"}
                  </p>
                  {(documentsBySubject[subject.id] || []).length > 0 && (
                    <ul className="mt-4 space-y-2 border-t border-white/[0.06] pt-3">
                      {documentsBySubject[subject.id].map((document) => (
                        <li key={document.id} className="flex items-center justify-between gap-3 text-xs text-white/45">
                          <span className="truncate">{fileIcon(document.filename)} {document.filename}</span>
                          <span className="shrink-0 text-white/25">{document.chunk_count} chunks</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
