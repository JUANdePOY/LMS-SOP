import { useState, useEffect, useMemo } from "react";
import { Users, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import AirbasePageHeader from "@/components/airbase/AirbasePageHeader";
import ManagementTable from "@/components/airbase/ManagementTable";
import { StatusBadge, TypeBadge, MonoCode, PrimaryButton, FilterSelect } from "@/components/airbase/AirbaseUI";
import AddEditModal, { FormField, FormInput, FormSelect } from "@/components/airbase/AddEditModal";
import DetailModal, { DetailSection, DetailRow, DetailStatCard } from "@/components/airbase/DetailModal";
import { getGroupsList, getArcens, createGroup, updateGroup, deleteGroup } from "@/services/api";

const GROUP_TYPES = ["Combat Support", "Logistics", "Air Defense", "Intelligence", "Medical"];

export default function ManageGroups() {
  const [data,        setData]        = useState([]);
  const [arcenOptions, setArcenOptions] = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [detail,      setDetail]      = useState(null);
  const [editModal,   setEditModal]   = useState(false);
  const [editMode,    setEditMode]    = useState("add");
  const [form,        setForm]        = useState({ name: "", code: "", type: "", commander: "", arcenId: "", status: "active" });
  const [arcenFilter, setArcenFilter] = useState("");
  const [typeFilter,  setTypeFilter]  = useState("");

  useEffect(() => {
    fetchArcenOptions();
    fetchGroups();
  }, []);

  const fetchArcenOptions = async () => {
    try {
      const response = await getArcens();
      if (response.data.status === 'success') {
        const options = response.data.data.map(arcen => ({
          value: String(arcen.id),
          label: `${arcen.name} — ${arcen.name}`,
          arcenName: arcen.name,
          arcenFull: arcen.name,
        }));
        setArcenOptions(options);
      }
    } catch (err) {
      console.error('Failed to fetch ARCENs:', err);
    }
  };

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const response = await getGroupsList();
      if (response.data.status === 'success') {
        const transformed = response.data.data.map(group => ({
          id: `group-${group.id}`,
          dbId: group.id,
          name: group.name,
          code: group.code,
          type: group.type || "Combat Support",
          commander: group.commander_name || '',
          reservists: group.squadron_count || 0,
          squadrons: group.squadron_count || 0,
          activeSquadrons: group.squadron_count || 0,
          members: group.squadron_count || 0,
          arcenId: String(group.arsen_id),
          arcenName: group.arsen_name || '',
          arcenFull: group.arsen_code || '',
          status: group.is_active ? "active" : "inactive",
        }));
        setData(transformed);
      }
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    let d = data;
    if (arcenFilter) d = d.filter((r) => r.arcenId === arcenFilter);
    if (typeFilter)  d = d.filter((r) => r.type    === typeFilter);
    return d;
  }, [data, arcenFilter, typeFilter]);

  const openAdd = () => { setForm({ name: "", code: "", type: "", commander: "", arcenId: "", status: "active" }); setEditMode("add"); setEditModal(true); };
  const openEdit = (row) => {
    setForm({ name: row.name, code: row.code, type: row.type, commander: row.commander, arcenId: row.arcenId, status: row.status });
    setEditMode("edit");
    setEditModal(true);
    setDetail(null);
  };
  const closeEdit = () => setEditModal(false);

  const handleSubmit = async () => {
    try {
      const arcen = arcenOptions.find((a) => a.value === form.arcenId);
      if (editMode === "add") {
        const response = await createGroup({
          arsen_id: parseInt(form.arcenId),
          code: form.code,
          name: form.name,
          commander_name: form.commander,
        });
        if (response.data.status === 'success') {
          await fetchGroups();
        }
      } else if (detail) {
        const response = await updateGroup(detail.dbId, {
          arsen_id: parseInt(form.arcenId),
          code: form.code,
          name: form.name,
          commander_name: form.commander,
        });
        if (response.data.status === 'success') {
          await fetchGroups();
        }
      }
      closeEdit();
    } catch (err) {
      console.error('Failed to save group:', err);
    }
  };

  const handleDelete = async (row) => {
    if (!confirm(`Delete ${row.name}?`)) return;
    try {
      const response = await deleteGroup(row.dbId);
      if (response.data.status === 'success') {
        setData((prev) => prev.filter((r) => r.id !== row.id));
        setDetail(null);
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to delete group';
      alert(msg);
      console.error('Failed to delete group:', err);
    }
  };

  const toggleStatus = async (row) => {
    try {
      const response = await updateGroup(row.dbId, {
        arsen_id: parseInt(row.arcenId),
        code: row.code,
        name: row.name,
        commander_name: row.commander,
      });
      if (response.data.status === 'success') {
        const updated = { ...row, status: row.status === "active" ? "inactive" : "active" };
        setData((prev) => prev.map((r) => r.id === row.id ? updated : r));
        setDetail(updated);
      }
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-10">
      <AirbasePageHeader
        icon={Users}
        title="Manage Groups"
        description="Click any row to view details. Add, edit, or manage reserve groups."
        breadcrumbs={[{ label: "Airbase", path: "/airbase" }, { label: "Manage Groups" }]}
        actions={<PrimaryButton icon={Plus} onClick={openAdd}>Add Group</PrimaryButton>}
      />

      {/* Stats */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: "Total Groups",     value: data.length },
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

      <ManagementTable
        columns={[
          { key: "name",      label: "Group",      sortable: true },
          { key: "code",      label: "Code",       sortable: true },
          { key: "arcenName", label: "ARCEN",      sortable: true },
          { key: "type",      label: "Type",       sortable: true },
          { key: "commander", label: "Commander",  sortable: true },
          { key: "squadrons", label: "Squadrons",  sortable: true },
          { key: "reservists",label: "Reservists", sortable: true },
          { key: "status",    label: "Status",     sortable: false },
        ]}
        data={filteredData}
        searchKeys={["name", "code", "arcenName", "type", "commander"]}
        searchPlaceholder="Search group name, code, ARCEN…"
        emptyMessage="No groups found."
        filterSlot={
          <>
            <FilterSelect value={arcenFilter} onChange={setArcenFilter} options={arcenOptions.map((o) => ({ value: o.value, label: o.label }))} placeholder="All ARCENs" />
            <FilterSelect value={typeFilter}  onChange={setTypeFilter}  options={GROUP_TYPES} placeholder="All Types" />
          </>
        }
        renderRow={(row) => (
          <tr
            key={row.id}
            onClick={() => setDetail(row)}
            className="group cursor-pointer hover:bg-indigo-50/60 dark:hover:bg-indigo-500/5 transition-colors duration-100"
          >
            <td className="px-4 py-3">
              <span className="text-[13px] font-bold text-neutral-800 dark:text-neutral-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
                {row.name}
              </span>
            </td>
            <td className="px-4 py-3"><MonoCode>{row.code}</MonoCode></td>
            <td className="px-4 py-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{row.arcenName}</span>
                <span className="text-[10px] text-neutral-400">{row.arcenFull}</span>
              </div>
            </td>
            <td className="px-4 py-3"><TypeBadge type={row.type} /></td>
            <td className="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-400">{row.commander}</td>
            <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">{row.activeSquadrons}</span>
              <span className="text-neutral-400">/{row.squadrons}</span>
            </td>
            <td className="px-4 py-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">{row.reservists.toLocaleString()}</td>
            <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
          </tr>
        )}
      />

      {/* ── Detail Modal ─────────────────────────────────────── */}
      {detail && (
        <DetailModal
          open={!!detail}
          onClose={() => setDetail(null)}
          icon={Users}
          iconColor="bg-blue-600"
          title={detail.name}
          subtitle={`${detail.arcenName} · ${detail.arcenFull}`}
          badge={detail.code}
          size="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <button onClick={() => handleDelete(detail)} className={cn("flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all duration-150")}>
                <Trash2 size={14} /> Delete
              </button>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleStatus(detail)} className={cn("flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all duration-150")}>
                  {detail.status === "active" ? <><ToggleRight size={14} className="text-emerald-500" /> Deactivate</> : <><ToggleLeft size={14} /> Activate</>}
                </button>
                <button onClick={() => openEdit(detail)} className={cn("flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200 dark:shadow-indigo-900/30 transition-all duration-150")}>
                  <Pencil size={14} /> Edit Group
                </button>
              </div>
            </div>
          }
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-5">
            <DetailStatCard label="Reservists"       value={detail.reservists.toLocaleString()} color="text-indigo-600 dark:text-indigo-400" />
            <DetailStatCard label="Total Squadrons"  value={detail.squadrons}                   color="text-blue-600 dark:text-blue-400" />
            <DetailStatCard label="Active Squadrons" value={detail.activeSquadrons}              color="text-emerald-600 dark:text-emerald-400" />
            <DetailStatCard label="Status"           value={detail.status === "active" ? "Active" : "Inactive"}
              color={detail.status === "active" ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-400"} />
          </div>

          <DetailSection title="Group Information">
            <DetailRow label="Group Name"  value={detail.name}      />
            <DetailRow label="Code"        value={detail.code}      />
            <DetailRow label="Type"        value={detail.type}      />
            <DetailRow label="Commander"   value={detail.commander} />
          </DetailSection>

          <DetailSection title="Assignment">
            <DetailRow label="ARCEN"       value={detail.arcenName} />
            <DetailRow label="ARCEN Full"  value={detail.arcenFull} />
          </DetailSection>
        </DetailModal>
      )}

      <AddEditModal
        open={editModal}
        title={editMode === "add" ? "Add New Group" : `Edit ${detail?.name ?? "Group"}`}
        onClose={closeEdit}
        onSubmit={handleSubmit}
        submitLabel={editMode === "add" ? "Add Group" : "Save Changes"}
      >
        <FormField label="Group Name" required>
          <FormInput value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="e.g. 509 or TOGR 10" />
        </FormField>
        <FormField label="Code" required>
          <FormInput value={form.code} onChange={(v) => setForm((f) => ({ ...f, code: v }))} placeholder="e.g. 509RG" />
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
        <FormField label="Commander">
          <FormInput value={form.commander} onChange={(v) => setForm((f) => ({ ...f, commander: v }))} placeholder="e.g. Col. Marcos Dela Torre" />
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