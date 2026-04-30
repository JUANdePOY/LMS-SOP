import { useState, useMemo } from "react";
import { Shield, Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { cn } from "@/lib/utils";
import AirbasePageHeader from "@/components/airbase/AirbasePageHeader";
import ManagementTable from "@/components/airbase/ManagementTable";
import { StatusBadge, ActionButton, MonoCode, PrimaryButton, FilterSelect } from "@/components/airbase/AirbaseUI";
import AddEditModal, { FormField, FormInput, FormSelect } from "@/components/airbase/AddEditModal";
import { hierarchyData } from "@/data/hierarchyData";

// ── Flatten all ARCENs from hierarchyData ─────────────────────
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

const EMPTY_FORM = {
  name: "", code: "", commander: "", areaId: "", status: "active",
};

const TABLE_COLUMNS = [
  { key: "name",       label: "ARCEN Name",  sortable: true  },
  { key: "code",       label: "Code",        sortable: true  },
  { key: "areaName",   label: "Airbase",     sortable: true  },
  { key: "commander",  label: "Commander",   sortable: true  },
  { key: "reservists", label: "Reservists",  sortable: true  },
  { key: "groups",     label: "Groups",      sortable: true  },
  { key: "status",     label: "Status",      sortable: false },
  { key: "actions",    label: "",            sortable: false, className: "w-24" },
];

export default function ManageArcens() {
  const [data,       setData]       = useState(INITIAL_DATA);
  const [modal,      setModal]      = useState({ open: false, mode: "add", row: null });
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [areaFilter, setAreaFilter] = useState("");

  // Area options for filter + form
  const areaOptions = useMemo(() =>
    hierarchyData.map((a) => ({ value: a.id, label: a.name })),
    []
  );

  // Apply area filter on top of ManagementTable's search
  const filteredData = areaFilter
    ? data.filter((row) => row.areaId === areaFilter)
    : data;

  // ── Modal helpers ──────────────────────────────────────────
  const openAdd = () => {
    setForm(EMPTY_FORM);
    setModal({ open: true, mode: "add", row: null });
  };

  const openEdit = (row) => {
    setForm({
      name: row.name, code: row.code,
      commander: row.commander, areaId: row.areaId, status: row.status,
    });
    setModal({ open: true, mode: "edit", row });
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
    }
    closeModal();
  };

  const handleDelete = (id) => {
    if (!confirm("Delete this ARCEN? This action cannot be undone.")) return;
    setData((prev) => prev.filter((r) => r.id !== id));
  };

  const toggleStatus = (id) => {
    setData((prev) => prev.map((r) =>
      r.id === id
        ? { ...r, status: r.status === "active" ? "inactive" : "active" }
        : r
    ));
  };

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Header */}
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

      {/* Stats row */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: "Total ARCENs", value: data.length },
          { label: "Active",  value: data.filter((r) => r.status === "active").length,   color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Inactive", value: data.filter((r) => r.status === "inactive").length, color: "text-neutral-400" },
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
            className="group hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors duration-100"
          >
            <td className="px-4 py-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-200">
                  {row.name}
                </span>
              </div>
            </td>
            <td className="px-4 py-3"><MonoCode>{row.code}</MonoCode></td>
            <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">{row.areaName}</td>
            <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">{row.commander}</td>
            <td className="px-4 py-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {row.reservists.toLocaleString()}
            </td>
            <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">{row.groups}</td>
            <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                <ActionButton
                  icon={row.status === "active" ? ToggleRight : ToggleLeft}
                  label={row.status === "active" ? "Deactivate" : "Activate"}
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
            <option value="inactive">Inactive</option>
          </FormSelect>
        </FormField>
      </AddEditModal>
    </div>
  );
}
