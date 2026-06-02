import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Package, Plus, Pencil, Trash2, AlertTriangle, Search, X, Loader, Boxes,
  UserCheck, ArrowUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
  getSupplies, getSupplyCategories, createSupply, updateSupply, deleteSupply,
  adjustSupplyStock, getLowStockSupplies,
  getUniformTracker, createIssuance,
} from "@/services/api";
import SupplyForm from "@/components/logistics/SupplyForm";
import StockAdjustForm from "@/components/logistics/StockAdjustForm";
import { KPICard, CategoryBadge, StockLevelBar } from "@/components/logistics/LogisticsUI";

const TABS = [
  { key: "inventory", label: "Inventory", icon: Package },
  { key: "uniform-tracker", label: "Uniform Tracker", icon: Boxes },
];

export default function Logistics() {
  const toast = useToast();

  // ── Data state ──
  const [supplies, setSupplies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [uniformTracker, setUniformTracker] = useState([]);
  const [uniformTrackerLoading, setUniformTrackerLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("inventory");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // ── Modal state ──
  const [supplyFormOpen, setSupplyFormOpen] = useState(false);
  const [editingSupply, setEditingSupply] = useState(null);
  const [stockAdjustOpen, setStockAdjustOpen] = useState(false);
  const [adjustingSupply, setAdjustingSupply] = useState(null);
  const [detailSupply, setDetailSupply] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [assignModal, setAssignModal] = useState(null);

  // ── Load data ──
  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === "uniform-tracker" && uniformTracker.length === 0) {
      loadUniformTracker();
    }
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [suppliesRes, categoriesRes, lowStockRes] = await Promise.all([
        getSupplies({ limit: 100 }),
        getSupplyCategories(),
        getLowStockSupplies(),
      ]);

      if (suppliesRes.data.status === "success") {
        setSupplies(suppliesRes.data.data.supplies || []);
      }
      if (categoriesRes.data.status === "success") {
        setCategories(categoriesRes.data.data.categories || []);
      }
      if (lowStockRes.data.status === "success") {
        setLowStock(lowStockRes.data.data.supplies || []);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load logistics data");
    } finally {
      setLoading(false);
    }
  };

  const loadUniformTracker = async () => {
    setUniformTrackerLoading(true);
    try {
      const res = await getUniformTracker();
      if (res.data.status === "success") {
        setUniformTracker(res.data.data.tracker || []);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load uniform tracker");
    } finally {
      setUniformTrackerLoading(false);
    }
  };

  // ── KPI computations ──
  const kpis = useMemo(() => {
    const totalItems = supplies.length;
    const totalStock = supplies.reduce((a, s) => a + (s.quantity_available || 0), 0);
    const lowStockCount = lowStock.length;
    return { totalItems, totalStock, lowStockCount };
  }, [supplies, lowStock]);

  // ── Filtered data ──
  const filteredSupplies = useMemo(() => {
    let d = supplies;
    if (categoryFilter) d = d.filter((s) => s.category === categoryFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      d = d.filter(
        (s) =>
          (s.name || "").toLowerCase().includes(q) ||
          (s.category || "").toLowerCase().includes(q) ||
          (s.location || "").toLowerCase().includes(q) ||
          (s.description || "").toLowerCase().includes(q)
      );
    }
    return d;
  }, [supplies, categoryFilter, search]);

  // ── Supply CRUD handlers ──
  const handleCreateSupply = async (data) => {
    try {
      const res = await createSupply(data);
      if (res.data.status === "success") {
        toast.success("Supply item created successfully");
        setSupplyFormOpen(false);
        loadData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create supply item");
    }
  };

  const handleUpdateSupply = async (data) => {
    try {
      const res = await updateSupply(editingSupply.id, data);
      if (res.data.status === "success") {
        toast.success("Supply item updated successfully");
        setSupplyFormOpen(false);
        setEditingSupply(null);
        loadData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update supply item");
    }
  };

  const handleDeleteSupply = async () => {
    if (!deleteConfirm) return;
    try {
      const res = await deleteSupply(deleteConfirm.id);
      if (res.data.status === "success") {
        toast.success("Supply item deleted successfully");
        setDeleteConfirm(null);
        loadData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete supply item");
      setDeleteConfirm(null);
    }
  };

  const handleAdjustStock = async (data) => {
    try {
      const res = await adjustSupplyStock(data);
      if (res.data.status === "success") {
        toast.success(`Stock adjusted. New quantity: ${res.data.data.new_quantity}`);
        setStockAdjustOpen(false);
        setAdjustingSupply(null);
        loadData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to adjust stock");
    }
  };

  const openEdit = (supply) => {
    setEditingSupply(supply);
    setSupplyFormOpen(true);
  };

  const openAdd = () => {
    setEditingSupply(null);
    setSupplyFormOpen(true);
  };

  const openAdjust = (supply) => {
    setAdjustingSupply(supply);
    setStockAdjustOpen(true);
  };

  const openDetail = (supply) => {
    setDetailSupply(supply);
  };

  const handleAssignItem = async (data) => {
    try {
      const res = await createIssuance(data);
      if (res.data.status === "success") {
        toast.success(`Assigned ${data.quantity_issued} item(s) to ${assignModal.last_name}, ${assignModal.first_name}`);
        setAssignModal(null);
        loadData();
        loadUniformTracker();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to assign item");
    }
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 pb-10">
      {/* ── KPI Cards ── */}
<div className="flex flex-wrap gap-3">
        <KPICard
          icon={Boxes}
          label="Total Supply Items"
          value={kpis.totalItems}
          subtext={`${kpis.totalStock.toLocaleString()} total units in stock`}
          color="text-indigo-600 dark:text-indigo-400"
          bgColor="bg-indigo-50 dark:bg-indigo-500/10"
        />
        <KPICard
          icon={AlertTriangle}
          label="Low Stock Items"
          value={kpis.lowStockCount}
          subtext={kpis.lowStockCount > 0 ? "Items below reorder level" : "All items stocked"}
          color={kpis.lowStockCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}
          bgColor={kpis.lowStockCount > 0 ? "bg-amber-50 dark:bg-amber-500/10" : "bg-emerald-50 dark:bg-emerald-500/10"}
        />
      </div>

      {/* ── Low Stock Alert Banner ── */}
      {lowStock.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/20 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-800 dark:text-amber-200 text-sm">Low Stock Alert</h3>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
              {lowStock.length} item(s) at or below reorder level:{" "}
              {lowStock.slice(0, 5).map((s) => s.name).join(", ")}
              {lowStock.length > 5 && ` and ${lowStock.length - 5} more`}
            </p>
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSearch(""); }}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all flex-1 justify-center",
                activeTab === tab.key
                  ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 shadow-sm"
                  : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
              )}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Header with Action Buttons ── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-neutral-500 dark:text-neutral-400">
          {activeTab === "inventory" && `${filteredSupplies.length} item${filteredSupplies.length !== 1 ? "s" : ""}`}
          {activeTab === "uniform-tracker" && `${uniformTracker.reduce((acc, sg) => acc + sg.reservists.length, 0)} reservist${uniformTracker.reduce((acc, sg) => acc + sg.reservists.length, 0) !== 1 ? "s" : ""}`}
        </div>
        <div className="flex items-center gap-2">
          {activeTab === "inventory" && (
            <button
              onClick={openAdd}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <Plus size={14} /> Add Item
            </button>
          )}
        </div>
      </div>

      {/* ── Tab Content ── */}
      {activeTab === "inventory" && (
        <InventoryTab
          supplies={filteredSupplies}
          categories={categories}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          search={search}
          setSearch={setSearch}
          onEdit={openEdit}
          onDelete={(s) => setDeleteConfirm(s)}
          onAdjust={openAdjust}
          onDetail={openDetail}
        />
      )}

      {activeTab === "uniform-tracker" && (
        <UniformTrackerTab
          search={search}
          setSearch={setSearch}
          uniformTracker={uniformTracker}
          loading={uniformTrackerLoading}
          supplies={supplies}
          onAssign={(reservist) => setAssignModal(reservist)}
        />
      )}

      {/* ── Modals ── */}
      <SupplyForm
        open={supplyFormOpen}
        onClose={() => { setSupplyFormOpen(false); setEditingSupply(null); }}
        onSubmit={editingSupply ? handleUpdateSupply : handleCreateSupply}
        initialData={editingSupply}
      />

      <StockAdjustForm
        open={stockAdjustOpen}
        onClose={() => { setStockAdjustOpen(false); setAdjustingSupply(null); }}
        onSubmit={handleAdjustStock}
        supply={adjustingSupply}
      />

      <ConfirmDialog
        open={!!deleteConfirm}
        title="Delete Supply Item"
        description={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteSupply}
        onCancel={() => setDeleteConfirm(null)}
        destructive
      />

      {/* ── Supply Detail Modal ── */}
      {detailSupply && (
        <SupplyDetailModal supply={detailSupply} onClose={() => setDetailSupply(null)} />
      )}

      {/* ── Assign Item Modal ── */}
      <AssignItemModal
        reservist={assignModal}
        supplies={supplies}
        open={!!assignModal}
        onClose={() => setAssignModal(null)}
        onSubmit={handleAssignItem}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// INVENTORY TAB
// ═══════════════════════════════════════════════════════════════
function InventoryTab({
  supplies, categories, categoryFilter, setCategoryFilter,
  search, setSearch, onEdit, onDelete, onAdjust, onDetail,
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items, categories, locations…"
            className={cn(
              "w-full rounded-lg border py-2 pl-9 pr-8 text-sm",
              "border-neutral-200 dark:border-neutral-700",
              "bg-white dark:bg-neutral-900",
              "text-neutral-800 dark:text-neutral-200",
              "placeholder:text-neutral-400 dark:placeholder:text-neutral-600",
              "outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400",
              "transition-all"
            )}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
              <X size={13} />
            </button>
          )}
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className={cn(
            "rounded-lg border py-2 pl-3 pr-8 text-sm",
            "border-neutral-200 dark:border-neutral-700",
            "bg-white dark:bg-neutral-900",
            "text-neutral-700 dark:text-neutral-300",
            "outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400",
            "cursor-pointer"
          )}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <span className="ml-auto text-xs text-neutral-400 dark:text-neutral-600 shrink-0">
          {supplies.length} item{supplies.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">Item</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">Category</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">Stock Level</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">Location</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">Supplier</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 bg-white dark:bg-neutral-900">
              {supplies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-neutral-400 dark:text-neutral-600">
                    No supply items found
                  </td>
                </tr>
              ) : (
                supplies.map((supply) => {
                  const isLow = supply.quantity_available <= supply.reorder_level;
                  return (
                    <tr
                      key={supply.id}
                      className="group hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <button
                          onClick={() => onDetail(supply)}
                          className="text-left hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        >
                          <span className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                            {supply.name}
                          </span>
                          {supply.description && (
                            <p className="text-[10px] text-neutral-400 mt-0.5 max-w-[200px] truncate">{supply.description}</p>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <CategoryBadge category={supply.category} />
                      </td>
                      <td className="px-4 py-3 min-w-[140px]">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-sm font-bold",
                            supply.quantity_available === 0
                              ? "text-red-500"
                              : isLow
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-neutral-800 dark:text-neutral-200"
                          )}>
                            {supply.quantity_available}
                          </span>
                          <span className="text-[10px] text-neutral-400">{supply.unit}</span>
                        </div>
                        <div className="mt-1">
                          <StockLevelBar
                            current={supply.quantity_available}
                            reorder={supply.reorder_level}
                            max={supply.max_stock || Math.max(supply.quantity_available, supply.reorder_level) * 2}
                          />
                        </div>
                        <p className="text-[9px] text-neutral-400 mt-0.5">
                          Reorder: {supply.reorder_level}
                          {supply.max_stock ? ` · Max: ${supply.max_stock}` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-500 dark:text-neutral-400">
                        {supply.location || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-500 dark:text-neutral-400">
                        {supply.supplier || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onAdjust(supply)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400 transition-all"
                            title="Adjust Stock"
                          >
                            <ArrowUpDown size={13} />
                          </button>
                          <button
                            onClick={() => onEdit(supply)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400 transition-all"
                            title="Edit"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => onDelete(supply)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-all"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ASSIGN ITEM MODAL
// ═══════════════════════════════════════════════════════════════
function AssignItemModal({ reservist, supplies, open, onClose, onSubmit }) {
  const [selectedSupply, setSelectedSupply] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [issuanceType, setIssuanceType] = useState("issued");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!selectedSupply) return;
    setSubmitting(true);
    try {
      await onSubmit({
        reservist_id: reservist.id,
        supply_id: selectedSupply.id,
        quantity_issued: quantity,
        issuance_type: issuanceType,
        notes: notes,
      });
    } finally {
      setSubmitting(false);
    }
  }, [selectedSupply, quantity, issuanceType, notes, onSubmit, reservist]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-md rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <UserCheck size={18} />
            </span>
            <div>
              <h2 className="text-[15px] font-bold text-neutral-900 dark:text-neutral-50">Assign Item</h2>
              <p className="text-[11px] text-neutral-400">{reservist.last_name}, {reservist.first_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
            <X size={15} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-[10px] font-medium text-neutral-400 mb-1.5">Item</label>
            <select
              value={selectedSupply?.id || ""}
              onChange={(e) => setSelectedSupply(supplies.find(s => s.id === parseInt(e.target.value)))}
              className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400"
            >
              <option value="">Select an item</option>
              {supplies.filter(s => s.quantity_available > 0).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.quantity_available} available)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-medium text-neutral-400 mb-1.5">Quantity</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-neutral-400 mb-1.5">Type</label>
              <select
                value={issuanceType}
                onChange={(e) => setIssuanceType(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400"
              >
                <option value="issued">Issued</option>
                <option value="personal">Personal</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-medium text-neutral-400 mb-1.5">Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 resize-none"
              rows="2"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 dark:border-neutral-800 px-6 py-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedSupply || submitting}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Assigning..." : "Assign Item"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// UNIFORM TRACKER TAB
// ═══════════════════════════════════════════════════════════════
function UniformTrackerTab({ search, setSearch, uniformTracker, loading, onAssign }) {
  const filteredTracker = useMemo(() => {
    if (!search.trim()) return uniformTracker;
    const q = search.toLowerCase();
    return uniformTracker.map(squadronGroup => ({
      ...squadronGroup,
      reservists: squadronGroup.reservists.filter(r => 
        `${r.last_name}, ${r.first_name}`.toLowerCase().includes(q) ||
        r.service_number?.toLowerCase().includes(q) ||
        r.rank?.toLowerCase().includes(q)
      )
    })).filter(sg => sg.reservists.length > 0);
  }, [uniformTracker, search]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="relative min-w-[220px] flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, rank, service number…"
            className="w-full rounded-lg border py-2 pl-9 pr-8 text-sm border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all"
          />
        </div>
        <span className="ml-auto text-xs text-neutral-400 dark:text-neutral-600 shrink-0">
          {filteredTracker.reduce((acc, sg) => acc + sg.reservists.length, 0)} reservist{filteredTracker.reduce((acc, sg) => acc + sg.reservists.length, 0) !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-6">
        {filteredTracker.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/10 mb-4">
              <Package size={28} className="text-emerald-500" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">No Reservists Found</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Try adjusting your search criteria.</p>
          </div>
        ) : (
          filteredTracker.map((squadronGroup) => (
            <div key={`${squadronGroup.squadron_id}-${squadronGroup.group_id}`} className="space-y-3">
              <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2">
                <h3 className="font-bold text-neutral-800 dark:text-neutral-200">
                  {squadronGroup.squadron_name || "Unassigned"} - {squadronGroup.group_name || "No Group"}
                </h3>
                <span className="text-xs text-neutral-400 dark:text-neutral-600">({squadronGroup.reservists.length} reservists)</span>
              </div>
              <div className="space-y-3">
                {squadronGroup.reservists.map((reservist) => (
                  <div key={reservist.id} className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                          {reservist.last_name}, {reservist.first_name}
                        </p>
                        <p className="text-xs text-neutral-400">{reservist.rank} · {reservist.service_number}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          reservist.uniforms.length === 0
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                            : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                        )}>
                          {reservist.uniforms.length === 0 ? "No Uniform" : `${reservist.uniforms.length} Uniform${reservist.uniforms.length > 1 ? "s" : ""}`}
                        </span>
                        <button
                          onClick={() => onAssign(reservist)}
                          className="flex items-center gap-1 rounded-lg bg-indigo-600 text-white px-2 py-1 text-[10px] font-medium hover:bg-indigo-700 transition-colors"
                          title="Assign Item"
                        >
                          <UserCheck size={12} />
                          Assign
                        </button>
                      </div>
                    </div>

                    {reservist.uniforms.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {reservist.uniforms.map((uniform) => (
                          <div key={uniform.issuance_id} className="flex items-center justify-between text-xs pl-2 border-l-2 border-neutral-200 dark:border-neutral-700">
                            <div>
                              <span className="font-medium text-neutral-700 dark:text-neutral-300">{uniform.supply_name}</span>
                              <span className="text-neutral-400 dark:text-neutral-500"> ({uniform.issuance_type === "issued" ? "Issued" : "Personal"})</span>
                              <span className="text-neutral-400"> - Qty: {uniform.quantity_issued}</span>
                              {uniform.returned_date && (
                                <span className="text-emerald-600 dark:text-emerald-400"> (Returned: {uniform.returned_date})</span>
                              )}
                            </div>
                            <span className={cn(
                              uniform.returned_date ? "text-emerald-600" : "text-blue-600"
                            )}>
                              {uniform.returned_date ? "Returned" : "Active"}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-2 text-xs text-neutral-400 dark:text-neutral-600">
                        <span className="mr-3">Issued: {reservist.uniforms.filter(u => u.issuance_type === "issued").length}</span>
                        <span>Personal: {reservist.uniforms.filter(u => u.issuance_type === "personal").length}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SUPPLY DETAIL MODAL
// ═══════════════════════════════════════════════════════════════
function SupplyDetailModal({ supply, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-lg rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <Package size={18} />
            </span>
            <div>
              <h2 className="text-[15px] font-bold text-neutral-900 dark:text-neutral-50">{supply.name}</h2>
              <p className="text-[11px] text-neutral-400">{supply.category}</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
            <X size={15} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {supply.description && (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">{supply.description}</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3">
              <p className="text-[10px] font-medium text-neutral-400">Available</p>
              <p className={cn(
                "text-xl font-bold mt-0.5",
                supply.quantity_available <= supply.reorder_level
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-neutral-900 dark:text-neutral-50"
              )}>
                {supply.quantity_available} <span className="text-xs font-normal text-neutral-400">{supply.unit}</span>
              </p>
            </div>
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3">
              <p className="text-[10px] font-medium text-neutral-400">Reorder Level</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-neutral-50 mt-0.5">
                {supply.reorder_level} <span className="text-xs font-normal text-neutral-400">{supply.unit}</span>
              </p>
            </div>
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3">
              <p className="text-[10px] font-medium text-neutral-400">Max Stock</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-neutral-50 mt-0.5">
                {supply.max_stock || "—"}
              </p>
            </div>
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3">
              <p className="text-[10px] font-medium text-neutral-400">Location</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-neutral-50 mt-0.5">
                {supply.location || "—"}
              </p>
            </div>
          </div>
          {supply.supplier && (
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3">
              <p className="text-[10px] font-medium text-neutral-400">Supplier</p>
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mt-0.5">{supply.supplier}</p>
            </div>
          )}
          <div>
            <p className="text-[10px] font-medium text-neutral-400 mb-1.5">Stock Level</p>
            <StockLevelBar
              current={supply.quantity_available}
              reorder={supply.reorder_level}
              max={supply.max_stock || Math.max(supply.quantity_available, supply.reorder_level) * 2}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
