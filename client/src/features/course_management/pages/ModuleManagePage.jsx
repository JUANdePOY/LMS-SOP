import { useState } from "react";
import { useParams } from "react-router-dom";
import { useModules } from "../hooks/useModules";
import { useContentList } from "../hooks/useContentList";
import ModuleTable from "../components/tables/ModuleTable";
import ContentTable from "../components/tables/ContentTable";
import AddModuleModal from "../components/modals/AddModuleModal";
import { FadeIn } from "@/shared/motion";

export default function ModuleManagePage() {
  const { courseId, moduleId } = useParams();
  const { data: modules, refetch } = useModules(courseId);
  const [selectedModule, setSelectedModule] = useState(null);
  const [addModuleOpen, setAddModuleOpen] = useState(false);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Manage Modules</h1>
      <FadeIn>
        {moduleId ? (
          <ContentTab courseId={courseId} moduleId={moduleId} />
        ) : (
          <ModuleTable modules={modules} onEdit={(m) => {}} onDelete={() => refetch?.()} />
        )}
      </FadeIn>
      <AddModuleModal open={addModuleOpen} onClose={() => setAddModuleOpen(false)} onSubmit={() => refetch?.()} />
    </div>
  );
}
