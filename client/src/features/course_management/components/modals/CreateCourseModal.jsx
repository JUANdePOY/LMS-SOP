import { useEffect, useState } from "react";
import { Modal } from "@/shared/components/ui/modal";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Loader2 } from "lucide-react";
import { useToast } from "@/shared/components/ui/Toast";
import { getBusinesses } from "@/features/organization-management/api/business.api";
import { getDepartments } from "@/services/api";
import { getCategories } from "@/features/organization-management/api/category.api";

export default function CreateCourseModal({ open, onClose, loading, course = null, onSuccess }) {
  const { toast } = useToast();
  const isEdit = Boolean(course);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [businesses, setBusinesses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState({ businesses: false, departments: false, categories: false });
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (isEdit && course) {
      setTitle(course.title || "");
      setDescription(course.description || "");
      setThumbnailUrl(course.thumbnail_url || "");
      setBusinessId(course.business_id || course.businesses?.id || "");
      setCategory(course.category || "");
      setCategoryId(course.category_id || "");
      setDepartmentId(course.department_id || "");
      fetchBusinesses();
    } else if (!isEdit) {
      setTitle("");
      setDescription("");
      setCategory("");
      setBusinessId("");
      setDepartmentId("");
      setCategoryId("");
      setThumbnailUrl("");
      fetchBusinesses();
      fetchDepartments();
    }
  }, [open, isEdit, course]);

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      fetchDepartments(businessId ? businessId : undefined);
      return;
    }
    if (!businessId) {
      setDepartmentId("");
      setCategories([]);
      setCategory("");
      setCategoryId("");
      fetchDepartments();
      return;
    }
    setDepartmentId("");
    setCategories([]);
    setCategory("");
    setCategoryId("");
    fetchDepartments(businessId);
  }, [businessId, open, isEdit]);

  useEffect(() => {
    if (!open || !departmentId) {
      if (!departmentId && !isEdit) {
        setCategories([]);
        setCategory("");
        setCategoryId("");
      }
      return;
    }
    fetchCategories(departmentId);
  }, [departmentId, open, isEdit]);

  const fetchBusinesses = async () => {
    setLoadingOptions((p) => ({ ...p, businesses: true }));
    try {
      const res = await getBusinesses({ status: "active", limit: 100 });
      const rows = res?.data?.data?.rows || [];
      setBusinesses(rows);
    } catch {
      setBusinesses([]);
    } finally {
      setLoadingOptions((p) => ({ ...p, businesses: false }));
    }
  };

  const fetchDepartments = async (busId) => {
    setLoadingOptions((p) => ({ ...p, departments: true }));
    try {
      const params = { status: "all", limit: 200 };
      if (busId) params.business_id = busId;
      const res = await getDepartments(params);
      const rows = res?.data?.data?.rows || [];
      setDepartments(rows);
    } catch {
      setDepartments([]);
    } finally {
      setLoadingOptions((p) => ({ ...p, departments: false }));
    }
  };

  const fetchCategories = async (deptId) => {
    setLoadingOptions((p) => ({ ...p, categories: true }));
    try {
      const res = await getCategories({ department_id: deptId, limit: 200 });
      const rows = res?.data?.data?.rows || [];
      setCategories(rows);
    } catch {
      setCategories([]);
    } finally {
      setLoadingOptions((p) => ({ ...p, categories: false }));
    }
  };

  const handleCategoryChange = (e) => {
    const value = e.target.value;
    const selected = categories.find((c) => String(c.id) === value);
    if (selected) {
      setCategoryId(selected.id);
      setCategory(selected.name);
    } else {
      setCategoryId("");
      setCategory(value);
    }
  };

  const handleBusinessChange = (e) => {
    const value = e.target.value;
    setBusinessId(value);
    setDepartmentId("");
    setCategories([]);
    setCategory("");
    setCategoryId("");
  };

  const handleDepartmentChange = (e) => {
    const value = e.target.value;
    setDepartmentId(value);
    setCategories([]);
    setCategory("");
    setCategoryId("");
  };

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const handleThumbnailUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingThumbnail(true);
    try {
      const { uploadCourseThumbnail } = await import("@/features/course_management/api/course.api");
      const res = await uploadCourseThumbnail(file);
      const url = res?.data?.thumbnail_url;
      if (url) {
        setThumbnailUrl(url);
      } else {
        throw new Error(res?.data?.message || "Upload failed");
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message || "Failed to upload thumbnail";
      alert(message);
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const handleCreate = async () => {
    if (loading || !title.trim()) return;
    try {
      const payload = {
        title: title.trim(),
        description,
        category,
        category_id: categoryId ? parseInt(categoryId, 10) : undefined,
        department_id: departmentId ? parseInt(departmentId, 10) : undefined,
        modules: [],
        thumbnail_url: thumbnailUrl.trim() || undefined,
      };

      if (isEdit) {
        payload.status = course.status || undefined;
        const { builderUpdate } = await import("@/features/course_management/api/course.api");
        const res = await builderUpdate(course.id, payload);
        if (res?.success) {
          toast.success("Course updated successfully");
          onSuccess?.();
          onClose?.();
        } else {
          throw new Error(res?.data?.message || res?.message || "Failed to update course");
        }
      } else {
        const { builderCreate } = await import("@/features/course_management/api/course.api");
        const res = await builderCreate(payload);
        if (res?.success || res?.data?.success || res === 201) {
          toast.success("Course created successfully");
          onSuccess?.();
          onClose?.();
        } else {
          throw new Error(res.data?.message || "Failed to create course");
        }
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message || (isEdit ? "Failed to update course" : "Failed to create course");
      alert(message);
    }
  };

  const selectClassName = "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800";

  if (!open) return null;

  return (
    <Modal open={open} title={isEdit ? "Edit Course" : "Add Course"} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Course Title <span className="text-red-500">*</span></label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Advanced Workplace Safety"
            className={selectClassName}
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What will learners accomplish in this course?"
            className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-sm"
            rows={3}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Business</label>
            <select
              value={businessId}
              onChange={handleBusinessChange}
              disabled={loadingOptions.businesses || loading}
              className={`w-full rounded-md border px-2.5 py-1.5 text-sm ${selectClassName}`}
            >
              <option value="">All Businesses</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>{b.business_name || b.business_code}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Department</label>
            <select
              value={departmentId}
              onChange={handleDepartmentChange}
              disabled={loadingOptions.departments || loading}
              className={`w-full rounded-md border px-2.5 py-1.5 text-sm ${selectClassName}`}
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Category</label>
          <select
            value={categoryId}
            onChange={handleCategoryChange}
            disabled={loadingOptions.categories || !departmentId || loading}
            className={`w-full rounded-md border px-2.5 py-1.5 text-sm ${selectClassName}`}
          >
            <option value="">Select a department first</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Thumbnail</label>
          <div className="flex items-center gap-3">
            {thumbnailUrl && (
              <img
                src={thumbnailUrl}
                alt="Thumbnail preview"
                className="h-16 w-16 rounded-md object-cover border border-neutral-200 dark:border-neutral-700"
              />
            )}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-neutral-600 dark:text-neutral-400">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleThumbnailUpload}
                  disabled={uploadingThumbnail || loading}
                  className="file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-neutral-700 dark:file:text-neutral-200"
                />
              </label>
              <p className="text-[10px] text-neutral-400">PNG, JPG, WebP up to 10MB</p>
            </div>
          </div>
          {thumbnailUrl && (
            <Input
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="Or paste an image URL"
              className={`mt-2 ${selectClassName}`}
            />
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} className="border-neutral-200 dark:border-neutral-700">
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading || !title.trim()} className="shadow-sm">
            {loading && <Loader2 size={16} className="animate-spin mr-2" />}
            {isEdit ? "Save Changes" : "Create Course"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
