import { useState, useEffect, useMemo } from "react";
import {
  Package, Plus, Pencil, Trash2, AlertTriangle, ArrowUpDown,
  Search, X, Loader, ClipboardList, Clock, RotateCcw, Boxes,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
  getSupplies, getSupplyCategories, createSupply, updateSupply, deleteSupply,
  adjustSupplyStock, getLowStockSupplies,
  getIssuances, getOverdueIssuances, createIssuance, returnIssuance,
} from "@/services/api";
import SupplyForm from "@/components/logistics/SupplyForm";
import StockAdjustForm from "@/components/logistics/StockAdjustForm";
import IssueForm from "@/components/logistics/IssueForm";
import ReturnForm from "@/components/logistics/ReturnForm";
import { KPICard, CategoryBadge, StockLevelBar } from "@/components/logistics/LogisticsUI";

const TABS = [
  { key: "inventory", label: "Inventory", icon: Package },
  { key: "issuances", label: "Issuances", icon: ClipboardList },
  { key: "overdue", label: "Overdue", icon: Clock },
];

export default function Logistics() {
  const toast = useToast();

  // ── Data state ──
  const [supplies, setSupplies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [issuances, setIssuances] = useState([]);
  const [overdueIssuances, setOverdueIssuances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("inventory");

  // ── Filter state ──
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [issuanceFilter, setIssuanceFilter] = useState("all"); // all | active | returned

  // ── Modal state ──
  const [supplyFormOpen, setSupplyFormOpen] = useState(false);
  const [editingSupply, setEditingSupply] = useState(null);
  const [stockAdjustOpen, setStockAdjustOpen] = useState(false);
  const [adjustingSupply, setAdjustingSupply] = useState(null);
  const [issueFormOpen, setIssueFormOpen] = useState(false);
  const [returnFormOpen, setReturnFormOpen] = useState(false);
  const [returningIssuance, setReturningIssuance] = useState(null);
  const [detailSupply, setDetailSupply] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // ── Load data ──
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [suppliesRes, categoriesRes, lowStockRes, issuancesRes, overdueRes] = await Promise.all([
        getSupplies({ limit: 100 }),
        getSupplyCategories(),
        getLowStockSupplies(),
        getIssuances({ limit: 100 }),
        getOverdueIssuances(),
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
      if (issuancesRes.data.status === "success") {
        setIssuances(issuancesRes.data.data.issuances || []);
      }
      if (overdueRes.data.status === "success") {
        setOverdueIssuances(overdueRes.data.data.issuances || []);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load logistics data");
    } finally {
      setLoading(false);
    }
  };

  // ── KPI computations ──
  const kpis = useMemo(() => {
    const totalItems = supplies.length;
    const totalStock = supplies.reduce((a, s) => a + (s.quantity_available || 0), 0);
    const lowStockCount = lowStock.length;
    const activeIssuances = issuances.filter((i) => !i.returned_date).length;
    const overdueCount = overdueIssuances.length;
    return { totalItems, totalStock, lowStockCount, activeIssuances, overdueCount };
  }, [supplies, lowStock, issuances, overdueIssuances]);

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

  const filteredIssuances = useMemo(() => {
    let d = issuances;
    if (issuanceFilter === "active") d = d.filter((i) => !i.returned_date);
    if (issuanceFilter === "returned") d = d.filter((i) => !!i.returned_date);
    if (search.trim()) {
      const q = search.toLowerCase();
      d = d.filter(
        (i) =>
          (i.supply_name || "").toLowerCase().includes(q) ||
          (i.last_name || "").toLowerCase().includes(q) ||
          (i.first_name || "").toLowerCase().includes(q) ||
          (i.service_number || "").toLowerCase().includes(q) ||
          (i.rank || "").toLowerCase().includes(q)
      );
    }
    return d;
  }, [issuances, issuanceFilter, search]);

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

  // ── Issuance handlers ──
  const handleIssue = async (data) => {
    try {
      const res = await createIssuance(data);
      if (res.data.status === "success") {
        toast.success(`Issued ${data.quantity_issued} item(s) successfully`);
        setIssueFormOpen(false);
        loadData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to issue supplies");
    }
  };

  const handleReturn = async (data) => {
    try {
      const res = await returnIssuance(returningIssuance.id, data);
      if (res.data.status === "success") {
        toast.success("Items returned successfully");
        setReturnFormOpen(false);
        setReturningIssuance(null);
        loadData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to process return");
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

  const openReturn = (issuance) => {
    setReturningIssuance(issuance);
    setReturnFormOpen(true);
  };

  const openDetail = (supply) => {
    setDetailSupply(supply);
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
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">Logistics & Supplies</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Manage inventory, track issuances, and monitor supply distribution
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === "inventory" && (
            <button
              onClick={openAdd}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200 dark:shadow-indigo-900/30 transition-all"
            >
              <Plus size={15} /> Add Item
            </button>
          )}
          {activeTab === "issuances" && (
            <button
              onClick={() => setIssueFormOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200 dark:shadow-indigo-900/30 transition-all"
            >
              <Plus size={15} /> Issue Supplies
            </button>
          )}
        </div>
      </div>

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
        <KPICard
          icon={ClipboardList}
          label="Active Issuances"
          value={kpis.activeIssuances}
          subtext="Items currently issued"
          color="text-blue-600 dark:text-blue-400"
          bgColor="bg-blue-50 dark:bg-blue-500/10"
        />
        <KPICard
          icon={Clock}
          label="Overdue Returns"
          value={kpis.overdueCount}
          subtext={kpis.overdueCount > 0 ? "Items past due date" : "No overdue items"}
          color={kpis.overdueCount > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}
          bgColor={kpis.overdueCount > 0 ? "bg-red-50 dark:bg-red-500/10" : "bg-emerald-50 dark:bg-emerald-500/10"}
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
              {tab.key === "overdue" && kpis.overdueCount > 0 && (
                <span className="ml-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                  {kpis.overdueCount}
                </span>
              )}
            </button>
          );
        })}
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

      {activeTab === "issuances" && (
        <IssuancesTab
          issuances={filteredIssuances}
          filter={issuanceFilter}
          setFilter={setIssuanceFilter}
          search={search}
          setSearch={setSearch}
          onReturn={openReturn}
        />
      )}

      {activeTab === "overdue" && (
        <OverdueTab
          issuances={overdueIssuances}
          onReturn={openReturn}
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

      <IssueForm
        open={issueFormOpen}
        onClose={() => setIssueFormOpen(false)}
        onSubmit={handleIssue}
        supplies={supplies}
      />

      <ReturnForm
        open={returnFormOpen}
        onClose={() => { setReturnFormOpen(false); setReturningIssuance(null); }}
        onSubmit={handleReturn}
        issuance={returningIssuance}
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
// ISSUANCES TAB
// ═══════════════════════════════════════════════════════════════
function IssuancesTab({ issuances, filter, setFilter, search, setSearch, onReturn }) {
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
            placeholder="Search by name, rank, item…"
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
        <div className="flex gap-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-0.5">
          {[
            { key: "all", label: "All" },
            { key: "active", label: "Active" },
            { key: "returned", label: "Returned" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                filter === f.key
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-neutral-400 dark:text-neutral-600 shrink-0">
          {issuances.length} record{issuances.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">Item</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">Issued To</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">Qty</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">Issued Date</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">Due Date</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">Status</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 bg-white dark:bg-neutral-900">
              {issuances.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-neutral-400 dark:text-neutral-600">
                    No issuance records found
                  </td>
                </tr>
              ) : (
                issuances.map((iss) => {
                  const isOverdue = !iss.returned_date && iss.due_return_date && new Date(iss.due_return_date) < new Date();
                  return (
                    <tr key={iss.id} className="group hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-200">{iss.supply_name}</p>
                        <p className="text-[10px] text-neutral-400">{iss.category}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
                          {iss.last_name}, {iss.first_name}
                        </p>
                        <p className="text-[10px] text-neutral-400">{iss.rank} · {iss.service_number}</p>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        {iss.quantity_issued} {iss.unit}
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-500 dark:text-neutral-400">
                        {iss.issued_date}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className={cn(isOverdue ? "text-red-600 dark:text-red-400 font-semibold" : "text-neutral-500 dark:text-neutral-400")}>
                          {iss.due_return_date}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {iss.returned_date ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
                            Returned
                          </span>
                        ) : isOverdue ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
                            <Clock size={9} /> Overdue
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {!iss.returned_date && (
                            <button
                              onClick={() => onReturn(iss)}
                              className="flex h-7 items-center gap-1 rounded-lg border border-emerald-200 dark:border-emerald-800 px-2 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all"
                            >
                              <RotateCcw size={11} /> Return
                            </button>
                          )}
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
// OVERDUE TAB
// ═══════════════════════════════════════════════════════════════
function OverdueTab({ issuances, onReturn }) {
  return (
    <div className="flex flex-col gap-4">
      {issuances.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/10 mb-4">
            <Clock size={28} className="text-emerald-500" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">No Overdue Items</h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">All issued supplies are within their return period.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/20 p-3">
            <AlertTriangle size={16} className="text-red-500 shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">
              <span className="font-semibold">{issuances.length} overdue item(s)</span> — These supplies are past their due return date.
            </p>
          </div>
          <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">Item</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">Issued To</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">Qty</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">Due Date</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">Days Overdue</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 bg-white dark:bg-neutral-900">
                  {issuances.map((iss) => {
                    const dueDate = new Date(iss.due_return_date);
                    const today = new Date();
                    const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
                    return (
                      <tr key={iss.id} className="group hover:bg-red-50/50 dark:hover:bg-red-500/5 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-200">{iss.supply_name}</p>
                          <p className="text-[10px] text-neutral-400">{iss.category}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
                            {iss.last_name}, {iss.first_name}
                          </p>
                          <p className="text-[10px] text-neutral-400">{iss.rank} · {iss.service_number}</p>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                          {iss.quantity_issued} {iss.unit}
                        </td>
                        <td className="px-4 py-3 text-xs text-red-600 dark:text-red-400 font-medium">
                          {iss.due_return_date}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-500/15 px-2 py-0.5 text-[11px] font-bold text-red-700 dark:text-red-400">
                            {daysOverdue} day{daysOverdue !== 1 ? "s" : ""}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => onReturn(iss)}
                              className="flex h-7 items-center gap-1 rounded-lg border border-emerald-200 dark:border-emerald-800 px-2 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all"
                            >
                              <RotateCcw size={11} /> Return
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
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
