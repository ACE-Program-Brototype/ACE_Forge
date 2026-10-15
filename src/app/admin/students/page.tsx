"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  RiGroupLine,
  RiUserAddLine,
  RiFileUploadLine,
  RiSearchLine,
  RiMailLine,
  RiPhoneLine,
  RiCloseLine,
  RiCheckLine,
  RiArrowRightLine,
  RiAlertLine,
  RiDeleteBinLine,
} from "react-icons/ri";

interface StudentListItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "ACTIVE" | "INACTIVE";
  batch: { id: string; name: string };
  currentModule: { id: string; name: string; orderIndex: number };
  _count?: {
    studentTasks: number;
    reports: number;
  };
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

interface ImportError {
  row: number;
  email?: string;
  error: string;
}

interface ImportSummary {
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  errorCount: number;
  errors: ImportError[];
}

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [modules, setModules] = useState<ModuleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Add Student Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Bulk Import Modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Fetch batches & modules for dropdowns
  useEffect(() => {
    async function loadMeta() {
      try {
        const [bRes, mRes] = await Promise.all([
          fetch("/api/admin/batches"),
          fetch("/api/admin/modules"),
        ]);
        const bData = await bRes.json();
        const mData = await mRes.json();
        if (bData.success) {
          setBatches(bData.batches);
          if (bData.batches[0]) setSelectedBatchId(bData.batches[0].id);
        }
        if (mData.success) {
          setModules(mData.modules);
          if (mData.modules[0]) setSelectedModuleId(mData.modules[0].id);
        }
      } catch (err) {
        console.error("Failed to load batches or modules:", err);
      }
    }
    loadMeta();
  }, []);

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (batchFilter) params.set("batchId", batchFilter);
      if (moduleFilter) params.set("moduleId", moduleFilter);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/admin/students?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to load students.");
        return;
      }
      setStudents(data.students);
    } catch {
      setError("An unexpected network error occurred while loading students.");
    } finally {
      setLoading(false);
    }
  }, [search, batchFilter, moduleFilter, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchStudents]);

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    setAddLoading(true);

    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          batchId: selectedBatchId,
          currentModuleId: selectedModuleId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setAddError(data.error || "Failed to enroll student.");
        setAddLoading(false);
        return;
      }

      if (data.emailSent === false) {
        setSuccessNotice(
          `Student ${data.student.name} enrolled! Note: Email delivery failed (${data.emailError || "check SMTP settings"}). Initial temporary password is: ${data.student.phone}`
        );
      } else {
        setSuccessNotice(
          `Student ${data.student.name} successfully enrolled! Welcome email with initial credentials sent to ${data.student.email} (Password: phone number).`
        );
      }

      setName("");
      setEmail("");
      setPhone("");
      setShowAddModal(false);
      fetchStudents();
    } catch {
      setAddError("Network error while submitting.");
    } finally {
      setAddLoading(false);
    }
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      setImportError("Please select a file to upload.");
      return;
    }

    setImportError(null);
    setImportSummary(null);
    setImportLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", importFile);

      const res = await fetch("/api/admin/students/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setImportError(data.error || "Bulk import failed.");
        setImportLoading(false);
        return;
      }

      setImportSummary(data.summary);
      setImportFile(null);
      fetchStudents();
    } catch {
      setImportError("Network error during bulk import.");
    } finally {
      setImportLoading(false);
    }
  };

  const handleDeleteStudent = async (s: StudentListItem) => {
    const confirmed = confirm(
      `⚠️ PERMANENT DELETION WARNING:\n\nAre you sure you want to permanently delete "${s.name}"?\n\nThis will completely delete:\n• Student profile and credentials\n• All assigned tasks and deadlines\n• All weekly reports and GitHub submissions\n• All AI code evaluations and faculty marks\n• All email logs\n\nThis action CANNOT be undone. Proceed?`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/students/${s.id}?permanent=true`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Failed to delete student.");
        return;
      }
      setSuccessNotice(data.message || `Student "${s.name}" and all records permanently deleted.`);
      fetchStudents();
    } catch {
      alert("Network error deleting student.");
    }
  };

  const handleDeactivateToggle = async (s: StudentListItem) => {
    const nextStatus = s.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const confirmed = confirm(
      `Are you sure you want to ${nextStatus === "INACTIVE" ? "deactivate" : "activate"} "${s.name}"?`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/students/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Failed to update status.");
        return;
      }
      setSuccessNotice(`Student "${s.name}" marked as ${nextStatus}.`);
      fetchStudents();
    } catch {
      alert("Network error updating status.");
    }
  };

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-3xl font-bold text-primary">Student Directory</h1>
          <p className="text-secondary text-sm mt-1">
            Manage student enrollments, module transitions, weekly task records, and credentials.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setImportError(null);
              setImportSummary(null);
              setShowImportModal(true);
            }}
            className="btn-secondary text-xs flex items-center gap-2"
          >
            <RiFileUploadLine className="text-base" />
            Bulk Import (CSV/Excel)
          </button>
          <button
            onClick={() => {
              setAddError(null);
              setShowAddModal(true);
            }}
            className="btn-primary text-xs flex items-center gap-2 shadow-sm"
          >
            <RiUserAddLine className="text-base" />
            Enroll Student
          </button>
        </div>
      </div>

      {successNotice && (
        <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm flex items-center justify-between">
          <span>{successNotice}</span>
          <button
            onClick={() => setSuccessNotice(null)}
            className="text-green-700 hover:text-green-900 font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="card-ace p-4 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search Input */}
        <div className="relative">
          <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone..."
            className="w-full pl-9 pr-3 py-2 border border-outline-variant rounded-md text-xs text-primary focus:outline-none focus:border-primary"
          />
        </div>

        {/* Batch Filter */}
        <div>
          <select
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
            className="w-full px-3 py-2 border border-outline-variant rounded-md text-xs text-primary focus:outline-none focus:border-primary bg-white"
          >
            <option value="">All Cohort Batches</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Module Filter */}
        <div>
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="w-full px-3 py-2 border border-outline-variant rounded-md text-xs text-primary focus:outline-none focus:border-primary bg-white"
          >
            <option value="">All Modules</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                Week {m.orderIndex}: {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-outline-variant rounded-md text-xs text-primary focus:outline-none focus:border-primary bg-white"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </div>
      </div>

      {/* Students Table */}
      <div className="card-ace overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between">
          <div className="font-semibold text-primary text-sm">
            Enrolled Students ({students.length})
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-muted text-sm">Loading student directory...</div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center text-muted text-sm">No students match your query.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface border-b border-outline-variant text-xs uppercase font-bold text-muted">
                <tr>
                  <th className="px-6 py-3">Student</th>
                  <th className="px-6 py-3">Cohort Batch</th>
                  <th className="px-6 py-3">Current Module</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Task Progress</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-surface/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{
                            background: `hsl(${s.name.charCodeAt(0) * 11}, 35%, 40%)`,
                          }}
                        >
                          {s.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-primary">{s.name}</div>
                          <div className="text-xs text-muted flex items-center gap-2 mt-0.5">
                            <span className="flex items-center gap-1">
                              <RiMailLine /> {s.email}
                            </span>
                            <span className="flex items-center gap-1">
                              <RiPhoneLine /> {s.phone}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-secondary font-medium">
                      {s.batch.name}
                    </td>
                    <td className="px-6 py-4">
                      <span className="badge-ace badge-info text-xs">
                        W{s.currentModule.orderIndex}: {s.currentModule.name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {s.status === "ACTIVE" ? (
                        <span className="badge-ace badge-success text-xs">ACTIVE</span>
                      ) : (
                        <span className="badge-ace badge-error text-xs">INACTIVE</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-secondary">
                      {s._count?.studentTasks || 0} Tasks Assigned · {s._count?.reports || 0} Reports
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/admin/students/${s.id}`}
                          className="btn-secondary text-xs py-1 px-2.5 inline-flex items-center gap-1 hover:border-primary"
                        >
                          <span>View</span>
                          <RiArrowRightLine className="text-xs" />
                        </Link>
                        <button
                          onClick={() => handleDeactivateToggle(s)}
                          className={`py-1 px-2.5 rounded border text-xs transition-colors font-medium ${
                            s.status === "ACTIVE"
                              ? "border-outline-variant text-secondary hover:text-amber-700 hover:border-amber-400 bg-white"
                              : "border-green-200 text-green-700 hover:border-green-400 bg-green-50"
                          }`}
                          title={s.status === "ACTIVE" ? "Deactivate Student" : "Re-activate Student"}
                        >
                          {s.status === "ACTIVE" ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(s)}
                          className="p-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-400 transition-colors"
                          title="Permanently Delete Student and All Records"
                        >
                          <RiDeleteBinLine className="text-sm" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-outline-variant rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-outline-variant mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-primary-soft text-primary flex items-center justify-center text-lg">
                  <RiUserAddLine />
                </div>
                <h3 className="font-serif text-xl font-bold text-primary">Enroll Student</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-muted hover:text-primary text-xl"
              >
                <RiCloseLine />
              </button>
            </div>

            <div className="mb-4 p-3 rounded-md bg-primary-soft text-primary text-xs leading-relaxed">
              <strong>Initial Password Policy:</strong> The student&apos;s phone number will be their initial temporary password. A welcome email will be dispatched immediately.
            </div>

            {addError && (
              <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs">
                {addError}
              </div>
            )}

            <form onSubmit={handleManualAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Diya Patel"
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@aceprogram.org"
                  className="w-full px-3 py-2 border border-outline-variant rounded-md text-sm text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1">
                  Phone Number (Initial Temporary Password)
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+919876543210"
                  className="w-full px-3 py-2 border border-outline-variant rounded-md text-sm text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1">
                  Cohort Batch
                </label>
                <select
                  required
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
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
                  Starting Module
                </label>
                <select
                  required
                  value={selectedModuleId}
                  onChange={(e) => setSelectedModuleId(e.target.value)}
                  className="w-full px-3 py-2 border border-outline-variant rounded-md text-sm text-primary focus:outline-none focus:border-primary bg-white"
                >
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      Week {m.orderIndex}: {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
                >
                  {addLoading ? "Enrolling..." : (
                    <>
                      <RiCheckLine />
                      Enroll & Send Welcome Email
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-outline-variant rounded-xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-outline-variant mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-accent-container text-on-accent flex items-center justify-center text-lg">
                  <RiFileUploadLine />
                </div>
                <h3 className="font-serif text-xl font-bold text-primary">Bulk Student Import</h3>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-muted hover:text-primary text-xl"
              >
                <RiCloseLine />
              </button>
            </div>

            <div className="mb-4 text-xs text-secondary leading-relaxed bg-surface p-3 rounded border border-outline-variant">
              <p className="font-semibold text-primary mb-1">Required Spreadsheet Columns:</p>
              <code>name, email, phone, batch, module</code>
              <p className="mt-1 text-muted">
                Accepts <code>.csv</code>, <code>.xlsx</code>, or <code>.xls</code>. Rows with duplicate emails are safely skipped and reported.
              </p>
            </div>

            {importError && (
              <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs">
                {importError}
              </div>
            )}

            {/* Import Summary Results */}
            {importSummary && (
              <div className="mb-5 p-4 rounded-lg bg-primary-soft/60 border border-primary/10">
                <h4 className="font-semibold text-primary text-sm mb-2">Import Summary</h4>
                <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
                  <div className="bg-white p-2 rounded border border-outline-variant">
                    <span className="block font-bold text-primary">{importSummary.totalRows}</span>
                    <span className="text-muted">Total Rows</span>
                  </div>
                  <div className="bg-white p-2 rounded border border-green-200 text-green-700">
                    <span className="block font-bold">{importSummary.importedCount}</span>
                    <span>Enrolled</span>
                  </div>
                  <div className="bg-white p-2 rounded border border-amber-200 text-amber-700">
                    <span className="block font-bold">{importSummary.skippedCount}</span>
                    <span>Duplicates</span>
                  </div>
                </div>

                {importSummary.errors.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs font-semibold text-red-800 mb-1 flex items-center gap-1">
                      <RiAlertLine />
                      Row-Level Notices ({importSummary.errors.length}):
                    </div>
                    <div className="max-h-32 overflow-y-auto space-y-1 bg-white p-2 rounded border border-red-100 text-[11px]">
                      {importSummary.errors.map((err, idx) => (
                        <div key={idx} className="text-red-700">
                          Row {err.row} ({err.email}): {err.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleBulkImport} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1">
                  Upload CSV or Excel File
                </label>
                <input
                  type="file"
                  required
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-dark cursor-pointer"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="btn-secondary text-xs px-4 py-2"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={importLoading || !importFile}
                  className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
                >
                  {importLoading ? "Processing File..." : (
                    <>
                      <RiFileUploadLine />
                      Start Import
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
