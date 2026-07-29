import { useState } from "react";
import CourseCreateForm from "../components/forms/CourseCreateForm";
import { useCreateCourse } from "../hooks/useCreateCourse";

export default function CourseCreatePage() {
  const { create, loading } = useCreateCourse();
  const [created, setCreated] = useState(null);

  const handleSubmit = async (values) => {
    const result = await create(values);
    setCreated(result.data || result);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl font-bold">Create New Course</h1>
      {created ? (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm">
          Course created successfully! ID: {created.id}
        </div>
      ) : (
        <CourseCreateForm onSubmit={handleSubmit} onCancel={() => history.back()} />
      )}
    </div>
  );
}
