import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '@/services/api';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch independently: a failure on one endpoint (e.g. the businesses
      // list being unavailable for a given role) must not blank the other list,
      // otherwise the whole secondary panel renders empty.
      const [bizRes, clientRes] = await Promise.allSettled([
        api.get('/businesses', { params: { limit: 1000 } }),
        api.get('/clients'),
      ]);

      const bizRows = bizRes.status === 'fulfilled'
        ? (bizRes.value?.data?.data?.rows || bizRes.value?.data?.rows || [])
        : [];
      const clientRows = clientRes.status === 'fulfilled'
        ? (Array.isArray(clientRes.value?.data?.data)
            ? clientRes.value.data.data
            : (clientRes.value?.data?.rows || []))
        : [];

      setBusinesses(
        bizRows
          .map((b) => {
            const name = (b.business_name || b.name || '').toString().trim();
            return { id: b.id, name: name || `Business ${b.id}` };
          })
          .filter((b) => b.id != null)
      );
      setClients(Array.isArray(clientRows) ? clientRows : []);
    } catch (err) {
      setError(err?.message || 'Failed to load business/client tree');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
        clients: grouped[Number(b.id)] || [],
      })),
      unassigned,
    }),
    [businesses, grouped, unassigned]
  );

  return { ...tree, loading, error, refresh: load };
}
