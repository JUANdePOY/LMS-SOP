import { useState, useEffect, useCallback } from "react";
import RichTextEditor from "@/features/sop-management/components/SOPEditor/RichTextEditor";
import { useAuth } from "@/contexts/AuthContext";
import { getBusinesses } from "@/features/organization-management/api/business.api";
import { getDepartments } from "@/features/organization-management/api/department.api";
import { resolveFileUrl, resolveBodyImages } from "@/lib/fileUrl";
import api from "@/services/api";

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const TYPE_OPTIONS = [
  { value: "General", label: "General" },
  { value: "Training", label: "Training" },
  { value: "Deployment", label: "Deployment" },
  { value: "Administrative", label: "Administrative" },
  { value: "Emergency", label: "Emergency" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export default function AnnouncementForm({ initialData, onSubmit, onCancel, saving }) {
  const { user } = useAuth();
  const role = user?.role || "";
  const isSuperAdmin = role === "super_admin";
  const scopedBusinessId = user?.business_id || null;

  const [title, setTitle] = useState(initialData?.title || "");
  const [body, setBody] = useState(initialData?.body || "");
  const [type, setType] = useState(initialData?.type || "General");
  const [priority, setPriority] = useState(initialData?.priority || "medium");
  const [status, setStatus] = useState(initialData?.status || "active");

  const [businessId, setBusinessId] = useState(() => initialData?.business_id || scopedBusinessId || "");
  const [targetDepartmentCode, setTargetDepartmentCode] = useState(() => {
    if (!initialData?.target_departments) return "";
    const codes = Array.isArray(initialData.target_departments) ? initialData.target_departments : [];
    return codes.length === 1 ? codes[0] : "";
  });
  const [businesses, setBusinesses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState({ businesses: false, departments: false });

  const fetchBusinesses = useCallback(async () => {
    setLoadingOptions((p) => ({ ...p, businesses: true }));
    try {
      const params = { status: "active", limit: 100 };
      if (!isSuperAdmin && scopedBusinessId) {
        params.business_id = String(scopedBusinessId);
      }
      const res = await getBusinesses(params);
      setBusinesses(res?.data?.data?.rows || []);
    } catch {
      setBusinesses([]);
    } finally {
      setLoadingOptions((p) => ({ ...p, businesses: false }));
    }
  }, [isSuperAdmin, scopedBusinessId]);

  const fetchDepartments = useCallback(async (busId) => {
    setLoadingOptions((p) => ({ ...p, departments: true }));
    try {
      const params = { status: "active", limit: 200 };
      if (!isSuperAdmin && scopedBusinessId) {
        params.business_id = String(scopedBusinessId);
      } else if (busId) {
        params.business_id = String(busId);
      }
      const res = await getDepartments(params);
      let rows = res?.data?.data?.rows || [];
      if (!isSuperAdmin && scopedBusinessId) {
        rows = rows.filter((d) => String(d.business_id) === String(scopedBusinessId));
      }
      setDepartments(rows);
    } catch {
      setDepartments([]);
    } finally {
      setLoadingOptions((p) => ({ ...p, departments: false }));
    }
  }, [isSuperAdmin, scopedBusinessId]);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  useEffect(() => {
    if (businessId) {
      fetchDepartments(businessId);
    } else {
      setDepartments([]);
    }
    setTargetDepartmentCode("");
  }, [businessId, fetchDepartments]);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setBody(initialData.body || "");
      setType(initialData.type || "General");
      setPriority(initialData.priority || "medium");
      setStatus(initialData.status || "active");
      const initBusinessId = initialData.business_id || scopedBusinessId || "";
      setBusinessId(initBusinessId);
      if (initialData.target_departments) {
        const codes = Array.isArray(initialData.target_departments) ? initialData.target_departments : [];
        setTargetDepartmentCode(codes.length === 1 ? codes[0] : "");
      } else {
        setTargetDepartmentCode("");
      }
    }
  }, [initialData, scopedBusinessId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    const targetDepartments = targetDepartmentCode ? [targetDepartmentCode] : null;
    onSubmit({
      title: title.trim(),
      body: body.trim(),
      type,
      priority,
      status,
      business_id: businessId ? Number(businessId) : null,
      target_departments: targetDepartments,
    });
  };

  const filteredDepartments = departments.filter((d) => {
    if (!businessId) return false;
    return String(d.business_id) === String(businessId);
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-neutral-700 mb-1">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
          placeholder="Announcement title"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-700 mb-1">Content</label>
        <RichTextEditor
          value={resolveBodyImages(body)}
          onChange={(html) => setBody(html)}
          placeholder="Enter announcement content..."
          onImageUpload={async (file) => {
            const formData = new FormData();
            formData.append('file', file);
            const res = await api.post('/announcements/upload-image', formData);
            return resolveFileUrl(res.data.url);
          }}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">Business</label>
          <select
            value={businessId}
            onChange={(e) => setBusinessId(e.target.value)}
            disabled={loadingOptions.businesses || !isSuperAdmin}
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <option value="">{isSuperAdmin ? "All Businesses" : "My Business"}</option>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>{b.business_name || b.business_code}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">Target Department</label>
          <select
            value={targetDepartmentCode}
            onChange={(e) => setTargetDepartmentCode(e.target.value)}
            disabled={loadingOptions.departments || !businessId}
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <option value="">All Departments</option>
            {filteredDepartments.map((d) => (
              <option key={d.id} value={d.code}>{d.name}</option>
            ))}
          </select>
          {!businessId && (
            <p className="text-[10px] text-neutral-400 mt-1">Select a business first.</p>
          )}
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm border border-neutral-300 dark:border-neutral-600">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="rounded-lg px-4 py-2 text-sm btn-primary disabled:opacity-50">
          {saving ? "Saving..." : initialData ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
}
