import { useState, useMemo } from "react";
import { Shield, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, MapPin, User, Hash, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import AirbasePageHeader from "@/components/airbase/AirbasePageHeader";
import ManagementTable from "@/components/airbase/ManagementTable";
import { StatusBadge, MonoCode, PrimaryButton, FilterSelect } from "@/components/airbase/AirbaseUI";
import AddEditModal, { FormField, FormInput, FormSelect } from "@/components/airbase/AddEditModal";
import DetailModal, { DetailSection, DetailRow, DetailStatCard } from "@/components/airbase/DetailModal";
import { hierarchyData } from "@/data/hierarchyData";

// ── Flatten all ARCENs ─────────────────────────────────────────
function flattenArcens() {
  const rows = [];
  hierarchyData.forEach((area) => {
    area.arcens.forEach((arcen) => {
      rows.push({
        id:         arcen.id,
        name:       arcen.name,
        code:       arcen.code,
        commander:  arcen.commander,
        reservists: arcen.reservists,
        groups:     arcen.groups.length,
        areaId:     area.id,
        areaName:   area.name,
        status:     "active",
      });
    });
  });
  return rows;
}

const INITIAL_DATA = flattenArcens();
const EMPTY_FORM = { name: "", code: "", commander: "", areaId: "", status: "active" };

const TABLE_COLUMNS = [
  { key: "name",       label: "ARCEN Name",  sortable: true  },
  { key: "code",       label: "Code",        sortable: true  },
  { key: "areaName",   label: "Airbase",     sortable: true  },
  { key: "commander",  label: "Commander",   sortable: true  },
  { key: "reservists", label: "Reservists",  sortable: true  },
  { key: "groups",     label: "Groups",      sortable: true  },
  { key: "status",     label: "Status",      sortable: false },
];

export default function ManageArcens() {
  const [data,       setData]       = useState(INITIAL_DATA);
  const [modal,      setModal]      = useState({ open: false, mode: "add", row: null });
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [areaFilter, setAreaFilter] = useState("");
  const [detailRow,  setDetailRow]  = useState(null);

  const areaOptions = useMemo(() =>
    hierarchyData.map((a) => ({ value: a.id, label: a.name })), []
  );

  const filteredData = areaFilter
    ? data.filter((row) => row.areaId === areaFilter)
    : data;

  // ── Modal helpers ──────────────────────────────────────────
  const openAdd = () => {
    setForm(EMPTY_FORM);
    setModal({ open: true, mode: "add", row: null });
  };

  const openEdit = (row) => {
    setForm({ name: row.name, code: row.code, commander: row.commander, areaId: row.areaId, status: row.status });
    setModal({ open: true, mode: "edit", row });
    setDetailRow(null);
  };

  const closeModal = () => setModal((m) => ({ ...m, open: false }));

  const handleSubmit = () => {
    const area = hierarchyData.find((a) => a.id === form.areaId);
    if (modal.mode === "add") {
      setData((prev) => [...prev, {
        id: `arcen-${Date.now()}`,
        name: form.name, code: form.code,
        commander: form.commander,
        areaId: form.areaId, areaName: area?.name ?? "",
        reservists: 0, groups: 0, status: form.status,
      }]);
    } else {
      setData((prev) => prev.map((r) =>
        r.id === modal.row.id
          ? { ...r, ...form, areaName: area?.name ?? r.areaName }
          : r
      ));
      if (detailRow?.id === modal.row.id) {
        setDetailRow((prev) => ({ ...prev, ...form, areaName: area?.name ?? prev.areaName }));
      }
    }
    closeModal();
  };

  const handleDelete = (id) => {
    if (!confirm("Delete this ARCEN? This action cannot be undone.")) return;
    setData((prev) => prev.filter((r) => r.id !== id));
    setDetailRow(null);
  };

  const toggleStatus = (id) => {
    setData((prev) => prev.map((r) =>
      r.id === id ? { ...r, status: r.status === "active" ? "standby" : "active" } : r
    ));
    if (detailRow?.id === id) {
      setDetailRow((prev) => ({ ...prev, status: prev.status === "active" ? "standby" : "active" }));
    }
  };

  const isActive = detailRow?.status === "active";

  return (
    <div className="flex flex-col gap-6 pb-10">
      <AirbasePageHeader
        icon={Shield}
        title="Manage ARCENs"
        description="Add, edit, and manage Air Reserve Center units across all airbases."
        breadcrumbs={[
          { label: "Airbase", path: "/airbase" },
          { label: "Manage ARCENs" },
        ]}
        actions={<PrimaryButton icon={Plus} onClick={openAdd}>Add ARCEN</PrimaryButton>}
      />

      {/* Stats */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: "Total ARCENs", value: data.length },
          { label: "Active",  value: data.filter((r) => r.status === "active").length,  color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Standby", value: data.filter((r) => r.status === "standby").length, color: "text-neutral-400" },
        ].map((s) => (
          <div key={s.label} className={cn(
            "flex flex-col rounded-xl border px-4 py-2.5 min-w-[100px]",
            "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
          )}>
            <span className={cn("text-xl font-bold leading-none", s.color ?? "text-neutral-900 dark:text-neutral-50")}>
              {s.value}
            </span>
            <span className="mt-0.5 text-[10px] text-neutral-400 dark:text-neutral-600">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <ManagementTable
        columns={TABLE_COLUMNS}
        data={filteredData}
        searchKeys={["name", "code", "commander", "areaName"]}
        searchPlaceholder="Search ARCEN name, code, commander…"
        emptyMessage="No ARCENs found. Add one to get started."
        filterSlot={
          <FilterSelect
            value={areaFilter}
            onChange={setAreaFilter}
            options={areaOptions}
            placeholder="All Airbases"
          />
        }
        renderRow={(row) => (
          <tr
            key={row.id}
            onClick={() => setDetailRow(row)}
            className="cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors duration-100"
          >
            <td className="px-4 py-3">
              <span className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-200">{row.name}</span>
            </td>
            <td className="px-4 py-3"><MonoCode>{row.code}</MonoCode></td>
            <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">{row.areaName}</td>
            <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">{row.commander}</td>
            <td className="px-4 py-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {row.reservists.toLocaleString()}
            </td>
            <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">{row.groups}</td>
            <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
          </tr>
        )}
      />

      {/* Add / Edit Modal */}
      <AddEditModal
        open={modal.open}
        title={modal.mode === "add" ? "Add New ARCEN" : "Edit ARCEN"}
        onClose={closeModal}
        onSubmit={handleSubmit}
        submitLabel={modal.mode === "add" ? "Add ARCEN" : "Save Changes"}
      >
        <FormField label="ARCEN Name" required>
          <FormInput value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="e.g. ARCEN-1 Butuan" />
        </FormField>
        <FormField label="Code" required>
          <FormInput value={form.code} onChange={(v) => setForm((f) => ({ ...f, code: v }))} placeholder="e.g. ARC1-BTA" />
        </FormField>
        <FormField label="Airbase" required>
          <FormSelect value={form.areaId} onChange={(v) => setForm((f) => ({ ...f, areaId: v }))}>
            <option value="">Select Airbase…</option>
            {areaOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </FormSelect>
        </FormField>
        <FormField label="Commander">
          <FormInput value={form.commander} onChange={(v) => setForm((f) => ({ ...f, commander: v }))} placeholder="e.g. Col. Jose Reyes" />
        </FormField>
        <FormField label="Status">
          <FormSelect value={form.status} onChange={(v) => setForm((f) => ({ ...f, status: v }))}>
            <option value="active">Active</option>
            <option value="standby">Standby</option>
          </FormSelect>
        </FormField>
      </AddEditModal>

      {/* Detail Modal */}
      <DetailModal
        open={!!detailRow}
        onClose={() => setDetailRow(null)}
        icon={Shield}
        title={detailRow?.name ?? ""}
        badge={detailRow?.code}
        subtitle={detailRow?.areaName}
        size="md"
        footer={
          <div className="flex w-full items-center gap-2">
            {/* Toggle status */}
            <button
              onClick={() => toggleStatus(detailRow.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors duration-150",
                isActive
                  ? "border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20"
                  : "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20"
              )}
            >
              {isActive ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
              {isActive ? "Set Standby" : "Set Active"}
            </button>
            <div className="flex-1" />
            <button
              onClick={() => handleDelete(detailRow.id)}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors duration-150"
            >
              <Trash2 size={13} /> Delete
            </button>
            <button
              onClick={() => openEdit(detailRow)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors duration-150"
            >
              <Pencil size={13} /> Edit
            </button>
          </div>
        }
      >
        {detailRow && (
          <>
            <div className="grid grid-cols-3 gap-3 mb-5">
              <DetailStatCard label="Reservists" value={detailRow.reservists.toLocaleString()} />
              <DetailStatCard label="Groups"     value={detailRow.groups} />
              <DetailStatCard label="Status"     value={detailRow.status === "active" ? "Active" : "Standby"}
                color={detailRow.status === "active" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"} />
            </div>
            <DetailSection title="ARCEN Information">
              <DetailRow label="Full Name"   value={detailRow.name} />
              <DetailRow label="Code"        value={detailRow.code} />
              <DetailRow label="Airbase"     value={detailRow.areaName} />
              <DetailRow label="Commander"   value={detailRow.commander} />
            </DetailSection>
          </>
        )}
      </DetailModal>
    </div>
  );
}