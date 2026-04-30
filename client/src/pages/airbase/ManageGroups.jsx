import { useState, useMemo } from "react";
import { Users, Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { cn } from "@/lib/utils";
import AirbasePageHeader from "@/components/airbase/AirbasePageHeader";
import ManagementTable from "@/components/airbase/ManagementTable";
import { StatusBadge, TypeBadge, ActionButton, MonoCode, PrimaryButton, FilterSelect } from "@/components/airbase/AirbaseUI";
import AddEditModal, { FormField, FormInput, FormSelect } from "@/components/airbase/AddEditModal";
import { hierarchyData } from "@/data/hierarchyData";

const GROUP_TYPES = ["Combat Support", "Logistics", "Air Defense", "Intelligence", "Medical"];

// Flatten all groups from hierarchyData
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
          commander:  group.commander,
          reservists: group.reservists,
          squadrons:  group.squadrons.length,
          arcenId:    arcen.id,
          arcenName:  arcen.name,
          arcenFull:  arcen.fullName,
          status:     "active",
        });
      });
    });
  });
  return rows;
}

// Build ARCEN options for filter + form
function buildArcenOptions() {
  const list = [];
  hierarchyData.forEach((area) => {
    area.arcens.forEach((arcen) => {
      list.push({
        value: arcen.id,
        label: `${arcen.name} — ${arcen.fullName}`,
        arcenName: arcen.name,
        arcenFull: arcen.fullName,
      });
    });
  });
  return list;
}

const INITIAL_DATA   = flattenGroups();
const ARCEN_OPTIONS  = buildArcenOptions();
const EMPTY_FORM     = { name: "", code: "", type: "", commander: "", arcenId: "", status: "active" };

const COLUMNS = [
  { key: "name",      label: "Group Name",  sortable: true  },
  { key: "code",      label: "Code",        sortable: true  },
  { key: "arcenName", label: "ARCEN",       sortable: true  },
  { key: "type",      label: "Type",        sortable: true  },
  { key: "commander", label: "Commander",   sortable: true  },
  { key: "reservists",label: "Reservists",  sortable: true  },
  { key: "squadrons", label: "Squadrons",   sortable: true  },
  { key: "status",    label: "Status",      sortable: false },
  { key: "actions",   label: "",            sortable: false, className: "w-24" },
];

export default function ManageGroups() {
  const [data,        setData]        = useState(INITIAL_DATA);
  const [modal,       setModal]       = useState({ open: false, mode: "add", row: null });
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [arcenFilter, setArcenFilter] = useState("");
  const [typeFilter,  setTypeFilter]  = useState("");

  // Apply filters
  const filteredData = useMemo(() => {
    let d = data;
    if (arcenFilter) d = d.filter((r) => r.arcenId === arcenFilter);
    if (typeFilter)  d = d.filter((r) => r.type    === typeFilter);
    return d;
  }, [data, arcenFilter, typeFilter]);

  const openAdd  = () => { setForm(EMPTY_FORM); setModal({ open: true, mode: "add", row: null }); };
  const openEdit = (row) => {
    setForm({ name: row.name, code: row.code, type: row.type, commander: row.commander, arcenId: row.arcenId, status: row.status });
    setModal({ open: true, mode: "edit", row });
  };
  const closeModal = () => setModal((m) => ({ ...m, open: false }));

  const handleSubmit = () => {
    const arcen = ARCEN_OPTIONS.find((a) => a.value === form.arcenId);
    if (modal.mode === "add") {
      setData((prev) => [...prev, {
        id: `group-${Date.now()}`,
        ...form,
        arcenName: arcen?.arcenName ?? "",
        arcenFull: arcen?.arcenFull ?? "",
        reservists: 0,
        squadrons: 0,
      }]);
    } else {
      setData((prev) => prev.map((r) =>
        r.id === modal.row.id
          ? { ...r, ...form, arcenName: arcen?.arcenName ?? r.arcenName, arcenFull: arcen?.arcenFull ?? r.arcenFull }
          : r
      ));
    }
    closeModal();
  };

  const handleDelete = (id) => { if (!confirm("Delete this Group?")) return; setData((p) => p.filter((r) => r.id !== id)); };
  const toggleStatus = (id) => setData((p) => p.map((r) => r.id === id ? { ...r, status: r.status === "active" ? "inactive" : "active" } : r));

  return (
    <div className="flex flex-col gap-6 pb-10">
      <AirbasePageHeader
        icon={Users}
        title="Manage Groups"
        description="Add, edit, and manage reserve groups (e.g. 509, TOGR 10) assigned to ARCENs."
        breadcrumbs={[
          { label: "Airbase", path: "/airbase" },
          { label: "Manage Groups" },
        ]}
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
            "flex flex-col rounded-xl border px-4 py-2.5 min-w-[110px]",
            "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
          )}>
            <span className={cn("text-xl font-bold leading-none", s.color ?? "text-neutral-900 dark:text-neutral-50")}>{s.value}</span>
            <span className="mt-0.5 text-[10px] text-neutral-400">{s.label}</span>
          </div>
        ))}
      </div>

      <ManagementTable
        columns={COLUMNS}
        data={filteredData}
        searchKeys={["name", "code", "arcenName", "type", "commander"]}
        searchPlaceholder="Search group name, code, ARCEN, commander…"
        emptyMessage="No groups found."
        filterSlot={
          <>
            <FilterSelect
              value={arcenFilter}
              onChange={setArcenFilter}
              options={ARCEN_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              placeholder="All ARCENs"
            />
            <FilterSelect
              value={typeFilter}
              onChange={setTypeFilter}
              options={GROUP_TYPES}
              placeholder="All Types"
            />
          </>
        }
        renderRow={(row) => (
          <tr key={row.id} className="group hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors duration-100">
            <td className="px-4 py-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[13px] font-bold text-neutral-800 dark:text-neutral-200">{row.name}</span>
              </div>
            </td>
            <td className="px-4 py-3"><MonoCode>{row.code}</MonoCode></td>
            <td className="px-4 py-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{row.arcenName}</span>
                <span className="text-[10px] text-neutral-400 dark:text-neutral-600">{row.arcenFull}</span>
              </div>
            </td>
            <td className="px-4 py-3"><TypeBadge type={row.type} /></td>
            <td className="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-400">{row.commander}</td>
            <td className="px-4 py-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">{row.reservists.toLocaleString()}</td>
            <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">{row.squadrons}</td>
            <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <ActionButton icon={row.status === "active" ? ToggleRight : ToggleLeft} label="Toggle" onClick={() => toggleStatus(row.id)} />
                <ActionButton icon={Pencil} label="Edit"   onClick={() => openEdit(row)} />
                <ActionButton icon={Trash2} label="Delete" onClick={() => handleDelete(row.id)} variant="danger" />
              </div>
            </td>
          </tr>
        )}
      />

      <AddEditModal
        open={modal.open}
        title={modal.mode === "add" ? "Add New Group" : "Edit Group"}
        onClose={closeModal}
        onSubmit={handleSubmit}
        submitLabel={modal.mode === "add" ? "Add Group" : "Save Changes"}
      >
        <FormField label="Group Name" required>
          <FormInput value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="e.g. 509 or TOGR 10" />
        </FormField>
        <FormField label="Code" required>
          <FormInput value={form.code} onChange={(v) => setForm((f) => ({ ...f, code: v }))} placeholder="e.g. 509RG or TOGR10" />
        </FormField>
        <FormField label="ARCEN" required>
          <FormSelect value={form.arcenId} onChange={(v) => setForm((f) => ({ ...f, arcenId: v }))}>
            <option value="">Select ARCEN…</option>
            {ARCEN_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
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