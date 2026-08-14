import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { StaggerList, MotionItem, FadeIn } from '@/shared/motion';

function SOPVersionPage() {
  const { id, versionId } = useParams();
  const sopId = id;
  const navigate = useNavigate();
  const [version, setVersion] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
      const [versionRes, modulesRes] = await Promise.all([
        api.get(`/sops/${sopId}/versions/${versionId}`),
        api.get(`/sops/${sopId}/modules?versionId=${versionId}`),
      ]);
        setVersion(versionRes.data?.data || null);
        setModules(modulesRes.data?.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [sopId, versionId]);

  const handleRestore = async () => {
    setRestoring(true);
    try {
      await api.post(`/sops/${sopId}/versions/${versionId}/restore`);
      navigate(`/sops/${sopId}`);
    } catch (err) {
      console.error(err);
    } finally {
      setRestoring(false);
    }
  };

  if (loading) return <p>Loading version...</p>;
  if (!version) return <p>Version not found.</p>;

  return (
    <div className="sop-version-page p-4">
      <h1 className="text-xl font-bold mb-4">Version {version.version}</h1>
      <div className="mb-4">
        <span className="px-2 py-1 rounded text-sm bg-gray-100">{version.status}</span>
        {version.is_current && (
          <span className="ml-2 px-2 py-1 rounded text-sm bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            Current
          </span>
        )}
        {version.change_summary && (
          <p className="text-sm text-gray-600 mt-2">{version.change_summary}</p>
        )}
        <p className="text-xs text-gray-400 mt-2">
          Created by {version.created_by} on {new Date(version.created_at).toLocaleDateString()}
        </p>
      </div>
      <h2 className="font-medium mb-2">Modules</h2>
      <StaggerList className="space-y-2">
        {modules.map((mod) => (
          <MotionItem key={mod.id} className="border rounded p-3">
            <h3 className="font-medium">{mod.title}</h3>
            <p className="text-sm text-gray-600">{mod.content?.replace(/<[^>]*>/g, '')?.substring(0, 200)}</p>
          </MotionItem>
        ))}
      </StaggerList>
      <div className="mt-6">
        <button
          onClick={handleRestore}
          disabled={restoring}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md disabled:opacity-50 transition-colors"
        >
          {restoring ? 'Restoring...' : 'Restore this version'}
        </button>
      </div>
    </div>
  );
}

export default SOPVersionPage;