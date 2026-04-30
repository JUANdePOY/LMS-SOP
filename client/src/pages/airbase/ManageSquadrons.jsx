import { useState, useMemo } from "react";
import { Layers, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import AirbasePageHeader from "@/components/airbase/AirbasePageHeader";
import ManagementTable from "@/components/airbase/ManagementTable";
import { StatusBadge, ActionButton, MonoCode, PrimaryButton, FilterSelect } from "@/components/airbase/AirbaseUI";
import AddEditModal, { FormField, FormInput, FormSelect } from "@/components/airbase/AddEditModal";
import { hierarchyData } from "@/data/hierarchyData";

const SPECIALIZATIONS = [
  "Security", "Engineering", "Communications", "Medical",
  "Supply", "Transport", "Maintenance", "Air Defense",
  "Radar Ops", "Intelligence", "Surveillance", "Cyber",
  "Dental", "Nursing", "Administrative",
];

// Flatten all squadrons
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
            location:       sq.location,
            groupId:        group.id,
            groupName:      group.name,
            arcenId:        arcen.id,
            arcenName:      arcen.name,
          });
        });
      });
    });
  });
  return rows;
}

// Build group options (Group → ARCEN)
function buildGroupOptions() {
  const list = [];
  hierarchyData.forEach((area) => {
    area.arcens.forEach((arcen) => {
      arcen.groups.forEach((group) => {
        list.push({
          value:     group.id,
          label:     `${group.name} — ${arcen.name}`,
          groupName: group.name,
          arcenName: arcen.name,
          arcenId:   arcen.id,
        });
      });
    });
  });
  return list;
}

// Build ARCEN options for filter
function buildArcenOptions() {
  const list = [];
  hierarchyData.forEach((area) => {
    area.arcens.forEach((arcen) => {
      list.push({ value: arcen.id, label: arcen.name });
    });
  });
  return list;
}

const INITIAL_DATA   = flattenSquadrons();
const GROUP_OPTIONS  = buildGroupOptions();
const ARCEN_OPTIONS  = buildArcenOptions();
const EMPTY_FORM     = { name: "", code: "", groupId: "", specialization: "", location: "", members: "", status: "active" };

const COLUMNS = [
  { key: "name",           label: "Squadron",       sortable: true  },
  { key: "code",           label: "Code",           sortable: true  },
  { key: "groupName",      label: "Group",          sortable: true  },
  { key: "arcenName",      label: "ARCEN",          sortable: true  },
  { key: "location",       label: "Location",       sortable: true  },
  { key: "specialization", label: "Specialization", sortable: true  },
  { key: "members",        label: "Members",        sortable: true  },
  { key: "status",         label: "Status",         sortable: false },
  { key: "actions",        label: "",               sortable: false, className: "w-24" },
];

export default function ManageSquadrons() {
  const [data,         setData]         = useState(INITIAL_DATA);
  const [modal,        setModal]        = useState({ open: false, mode: "add", row: null });
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [arcenFilter,  setArcenFilter]  = useState("");
  const [groupFilter,  setGroupFilter]  = useState("");
  const [specFilter,   setSpecFilter]   = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Filtered group options based on selected ARCEN
  const filteredGroupOptions = useMemo(() =>
    arcenFilter
      ? GROUP_OPTIONS.filter((g) => g.arcenId === arcenFilter)
      : GROUP_OPTIONS,
    [arcenFilter]
  );

  // Apply all filters to table data
  const filteredData = useMemo(() => {
    let d = data;
    if (arcenFilter)  d = d.filter((r) => r.arcenId        === arcenFilter);
    if (groupFilter)  d = d.filter((r) => r.groupId        === groupFilter);
    if (specFilter)   d = d.filter((r) => r.specialization === specFilter);
    if (statusFilter) d = d.filter((r) => r.status         === statusFilter);
    return d;
  }, [data, arcenFilter, groupFilter, specFilter, statusFilter]);

  // When ARCEN filter changes, reset group filter
  const handleArcenFilter = (val) => {
    setArcenFilter(val);
    setGroupFilter("");
  };

  const openAdd  = () => { setForm(EMPTY_FORM); setModal({ open: true, mode: "add", row: null }); };
  const openEdit = (row) => {
    setForm({
      name: row.name, code: row.code, groupId: row.groupId,
      specialization: row.specialization, location: row.location,
      members: String(row.members), status: row.status,
    });
    setModal({ open: true, mode: "edit", row });
  };
  const closeModal = () => setModal((m) => ({ ...m, open: false }));

  const handleSubmit = () => {
    const grp = GROUP_OPTIONS.find((g) => g.value === form.groupId);
    if (modal.mode === "add") {
      setData((prev) => [...prev, {
        id: `sq-${Date.now()}`,
        name:           form.name,
        code:           form.code,
        groupId:        form.groupId,
        groupName:      grp?.groupName ?? "",
        arcenId:        grp?.arcenId  ?? "",
        arcenName:      grp?.arcenName ?? "",
        specialization: form.specialization,
        location:       form.location,
        members:        Number(form.members) || 0,
        status:         form.status,
      }]);
    } else {
      setData((prev) => prev.map((r) =>
        r.id === modal.row.id
          ? {
              ...r,
              name:           form.name,
              code:           form.code,
              groupId:        form.groupId,
              groupName:      grp?.groupName ?? r.groupName,
              arcenId:        grp?.arcenId   ?? r.arcenId,
              arcenName:      grp?.arcenName ?? r.arcenName,
              specialization: form.specialization,
              location:       form.location,
              members:        Number(form.members) || r.members,
              status:         form.status,
            }
          : r
      ));
    }
    closeModal();
  };

  const handleDelete = (id) => {
    if (!confirm("Delete this Squadron?")) return;
    setData((p) => p.filter((r) => r.id !== id));
  };

  const toggleStatus = (id) =>
    setData((p) => p.map((r) =>
      r.id === id ? { ...r, status: r.status === "active" ? "inactive" : "active" } : r
    ));

  const activeCount   = data.filter((r) => r.status === "active").length;
  const inactiveCount = data.filter((r) => r.status === "inactive").length;

  return (
    <div className="flex flex-col gap-6 pb-10">
      <AirbasePageHeader
        icon={Layers}
        title="Manage Squadrons"
        description="Add, edit, and manage location-based squadrons (Butuan, Surigao, Cagayan, etc.)."
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
          { label: "Active",          value: activeCount,                                          color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Inactive",        value: inactiveCount,                                        color: "text-neutral-400" },
          { label: "Total Members",   value: data.reduce((a, r) => a + r.members, 0).toLocaleString() },
        ].map((s) => (
          <div key={s.label} className={cn(
            "flex flex-col rounded-xl border px-4 py-2.5 min-w-[110px]",
            "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
          )}>
            <span className={cn("text-xl font-bold leading-none", s.color ?? "text-neutral-900 dark:text-neutral-50")}>
              {s.value}
            </span>
            <span className="mt-0.5 text-[10px] text-neutral-400">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <ManagementTable
        columns={COLUMNS}
        data={filteredData}
        searchKeys={["name", "code", "groupName", "arcenName", "location", "specialization"]}
        searchPlaceholder="Search squadron, location, group, ARCEN…"
        emptyMessage="No squadrons found."
        filterSlot={
          <>
            <FilterSelect
              value={arcenFilter}
              onChange={handleArcenFilter}
              options={ARCEN_OPTIONS}
              placeholder="All ARCENs"
            />
            <FilterSelect
              value={groupFilter}
              onChange={setGroupFilter}
              options={filteredGroupOptions.map((g) => ({ value: g.value, label: g.label }))}
              placeholder="All Groups"
            />
            <FilterSelect
              value={specFilter}
              onChange={setSpecFilter}
              options={SPECIALIZATIONS}
              placeholder="All Specializations"
            />
            <FilterSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "active",   label: "Active"   },
                { value: "inactive", label: "Inactive" },
              ]}
              placeholder="All Status"
            />
          </>
        }
        renderRow={(row) => (
          <tr
            key={row.id}
            className="group hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors duration-100"
          >
            <td className="px-4 py-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[13px] font-bold text-neutral-800 dark:text-neutral-200">
                  {row.name}
                </span>
              </div>
            </td>
            <td className="px-4 py-3"><MonoCode>{row.code}</MonoCode></td>
            <td className="px-4 py-3 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              {row.groupName}
            </td>
            <td className="px-4 py-3 text-xs text-neutral-500 dark:text-neutral-500">
              {row.arcenName}
            </td>
            <td className="px-4 py-3">
              <span className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                <MapPin size={11} className="shrink-0 text-neutral-400" />
                {row.location}
              </span>
            </td>
            <td className="px-4 py-3">
              <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                {row.specialization}
              </span>
            </td>
            <td className="px-4 py-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {row.members}
            </td>
            <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <ActionButton
                  icon={row.status === "active" ? ToggleRight : ToggleLeft}
                  label="Toggle Status"
                  onClick={() => toggleStatus(row.id)}
                />
                <ActionButton icon={Pencil} label="Edit"   onClick={() => openEdit(row)} />
                <ActionButton icon={Trash2} label="Delete" onClick={() => handleDelete(row.id)} variant="danger" />
              </div>
            </td>
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
          <FormInput
            value={form.name}
            onChange={(v) => setForm((f) => ({ ...f, name: v }))}
            placeholder="e.g. Butuan, Surigao, Cagayan"
          />
        </FormField>
        <FormField label="Code" required>
          <FormInput
            value={form.code}
            onChange={(v) => setForm((f) => ({ ...f, code: v }))}
            placeholder="e.g. BTN-SQ"
          />
        </FormField>
        <FormField label="Group" required>
          <FormSelect value={form.groupId} onChange={(v) => setForm((f) => ({ ...f, groupId: v }))}>
            <option value="">Select Group…</option>
            {GROUP_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </FormSelect>
        </FormField>
        <FormField label="Location">
          <FormInput
            value={form.location}
            onChange={(v) => setForm((f) => ({ ...f, location: v }))}
            placeholder="e.g. Butuan City, Agusan del Norte"
          />
        </FormField>
        <FormField label="Specialization">
          <FormSelect value={form.specialization} onChange={(v) => setForm((f) => ({ ...f, specialization: v }))}>
            <option value="">Select Specialization…</option>
            {SPECIALIZATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </FormSelect>
        </FormField>
        <FormField label="Members">
          <FormInput
            type="number"
            value={form.members}
            onChange={(v) => setForm((f) => ({ ...f, members: v }))}
            placeholder="e.g. 88"
          />
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