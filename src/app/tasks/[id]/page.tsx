"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StudentHeader from "@/components/student/StudentHeader";
import TaskCountdown from "@/components/student/TaskCountdown";
import {
  RiArrowLeftLine,
  RiFileListLine,
  RiExternalLinkLine,
  RiGithubLine,
  RiAlertLine,
  RiCheckDoubleLine,
  RiCheckLine,
  RiShieldCheckLine,
} from "react-icons/ri";

interface TaskReport {
  id: string;
  title: string;
  description: string;
  githubRepoUrl: string;
  submittedAt: string;
  status: string;
}

interface StudentTaskDetailData {
  id: string; // studentTaskId
  taskId: string;
  title: string;
  description: string;
  referenceLink?: string | null;
  module: {
    id: string;
    name: string;
    orderIndex: number;
  };
  assignedAt: string;
  dueAt: string;
  status: "ASSIGNED" | "SUBMITTED" | "REVIEWED" | "OVERDUE";
  report?: TaskReport | null;
}

export default function StudentTaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [task, setTask] = useState<StudentTaskDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [githubRepoUrl, setGithubRepoUrl] = useState("");
  const [aiDeclarationAccepted, setAiDeclarationAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const fetchTask = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/student/tasks/${resolvedParams.id}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Failed to load task details.");
        return;
      }
      setTask(json.studentTask);
      if (json.studentTask.title) {
        setTitle(`Weekly Milestone: ${json.studentTask.title}`);
      }
    } catch {
      setError("Network connection error. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.id]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiDeclarationAccepted) {
      setFormError("You must accept the academic honesty and AI-disqualification declaration.");
      return;
    }

    if (!task) return;

    setFormError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/student/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentTaskId: task.id,
          title: title.trim(),
          description: description.trim(),
          githubRepoUrl: githubRepoUrl.trim(),
          aiDeclarationAccepted: true,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setFormError(json.error || "Failed to submit report. Please check the form fields.");
        setSubmitting(false);
        return;
      }

      setSubmittedSuccess(true);
      fetchTask();
    } catch {
      setFormError("Network communication error while submitting report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-between">
      <StudentHeader />

      <main className="max-w-4xl mx-auto px-6 py-10 flex-1 w-full">
        {/* Back navigation */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-xs font-semibold text-secondary hover:text-primary transition-colors"
          >
            <RiArrowLeftLine />
            Back to Dashboard
          </Link>
        </div>

        {loading ? (
          <div className="p-16 text-center text-muted text-sm">Loading task requirements...</div>
        ) : error || !task ? (
          <div className="card-ace p-8 text-center text-red-700 text-sm">
            {error || "Task not found."}
          </div>
        ) : (
          <>
            {/* Task Specification Card */}
            <div className="card-ace p-6 sm:p-8 mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary text-white flex items-center justify-center text-xl shrink-0">
                    <RiFileListLine />
                  </div>
                  <div>
                    <span className="badge-ace badge-info text-xs">
                      WEEK {task.module.orderIndex} · {task.module.name}
                    </span>
                    <h1 className="font-serif text-2xl sm:text-3xl font-bold text-primary mt-1">
                      {task.title}
                    </h1>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <TaskCountdown dueAt={task.dueAt} status={task.status} />
                </div>
              </div>

              <div className="text-secondary text-sm sm:text-base leading-relaxed my-6 bg-surface p-4 rounded-lg border border-outline-variant">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">
                  Task Specification & Objectives
                </h4>
                <p className="whitespace-pre-line">{task.description}</p>
              </div>

              {task.referenceLink && (
                <div className="pt-4 border-t border-outline-variant flex items-center gap-2 text-xs">
                  <span className="text-muted font-medium">Documentation & Resources:</span>
                  <a
                    href={task.referenceLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-accent font-semibold hover:underline"
                  >
                    <RiExternalLinkLine />
                    {task.referenceLink}
                  </a>
                </div>
              )}
            </div>

            {/* Submission Section */}
            {task.report ? (
              /* Already Submitted View */
              <div className="card-ace p-6 sm:p-8 bg-white border-green-200">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-outline-variant">
                  <div className="w-10 h-10 rounded-lg bg-green-50 text-green-700 flex items-center justify-center text-xl">
                    <RiCheckDoubleLine />
                  </div>
                  <div>
                    <span className="badge-ace badge-success text-xs">REPORT SUBMITTED</span>
                    <h2 className="font-serif text-2xl font-bold text-primary mt-0.5">
                      {task.report.title}
                    </h2>
                  </div>
                </div>

                <div className="space-y-4 text-sm text-secondary mb-6">
                  <div>
                    <span className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
                      GitHub Repository
                    </span>
                    <a
                      href={task.report.githubRepoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-primary font-semibold hover:text-accent hover:underline"
                    >
                      <RiGithubLine className="text-base" />
                      {task.report.githubRepoUrl}
                      <RiExternalLinkLine className="text-xs" />
                    </a>
                  </div>

                  <div>
                    <span className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
                      Learnings & Engineering Synthesis
                    </span>
                    <div className="bg-surface p-4 rounded-lg border border-outline-variant text-primary text-sm whitespace-pre-line leading-relaxed">
                      {task.report.description}
                    </div>
                  </div>

                  <div className="text-xs text-muted">
                    Submitted on: {new Date(task.report.submittedAt).toLocaleString()}
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-primary-soft text-primary text-xs leading-relaxed flex items-center gap-2">
                  <RiShieldCheckLine className="text-accent text-lg shrink-0" />
                  <span>
                    Your report and GitHub repository have been received and locked for academic evaluation.
                    Feedback and evaluation scores are retained confidentially by faculty mentors.
                  </span>
                </div>
              </div>
            ) : (
              /* Report Submission Form */
              <div className="card-ace p-6 sm:p-8">
                <div className="mb-6">
                  <h2 className="font-serif text-2xl font-bold text-primary">
                    Submit Weekly Report
                  </h2>
                  <p className="text-secondary text-xs sm:text-sm mt-1">
                    Provide a thorough report of your implementation, architecture decisions, and code repository.
                  </p>
                </div>

                {submittedSuccess && (
                  <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm">
                    Report successfully submitted!
                  </div>
                )}

                {formError && (
                  <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
                    {formError}
                  </div>
                )}

                {/* PROMINENT AI DISQUALIFICATION WARNING BANNER */}
                <div className="mb-8 p-5 rounded-lg bg-gradient-to-r from-red-50 via-amber-50 to-red-50 border-2 border-red-300 text-red-950 shadow-sm">
                  <div className="flex items-center gap-2 text-red-900 font-bold text-sm mb-2 uppercase tracking-wide">
                    <RiAlertLine className="text-xl text-red-700 animate-bounce" />
                    STRICT ACADEMIC INTEGRITY & AI DISQUALIFICATION NOTICE
                  </div>
                  <p className="text-xs sm:text-sm leading-relaxed text-red-900 mb-2">
                    ACE operates under an uncompromising policy regarding originality and technical rigor.
                    All submitted code repositories are subjected to automated AST structural inspection,
                    commit history verification, and deep LLM-generation analysis.
                  </p>
                  <p className="text-xs font-semibold text-red-900">
                    ⚠️ If your codebase or report is identified as AI-generated or copied from unauthorized sources, you will face immediate disqualification from the ACE engineering cohort.
                  </p>
                </div>

                <form onSubmit={handleSubmitReport} className="space-y-6">
                  {/* Title */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-2">
                      Report Title
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Implementation of Concurrent Token Bucket Limiter"
                      className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-md text-sm text-primary placeholder:text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    />
                  </div>

                  {/* GitHub URL */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-primary">
                        GitHub Repository URL
                      </label>
                      <span className="text-xs text-muted">Must be publicly accessible</span>
                    </div>
                    <div className="relative">
                      <RiGithubLine className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-lg" />
                      <input
                        type="url"
                        required
                        value={githubRepoUrl}
                        onChange={(e) => setGithubRepoUrl(e.target.value)}
                        placeholder="https://github.com/your-username/your-repository"
                        className="w-full pl-10 pr-4 py-2.5 bg-surface border border-outline-variant rounded-md text-sm text-primary placeholder:text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                      />
                    </div>
                  </div>

                  {/* Description of Learnings */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-primary">
                        What Did You Learn? (Architectural & Technical Synthesis)
                      </label>
                      <span className="text-xs text-muted">Minimum 20 characters</span>
                    </div>
                    <textarea
                      rows={6}
                      required
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Detail your engineering challenges, concurrency handling, benchmark results, trade-offs evaluated, and lessons learned during implementation..."
                      className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-md text-sm text-primary placeholder:text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all leading-relaxed"
                    />
                  </div>

                  {/* Mandatory Checkbox Declaration */}
                  <div className="p-4 rounded-lg bg-surface border border-outline-variant">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        required
                        checked={aiDeclarationAccepted}
                        onChange={(e) => setAiDeclarationAccepted(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary"
                      />
                      <span className="text-xs sm:text-sm font-semibold text-primary leading-snug">
                        I confirm this report and repository represent my own original engineering work.
                        I understand that if it is found to be AI-generated or plagiarized, I will be immediately disqualified from the cohort.
                      </span>
                    </label>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-4">
                    <Link href="/dashboard" className="btn-secondary text-xs px-5 py-2.5">
                      Cancel
                    </Link>
                    <button
                      type="submit"
                      disabled={submitting || !aiDeclarationAccepted}
                      className="btn-primary text-xs px-6 py-2.5 flex items-center gap-2 shadow-md disabled:opacity-50"
                    >
                      {submitting ? (
                        <span>Submitting Milestone...</span>
                      ) : (
                        <>
                          <RiCheckLine />
                          Submit Weekly Report
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-outline-variant bg-white py-6 text-center text-xs text-muted">
        ACE Forge Academic Verification Engine · Strict Plagiarism & AI Auditing
      </footer>
    </div>
  );
}
