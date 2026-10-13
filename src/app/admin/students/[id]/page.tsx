"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  RiArrowLeftLine,
  RiGraduationCapLine,
  RiMailLine,
  RiPhoneLine,
  RiStackLine,
  RiBookOpenLine,
  RiEditLine,
  RiCheckLine,
  RiCloseLine,
  RiTimeLine,
  RiGithubLine,
  RiRobotLine,
  RiShieldCheckLine,
  RiExternalLinkLine,
} from "react-icons/ri";

interface FeedbackItem {
  id: string;
  type: "AI" | "EMPLOYEE";
  marks: number;
  comments: string;
  strengths: string[];
  improvements: string[];
  aiModel?: string | null;
  reviewerAdmin?: { id: string; name: string } | null;
  createdAt: string;
}

interface ReportDetail {
  id: string;
  title: string;
  description: string;
  githubRepoUrl: string;
  status: "SUBMITTED" | "AI_REVIEWED" | "FINALIZED";
  finalMarks?: number | null;
  submittedAt: string;
  feedbacks: FeedbackItem[];
}

interface StudentTaskDetail {
  id: string;
  assignedAt: string;
  dueAt: string;
  status: "ASSIGNED" | "SUBMITTED" | "REVIEWED" | "OVERDUE";
  task: {
    id: string;
    title: string;
    referenceLink?: string | null;
    module: { id: string; name: string; orderIndex: number };
  };
  report?: ReportDetail | null;
}

interface EmailLogItem {
  id: string;
  type: "WELCOME" | "REMINDER_DAY6" | "OTHER";
  status: "SENT" | "FAILED";
  sentAt: string;
  error?: string | null;
}

interface StudentDetailData {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "ACTIVE" | "INACTIVE";
  mustChangePassword: boolean;
  createdAt: string;
  batch: { id: string; name: string };
  currentModule: { id: string; name: string; orderIndex: number };
  studentTasks: StudentTaskDetail[];
  emailLogs: EmailLogItem[];
}

interface BatchOption {
  id: string;
  name: string;
}

interface ModuleOption {
  id: string;
  name: string;
  orderIndex: number;
}

export default function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [student, setStudent] = useState<StudentDetailData | null>(null);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [modules, setModules] = useState<ModuleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBatchId, setEditBatchId] = useState("");
  const [editModuleId, setEditModuleId] = useState("");
  const [editStatus, setEditStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchStudent = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/students/${resolvedParams.id}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to load student details.");
        return;
      }
      setStudent(data.student);
      setEditName(data.student.name);
      setEditEmail(data.student.email);
      setEditPhone(data.student.phone);
      setEditBatchId(data.student.batchId || data.student.batch.id);
      setEditModuleId(data.student.currentModuleId || data.student.currentModule.id);
      setEditStatus(data.student.status);
    } catch {
      setError("An unexpected network error occurred.");
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.id]);

  useEffect(() => {
    fetchStudent();
    async function loadMeta() {
      try {
        const [bRes, mRes] = await Promise.all([
          fetch("/api/admin/batches"),
          fetch("/api/admin/modules"),
        ]);
        const bData = await bRes.json();
        const mData = await mRes.json();
        if (bData.success) setBatches(bData.batches);
        if (mData.success) setModules(mData.modules);
      } catch (err) {
        console.error("Meta loading error:", err);
      }
    }
    loadMeta();
  }, [fetchStudent]);

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaving(true);

    try {
      const res = await fetch(`/api/admin/students/${resolvedParams.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          phone: editPhone,
          batchId: editBatchId,
          currentModuleId: editModuleId,
          status: editStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setSaveError(data.error || "Failed to update student profile.");
        setSaving(false);
        return;
      }

      setShowEditModal(false);
      fetchStudent();
    } catch {
      setSaveError("Network communication error.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleDeactivate = async () => {
    if (!student) return;
    const newStatus = student.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    if (!confirm(`Are you sure you want to mark ${student.name} as ${newStatus}?`)) return;

    try {
      const res = await fetch(`/api/admin/students/${student.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Failed to update status.");
        return;
      }
      fetchStudent();
    } catch {
      alert("Network error updating status.");
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-12 text-center text-muted text-sm">Loading student profile...</div>
      </AdminLayout>
    );
  }

  if (error || !student) {
    return (
      <AdminLayout>
        <div className="card-ace p-8 text-center">
          <p className="text-red-700 text-sm mb-4">{error || "Student not found."}</p>
          <Link href="/admin/students" className="btn-secondary text-xs inline-flex items-center gap-1.5">
            <RiArrowLeftLine />
            Back to Directory
          </Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Back button */}
      <div className="mb-6">
        <Link
          href="/admin/students"
          className="inline-flex items-center gap-2 text-xs font-semibold text-secondary hover:text-primary transition-colors"
        >
          <RiArrowLeftLine />
          Back to Student Directory
        </Link>
      </div>

      {/* Profile Overview Card */}
      <div className="card-ace p-6 sm:p-8 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold shrink-0 shadow-md"
              style={{
                background: `hsl(${student.name.charCodeAt(0) * 11}, 35%, 40%)`,
              }}
            >
              {student.name.charAt(0)}
            </div>

            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="font-serif text-2xl sm:text-3xl font-bold text-primary">
                  {student.name}
                </h1>
                {student.status === "ACTIVE" ? (
                  <span className="badge-ace badge-success text-xs">ACTIVE</span>
                ) : (
                  <span className="badge-ace badge-error text-xs">INACTIVE</span>
                )}
                {student.mustChangePassword && (
                  <span className="badge-ace badge-pending text-xs">PASSWORD ROTATION PENDING</span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-secondary mt-3">
                <div className="flex items-center gap-2">
                  <RiMailLine className="text-muted" />
                  <span>{student.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <RiPhoneLine className="text-muted" />
                  <span>{student.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <RiStackLine className="text-muted" />
                  <span>{student.batch.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <RiBookOpenLine className="text-muted" />
                  <span className="font-semibold text-primary">
                    Week {student.currentModule.orderIndex}: {student.currentModule.name}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            <button
              onClick={() => {
                setSaveError(null);
                setShowEditModal(true);
              }}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              <RiEditLine />
              Edit Profile / Move Module
            </button>
            <button
              onClick={handleToggleDeactivate}
              className={`btn-secondary text-xs ${
                student.status === "ACTIVE"
                  ? "hover:border-red-500 hover:text-red-700"
                  : "hover:border-green-500 hover:text-green-700"
              }`}
            >
              {student.status === "ACTIVE" ? "Deactivate" : "Re-activate"}
            </button>
          </div>
        </div>
      </div>

      {/* Assigned Tasks Section */}
      <div className="card-ace overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between">
          <div className="font-semibold text-primary text-sm flex items-center gap-2">
            <RiGraduationCapLine className="text-lg text-accent" />
            Assigned Engineering Tasks ({student.studentTasks.length})
          </div>
        </div>

        {student.studentTasks.length === 0 ? (
          <div className="p-8 text-center text-muted text-xs">
            No tasks assigned to this candidate yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface border-b border-outline-variant text-xs uppercase font-bold text-muted">
                <tr>
                  <th className="px-6 py-3">Task Title</th>
                  <th className="px-6 py-3">Curriculum Module</th>
                  <th className="px-6 py-3">Assigned Date</th>
                  <th className="px-6 py-3">Due Date</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Submission Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {student.studentTasks.map((st) => (
                  <tr key={st.id} className="hover:bg-surface/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-primary">{st.task.title}</td>
                    <td className="px-6 py-4 text-xs text-secondary">
                      W{st.task.module.orderIndex}: {st.task.module.name}
                    </td>
                    <td className="px-6 py-4 text-xs text-muted">
                      {new Date(st.assignedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-xs text-secondary font-medium">
                      {new Date(st.dueAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      {st.status === "ASSIGNED" && (
                        <span className="badge-ace badge-pending text-xs">IN PROGRESS</span>
                      )}
                      {st.status === "SUBMITTED" && (
                        <span className="badge-ace badge-info text-xs">SUBMITTED</span>
                      )}
                      {st.status === "REVIEWED" && (
                        <span className="badge-ace badge-success text-xs">GRADED</span>
                      )}
                      {st.status === "OVERDUE" && (
                        <span className="badge-ace badge-error text-xs">OVERDUE</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {st.report ? (
                        <div className="inline-flex items-center gap-2">
                          {st.report.finalMarks !== null && (
                            <span className="text-xs font-bold text-primary">
                              {st.report.finalMarks}/100
                            </span>
                          )}
                          <Link
                            href={`/admin/reports?studentTaskId=${st.id}`}
                            className="btn-secondary text-xs py-1 px-2.5 inline-flex items-center gap-1"
                          >
                            View Submission
                          </Link>
                        </div>
                      ) : (
                        <span className="text-xs text-muted italic">Awaiting submission</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reports and Feedback History */}
      <div className="mb-8">
        <h2 className="font-serif text-2xl font-bold text-primary mb-4">
          Reports & Evaluation History
        </h2>

        {student.studentTasks.filter((st) => st.report).length === 0 ? (
          <div className="card-ace p-8 text-center text-muted text-xs">
            Candidate has not submitted any reports yet.
          </div>
        ) : (
          <div className="space-y-6">
            {student.studentTasks
              .filter((st) => st.report)
              .map((st) => {
                const report = st.report!;
                const aiFeedback = report.feedbacks.find((f) => f.type === "AI");
                const employeeFeedback = report.feedbacks.find((f) => f.type === "EMPLOYEE");

                return (
                  <div key={report.id} className="card-ace p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-outline-variant mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="badge-ace badge-info text-xs">
                            {st.task.module.name}
                          </span>
                          <span className="text-xs text-muted">
                            Submitted: {new Date(report.submittedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="font-serif text-xl font-bold text-primary mt-1">
                          {report.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-3">
                        {report.finalMarks !== null && (
                          <div className="text-right">
                            <span className="text-xs text-muted block uppercase">Final Grade</span>
                            <span className="font-serif text-2xl font-bold text-primary">
                              {report.finalMarks}/100
                            </span>
                          </div>
                        )}
                        <a
                          href={report.githubRepoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-secondary text-xs flex items-center gap-1.5"
                        >
                          <RiGithubLine className="text-base" />
                          GitHub Repository
                          <RiExternalLinkLine className="text-xs" />
                        </a>
                      </div>
                    </div>

                    <p className="text-secondary text-sm mb-6 leading-relaxed">
                      {report.description}
                    </p>

                    {/* Feedback Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* AI Feedback Card */}
                      {aiFeedback && (
                        <div className="bg-primary-soft/50 p-4 rounded-lg border border-primary/10">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5 font-semibold text-primary text-xs">
                              <RiRobotLine className="text-accent text-sm" />
                              AI Code & Integrity Evaluation
                            </div>
                            <span className="font-bold text-primary text-xs">
                              Score: {aiFeedback.marks}/100
                            </span>
                          </div>
                          <p className="text-secondary text-xs mb-3">{aiFeedback.comments}</p>
                          {aiFeedback.strengths.length > 0 && (
                            <div className="text-[11px] mb-2">
                              <span className="font-semibold text-green-800">Strengths:</span>
                              <ul className="list-disc list-inside text-secondary">
                                {aiFeedback.strengths.map((s, idx) => (
                                  <li key={idx}>{s}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {aiFeedback.improvements.length > 0 && (
                            <div className="text-[11px]">
                              <span className="font-semibold text-amber-800">Improvements:</span>
                              <ul className="list-disc list-inside text-secondary">
                                {aiFeedback.improvements.map((imp, idx) => (
                                  <li key={idx}>{imp}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Employee Feedback Card */}
                      {employeeFeedback && (
                        <div className="bg-amber-50/50 p-4 rounded-lg border border-amber-200/50">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5 font-semibold text-amber-900 text-xs">
                              <RiShieldCheckLine className="text-amber-700 text-sm" />
                              Faculty Feedback ({employeeFeedback.reviewerAdmin?.name || "Mentor"})
                            </div>
                            <span className="font-bold text-amber-900 text-xs">
                              Score: {employeeFeedback.marks}/100
                            </span>
                          </div>
                          <p className="text-secondary text-xs">{employeeFeedback.comments}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Edit Profile / Change Module Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-outline-variant rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-outline-variant mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-primary-soft text-primary flex items-center justify-center text-lg">
                  <RiEditLine />
                </div>
                <h3 className="font-serif text-xl font-bold text-primary">Edit Student Profile</h3>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-muted hover:text-primary text-xl"
              >
                <RiCloseLine />
              </button>
            </div>

            <div className="mb-4 p-3 rounded-md bg-primary-soft text-primary text-xs leading-relaxed">
              <strong>Module Transition Rule:</strong> If you transition this candidate to a new module, all active tasks belonging to the new module will be automatically assigned with a 7-day deadline.
            </div>

            {saveError && (
              <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs">
                {saveError}
              </div>
            )}

            <form onSubmit={handleUpdateStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-outline-variant rounded-md text-sm text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-outline-variant rounded-md text-sm text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-outline-variant rounded-md text-sm text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1">
                  Cohort Batch
                </label>
                <select
                  value={editBatchId}
                  onChange={(e) => setEditBatchId(e.target.value)}
                  className="w-full px-3 py-2 border border-outline-variant rounded-md text-sm text-primary focus:outline-none focus:border-primary bg-white"
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1">
                  Current Module (Changes will auto-assign new tasks)
                </label>
                <select
                  value={editModuleId}
                  onChange={(e) => setEditModuleId(e.target.value)}
                  className="w-full px-3 py-2 border border-outline-variant rounded-md text-sm text-primary focus:outline-none focus:border-primary bg-white"
                >
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      Week {m.orderIndex}: {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1">
                  Enrollment Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as "ACTIVE" | "INACTIVE")}
                  className="w-full px-3 py-2 border border-outline-variant rounded-md text-sm text-primary focus:outline-none focus:border-primary bg-white"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn-secondary text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
                >
                  {saving ? "Saving..." : (
                    <>
                      <RiCheckLine />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
