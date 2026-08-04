import { useState, useEffect } from "react";
import { getCategories } from "@/features/organization-management/api/category.api";

export default function CourseCreateForm({ onSubmit, onCancel, initialData }) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [categoryId, setCategoryId] = useState(initialData?.category_id || '');
  const [difficulty, setDifficulty] = useState(initialData?.difficulty || 'beginner');
  const [thumbnail, setThumbnail] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(initialData?.thumbnail_url || '');
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  useEffect(() => {
    setLoadingCategories(true);
    getCategories({ status: 'active', limit: 100 })
      .then((res) => {
        const rows = res.data?.rows || res.data || [];
        setCategories(rows);
      })
      .catch(() => setCategories([]))
      .finally(() => setLoadingCategories(false));
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('title', title);
    fd.append('description', description);
    if (categoryId) fd.append('category_id', categoryId);
    fd.append('difficulty', difficulty);
    if (thumbnail) fd.append('thumbnail', thumbnail);
    onSubmit(fd);
  };

  const handleThumbnailChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbnail(file);
    setThumbnailPreview(URL.createObjectURL(file));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-neutral-700 mb-1">Title</label>
        <input name="title" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-700 mb-1">Description</label>
        <textarea name="description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} required className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-700 mb-1">Category</label>
        <select name="category_id" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} disabled={loadingCategories} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
          <option value="">Select category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-700 mb-1">Thumbnail</label>
        <div className="flex items-center gap-3">
          {thumbnailPreview && (
            <img src={thumbnailPreview} alt="Thumbnail preview" className="h-16 w-16 rounded object-cover border border-neutral-200" />
          )}
          <div>
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleThumbnailChange} className="text-xs" />
            <p className="text-[10px] text-neutral-400 mt-1">PNG, JPG up to 2MB</p>
          </div>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-700 mb-1">Difficulty</label>
        <select name="difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm border border-[var(--border)]">Cancel</button>
        <button type="submit" className="rounded-lg px-4 py-2 text-sm bg-blue-600 text-white">Create Course</button>
      </div>
    </form>
  );
}
