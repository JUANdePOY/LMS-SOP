import { useState, useMemo } from "react";
import { Users, Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { cn } from "@/lib/utils";
import AirbasePageHeader from "@/components/airbase/AirbasePageHeader";
import ManagementTable from "@/components/airbase/ManagementTable";
import { StatusBadge, TypeBadge, MonoCode, PrimaryButton, FilterSelect } from "@/components/airbase/AirbaseUI";
import AddEditModal, { FormField, FormInput, FormSelect } from "@/components/airbase/AddEditModal";
import DetailModal, { DetailSection, DetailRow, DetailStatCard } from "@/components/airbase/DetailModal";
import { hierarchyData } from "@/data/hierarchyData";

const GROUP_TYPES = ["Combat Support", "Logistics", "Air Defense", "Intelligence", "Medical"];

function flattenGroups() {
  const rows = [];
  hierarchyData.forEach((area) => {
    area.arcens.forEach((arcen) => {
      arcen.groups.forEach((group) => {
        rows.push({
          id:         group.id,
          name:       group.name,
          code:       group.code,
          type:       group.type,
          reservists: group.reservists,
          squadrons:  group.squadrons.length,
          arcenId:    arcen.id,
          arcenName:  arcen.name,
          areaName:   area.name,
          status:     "active",
        });
      });
    });
  });
  return rows;
}

const INITIAL_DATA = flattenGroups();
const EMPTY_FORM   = { name: "", code: "", type: "", arcenId: "", status: "active" };

const TABLE_COLUMNS = [
  { key: "name",       label: "Group Name",  sortable: true  },
  { key: "code",       label: "Code",        sortable: true  },
  { key: "arcenName",  label: "ARCEN",       sortable: true  },
  { key: "areaName",   label: "Airbase",     sortable: true  },
  { key: "type",       label: "Type",        sortable: true  },
  { key: "reservists", label: "Reservists",  sortable: true  },
  { key: "squadrons",  label: "Squadrons",   sortable: true  },
  { key: "status",     label: "Status",      sortable: false },
];

export default function ManageGroups() {
  const [data,        setData]        = useState(INITIAL_DATA);
  const [modal,       setModal]       = useState({ open: false, mode: "add", row: null });
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [arcenFilter, setArcenFilter] = useState("");
  const [typeFilter,  setTypeFilter]  = useState("");
  const [detailRow,   setDetailRow]   = useState(null);

  const arcenOptions = useMemo(() => {
    const list = [];
    hierarchyData.forEach((area) => {
      area.arcens.forEach((arc) => {
        list.push({ value: arc.id, label: `${arc.name} (${area.name})` });
      });
    });
    return list;
  }, []);

  const filteredData = useMemo(() => {
    let d = data;
    if (arcenFilter) d = d.filter((r) => r.arcenId === arcenFilter);
    if (typeFilter)  d = d.filter((r) => r.type    === typeFilter);
    return d;
  }, [data, arcenFilter, typeFilter]);

  // ── Modal helpers ──────────────────────────────────────────
  const openAdd = () => { setForm(EMPTY_FORM); setModal({ open: true, mode: "add", row: null }); };

  const openEdit = (row) => {
    setForm({ name: row.name, code: row.code, type: row.type, arcenId: row.arcenId, status: row.status });
    setModal({ open: true, mode: "edit", row });
    setDetailRow(null);
  };

  const closeModal = () => setModal((m) => ({ ...m, open: false }));

  const handleSubmit = () => {
    const arcen = arcenOptions.find((a) => a.value === form.arcenId);
    const area  = hierarchyData.find((a) => a.arcens.some((arc) => arc.id === form.arcenId));
    if (modal.mode === "add") {
      setData((prev) => [...prev, {
        id: `group-${Date.now()}`,
        name: form.name, code: form.code, type: form.type,
        arcenId: form.arcenId, arcenName: arcen?.label.split(" (")[0] ?? "",
        areaName: area?.name ?? "",
        reservists: 0, squadrons: 0, status: form.status,
      }]);
    } else {
      const updated = { ...form, arcenName: arcen?.label.split(" (")[0] ?? "", areaName: area?.name ?? "" };
      setData((prev) => prev.map((r) => r.id === modal.row.id ? { ...r, ...updated } : r));
      if (detailRow?.id === modal.row.id) setDetailRow((prev) => ({ ...prev, ...updated }));
    }
    closeModal();
  };

  const handleDelete = (id) => {
    if (!confirm("Delete this Group?")) return;
    setData((p) => p.filter((r) => r.id !== id));
    setDetailRow(null);
  };

  const toggleStatus = (id) => {
    setData((p) => p.map((r) => r.id === id ? { ...r, status: r.status === "active" ? "standby" : "active" } : r));
    if (detailRow?.id === id) {
      setDetailRow((prev) => ({ ...prev, status: prev.status === "active" ? "standby" : "active" }));
    }
  };

  const isActive = detailRow?.status === "active";

  return (
    <div className="flex flex-col gap-6 pb-10">
      <AirbasePageHeader
        icon={Users}
        title="Manage Groups"
        description="Add, edit, and manage reserve groups assigned to ARCENs."
        breadcrumbs={[
          { label: "Airbase", path: "/airbase" },
          { label: "Manage Groups" },
        ]}
        actions={<PrimaryButton icon={Plus} onClick={openAdd}>Add Group</PrimaryButton>}
      />

      {/* Stats */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: "Total Groups", value: data.length },
          { label: "Active",   value: data.filter((r) => r.status === "active").length,   color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Standby",  value: data.filter((r) => r.status === "standby").length,  color: "text-neutral-400" },
          ...GROUP_TYPES.map((t) => ({ label: t, value: data.filter((r) => r.type === t).length })),
        ].map((s) => (
          <div key={s.label} className={cn(
            "flex flex-col rounded-xl border px-4 py-2.5 min-w-[90px]",
            "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
          )}>
            <span className={cn("text-xl font-bold leading-none", s.color ?? "text-neutral-900 dark:text-neutral-50")}>{s.value}</span>
            <span className="mt-0.5 text-[10px] text-neutral-400 dark:text-neutral-600 leading-tight">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <ManagementTable
        columns={TABLE_COLUMNS}
        data={filteredData}
        searchKeys={["name", "code", "arcenName", "areaName", "type"]}
        searchPlaceholder="Search group name, code, ARCEN…"
        emptyMessage="No groups found."
        filterSlot={
          <>
            <FilterSelect value={arcenFilter} onChange={setArcenFilter} options={arcenOptions} placeholder="All ARCENs" />
            <FilterSelect value={typeFilter}  onChange={setTypeFilter}  options={GROUP_TYPES}  placeholder="All Types"  />
          </>
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
            <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">{row.arcenName}</td>
            <td className="px-4 py-3 text-sm text-neutral-500 dark:text-neutral-500">{row.areaName}</td>
            <td className="px-4 py-3"><TypeBadge type={row.type} /></td>
            <td className="px-4 py-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">{row.reservists.toLocaleString()}</td>
            <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">{row.squadrons}</td>
            <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
          </tr>
        )}
      />

      {/* Add / Edit Modal */}
      <AddEditModal
        open={modal.open}
        title={modal.mode === "add" ? "Add New Group" : "Edit Group"}
        onClose={closeModal}
        onSubmit={handleSubmit}
        submitLabel={modal.mode === "add" ? "Add Group" : "Save Changes"}
      >
        <FormField label="Group Name" required>
          <FormInput value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="e.g. 101st Reserve Group" />
        </FormField>
        <FormField label="Code" required>
          <FormInput value={form.code} onChange={(v) => setForm((f) => ({ ...f, code: v }))} placeholder="e.g. 101RG" />
        </FormField>
        <FormField label="ARCEN" required>
          <FormSelect value={form.arcenId} onChange={(v) => setForm((f) => ({ ...f, arcenId: v }))}>
            <option value="">Select ARCEN…</option>
            {arcenOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </FormSelect>
        </FormField>
        <FormField label="Type" required>
          <FormSelect value={form.type} onChange={(v) => setForm((f) => ({ ...f, type: v }))}>
            <option value="">Select Type…</option>
            {GROUP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </FormSelect>
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
        icon={Users}
        title={detailRow?.name ?? ""}
        badge={detailRow?.code}
        subtitle={`${detailRow?.arcenName ?? ""} · ${detailRow?.areaName ?? ""}`}
        size="md"
        footer={
          <div className="flex w-full items-center gap-2">
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
              <DetailStatCard label="Squadrons"  value={detailRow.squadrons} />
              <DetailStatCard label="Status"     value={detailRow.status === "active" ? "Active" : "Standby"}
                color={detailRow.status === "active" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"} />
            </div>
            <DetailSection title="Group Information">
              <DetailRow label="Group Name" value={detailRow.name} />
              <DetailRow label="Code"       value={detailRow.code} />
              <DetailRow label="Type"       value={detailRow.type} />
              <DetailRow label="ARCEN"      value={detailRow.arcenName} />
              <DetailRow label="Airbase"    value={detailRow.areaName} />
            </DetailSection>
          </>
        )}
      </DetailModal>
    </div>
  );
}