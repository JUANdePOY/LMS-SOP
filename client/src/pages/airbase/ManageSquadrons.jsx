import { useState, useMemo } from "react";
import { Layers, Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { cn } from "@/lib/utils";
import AirbasePageHeader from "@/components/airbase/AirbasePageHeader";
import ManagementTable from "@/components/airbase/ManagementTable";
import { StatusBadge, MonoCode, PrimaryButton, FilterSelect } from "@/components/airbase/AirbaseUI";
import AddEditModal, { FormField, FormInput, FormSelect } from "@/components/airbase/AddEditModal";
import DetailModal, { DetailSection, DetailRow, DetailStatCard } from "@/components/airbase/DetailModal";
import { hierarchyData } from "@/data/hierarchyData";

const SPECIALIZATIONS = [
  "Security", "Engineering", "Communications", "Medical",
  "Supply", "Transport", "Maintenance", "Air Defense",
  "Radar Ops", "Intel", "Surveillance", "Cyber", "Dental", "Nursing",
];

function flattenSquadrons() {
  const rows = [];
  hierarchyData.forEach((area) => {
    area.arcens.forEach((arcen) => {
      arcen.groups.forEach((group) => {
        group.squadrons.forEach((sq) => {
          rows.push({
            id:             sq.id,
            name:           sq.name,
            code:           sq.code,
            status:         sq.status,
            members:        sq.members,
            specialization: sq.specialization,
            location:       sq.location ?? "",
            groupId:        group.id,
            groupName:      group.name,
            arcenName:      arcen.name,
            areaName:       area.name,
          });
        });
      });
    });
  });
  return rows;
}

function flattenGroupOptions() {
  const list = [];
  hierarchyData.forEach((area) => {
    area.arcens.forEach((arcen) => {
      arcen.groups.forEach((group) => {
        list.push({
          value: group.id,
          label: `${group.name} — ${arcen.name}`,
          arcenName: arcen.name,
          areaName:  area.name,
        });
      });
    });
  });
  return list;
}

const INITIAL_DATA  = flattenSquadrons();
const GROUP_OPTIONS = flattenGroupOptions();
const EMPTY_FORM    = { name: "", code: "", groupId: "", specialization: "", members: "", status: "active" };

const TABLE_COLUMNS = [
  { key: "name",           label: "Squadron",       sortable: true  },
  { key: "code",           label: "Code",           sortable: true  },
  { key: "groupName",      label: "Group",          sortable: true  },
  { key: "arcenName",      label: "ARCEN",          sortable: true  },
  { key: "areaName",       label: "Airbase",        sortable: true  },
  { key: "specialization", label: "Specialization", sortable: true  },
  { key: "members",        label: "Members",        sortable: true  },
  { key: "status",         label: "Status",         sortable: false },
];

export default function ManageSquadrons() {
  const [data,         setData]         = useState(INITIAL_DATA);
  const [modal,        setModal]        = useState({ open: false, mode: "add", row: null });
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [groupFilter,  setGroupFilter]  = useState("");
  const [specFilter,   setSpecFilter]   = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [detailRow,    setDetailRow]    = useState(null);

  const filteredData = useMemo(() => {
    let d = data;
    if (groupFilter)  d = d.filter((r) => r.groupId        === groupFilter);
    if (specFilter)   d = d.filter((r) => r.specialization === specFilter);
    if (statusFilter) d = d.filter((r) => r.status         === statusFilter);
    return d;
  }, [data, groupFilter, specFilter, statusFilter]);

  // ── Modal helpers ──────────────────────────────────────────
  const openAdd = () => { setForm(EMPTY_FORM); setModal({ open: true, mode: "add", row: null }); };

  const openEdit = (row) => {
    setForm({
      name: row.name, code: row.code, groupId: row.groupId,
      specialization: row.specialization, members: String(row.members), status: row.status,
    });
    setModal({ open: true, mode: "edit", row });
    setDetailRow(null);
  };

  const closeModal = () => setModal((m) => ({ ...m, open: false }));

  const handleSubmit = () => {
    const grp = GROUP_OPTIONS.find((g) => g.value === form.groupId);
    if (modal.mode === "add") {
      setData((prev) => [...prev, {
        id: `sq-${Date.now()}`,
        name: form.name, code: form.code,
        groupId: form.groupId, groupName: grp?.label.split(" — ")[0] ?? "",
        arcenName: grp?.arcenName ?? "", areaName: grp?.areaName ?? "",
        specialization: form.specialization,
        members: Number(form.members) || 0,
        location: "",
        status: form.status,
      }]);
    } else {
      const updated = {
        name: form.name, code: form.code,
        groupId: form.groupId, groupName: grp?.label.split(" — ")[0] ?? "",
        arcenName: grp?.arcenName ?? "", areaName: grp?.areaName ?? "",
        specialization: form.specialization,
        members: Number(form.members) || 0,
        status: form.status,
      };
      setData((prev) => prev.map((r) => r.id === modal.row.id ? { ...r, ...updated } : r));
      if (detailRow?.id === modal.row.id) setDetailRow((prev) => ({ ...prev, ...updated }));
    }
    closeModal();
  };

  const handleDelete = (id) => {
    if (!confirm("Delete this Squadron?")) return;
    setData((p) => p.filter((r) => r.id !== id));
    setDetailRow(null);
  };

  const toggleStatus = (id) => {
    setData((p) => p.map((r) => r.id === id ? { ...r, status: r.status === "active" ? "standby" : "active" } : r));
    if (detailRow?.id === id) {
      setDetailRow((prev) => ({ ...prev, status: prev.status === "active" ? "standby" : "active" }));
    }
  };

  const isActive     = detailRow?.status === "active";
  const activeCount  = data.filter((r) => r.status === "active").length;
  const standbyCount = data.filter((r) => r.status === "standby").length;

  return (
    <div className="flex flex-col gap-6 pb-10">
      <AirbasePageHeader
        icon={Layers}
        title="Manage Squadrons"
        description="Add, edit, and manage squadrons assigned to reserve groups."
        breadcrumbs={[
          { label: "Airbase", path: "/airbase" },
          { label: "Manage Squadrons" },
        ]}
        actions={<PrimaryButton icon={Plus} onClick={openAdd}>Add Squadron</PrimaryButton>}
      />

      {/* Stats */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: "Total Squadrons", value: data.length },
          { label: "Active",         value: activeCount,  color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Standby",        value: standbyCount, color: "text-neutral-400" },
          { label: "Total Members",  value: data.reduce((a, r) => a + r.members, 0).toLocaleString() },
        ].map((s) => (
          <div key={s.label} className={cn(
            "flex flex-col rounded-xl border px-4 py-2.5 min-w-[110px]",
            "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
          )}>
            <span className={cn("text-xl font-bold leading-none", s.color ?? "text-neutral-900 dark:text-neutral-50")}>{s.value}</span>
            <span className="mt-0.5 text-[10px] text-neutral-400 dark:text-neutral-600">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <ManagementTable
        columns={TABLE_COLUMNS}
        data={filteredData}
        searchKeys={["name", "code", "groupName", "arcenName", "areaName", "specialization"]}
        searchPlaceholder="Search squadron, code, group, specialization…"
        emptyMessage="No squadrons found."
        filterSlot={
          <>
            <FilterSelect value={groupFilter}  onChange={setGroupFilter}  options={GROUP_OPTIONS.map((g) => ({ value: g.value, label: g.label }))} placeholder="All Groups"  />
            <FilterSelect value={specFilter}   onChange={setSpecFilter}   options={SPECIALIZATIONS} placeholder="All Specializations" />
            <FilterSelect value={statusFilter} onChange={setStatusFilter} options={[{ value: "active", label: "Active" }, { value: "standby", label: "Standby" }]} placeholder="All Status" />
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
            <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">{row.groupName}</td>
            <td className="px-4 py-3 text-sm text-neutral-500 dark:text-neutral-500">{row.arcenName}</td>
            <td className="px-4 py-3 text-sm text-neutral-400 dark:text-neutral-600">{row.areaName}</td>
            <td className="px-4 py-3">
              <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                {row.specialization}
              </span>
            </td>
            <td className="px-4 py-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">{row.members}</td>
            <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
          </tr>
        )}
      />

      {/* Add / Edit Modal */}
      <AddEditModal
        open={modal.open}
        title={modal.mode === "add" ? "Add New Squadron" : "Edit Squadron"}
        onClose={closeModal}
        onSubmit={handleSubmit}
        submitLabel={modal.mode === "add" ? "Add Squadron" : "Save Changes"}
      >
        <FormField label="Squadron Name" required>
          <FormInput value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="e.g. Alpha Squadron" />
        </FormField>
        <FormField label="Code" required>
          <FormInput value={form.code} onChange={(v) => setForm((f) => ({ ...f, code: v }))} placeholder="e.g. A-SQ" />
        </FormField>
        <FormField label="Group" required>
          <FormSelect value={form.groupId} onChange={(v) => setForm((f) => ({ ...f, groupId: v }))}>
            <option value="">Select Group…</option>
            {GROUP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </FormSelect>
        </FormField>
        <FormField label="Specialization" required>
          <FormSelect value={form.specialization} onChange={(v) => setForm((f) => ({ ...f, specialization: v }))}>
            <option value="">Select Specialization…</option>
            {SPECIALIZATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </FormSelect>
        </FormField>
        <FormField label="Members">
          <FormInput type="number" value={form.members} onChange={(v) => setForm((f) => ({ ...f, members: v }))} placeholder="e.g. 42" />
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
        icon={Layers}
        title={detailRow?.name ?? ""}
        badge={detailRow?.code}
        subtitle={`${detailRow?.groupName ?? ""} · ${detailRow?.arcenName ?? ""}`}
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
              <DetailStatCard label="Members"        value={detailRow.members} />
              <DetailStatCard label="Specialization" value={detailRow.specialization} />
              <DetailStatCard label="Status"         value={detailRow.status === "active" ? "Active" : "Standby"}
                color={detailRow.status === "active" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"} />
            </div>
            <DetailSection title="Squadron Information">
              <DetailRow label="Squadron Name"  value={detailRow.name} />
              <DetailRow label="Code"           value={detailRow.code} />
              <DetailRow label="Specialization" value={detailRow.specialization} />
              <DetailRow label="Group"          value={detailRow.groupName} />
              <DetailRow label="ARCEN"          value={detailRow.arcenName} />
              <DetailRow label="Airbase"        value={detailRow.areaName} />
              {detailRow.location && <DetailRow label="Location" value={detailRow.location} />}
            </DetailSection>
          </>
        )}
      </DetailModal>
    </div>
  );
}