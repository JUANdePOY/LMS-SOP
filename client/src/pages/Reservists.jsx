import { useState, useMemo, useEffect } from "react";
import { UserSquare, Plus, Search, X, Loader } from "lucide-react";
import { cn } from "@/lib/utils";
import { getReservists, createReservist, updateReservist, deleteReservist } from "@/services/api";
import AirbasePageHeader from "@/components/airbase/AirbasePageHeader";
import { PrimaryButton } from "@/components/airbase/AirbaseUI";
import ReservistStatsBar    from "@/components/reservists/ReservistStatsBar";
import ReservistFilters, { DEFAULT_FILTERS } from "@/components/reservists/ReservistFilters";
import ReservistTable       from "@/components/reservists/ReservistTable";
import ReservistModal       from "@/components/reservists/ReservistModal";
import ReservistDetailPanel from "@/components/reservists/ReservistDetailPanel";

const EMPTY_FORM = {
  firstName: "", lastName: "", serialNo: "", dateEnlisted: "",
  rank: "", status: "active", squadron: "", group: "", arcen: "", airbase: "",
  specialization: "", civilOccupation: "", contact: "", address: "",
  readinessScore: 0, attendanceRate: 0, trainingsCompleted: 0,
  email: "", password: "",
};

/**
 * Reservists page
 * Full CRUD management: search, multi-level filter, sortable table,
 * add/edit modal, detail slide panel, status toggle, delete.
 */
export default function Reservists() {
  const [data,          setData]          = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [search,        setSearch]        = useState("");
  const [filters,       setFilters]       = useState(DEFAULT_FILTERS);
  const [modal,         setModal]         = useState({ open: false, mode: "add", row: null });
  const [form,          setForm]          = useState(EMPTY_FORM);
  const [detailRow,     setDetailRow]     = useState(null);

// Transform API data to frontend format
   const transformReservistData = (apiData) => {
     return apiData.map(r => ({
       id: r.id,
       firstName: r.first_name || '',
       lastName: r.last_name || '',
       serialNo: r.service_number || '',
       rank: r.rank || '',
       status: r.is_active ? 'active' : 'inactive',
       reserveStatus: r.reserve_status || 'Ready Reserve',
       squadron: r.squadron_name || '',
       squadronId: r.squadron_id || '',
       group: r.group_name || '',
       groupId: r.group_id || '',
       arcen: r.arcen || '',
       airbase: r.airbase || '',
       specialization: r.specialization || '',
       civilOccupation: r.occupation || '',
       contact: r.phone_number || '',
       address: r.address || '',
       dateEnlisted: r.date_enlisted || '',
       readinessScore: r.readiness_score || 0,
       attendanceRate: r.attendance_rate || 0,
       trainingsCompleted: r.trainings_completed || 0,
     }));
   };

   // Load reservists from API
   useEffect(() => {
     loadReservists();
   }, []);

const loadReservists = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = {};
        if (search) {
          params.search = search;
        }
        if (filters.status && filters.status !== '' && filters.status !== 'all') {
          params.status = filters.status;
        }
        if (filters.squadron && filters.squadron !== '') {
          params.squadron_id = parseInt(filters.squadron);
        }
        const response = await getReservists(params);
        if (response.data.status === 'success') {
          setData(transformReservistData(response.data.data));
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load reservists');
      } finally {
        setLoading(false);
      }
    };

  // ── Apply search + filters ────────────────────────────────────
  const filteredData = useMemo(() => {
    return data.filter((r) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          r.firstName?.toLowerCase().includes(q) ||
          r.lastName?.toLowerCase().includes(q)  ||
          r.serialNo?.toLowerCase().includes(q)  ||
          r.rank?.toLowerCase().includes(q)      ||
          r.squadron?.toLowerCase().includes(q);
        if (!match) return false;
      }
      // Filters
      if (filters.airbase        && r.airbase        !== filters.airbase)        return false;
      if (filters.arcen          && r.arcen          !== filters.arcen)          return false;
      if (filters.group          && r.group          !== filters.group)          return false;
      if (filters.squadron       && r.squadron       !== filters.squadron)       return false;
      if (filters.rank           && r.rank           !== filters.rank)           return false;
      if (filters.specialization && r.specialization !== filters.specialization) return false;
      if (filters.status         && r.status         !== filters.status)         return false;
      return true;
    });
  }, [data, search, filters]);

  // ── Modal helpers ──────────────────────────────────────────────
  const openAdd = () => {
    setForm(EMPTY_FORM);
    setModal({ open: true, mode: "add", row: null });
  };

const openEdit = (row) => {
     setForm({
       firstName: row.firstName,
       lastName: row.lastName,
       serialNo: row.serialNo,
       dateEnlisted: row.dateEnlisted,
       rank: row.rank,
       status: row.status || 'active',
       squadron: row.squadronId || '',
       group: row.groupId || '',
       arcen: row.arcen || '',
       airbase: row.airbase || '',
       specialization: row.specialization || '',
       civilOccupation: row.civilOccupation || '',
       contact: row.contact || '',
       address: row.address || '',
       readinessScore: row.readinessScore || 0,
       attendanceRate: row.attendanceRate || 0,
       trainingsCompleted: row.trainingsCompleted || 0,
     });
     setModal({ open: true, mode: "edit", row });
     setDetailRow(null);
   };

  const closeModal = () => setModal((m) => ({ ...m, open: false }));

const handleSubmit = async () => {
     try {
       if (modal.mode === "add") {
         const response = await createReservist({
           email: form.email || `${form.firstName.toLowerCase()}.${form.lastName.toLowerCase()}@example.com`,
           password: form.password || 'password123',
           first_name: form.firstName,
           last_name: form.lastName,
           service_number: form.serialNo,
           rank: form.rank,
           ...(form.squadron && { squadron_id: parseInt(form.squadron) }),
           ...(form.group && { group_id: parseInt(form.group) }),
           date_enlisted: form.dateEnlisted,
           phone_number: form.contact,
           address: form.address,
           specialization: form.specialization,
           occupation: form.civilOccupation,
         });
         if (response.data.status === 'success') {
           setData((prev) => [...prev, transformReservistData([response.data.data])[0]]);
         }
       } else {
         const response = await updateReservist(modal.row.id, {
           first_name: form.firstName,
           last_name: form.lastName,
           rank: form.rank,
         });
         if (response.data.status === 'success') {
           const updatedReservist = transformReservistData([response.data.data])[0];
           setData((prev) =>
             prev.map((r) => r.id === modal.row.id ? updatedReservist : r)
           );
           if (detailRow?.id === modal.row.id) {
             setDetailRow(updatedReservist);
           }
         }
       }
       closeModal();
     } catch (err) {
       setError(err.response?.data?.message || 'Operation failed');
     }
   };

  const handleDelete = async (id) => {
    if (!confirm("Delete this reservist? This action cannot be undone.")) return;
    try {
      await deleteReservist(id);
      setData((prev) => prev.filter((r) => r.id !== id));
      if (detailRow?.id === id) setDetailRow(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed');
    }
  };

const toggleStatus = async (id) => {
     try {
       const reservist = data.find(r => r.id === id);
       const response = await updateReservist(id, {
         is_active: reservist.status !== 'active'
       });
       if (response.data.status === 'success') {
         const updatedReservist = transformReservistData([response.data.data])[0];
         setData((prev) =>
           prev.map((r) =>
             r.id === id ? updatedReservist : r
           )
         );
         if (detailRow?.id === id) {
           setDetailRow(updatedReservist);
         }
       }
     } catch (err) {
       setError(err.response?.data?.message || 'Status update failed');
     }
   };

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* ── Loading state ─────────────────────────────────────────── */}
      {loading && (
        <div className="flex h-40 items-center justify-center">
          <Loader className="h-6 w-6 animate-spin text-indigo-500" />
        </div>
      )}

      {/* ── Error state ───────────────────────────────────────────── */}
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      {!loading && (
        <>
          {/* ── Page header ─────────────────────────────────────── */}
          <AirbasePageHeader
            icon={UserSquare}
            title="Reservists"
            description="Manage all Philippine Air Force reservist records, assignments, and status."
            breadcrumbs={[{ label: "Reservists" }]}
            actions={<PrimaryButton icon={Plus} onClick={openAdd}>Add Reservist</PrimaryButton>}
          />

          {/* ── Stats ───────────────────────────────────────────── */}
          <ReservistStatsBar data={data} />

          {/* ── Search bar ──────────────────────────────────────── */}
          <div className="relative max-w-sm">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, serial no., rank, squadron…"
              className={cn(
                "w-full rounded-lg border py-2 pl-8 pr-8 text-sm",
                "border-neutral-200 dark:border-neutral-700",
                "bg-white dark:bg-neutral-900",
                "text-neutral-800 dark:text-neutral-200",
                "placeholder:text-neutral-400 dark:placeholder:text-neutral-600",
                "outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400",
                "transition-all duration-150"
              )}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* ── Filters ─────────────────────────────────────────── */}
          <ReservistFilters filters={filters} onChange={setFilters} />

          {/* ── Table ───────────────────────────────────────────── */}
          <ReservistTable
            data={filteredData}
            onView={setDetailRow}
            onEdit={openEdit}
            onDelete={handleDelete}
            onToggleStatus={toggleStatus}
          />

          {/* ── Add / Edit Modal ─────────────────────────────────── */}
          <ReservistModal
            open={modal.open}
            mode={modal.mode}
            form={form}
            onChange={setForm}
            onClose={closeModal}
            onSubmit={handleSubmit}
          />

          {/* ── Detail slide panel ───────────────────────────────── */}
          {detailRow && (
            <ReservistDetailPanel
              reservist={detailRow}
              onClose={() => setDetailRow(null)}
              onEdit={() => openEdit(detailRow)}
            />
          )}
        </>
      )}
    </div>
  );
}