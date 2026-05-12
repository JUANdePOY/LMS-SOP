import { useState, useEffect } from "react";
import { getTrainings, createTraining, updateTraining, deleteTraining } from "@/services/api";
import { Loader, Plus } from "lucide-react";

export default function Trainings() {
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadTrainings();
  }, []);

  const loadTrainings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getTrainings();
      if (response.data.status === 'success') {
        setTrainings(response.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load trainings');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">Trainings</h1>
        <button className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          <Plus className="h-4 w-4" />
          Add Training
        </button>
      </div>
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-800 dark:text-red-200 mb-4">
          {error}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-neutral-700">
              <th className="px-4 py-2 text-left">Title</th>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {trainings.length > 0 ? trainings.map((training) => (
              <tr key={training.id} className="border-b border-neutral-200 dark:border-neutral-700">
                <td className="px-4 py-2">{training.title || 'N/A'}</td>
                <td className="px-4 py-2">{training.date || 'N/A'}</td>
                <td className="px-4 py-2">{training.status || 'N/A'}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan="3" className="px-4 py-8 text-center text-neutral-500">
                  No trainings found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
