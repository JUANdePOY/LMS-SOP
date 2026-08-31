import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '@/services/api';
import { useOrgTreeVersion } from '@/shared/store/orgTreeBus';

/**
 * Builds the secondary-panel tree: SOP Business -> Clients -> (client) Business units.
 *
 * - SOP businesses come from `GET /businesses` (the top-level `businesses` table
 *   that powers the SOP dashboard).
 * - Clients come from `GET /clients`, each already carrying `business_id` (the
 *   SOP business it belongs to) and its `businesses` array (the client's own
 *   client_businesses units, used as the 3rd level and as /tasks deep links).
 *
 * Clients with no `business_id` are surfaced under an "Unassigned" pseudo-group
 * so they are never orphaned from the panel.
 */
export function useBusinessClientTree() {
  const [businesses, setBusinesses] = useState([]);
  const [clients, setClients] = useState([]);
  const [projectsByBiz, setProjectsByBiz] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch independently: a failure on one endpoint (e.g. the businesses
      // list being unavailable for a given role) must not blank the other list,
      // otherwise the whole secondary panel renders empty.
      const [bizRes, clientRes, projectRes] = await Promise.allSettled([
        api.get('/businesses', { params: { limit: 1000 } }),
        api.get('/clients'),
        api.get('/projects', { params: { limit: 1000 } }),
      ]);

      const bizRows = bizRes.status === 'fulfilled'
        ? (bizRes.value?.data?.data?.rows || bizRes.value?.data?.rows || [])
        : [];
      const clientRows = clientRes.status === 'fulfilled'
        ? (Array.isArray(clientRes.value?.data?.data)
            ? clientRes.value.data.data
            : (clientRes.value?.data?.rows || []))
        : [];
      const projectRows = projectRes.status === 'fulfilled'
        ? (projectRes.value?.data?.data?.rows || projectRes.value?.data?.rows || [])
        : [];

      // Group projects by the client business unit they belong to so each unit
      // can list its projects (used for deep-linking into a single project).
      const projectsByBiz = {};
      for (const p of projectRows) {
        const bid = p.client_business_id != null ? Number(p.client_business_id) : null;
        if (bid == null) continue;
        (projectsByBiz[bid] = projectsByBiz[bid] || []).push({
          id: p.id,
          name: p.name || p.project_name || `Project ${p.id}`,
        });
      }

      setBusinesses(
        bizRows
          .map((b) => {
            const name = (b.business_name || b.name || '').toString().trim();
            return { id: b.id, name: name || `Business ${b.id}` };
          })
          .filter((b) => b.id != null)
      );
      setClients(Array.isArray(clientRows) ? clientRows : []);
      setProjectsByBiz(projectsByBiz);
    } catch (err) {
      setError(err?.message || 'Failed to load business/client tree');
    } finally {
      setLoading(false);
    }
  }, []);

  const orgVersion = useOrgTreeVersion();

  useEffect(() => {
    load();
  }, [load, orgVersion]);

  const { grouped, unassigned } = useMemo(() => {
    const byBiz = {};
    const unassignedClients = [];
    for (const c of clients) {
      const bizId = c.business_id ? Number(c.business_id) : null;
      if (bizId == null) {
        unassignedClients.push(c);
        continue;
      }
      if (!byBiz[bizId]) byBiz[bizId] = [];
      byBiz[bizId].push(c);
    }
    return { grouped: byBiz, unassigned: unassignedClients };
  }, [clients]);

  const tree = useMemo(
    () => ({
      businesses: businesses.map((b) => ({
        ...b,
        clients: (grouped[Number(b.id)] || []).map((c) => ({
          ...c,
          businesses: (c.businesses || []).map((u) => ({
            ...u,
            projects: projectsByBiz[Number(u.id)] || [],
          })),
        })),
      })),
      unassigned: (unassigned || []).map((c) => ({
        ...c,
        businesses: (c.businesses || []).map((u) => ({
          ...u,
          projects: projectsByBiz[Number(u.id)] || [],
        })),
      })),
    }),
    [businesses, grouped, unassigned, projectsByBiz]
  );

  return { ...tree, loading, error, refresh: load };
}
