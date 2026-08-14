import { useState } from "react";
import { useParams } from "react-router-dom";
import { useDiscussions } from "../hooks/useDiscussions";
import DiscussionTable from "../components/tables/DiscussionTable";
import { FadeIn } from "@/shared/motion";

export default function DiscussionManagePage() {
  const { courseId } = useParams();
  const { data: discussions } = useDiscussions(courseId);
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Discussions</h1>
        <button onClick={() => setOpen(true)} className="rounded-lg px-3 py-1.5 text-sm btn-primary">New Discussion</button>
      </div>
      <FadeIn>
        <DiscussionTable discussions={discussions} onToggle={() => {}} />
      </FadeIn>
    </div>
  );
}
