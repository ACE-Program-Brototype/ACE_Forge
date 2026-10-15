"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  RiArrowLeftLine,
  RiArticleLine,
  RiGithubLine,
  RiExternalLinkLine,
  RiRobotLine,
  RiShieldCheckLine,
  RiCheckLine,
  RiTimeLine,
  RiAlertLine,
  RiGitCommitLine,
  RiCodeLine,
  RiFolderLine,
} from "react-icons/ri";

interface FeedbackItem {
  id: string;
  type: "AI" | "EMPLOYEE";
  marks: number;
  comments: string;
  strengths: string[];
  improvements: string[];
  aiModel?: string | null;
  reviewerAdmin?: { id: string; name: string; email: string } | null;
  createdAt: string;
  repoSnapshot?: {
    owner?: string;
    repo?: string;
    isValidRepo?: boolean;
    error?: string;
    metadata?: {
      stars: number;
      forks: number;
      defaultBranch: string;
    };
    languages?: Record<string, number>;
    totalCommitsCount?: number;
    recentCommits?: Array<{
      sha: string;
      author: string;
      date: string;
      message: string;
    }>;
    fileTreeSummary?: string[];
    aiGeneratedLikelihood?: string;
    reasoning?: string;
    taskAlignment?: string;
  } | null;
}

interface ReportDetailData {
  id: string;
  studentTaskId: string;
  title: string;
  description: string;
  githubRepoUrl: string;
  status: "SUBMITTED" | "AI_REVIEWED" | "FINALIZED";
  finalMarks: number | null;
  submittedAt: string;
  student: {
    id: string;
    name: string;
    email: string;
    phone: string;
    batch: { id: string; name: string };
    currentModule: { id: string; name: string; orderIndex: number };
  };
  task: {
    id: string;
    title: string;
    description: string;
    referenceLink?: string | null;
    module: { id: string; name: string; orderIndex: number };
  };
  studentTask: {
    id: string;
    assignedAt: string;
    dueAt: string;
    status: string;
  };
  feedbacks: FeedbackItem[];
}

export default function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [report, setReport] = useState<ReportDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State for Employee Grading
  const [employeeMarks, setEmployeeMarks] = useState<number>(85);
  const [comments, setComments] = useState<string>("");
  const [finalMarks, setFinalMarks] = useState<number>(85);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/reports/${resolvedParams.id}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to load report details.");
        return;
      }
      setReport(data.report);

      const empFb = data.report.feedbacks.find((f: FeedbackItem) => f.type === "EMPLOYEE");
      const aiFb = data.report.feedbacks.find((f: FeedbackItem) => f.type === "AI");

      if (empFb) {
        setEmployeeMarks(empFb.marks);
        setComments(empFb.comments);
        setFinalMarks(data.report.finalMarks ?? empFb.marks);
      } else if (aiFb) {
        setEmployeeMarks(aiFb.marks);
        setFinalMarks(aiFb.marks);
      }
    } catch {
      setError("An unexpected network error occurred while loading report.");
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.id]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessNotice(null);
    setSubmitting(true);

    try {
      const res = await fetch(`/api/admin/reports/${resolvedParams.id}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeMarks: Number(employeeMarks),
          comments,
          finalMarks: Number(finalMarks),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormError(data.error || "Failed to save marks.");
        setSubmitting(false);
        return;
      }

      setSuccessNotice("Grade and employee feedback successfully recorded! Report is now FINALIZED.");
      fetchReport();
    } catch {
      setFormError("Network communication error while submitting grade.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-12 text-center text-muted text-sm">Loading report details...</div>
      </AdminLayout>
    );
  }

  if (error || !report) {
    return (
      <AdminLayout>
        <div className="card-ace p-8 text-center">
          <p className="text-red-700 text-sm mb-4">{error || "Report not found."}</p>
          <Link href="/admin/reports" className="btn-secondary text-xs inline-flex items-center gap-1.5">
            <RiArrowLeftLine />
            Back to Reports
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const aiFeedback = report.feedbacks.find((f) => f.type === "AI");
  const employeeFeedback = report.feedbacks.find((f) => f.type === "EMPLOYEE");
  const snapshot = aiFeedback?.repoSnapshot;

  return (
    <AdminLayout>
      {/* Back button */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/admin/reports"
          className="inline-flex items-center gap-2 text-xs font-semibold text-secondary hover:text-primary transition-colors"
        >
          <RiArrowLeftLine />
          Back to All Reports
        </Link>

        <span
          className={`badge-ace text-xs ${
            report.status === "FINALIZED"
              ? "badge-success"
              : report.status === "AI_REVIEWED"
              ? "badge-info"
              : "badge-pending"
          }`}
        >
          STATUS: {report.status}
        </span>
      </div>

      {successNotice && (
        <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200 text-green-900 text-sm">
          {successNotice}
        </div>
      )}

      {/* Report Header Card */}
      <div className="card-ace p-6 sm:p-8 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 pb-6 border-b border-outline-variant">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="badge-ace badge-info text-xs">
                WEEK {report.task.module.orderIndex} · {report.task.module.name}
              </span>
              <span className="text-xs text-muted">
                Submitted {new Date(report.submittedAt).toLocaleString()}
              </span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-primary">
              {report.title}
            </h1>
            <p className="text-secondary text-sm mt-1">
              Candidate: <strong>{report.student.name}</strong> ({report.student.email}) ·{" "}
              {report.student.batch.name}
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            {report.finalMarks !== null && (
              <div className="text-right">
                <span className="text-xs text-muted block uppercase font-bold">Final Grade</span>
                <span className="font-serif text-3xl font-bold text-primary">
                  {report.finalMarks} / 100
                </span>
              </div>
            )}
            <a
              href={report.githubRepoUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-primary text-xs flex items-center gap-2 shadow-sm"
            >
              <RiGithubLine className="text-lg" />
              <span>Inspect Repository</span>
              <RiExternalLinkLine />
            </a>
          </div>
        </div>

        {/* Written Description */}
        <div className="mt-6">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">
            Student Technical Synthesis & Learnings
          </h4>
          <div className="bg-surface p-4 rounded-lg border border-outline-variant text-sm text-primary leading-relaxed whitespace-pre-line">
            {report.description}
          </div>
        </div>
      </div>

      {/* Grid: AI Feedback & Repo Snapshot + Faculty Grading */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        {/* Left Column: AI Review & Repository Metrics */}
        <div className="space-y-6">
          <div className="card-ace p-6">
            <div className="flex items-center justify-between pb-4 border-b border-outline-variant mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-blue-50 text-blue-700 flex items-center justify-center text-lg">
                  <RiRobotLine />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-primary">
                    AI Code & Integrity Review
                  </h3>
                  <span className="text-[11px] text-muted">
                    Model: {aiFeedback?.aiModel || "Gemini Flash"}
                  </span>
                </div>
              </div>

              {aiFeedback && (
                <div className="text-right">
                  <span className="text-[10px] text-muted block uppercase">AI Score</span>
                  <span className="font-serif text-2xl font-bold text-blue-700">
                    {aiFeedback.marks} / 100
                  </span>
                </div>
              )}
            </div>

            {aiFeedback ? (
              <div className="space-y-4">
                {/* AI Likelihood Banner */}
                {snapshot?.aiGeneratedLikelihood && (
                  <div
                    className={`p-3 rounded-md text-xs border ${
                      snapshot.aiGeneratedLikelihood === "low"
                        ? "bg-green-50 text-green-900 border-green-200"
                        : snapshot.aiGeneratedLikelihood === "medium"
                        ? "bg-amber-50 text-amber-900 border-amber-200"
                        : "bg-red-50 text-red-900 border-red-200"
                    }`}
                  >
                    <div className="font-bold uppercase tracking-wide flex items-center gap-1.5 mb-1">
                      <RiAlertLine />
                      AI Generation Likelihood: {snapshot.aiGeneratedLikelihood.toUpperCase()}
                    </div>
                    <span>
                      {snapshot.reasoning ||
                        (snapshot.aiGeneratedLikelihood === "low"
                          ? "Organic multi-step commit timeline and consistent coding style indicate authentic development."
                          : "Elevated AI indicators detected. Manual inspection of commit messages and AST patterns recommended.")}
                    </span>
                  </div>
                )}

                <div>
                  <h5 className="text-xs font-bold uppercase tracking-wider text-muted mb-1">
                    Evaluation Summary
                  </h5>
                  <p className="text-xs text-secondary leading-relaxed bg-surface p-3 rounded border border-outline-variant">
                    {aiFeedback.comments}
                  </p>
                </div>

                {snapshot?.taskAlignment && (
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-muted mb-1">
                      Task Alignment
                    </h5>
                    <p className="text-xs text-secondary leading-relaxed bg-surface p-3 rounded border border-outline-variant capitalize">
                      {snapshot.taskAlignment}
                    </p>
                  </div>
                )}

                {aiFeedback.strengths.length > 0 && (
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-green-800 mb-1">
                      Strengths
                    </h5>
                    <ul className="list-disc list-inside text-xs text-secondary space-y-1">
                      {aiFeedback.strengths.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {aiFeedback.improvements.length > 0 && (
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-amber-800 mb-1">
                      Recommended Improvements
                    </h5>
                    <ul className="list-disc list-inside text-xs text-secondary space-y-1">
                      {aiFeedback.improvements.map((imp, idx) => (
                        <li key={idx}>{imp}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-muted text-xs">
                AI evaluation is currently processing...
              </div>
            )}
          </div>

          {/* Repo Snapshot Breakdown */}
          {snapshot && (
            <div className="card-ace p-6">
              <h4 className="font-serif text-base font-bold text-primary mb-3 flex items-center gap-2">
                <RiCodeLine />
                Repository Snapshot Details
              </h4>

              <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                <div className="bg-surface p-2.5 rounded border border-outline-variant">
                  <span className="text-muted block">Total Commits</span>
                  <span className="font-bold text-primary text-sm">
                    {snapshot.totalCommitsCount || 0} commits
                  </span>
                </div>
                <div className="bg-surface p-2.5 rounded border border-outline-variant">
                  <span className="text-muted block">Default Branch</span>
                  <span className="font-bold text-primary text-sm">
                    {snapshot.metadata?.defaultBranch || "main"}
                  </span>
                </div>
              </div>

              {snapshot.languages && Object.keys(snapshot.languages).length > 0 && (
                <div className="mb-4">
                  <span className="text-xs font-semibold text-muted block mb-1.5">Languages</span>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.keys(snapshot.languages).map((lang) => (
                      <span key={lang} className="badge-ace badge-info text-[11px] py-0.5">
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {snapshot.recentCommits && snapshot.recentCommits.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-muted block mb-2 flex items-center gap-1">
                    <RiGitCommitLine /> Recent Commit History
                  </span>
                  <div className="max-h-40 overflow-y-auto space-y-1.5 bg-surface p-2.5 rounded border border-outline-variant text-[11px]">
                    {snapshot.recentCommits.map((c, idx) => (
                      <div key={idx} className="flex items-start justify-between gap-2 border-b border-outline-variant/50 pb-1 last:border-0">
                        <span className="text-primary font-medium truncate">{c.message}</span>
                        <span className="text-muted shrink-0 text-[10px]">
                          {c.date ? new Date(c.date).toLocaleDateString() : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Faculty Evaluation & Grading Form */}
        <div className="space-y-6">
          <div className="card-ace p-6 sm:p-8 bg-white border-2 border-primary/20">
            <div className="flex items-center gap-2 pb-4 border-b border-outline-variant mb-6">
              <div className="w-8 h-8 rounded-md bg-primary text-white flex items-center justify-center text-lg">
                <RiShieldCheckLine />
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold text-primary">
                  Faculty Grading & Feedback
                </h3>
                <span className="text-xs text-muted">
                  CONFIDENTIAL: Only visible within the Admin portal.
                </span>
              </div>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleGradeSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1">
                  Employee / Mentor Marks (0 - 100)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={employeeMarks}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setEmployeeMarks(val);
                    setFinalMarks(val);
                  }}
                  className="w-full px-3 py-2 border border-outline-variant rounded-md text-sm font-bold text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1">
                  Faculty Qualitative Comments & Critique
                </label>
                <textarea
                  rows={5}
                  required
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Provide detailed feedback on architecture, concurrency patterns, code cleanliness, and adherence to requirements..."
                  className="w-full px-3 py-2 border border-outline-variant rounded-md text-sm text-primary focus:outline-none focus:border-primary leading-relaxed"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-primary">
                    Final Official Grade (0 - 100)
                  </label>
                  <span className="text-xs text-muted">Recorded into Report.finalMarks</span>
                </div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={finalMarks}
                  onChange={(e) => setFinalMarks(Number(e.target.value))}
                  className="w-full px-3 py-2 border-2 border-accent rounded-md text-base font-bold text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div className="pt-4 border-t border-outline-variant flex items-center justify-between">
                <span className="text-xs text-muted">
                  Moves task to <strong>REVIEWED</strong>
                </span>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs px-6 py-2.5 flex items-center gap-2 shadow-md"
                >
                  {submitting ? "Finalizing Grade..." : (
                    <>
                      <RiCheckLine />
                      Record Evaluation & Finalize Marks
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {employeeFeedback && (
            <div className="card-ace p-5 bg-surface text-xs text-secondary">
              <span className="font-semibold text-primary block mb-1">Previous Faculty Review</span>
              <p className="italic mb-2">&quot;{employeeFeedback.comments}&quot;</p>
              <span className="text-muted">
                Reviewed by {employeeFeedback.reviewerAdmin?.name || "Faculty"} on{" "}
                {new Date(employeeFeedback.createdAt).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
