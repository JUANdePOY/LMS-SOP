import { useState } from "react";
import { useParams } from "react-router-dom";
import { useDiscussions } from "../hooks/useDiscussions";
import DiscussionTable from "../components/tables/DiscussionTable";

export default function DiscussionManagePage() {
  const { courseId } = useParams();
  const { data: discussions } = useDiscussions(courseId);
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Discussions</h1>
        <button onClick={() => setOpen(true)} className="rounded-lg px-3 py-1.5 text-sm bg-blue-600 text-white">New Discussion</button>
      </div>
      <DiscussionTable discussions={discussions} onToggle={() => {}} />
    </div>
  );
}
