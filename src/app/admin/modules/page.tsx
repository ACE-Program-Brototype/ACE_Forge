"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  RiBookOpenLine,
  RiAddLine,
  RiFileListLine,
  RiGroupLine,
  RiCloseLine,
  RiCheckLine,
  RiExternalLinkLine,
  RiArrowRightLine,
} from "react-icons/ri";

interface TaskItem {
  id: string;
  title: string;
  description: string;
  referenceLink?: string | null;
  isActive: boolean;
  createdAt: string;
}

interface ModuleItem {
  id: string;
  name: string;
  orderIndex: number;
  description: string;
  tasks: TaskItem[];
  _count?: {
    tasks: number;
    students: number;
  };
}

export default function ModulesPage() {
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Module modal state
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [modName, setModName] = useState("");
  const [modOrderIndex, setModOrderIndex] = useState<number>(1);
  const [modDescription, setModDescription] = useState("");
  const [modSubmitting, setModSubmitting] = useState(false);
  const [modError, setModError] = useState<string | null>(null);

  // Task modal state
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [targetModuleId, setTargetModuleId] = useState<string>("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskReferenceLink, setTaskReferenceLink] = useState("");
  const [taskSubmitting, setTaskSubmitting] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [taskSuccessNotice, setTaskSuccessNotice] = useState<string | null>(null);

  const fetchModules = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/modules");
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to load modules.");
        return;
      }
      setModules(data.modules);
      if (data.modules.length > 0) {
        setModOrderIndex(data.modules.length + 1);
      }
    } catch {
      setError("An unexpected network error occurred while loading modules.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    setModError(null);
    setModSubmitting(true);

    try {
      const res = await fetch("/api/admin/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: modName,
          orderIndex: Number(modOrderIndex),
          description: modDescription,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setModError(data.error || "Failed to create module.");
        setModSubmitting(false);
        return;
      }

      setModName("");
      setModDescription("");
      setShowModuleModal(false);
      fetchModules();
    } catch {
      setModError("Network communication error.");
    } finally {
      setModSubmitting(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setTaskError(null);
    setTaskSubmitting(true);

    try {
      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskTitle,
          description: taskDescription,
          referenceLink: taskReferenceLink.trim() ? taskReferenceLink.trim() : null,
          moduleId: targetModuleId,
          isActive: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setTaskError(data.error || "Failed to create task.");
        setTaskSubmitting(false);
        return;
      }

      setTaskSuccessNotice(
        `Task "${data.task.title}" created! Automatically assigned to ${data.assignedStudentsCount} active students.`
      );
      setTaskTitle("");
      setTaskDescription("");
      setTaskReferenceLink("");
      setShowTaskModal(false);
      fetchModules();
    } catch {
      setTaskError("Network communication error.");
    } finally {
      setTaskSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-3xl font-bold text-primary">Modules & Engineering Tasks</h1>
          <p className="text-secondary text-sm mt-1">
            Curate weekly engineering curricula, specify task requirements, and monitor student assignments.
          </p>
        </div>

        <button
          onClick={() => {
            setModError(null);
            setShowModuleModal(true);
          }}
          className="btn-primary text-sm flex items-center gap-2 shadow-sm"
        >
          <RiAddLine className="text-base" />
          Create New Module
        </button>
      </div>

      {taskSuccessNotice && (
        <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200 text-green-900 text-sm flex items-center justify-between">
          <span>{taskSuccessNotice}</span>
          <button
            onClick={() => setTaskSuccessNotice(null)}
            className="text-green-700 hover:text-green-900 text-base"
          >
            <RiCloseLine />
          </button>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Modules List */}
      {loading ? (
        <div className="p-12 text-center text-muted text-sm">Loading modules and tasks...</div>
      ) : modules.length === 0 ? (
        <div className="card-ace p-12 text-center text-muted text-sm">
          No modules found. Create your first weekly module.
        </div>
      ) : (
        <div className="space-y-8">
          {modules.map((m) => (
            <div key={m.id} className="card-ace overflow-hidden">
              {/* Module Header Bar */}
              <div className="bg-primary-soft/50 p-6 border-b border-outline-variant flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="badge-ace badge-info text-xs">
                      WEEK {m.orderIndex}
                    </span>
                    <h2 className="font-serif text-2xl font-bold text-primary">{m.name}</h2>
                  </div>
                  <p className="text-secondary text-sm mt-2 max-w-3xl leading-relaxed">
                    {m.description}
                  </p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted">
                    <span className="flex items-center gap-1.5">
                      <RiFileListLine />
                      {m.tasks.length} Tasks
                    </span>
                    <span className="flex items-center gap-1.5">
                      <RiGroupLine />
                      {m._count?.students || 0} Students currently at this module
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setTargetModuleId(m.id);
                    setTaskError(null);
                    setShowTaskModal(true);
                  }}
                  className="btn-secondary text-xs flex items-center gap-1.5 whitespace-nowrap self-start sm:self-auto"
                >
                  <RiAddLine />
                  Add Task
                </button>
              </div>

              {/* Module Tasks List */}
              <div className="p-6">
                {m.tasks.length === 0 ? (
                  <div className="text-center py-6 text-muted text-xs">
                    No tasks assigned to this module yet. Click &quot;Add Task&quot; above to create one.
                  </div>
                ) : (
                  <div className="divide-y divide-outline-variant">
                    {m.tasks.map((task) => (
                      <div
                        key={task.id}
                        className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-primary text-base">{task.title}</h4>
                            {!task.isActive && (
                              <span className="badge-ace badge-error text-[10px] py-0.5">
                                ARCHIVED
                              </span>
                            )}
                          </div>
                          <p className="text-secondary text-xs mt-1 line-clamp-2">
                            {task.description}
                          </p>
                          {task.referenceLink && (
                            <a
                              href={task.referenceLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-accent font-medium mt-1.5 hover:underline"
                            >
                              <RiExternalLinkLine />
                              Reference Material
                            </a>
                          )}
                        </div>

                        <Link
                          href={`/admin/tasks/${task.id}`}
                          className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3 self-start md:self-auto hover:border-primary"
                        >
                          <span>Inspect Student Submissions</span>
                          <RiArrowRightLine />
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Module Modal */}
      {showModuleModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-outline-variant rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-outline-variant mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-primary-soft text-primary flex items-center justify-center text-lg">
                  <RiBookOpenLine />
                </div>
                <h3 className="font-serif text-xl font-bold text-primary">Create Module</h3>
              </div>
              <button
                onClick={() => setShowModuleModal(false)}
                className="text-muted hover:text-primary text-xl"
              >
                <RiCloseLine />
              </button>
            </div>

            {modError && (
              <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs">
                {modError}
              </div>
            )}

            <form onSubmit={handleCreateModule} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1">
                  Module Name
                </label>
                <input
                  type="text"
                  required
                  value={modName}
                  onChange={(e) => setModName(e.target.value)}
                  placeholder="e.g. Week 4: Distributed Consensus & Raft"
                  className="w-full px-3 py-2 border border-outline-variant rounded-md text-sm text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1">
                  Order Index (Week #)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={modOrderIndex}
                  onChange={(e) => setModOrderIndex(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-outline-variant rounded-md text-sm text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1">
                  Curriculum Overview & Description
                </label>
                <textarea
                  rows={4}
                  required
                  value={modDescription}
                  onChange={(e) => setModDescription(e.target.value)}
                  placeholder="Summary of learning outcomes, architectural challenges, and engineering competencies..."
                  className="w-full px-3 py-2 border border-outline-variant rounded-md text-sm text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModuleModal(false)}
                  className="btn-secondary text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modSubmitting}
                  className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
                >
                  {modSubmitting ? "Saving..." : (
                    <>
                      <RiCheckLine />
                      Save Module
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-outline-variant rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-outline-variant mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-accent-container text-on-accent flex items-center justify-center text-lg">
                  <RiFileListLine />
                </div>
                <h3 className="font-serif text-xl font-bold text-primary">Add Task to Module</h3>
              </div>
              <button
                onClick={() => setShowTaskModal(false)}
                className="text-muted hover:text-primary text-xl"
              >
                <RiCloseLine />
              </button>
            </div>

            <div className="mb-4 p-3 rounded-md bg-primary-soft text-primary text-xs leading-relaxed">
              <strong>Auto-Assignment Rule:</strong> Adding this task will automatically generate StudentTask entries with a 7-day due date for all active students enrolled in this module.
            </div>

            {taskError && (
              <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs">
                {taskError}
              </div>
            )}

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Implement Raft Leader Election Algorithm"
                  className="w-full px-3 py-2 border border-outline-variant rounded-md text-sm text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1">
                  Task Description & Requirements
                </label>
                <textarea
                  rows={4}
                  required
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Provide precise implementation guidelines, constraints, benchmarks, and expected output..."
                  className="w-full px-3 py-2 border border-outline-variant rounded-md text-sm text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1">
                  Reference Documentation / GitHub Spec (Optional)
                </label>
                <input
                  type="url"
                  value={taskReferenceLink}
                  onChange={(e) => setTaskReferenceLink(e.target.value)}
                  placeholder="https://raft.github.io"
                  className="w-full px-3 py-2 border border-outline-variant rounded-md text-sm text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="btn-secondary text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={taskSubmitting}
                  className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
                >
                  {taskSubmitting ? "Creating & Assigning..." : (
                    <>
                      <RiCheckLine />
                      Create & Assign Task
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
