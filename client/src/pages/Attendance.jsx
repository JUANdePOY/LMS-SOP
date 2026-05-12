import { useState, useEffect } from "react";
import { getAttendance, createAttendance, updateAttendance } from "@/services/api";
import { Loader } from "lucide-react";

export default function Attendance() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAttendance();
  }, []);

  const loadAttendance = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getAttendance();
      if (response.data.status === 'success') {
        setRecords(response.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load attendance records');
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
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 mb-4">Attendance</h1>
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-800 dark:text-red-200 mb-4">
          {error}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-neutral-700">
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {records.length > 0 ? records.map((record) => (
              <tr key={record.id} className="border-b border-neutral-200 dark:border-neutral-700">
                <td className="px-4 py-2">{record.reservist_name || 'N/A'}</td>
                <td className="px-4 py-2">{record.date || 'N/A'}</td>
                <td className="px-4 py-2">{record.status || 'N/A'}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan="3" className="px-4 py-8 text-center text-neutral-500">
                  No attendance records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
