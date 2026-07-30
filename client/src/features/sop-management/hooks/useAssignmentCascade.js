import { useState, useEffect, useCallback } from 'react';
import { fetchBusinesses, fetchDepartments, fetchPositions, fetchUsers } from '@/features/sop-management/services/assignmentService';

export function useAssignmentCascade() {
  const [businesses, setBusinesses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedBusinessIds, setSelectedBusinessIds] = useState([]);
  const [selectedDeptIds, setSelectedDeptIds] = useState([]);
  const [selectedPositions, setSelectedPositions] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [loading, setLoading] = useState({ businesses: false, departments: false, positions: false, users: false });
  const [totalUsers, setTotalUsers] = useState(0);
  const [userSearch, setUserSearch] = useState('');

  useEffect(() => {
    setLoading((p) => ({ ...p, businesses: true }));
    fetchBusinesses()
      .then((r) => setBusinesses(r.data?.data?.rows || []))
      .finally(() => setLoading((p) => ({ ...p, businesses: false })));
  }, []);

  const filteredDepartments = selectedBusinessIds.length > 0
    ? departments.filter((d) => selectedBusinessIds.includes(d.business_id))
    : departments;

  const loadDepartments = useCallback(async () => {
    setLoading((p) => ({ ...p, departments: true }));
    try {
      const r = await fetchDepartments();
      setDepartments(Array.isArray(r?.data?.data) ? r.data.data : (r.data?.data?.rows || []));
    } catch { setDepartments([]); }
    setLoading((p) => ({ ...p, departments: false }));
  }, []);

  useEffect(() => { loadDepartments(); }, [loadDepartments]);

  const loadPositions = useCallback(
    async (deptIds) => {
      if (!deptIds.length) {
        setPositions([]);
        setSelectedPositions([]);
        setUsers([]);
        setSelectedUserIds([]);
        return;
      }
      setLoading((p) => ({ ...p, positions: true }));
      const allPositions = new Set();
      for (const deptId of deptIds) {
        try {
          const r = await fetchPositions(deptId);
          const positionsList = Array.isArray(r?.data?.data) ? r.data.data : (r.data?.data?.rows || []);
          positionsList.forEach((pos) => allPositions.add(pos));
        } catch { /* ignore */ }
      }
      setPositions(Array.from(allPositions).sort());
      setSelectedPositions([]);
      setUsers([]);
      setSelectedUserIds([]);
      setLoading((p) => ({ ...p, positions: false }));
    },
    []
  );

  useEffect(() => { loadPositions(selectedDeptIds); }, [selectedDeptIds, loadPositions]);

  const loadUsers = useCallback(
    async (deptId, posName) => {
      if (!deptId) { setUsers([]); setTotalUsers(0); return; }
      setLoading((p) => ({ ...p, users: true }));
      try {
        const r = await fetchUsers(deptId, {
          positionName: posName || undefined,
          search: userSearch || undefined,
          limit: 100,
        });
        setUsers(Array.isArray(r?.data?.data) ? r.data.data : (r.data?.data?.rows || []));
      } catch { setUsers([]); }
      setLoading((p) => ({ ...p, users: false }));
    },
    [userSearch]
  );

  useEffect(() => {
    const deptId = selectedDeptIds[0];
    const posName = selectedPositions[0];
    if (deptId) {
      loadUsers(deptId, posName);
    } else {
      setUsers([]);
      setTotalUsers(0);
    }
  }, [selectedDeptIds, selectedPositions, loadUsers]);

  const toggleBusiness = (id) =>
    setSelectedBusinessIds((prev) => {
      const next = prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id];
      setSelectedDeptIds([]);
      setSelectedPositions([]);
      setUsers([]);
      setSelectedUserIds([]);
      return next;
    });

  const toggleDepartment = (id) =>
    setSelectedDeptIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );

  const togglePosition = (name) =>
    setSelectedPositions((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]
    );

  const toggleUser = (id) =>
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]
    );

  return {
    businesses,
    filteredDepartments,
    departments,
    positions,
    users,
    totalUsers,
    selectedBusinessIds,
    setSelectedBusinessIds,
    selectedDeptIds,
    setSelectedDeptIds,
    selectedPositions,
    setSelectedPositions,
    selectedUserIds,
    setSelectedUserIds,
    toggleBusiness,
    toggleDepartment,
    togglePosition,
    toggleUser,
    loading,
    userSearch,
    setUserSearch,
  };
}

export default useAssignmentCascade;