import { useState, useMemo } from "react";
import { UserSquare, Plus, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { reservistsData as INITIAL_DATA } from "@/data/reservistsData";
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
};

/**
 * Reservists page
 * Full CRUD management: search, multi-level filter, sortable table,
 * add/edit modal, detail slide panel, status toggle, delete.
 */
export default function Reservists() {
  const [data,          setData]          = useState(INITIAL_DATA);
  const [search,        setSearch]        = useState("");
  const [filters,       setFilters]       = useState(DEFAULT_FILTERS);
  const [modal,         setModal]         = useState({ open: false, mode: "add", row: null });
  const [form,          setForm]          = useState(EMPTY_FORM);
  const [detailRow,     setDetailRow]     = useState(null);

  // ── Apply search + filters ────────────────────────────────────
  const filteredData = useMemo(() => {
    return data.filter((r) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          r.firstName.toLowerCase().includes(q) ||
          r.lastName.toLowerCase().includes(q)  ||
          r.serialNo.toLowerCase().includes(q)  ||
          r.rank.toLowerCase().includes(q)      ||
          r.squadron.toLowerCase().includes(q);
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
      firstName: row.firstName, lastName: row.lastName,
      serialNo: row.serialNo, dateEnlisted: row.dateEnlisted,
      rank: row.rank, status: row.status,
      squadron: row.squadron, group: row.group,
      arcen: row.arcen, airbase: row.airbase,
      specialization: row.specialization,
      civilOccupation: row.civilOccupation,
      contact: row.contact, address: row.address,
      readinessScore: row.readinessScore,
      attendanceRate: row.attendanceRate,
      trainingsCompleted: row.trainingsCompleted,
    });
    setModal({ open: true, mode: "edit", row });
    setDetailRow(null);
  };

  const closeModal = () => setModal((m) => ({ ...m, open: false }));

  const handleSubmit = () => {
    if (modal.mode === "add") {
      setData((prev) => [...prev, {
        ...form,
        id: `rsv-${Date.now()}`,
        readinessScore: 0,
        attendanceRate: 0,
        trainingsCompleted: 0,
      }]);
    } else {
      setData((prev) =>
        prev.map((r) => r.id === modal.row.id ? { ...r, ...form } : r)
      );
      // Update detail panel if open
      if (detailRow?.id === modal.row.id) {
        setDetailRow((prev) => ({ ...prev, ...form }));
      }
    }
    closeModal();
  };

  const handleDelete = (id) => {
    if (!confirm("Delete this reservist? This action cannot be undone.")) return;
    setData((prev) => prev.filter((r) => r.id !== id));
    if (detailRow?.id === id) setDetailRow(null);
  };

  const toggleStatus = (id) => {
    setData((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: r.status === "active" ? "inactive" : "active" }
          : r
      )
    );
    if (detailRow?.id === id) {
      setDetailRow((prev) => ({
        ...prev,
        status: prev.status === "active" ? "inactive" : "active",
      }));
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-10">
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
    </div>
  );
}