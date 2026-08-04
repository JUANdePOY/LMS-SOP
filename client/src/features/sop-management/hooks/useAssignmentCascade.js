import { useState, useEffect, useCallback, useMemo } from 'react';
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

  const deptMap = useMemo(() => {
    const map = new Map();
    departments.forEach((d) => map.set(d.id, d));
    return map;
  }, [departments]);

  const businessMap = useMemo(() => {
    const map = new Map();
    businesses.forEach((b) => map.set(b.id, b));
    return map;
  }, [businesses]);

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
      setLoading((p) => ({ ...p, positions: false }));
    },
    []
  );

  useEffect(() => { loadPositions(selectedDeptIds); }, [selectedDeptIds, loadPositions]);

  const loadUsers = useCallback(
    async (deptIds) => {
      if (!deptIds.length) {
        setUsers([]);
        setTotalUsers(0);
        setSelectedUserIds([]);
        return;
      }
      setLoading((p) => ({ ...p, users: true }));
      try {
        const allUsers = [];
        const seenIds = new Set();
        for (const deptId of deptIds) {
          try {
            const r = await fetchUsers(deptId, {
              search: userSearch || undefined,
              limit: 100,
            });
            const usersList = Array.isArray(r?.data?.data) ? r.data.data : (r.data?.data?.rows || []);
            const dept = deptMap.get(deptId);
            const business = dept ? businessMap.get(dept.business_id) : null;
            usersList.forEach((user) => {
              if (!seenIds.has(user.id)) {
                seenIds.add(user.id);
                allUsers.push({
                  ...user,
                  department_id: deptId,
                  department_name: dept?.name || '',
                  business_id: dept?.business_id,
                  business_name: business?.business_name || '',
                });
              }
            });
          } catch { /* ignore individual department failures */ }
        }
        setUsers(allUsers);
        setTotalUsers(allUsers.length);
      } catch {
        setUsers([]);
        setTotalUsers(0);
      }
      setLoading((p) => ({ ...p, users: false }));
    },
    [userSearch, deptMap, businessMap]
  );

  useEffect(() => {
    if (selectedDeptIds.length > 0) {
      loadUsers(selectedDeptIds);
    } else {
      setUsers([]);
      setTotalUsers(0);
      setSelectedUserIds([]);
    }
  }, [selectedDeptIds, loadUsers]);

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

  const toggleUsers = useCallback((ids) => {
    setSelectedUserIds((prev) => {
      const allSelected = ids.every((id) => prev.includes(id));
      if (allSelected) {
        const idSet = new Set(ids);
        return prev.filter((u) => !idSet.has(u));
      }
      return Array.from(new Set([...prev, ...ids]));
    });
  }, []);

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
    toggleUsers,
    loading,
    userSearch,
    setUserSearch,
  };
}

export default useAssignmentCascade;
