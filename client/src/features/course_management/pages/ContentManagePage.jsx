import { useState } from "react";
import { useParams } from "react-router-dom";
import { useContentList } from "../hooks/useContentList";
import ContentTable from "../components/tables/ContentTable";
import AddContentModal from "../components/modals/AddContentModal";

export default function ContentManagePage() {
  const { courseId, moduleId } = useParams();
  const { data: contents, refetch } = useContentList(courseId, moduleId);
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Manage Content</h1>
      <div className="flex justify-end">
        <button onClick={() => setOpen(true)} className="rounded-lg px-3 py-1.5 text-sm bg-blue-600 text-white">Add Content</button>
      </div>
      <ContentTable contents={contents} onEdit={() => {}} onDelete={() => refetch?.()} />
      <AddContentModal open={open} onClose={() => setOpen(false)} onSubmit={() => refetch?.()} />
    </div>
  );
}
