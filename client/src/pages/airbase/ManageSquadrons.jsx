import { useState, useEffect, useMemo } from "react";
import { Layers, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import AirbasePageHeader from "@/components/airbase/AirbasePageHeader";
import ManagementTable from "@/components/airbase/ManagementTable";
import { StatusBadge, MonoCode, PrimaryButton, FilterSelect } from "@/components/airbase/AirbaseUI";
import AddEditModal, { FormField, FormInput, FormSelect } from "@/components/airbase/AddEditModal";
import DetailModal, { DetailSection, DetailRow, DetailStatCard } from "@/components/airbase/DetailModal";
import { getSquadrons, getArcens, getGroupsList, createSquadron, updateSquadron, deleteSquadron } from "@/services/api";

const SPECIALIZATIONS = [
  "Security", "Engineering", "Communications", "Medical", "Supply",
  "Transport", "Maintenance", "Air Defense", "Radar Ops", "Intelligence",
  "Surveillance", "Cyber", "Dental", "Nursing", "Administrative",
];

export default function ManageSquadrons() {
  const [data,         setData]         = useState([]);
  const [groupOptions, setGroupOptions] = useState([]);
  const [arcenOptions, setArcenOptions] = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [detail,       setDetail]       = useState(null);
  const [editModal,    setEditModal]    = useState(false);
  const [editMode,     setEditMode]     = useState("add");
  const [form,         setForm]         = useState({ name: "", code: "", groupId: "", specialization: "", location: "", members: "", status: "active" });
  const [arcenFilter,  setArcenFilter]  = useState("");
  const [groupFilter,  setGroupFilter]  = useState("");
  const [specFilter,   setSpecFilter]   = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    fetchArcenOptions();
    fetchGroupOptions();
    fetchSquadrons();
  }, []);

  const fetchArcenOptions = async () => {
    try {
      const response = await getArcens();
      if (response.data.status === 'success') {
        const options = response.data.data.map(arcen => ({
          value: String(arcen.id),
          label: arcen.name,
        }));
        setArcenOptions(options);
      }
    } catch (err) {
      console.error('Failed to fetch ARCENs:', err);
    }
  };

  const fetchGroupOptions = async () => {
    try {
      const response = await getGroupsList();
      if (response.data.status === 'success') {
        const options = response.data.data.map(group => ({
          value: String(group.id),
          label: `${group.name} — ${group.arsen_name}`,
          groupName: group.name,
          groupCode: group.code,
          groupType: group.type || 'Combat Support',
          arcenId: String(group.arsen_id),
          arcenName: group.arsen_name || '',
          arcenFull: group.arsen_code || '',
        }));
        setGroupOptions(options);
      }
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    }
  };

  const fetchSquadrons = async () => {
    setLoading(true);
    try {
      const response = await getSquadrons();
      if (response.data.status === 'success') {
        const transformed = response.data.data.map(sq => ({
          id: `sq-${sq.id}`,
          dbId: sq.id,
          name: sq.name,
          code: sq.code,
          status: sq.is_active ? 'active' : 'inactive',
          members: sq.members || 0,
          specialization: sq.specialization || '',
          location: sq.location || '',
          groupId: String(sq.group_id),
          groupName: sq.group_name || '',
          groupCode: sq.group_code || '',
          groupType: 'Combat Support',
          arcenId: '',
          arcenName: sq.arsen_name || '',
          arcenFull: '',
        }));
        setData(transformed);
      }
    } catch (err) {
      console.error('Failed to fetch squadrons:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredGroupOptions = useMemo(() =>
    arcenFilter ? groupOptions.filter((g) => g.arcenId === arcenFilter) : groupOptions,
    [arcenFilter, groupOptions]
  );

  const filteredData = useMemo(() => {
    let d = data;
    if (arcenFilter)  d = d.filter((r) => r.arcenName === arcenFilter || (r.arcenId && r.arcenId === arcenFilter));
    if (groupFilter)  d = d.filter((r) => r.groupId === groupFilter);
    if (specFilter)   d = d.filter((r) => r.specialization === specFilter);
    if (statusFilter) d = d.filter((r) => r.status === statusFilter);
    return d;
  }, [data, arcenFilter, groupFilter, specFilter, statusFilter]);

  const handleArcenFilter = (val) => { setArcenFilter(val); setGroupFilter(""); };

  const openAdd = () => { setForm({ name: "", code: "", groupId: "", specialization: "", location: "", members: "", status: "active" }); setEditMode("add"); setEditModal(true); };
  const openEdit = (row) => {
    setForm({ name: row.name, code: row.code, groupId: row.groupId, specialization: row.specialization, location: row.location, members: String(row.members), status: row.status });
    setEditMode("edit");
    setEditModal(true);
    setDetail(null);
  };
  const closeEdit = () => setEditModal(false);

  const handleSubmit = async () => {
    try {
      const grp = groupOptions.find((g) => g.value === form.groupId);
      if (editMode === "add") {
        const response = await createSquadron({
          group_id: parseInt(form.groupId),
          name: form.name,
          code: form.code,
          location: form.location,
          specialization: form.specialization,
        });
        if (response.data.status === 'success') {
          await fetchSquadrons();
        }
      } else if (detail) {
        const response = await updateSquadron(detail.dbId, {
          group_id: parseInt(form.groupId),
          name: form.name,
          code: form.code,
          location: form.location,
          specialization: form.specialization,
        });
        if (response.data.status === 'success') {
          await fetchSquadrons();
        }
      }
      closeEdit();
    } catch (err) {
      console.error('Failed to save squadron:', err);
    }
  };

  const handleDelete = async (row) => {
    if (!confirm(`Delete ${row.name} Squadron?`)) return;
    try {
      const response = await deleteSquadron(row.dbId);
      if (response.data.status === 'success') {
        setData((prev) => prev.filter((r) => r.id !== row.id));
        setDetail(null);
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to delete squadron';
      alert(msg);
      console.error('Failed to delete squadron:', err);
    }
  };

  const toggleStatus = async (row) => {
    try {
      const response = await updateSquadron(row.dbId, {
        group_id: parseInt(row.groupId),
        name: row.name,
        code: row.code,
        location: row.location,
        specialization: row.specialization,
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
        icon={Layers}
        title="Manage Squadrons"
        description="Click any row to view details. Add, edit, or manage location-based squadrons."
        breadcrumbs={[{ label: "Airbase", path: "/airbase" }, { label: "Manage Squadrons" }]}
        actions={<PrimaryButton icon={Plus} onClick={openAdd}>Add Squadron</PrimaryButton>}
      />

      {/* Stats */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: "Total Squadrons", value: data.length },
          { label: "Active",   value: data.filter((r) => r.status === "active").length,   color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Inactive", value: data.filter((r) => r.status === "inactive").length, color: "text-neutral-400" },
          { label: "Total Members", value: data.reduce((a, r) => a + r.members, 0).toLocaleString() },
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
          { key: "name",           label: "Squadron",       sortable: true  },
          { key: "code",           label: "Code",           sortable: true  },
          { key: "groupName",      label: "Group",          sortable: true  },
          { key: "arcenName",      label: "ARCEN",          sortable: true  },
          { key: "location",       label: "Location",       sortable: true  },
          { key: "specialization", label: "Specialization", sortable: true  },
          { key: "members",        label: "Members",        sortable: true  },
          { key: "status",         label: "Status",         sortable: false },
        ]}
        data={filteredData}
        searchKeys={["name", "code", "groupName", "arcenName", "location", "specialization"]}
        searchPlaceholder="Search squadron, location, group…"
        emptyMessage="No squadrons found."
        filterSlot={
          <>
            <FilterSelect value={arcenFilter}  onChange={handleArcenFilter}  options={arcenOptions}  placeholder="All ARCENs" />
            <FilterSelect value={groupFilter}  onChange={setGroupFilter}      options={filteredGroupOptions.map((g) => ({ value: g.value, label: g.label }))} placeholder="All Groups" />
            <FilterSelect value={specFilter}   onChange={setSpecFilter}       options={SPECIALIZATIONS} placeholder="All Spec." />
            <FilterSelect value={statusFilter} onChange={setStatusFilter}     options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} placeholder="All Status" />
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
            <td className="px-4 py-3 text-xs font-semibold text-neutral-700 dark:text-neutral-300">{row.groupName}</td>
            <td className="px-4 py-3 text-xs text-neutral-500 dark:text-neutral-500">{row.arcenName}</td>
            <td className="px-4 py-3">
              <span className="flex items-center gap-1 text-xs text-neutral-500">
                <MapPin size={11} className="shrink-0 text-neutral-400" /> {row.location}
              </span>
            </td>
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

      {/* ── Detail Modal ─────────────────────────────────────── */}
      {detail && (
        <DetailModal
          open={!!detail}
          onClose={() => setDetail(null)}
          icon={Layers}
          iconColor="bg-sky-600"
          title={`${detail.name} Squadron`}
          subtitle={`${detail.groupName} · ${detail.arcenName}`}
          badge={detail.code}
          size="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <button onClick={() => handleDelete(detail)} className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all duration-150">
                <Trash2 size={14} /> Delete
              </button>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleStatus(detail)} className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all duration-150">
                  {detail.status === "active" ? <><ToggleRight size={14} className="text-emerald-500" /> Deactivate</> : <><ToggleLeft size={14} /> Activate</>}
                </button>
                <button onClick={() => openEdit(detail)} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200 dark:shadow-indigo-900/30 transition-all duration-150">
                  <Pencil size={14} /> Edit Squadron
                </button>
              </div>
            </div>
          }
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-5">
            <DetailStatCard label="Members"        value={detail.members}  color="text-indigo-600 dark:text-indigo-400" />
            <DetailStatCard label="Specialization" value={detail.specialization} color="text-sky-600 dark:text-sky-400" />
            <DetailStatCard label="Group Type"     value={detail.groupType} color="text-blue-600 dark:text-blue-400" />
            <DetailStatCard label="Status"         value={detail.status === "active" ? "Active" : "Inactive"}
              color={detail.status === "active" ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-400"} />
          </div>

          <DetailSection title="Squadron Information">
            <DetailRow label="Name"           value={detail.name}           />
            <DetailRow label="Code"           value={detail.code}           />
            <DetailRow label="Specialization" value={detail.specialization} />
            <DetailRow label="Location"       value={detail.location}       />
            <DetailRow label="Members"        value={detail.members}        />
          </DetailSection>

          <DetailSection title="Assignment">
            <DetailRow label="Group"      value={detail.groupName} />
            <DetailRow label="Group Code" value={detail.groupCode} />
            <DetailRow label="ARCEN"      value={detail.arcenName} />
            <DetailRow label="ARCEN Full" value={detail.arcenFull} />
          </DetailSection>
        </DetailModal>
      )}

      <AddEditModal
        open={editModal}
        title={editMode === "add" ? "Add New Squadron" : `Edit ${detail?.name ?? ""} Squadron`}
        onClose={closeEdit}
        onSubmit={handleSubmit}
        submitLabel={editMode === "add" ? "Add Squadron" : "Save Changes"}
      >
        <FormField label="Squadron Name" required>
          <FormInput value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="e.g. Butuan, Surigao, Cagayan" />
        </FormField>
        <FormField label="Code" required>
          <FormInput value={form.code} onChange={(v) => setForm((f) => ({ ...f, code: v }))} placeholder="e.g. BTN-SQ" />
        </FormField>
        <FormField label="Group" required>
          <FormSelect value={form.groupId} onChange={(v) => setForm((f) => ({ ...f, groupId: v }))}>
            <option value="">Select Group…</option>
            {groupOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </FormSelect>
        </FormField>
        <FormField label="Location">
          <FormInput value={form.location} onChange={(v) => setForm((f) => ({ ...f, location: v }))} placeholder="e.g. Butuan City, Agusan del Norte" />
        </FormField>
        <FormField label="Specialization">
          <FormSelect value={form.specialization} onChange={(v) => setForm((f) => ({ ...f, specialization: v }))}>
            <option value="">Select Specialization…</option>
            {SPECIALIZATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </FormSelect>
        </FormField>
        <FormField label="Members">
          <FormInput type="number" value={form.members} onChange={(v) => setForm((f) => ({ ...f, members: v }))} placeholder="e.g. 88" />
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