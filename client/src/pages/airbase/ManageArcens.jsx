import { useState, useMemo } from "react";
import {
  Shield, Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
  MapPin, Users, Layers, ChevronsUpDown, ChevronUp, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import AirbasePageHeader from "@/components/airbase/AirbasePageHeader";
import ManagementTable from "@/components/airbase/ManagementTable";
import { StatusBadge, MonoCode, PrimaryButton } from "@/components/airbase/AirbaseUI";
import AddEditModal, { FormField, FormInput, FormSelect } from "@/components/airbase/AddEditModal";
import DetailModal, { DetailSection, DetailRow, DetailStatCard } from "@/components/airbase/DetailModal";
import { hierarchyData } from "@/data/hierarchyData";

// ── Flatten ARCENs ────────────────────────────────────────────
function flattenArcens() {
  const rows = [];
  hierarchyData.forEach((area) => {
    area.arcens.forEach((arcen) => {
      const totalSquadrons = arcen.groups.reduce((a, g) => a + g.squadrons.length, 0);
      const totalMembers   = arcen.groups.reduce((a, g) =>
        a + g.squadrons.reduce((b, s) => b + s.members, 0), 0);
      rows.push({
        id:             arcen.id,
        name:           arcen.name,
        fullName:       arcen.fullName,
        code:           arcen.code,
        commander:      arcen.commander,
        location:       arcen.location,
        reservists:     arcen.reservists,
        groups:         arcen.groups.length,
        squadrons:      totalSquadrons,
        members:        totalMembers,
        status:         arcen.status ?? "active",
      });
    });
  });
  return rows;
}

const INITIAL_DATA = flattenArcens();
const EMPTY_FORM   = { name: "", fullName: "", code: "", commander: "", location: "", status: "active" };

const COLUMNS = [
  { key: "name",       label: "ARCEN",      sortable: true },
  { key: "code",       label: "Code",       sortable: true },
  { key: "commander",  label: "Commander",  sortable: true },
  { key: "location",   label: "Location",   sortable: true },
  { key: "groups",     label: "Groups",     sortable: true },
  { key: "squadrons",  label: "Squadrons",  sortable: true },
  { key: "reservists", label: "Reservists", sortable: true },
  { key: "status",     label: "Status",     sortable: false },
];

export default function ManageArcens() {
  const [data,    setData]    = useState(INITIAL_DATA);
  const [detail,  setDetail]  = useState(null);          // selected row for detail modal
  const [editModal, setEditModal] = useState(false);     // add/edit modal
  const [editMode,  setEditMode]  = useState("add");
  const [form,    setForm]    = useState(EMPTY_FORM);

  // ── Handlers ──────────────────────────────────────────────
  const openDetail = (row) => setDetail(row);
  const closeDetail = () => setDetail(null);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditMode("add");
    setEditModal(true);
  };

  const openEdit = (row) => {
    setForm({ name: row.name, fullName: row.fullName, code: row.code, commander: row.commander, location: row.location, status: row.status });
    setEditMode("edit");
    setEditModal(true);
    setDetail(null);
  };

  const closeEdit = () => setEditModal(false);

  const handleSubmit = () => {
    if (editMode === "add") {
      setData((prev) => [...prev, {
        id: `arcen-${Date.now()}`, ...form,
        reservists: 0, groups: 0, squadrons: 0, members: 0,
      }]);
    } else if (detail) {
      const updated = { ...detail, ...form };
      setData((prev) => prev.map((r) => r.id === detail.id ? updated : r));
      setDetail(updated);
    }
    closeEdit();
  };

  const handleDelete = (row) => {
    if (!confirm(`Delete ${row.name}? This cannot be undone.`)) return;
    setData((prev) => prev.filter((r) => r.id !== row.id));
    closeDetail();
  };

  const toggleStatus = (row) => {
    const updated = { ...row, status: row.status === "active" ? "inactive" : "active" };
    setData((prev) => prev.map((r) => r.id === row.id ? updated : r));
    setDetail(updated);
  };

  return (
    <div className="flex flex-col gap-6 pb-10">
      <AirbasePageHeader
        icon={Shield}
        title="Manage ARCENs"
        description="Click any row to view details. Add, edit, or deactivate Air Reserve Centers."
        breadcrumbs={[{ label: "Airbase", path: "/airbase" }, { label: "Manage ARCENs" }]}
        actions={<PrimaryButton icon={Plus} onClick={openAdd}>Add ARCEN</PrimaryButton>}
      />

      {/* Stats */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: "Total ARCENs",     value: data.length },
          { label: "Active",           value: data.filter((r) => r.status === "active").length,   color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Inactive",         value: data.filter((r) => r.status === "inactive").length, color: "text-neutral-400" },
          { label: "Total Reservists", value: data.reduce((a, r) => a + r.reservists, 0).toLocaleString() },
        ].map((s) => (
          <div key={s.label} className={cn(
            "flex flex-col rounded-xl border px-4 py-2.5 min-w-[120px]",
            "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
          )}>
            <span className={cn("text-xl font-bold leading-none", s.color ?? "text-neutral-900 dark:text-neutral-50")}>{s.value}</span>
            <span className="mt-0.5 text-[10px] text-neutral-400">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Table — no action column, rows are clickable */}
      <ManagementTable
        columns={COLUMNS}
        data={data}
        searchKeys={["name", "fullName", "code", "commander", "location"]}
        searchPlaceholder="Search ARCEN name, commander, location…"
        emptyMessage="No ARCENs found."
        renderRow={(row) => (
          <tr
            key={row.id}
            onClick={() => openDetail(row)}
            className="group cursor-pointer hover:bg-indigo-50/60 dark:hover:bg-indigo-500/5 transition-colors duration-100"
          >
            <td className="px-4 py-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[13px] font-bold text-neutral-800 dark:text-neutral-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
                  {row.name}
                </span>
                <span className="text-[10px] text-neutral-400">{row.fullName}</span>
              </div>
            </td>
            <td className="px-4 py-3"><MonoCode>{row.code}</MonoCode></td>
            <td className="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-400">{row.commander}</td>
            <td className="px-4 py-3">
              <span className="flex items-center gap-1 text-xs text-neutral-500">
                <MapPin size={11} className="shrink-0 text-neutral-400" /> {row.location}
              </span>
            </td>
            <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">{row.groups}</td>
            <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">{row.squadrons}</td>
            <td className="px-4 py-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">{row.reservists.toLocaleString()}</td>
            <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
          </tr>
        )}
      />

      {/* ── Detail Modal ────────────────────────────────────── */}
      {detail && (
        <DetailModal
          open={!!detail}
          onClose={closeDetail}
          icon={Shield}
          iconColor="bg-indigo-600"
          title={detail.name}
          subtitle={detail.fullName}
          badge={detail.code}
          size="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              {/* Left — destructive */}
              <button
                onClick={() => handleDelete(detail)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium",
                  "border-red-200 dark:border-red-500/30",
                  "text-red-600 dark:text-red-400",
                  "hover:bg-red-50 dark:hover:bg-red-500/10",
                  "transition-all duration-150"
                )}
              >
                <Trash2 size={14} /> Delete
              </button>

              {/* Right — secondary + primary */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleStatus(detail)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium",
                    "border-neutral-200 dark:border-neutral-700",
                    "text-neutral-600 dark:text-neutral-400",
                    "hover:bg-neutral-50 dark:hover:bg-neutral-800",
                    "transition-all duration-150"
                  )}
                >
                  {detail.status === "active"
                    ? <><ToggleRight size={14} className="text-emerald-500" /> Deactivate</>
                    : <><ToggleLeft  size={14} className="text-neutral-400" /> Activate</>
                  }
                </button>
                <button
                  onClick={() => openEdit(detail)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold",
                    "bg-indigo-600 text-white",
                    "hover:bg-indigo-700 active:bg-indigo-800",
                    "shadow-sm shadow-indigo-200 dark:shadow-indigo-900/30",
                    "transition-all duration-150"
                  )}
                >
                  <Pencil size={14} /> Edit ARCEN
                </button>
              </div>
            </div>
          }
        >
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-5">
            <DetailStatCard label="Reservists"  value={detail.reservists.toLocaleString()} color="text-indigo-600 dark:text-indigo-400" />
            <DetailStatCard label="Groups"      value={detail.groups}     color="text-blue-600 dark:text-blue-400" />
            <DetailStatCard label="Squadrons"   value={detail.squadrons}  color="text-sky-600 dark:text-sky-400" />
            <DetailStatCard label="Status"      value={detail.status === "active" ? "Active" : "Inactive"}
              color={detail.status === "active" ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-400"} />
          </div>

          {/* Details */}
          <DetailSection title="ARCEN Information">
            <DetailRow label="Full Name"  value={detail.fullName}  />
            <DetailRow label="Code"       value={detail.code}      />
            <DetailRow label="Commander"  value={detail.commander} />
            <DetailRow label="Location"   value={detail.location}  />
          </DetailSection>
        </DetailModal>
      )}

      {/* ── Add / Edit Modal ────────────────────────────────── */}
      <AddEditModal
        open={editModal}
        title={editMode === "add" ? "Add New ARCEN" : `Edit ${detail?.name ?? "ARCEN"}`}
        onClose={closeEdit}
        onSubmit={handleSubmit}
        submitLabel={editMode === "add" ? "Add ARCEN" : "Save Changes"}
      >
        <FormField label="ARCEN Name" required>
          <FormInput value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="e.g. 1st ARCEN" />
        </FormField>
        <FormField label="Full Name">
          <FormInput value={form.fullName} onChange={(v) => setForm((f) => ({ ...f, fullName: v }))} placeholder="e.g. 1st Air Reserve Center" />
        </FormField>
        <FormField label="Code" required>
          <FormInput value={form.code} onChange={(v) => setForm((f) => ({ ...f, code: v }))} placeholder="e.g. 1ARCEN" />
        </FormField>
        <FormField label="Commander">
          <FormInput value={form.commander} onChange={(v) => setForm((f) => ({ ...f, commander: v }))} placeholder="e.g. Brig. Gen. Antonio Reyes" />
        </FormField>
        <FormField label="Location">
          <FormInput value={form.location} onChange={(v) => setForm((f) => ({ ...f, location: v }))} placeholder="e.g. Villamor Air Base, Pasay City" />
        </FormField>
        <FormField label="Status">
          <FormSelect value={form.status} onChange={(v) => setForm((f) => ({ ...f, status: v }))}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </FormSelect>
        </FormField>
      </AddEditModal>
    </div>
  );
}