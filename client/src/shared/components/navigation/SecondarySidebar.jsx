import { useState, useEffect, useMemo } from "react";
import { Link, useLocation, useSearchParams, useNavigate } from "react-router-dom";
import { Building2, Search, X, ChevronRight, ChevronDown, Plus, Briefcase, MoreHorizontal, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/services/api";
import { useToast } from "@/shared/components/ui/Toast";
import { useNavigation } from "@/shared/contexts/NavigationContext";
import { useAuth } from "@/contexts/AuthContext";
import { useBusinessClientTree } from "@/features/task-management/hooks/useBusinessClientTree";
import { notifyOrgTreeChanged } from "@/shared/store/orgTreeBus";
import InlineNameRow from "@/features/task-management/components/InlineNameRow";
import InlineBusinessForm from "@/features/task-management/components/InlineBusinessForm";
import ConfirmationDialog from "@/shared/components/ui/ConfirmationDialog";
import { getMyTaskHierarchy } from "@/features/task-management/services/taskService";
import { getDepartmentsForAssignment } from "@/features/task-management/api/assignment.api";

/**
 * Secondary (nested) sidebar shown beside the main nav rail. Lists every SOP
 * business (from the SOP dashboard's `businesses` table) and, when expanded, the
 * clients assigned to it, and under each client its own business units. Sits in
 * the flex flow on `lg` so the page content naturally shifts right; hidden on
 * smaller screens.
 */
// Renders text with the current search term emphasized (no background), so
// matches are easy to spot in the long client/business/unit list.
function highlight(text, q) {
  const str = String(text ?? '');
  if (!q) return str;
  const idx = str.toLowerCase().indexOf(q);
  if (idx === -1) return str;
  return (
    <>
      {str.slice(0, idx)}
      <mark className="bg-transparent font-semibold text-[var(--color-primary)]">
        {str.slice(idx, idx + q.length)}
      </mark>
      {str.slice(idx + q.length)}
    </>
  );
}

export default function SecondarySidebar() {
   const { secondaryNav, closeSecondaryNav } = useNavigation();
   const { user, isAnyAdmin, isDepartmentHead } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { businesses, unassigned, loading, refresh } = useBusinessClientTree();

  // Employees (non-admins) only ever see the single SOP business linked to their
  // account — the task tree in the My Tasks page is scoped to it, so this panel
  // mirrors that scope instead of exposing the whole org. Admins keep the full list.
  const employeeBusinessId = isAnyAdmin ? null : (user?.business_id ?? null);

  // For employees, restrict the visible clients to only those where they have
  // at least one task assignment. Fetch the employee's task hierarchy to get the
  // list of client IDs they belong to, then filter the sidebar's client list.
  // Also filter business units (client_businesses) to only those with tasks.
  const [employeeClientIds, setEmployeeClientIds] = useState(null);
  const [employeeBusinessIds, setEmployeeBusinessIds] = useState(null);
  useEffect(() => {
    if (isAnyAdmin || employeeBusinessId == null) {
      setEmployeeClientIds(null);
      setEmployeeBusinessIds(null);
      return;
    }
    let active = true;
    getMyTaskHierarchy()
      .then((data) => {
        if (!active) return;
        const clientIds = new Set((data?.clientTree || []).map((c) => Number(c.id)));
        const bizIds = new Set();
        for (const c of data?.clientTree || []) {
          for (const b of c.businesses || []) {
            bizIds.add(Number(b.id));
          }
        }
        setEmployeeClientIds(clientIds);
        setEmployeeBusinessIds(bizIds);
      })
      .catch(() => {
        if (active) { setEmployeeClientIds(new Set()); setEmployeeBusinessIds(new Set()); }
      });
    return () => { active = false; };
  }, [isAnyAdmin, employeeBusinessId]);

  const visibleBusinesses = useMemo(() => {
    // Department Heads see their SOP business (derived from their department's
    // business_id, falling back to their own business_id) and within it, only
    // clients that belong to their department. The business always shows even
    // if no clients match yet, so the user can add clients.
    if (isDepartmentHead && (user?.department_business_id != null || user?.business_id != null)) {
      const sopBizId = Number(user.department_business_id ?? user.business_id);
      const deptId = user?.department_id != null ? Number(user.department_id) : null;
      return businesses
        .filter((b) => Number(b.id) === sopBizId)
        .map((b) => ({
          ...b,
          clients: deptId != null
            ? (b.clients || []).filter((c) => Number(c.department_id) === deptId)
            : (b.clients || []),
        }));
    }
    if (isAnyAdmin) return businesses;
    // Employees with no SOP business linked see an empty panel, never the full org.
    if (employeeBusinessId == null) return [];
    const biz = businesses.filter((b) => Number(b.id) === Number(employeeBusinessId));
    // If we haven't loaded the employee's hierarchy yet, show the full business
    // (avoids a flash of empty panel while loading).
    if (employeeClientIds == null || employeeBusinessIds == null) return biz;
    // Filter each business's clients to only those where the employee has tasks,
    // and filter each client's business units to only those with tasks.
    return biz.map((b) => ({
      ...b,
      clients: (b.clients || [])
        .filter((c) => employeeClientIds.has(Number(c.id)))
        .map((c) => ({
          ...c,
          businesses: (c.businesses || []).filter((u) => employeeBusinessIds.has(Number(u.id))),
        })),
    }));
  }, [businesses, employeeBusinessId, isAnyAdmin, isDepartmentHead, user, employeeClientIds, employeeBusinessIds]);
  const showUnassigned = isAnyAdmin;
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [expandedBiz, setExpandedBiz] = useState({});
  const [expandedClient, setExpandedClient] = useState({});
   const [addingClientBiz, setAddingClientBiz] = useState(null); // SOP biz id or 'unassigned' or null
   const [addingClientDeptId, setAddingClientDeptId] = useState(null); // department id or null
   const [addingUnitClient, setAddingUnitClient] = useState(null); // client id or null
   const [menu, setMenu] = useState(null); // { kind: 'client'|'unit', id, clientId, name }
   const [pendingDelete, setPendingDelete] = useState(null);
   // When true, the "New Client" control shows an SOP-business picker first so a
   // client is always created under a chosen business rather than unassigned.
   const [clientBizPicker, setClientBizPicker] = useState(false);
   // Holds the chosen business while the department picker is shown (next step).
   const [clientDeptPicker, setClientDeptPicker] = useState(null);
   // Departments list for the department picker.
   const [departments, setDepartments] = useState([]);
// When true, show the inline "New Business" form with code + name fields.
    const [addingBusiness, setAddingBusiness] = useState(false);
    // Third step of the "New Client" flow: after a business + department are
    // chosen, show the inline name input. Without this the flow bounced back
    // to the "New Client" button after the department was picked, forcing the
    // user to reopen the picker to type the name.
    const [clientNamePicker, setClientNamePicker] = useState(false);

  // Open an inline "add client" row under the given SOP business (or the
  // Unassigned group) and expand it so the input is visible.
  const startAddClient = (bizKey) => {
    setAddingClientBiz(bizKey);
    setExpandedBiz((p) => ({ ...p, [bizKey]: true }));
  };

// "New Client" must be created under a chosen SOP business. The flow is
    // role-aware so each role only sees the steps it needs:
    //   super_admin:  choose business → choose department → type name
    //   admin:        choose department (business is locked to the actor's
    //                 own, so it's skipped) → type name
    //   department_head: type name only (business + department are pre-filled
    //                 from the actor's own scope)
    const handleNewClient = () => {
      if (!businesses || businesses.length === 0) {
        toast.error('Create an SOP business first');
        return;
      }
      if (user?.role === 'super_admin') {
        setClientBizPicker(true);
      } else if (user?.role === 'admin') {
        // Admins are locked to their own SOP business; pre-select it and go
        // straight to the department picker.
        setAddingClientBiz(String(user?.business_id ?? ''));
        setAddingClientDeptId(null);
        setClientDeptPicker(String(user?.business_id ?? ''));
        setClientNamePicker(false);
      } else {
        // Department Head: business + department come from the actor's own
        // scope, so only the name field is needed.
        setAddingClientBiz(String(user?.department_business_id ?? user?.business_id ?? ''));
        setAddingClientDeptId(String(user?.department_id ?? ''));
        setClientNamePicker(true);
      }
    };

   // Load departments once for the department picker.
   useEffect(() => {
     let active = true;
     getDepartmentsForAssignment('')
       .then((list) => { if (active) setDepartments(Array.isArray(list) ? list : []); })
       .catch(() => { if (active) setDepartments([]); });
     return () => { active = false; };
   }, []);

  // Open an inline "add business unit" row under the given client.
  const startAddUnit = (clientId) => {
    setAddingUnitClient(clientId);
    setExpandedClient((p) => ({ ...p, [clientId]: true }));
  };

   const commitAddClient = async (name) => {
     const bizId = addingClientBiz === "unassigned" ? null : addingClientBiz;
     try {
       await api.post("/clients", {
         client_name: name,
         business_id: bizId ? Number(bizId) : null,
         department_id: addingClientDeptId ? Number(addingClientDeptId) : null,
       });
       toast.success("Client created");
       setAddingClientBiz(null);
       setAddingClientDeptId(null);
       setClientDeptPicker(null);
       refresh();
       notifyOrgTreeChanged();
     } catch (err) {
       toast.error(err.response?.data?.message || "Failed to create client");
       throw err;
     }
   };

  const commitAddUnit = async (name) => {
    try {
      await api.post(`/clients/${addingUnitClient}/businesses`, { business_name: name });
      toast.success("Business unit created");
      setAddingUnitClient(null);
      refresh();
      notifyOrgTreeChanged();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create business unit");
      throw err;
    }
  };

  const commitAddBusiness = async (code, name) => {
    try {
      await api.post("/businesses", { business_code: code, business_name: name });
      toast.success("Business created");
      setAddingBusiness(false);
      refresh();
      notifyOrgTreeChanged();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create business");
      throw err;
    }
  };

  const requestDelete = (kind, id, clientId, name) => {
    setMenu(null);
    setPendingDelete({ kind, id, clientId, name });
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const { kind, id, clientId } = pendingDelete;
    try {
      if (kind === "client") {
        await api.delete(`/clients/${id}`);
        toast.success("Client deleted");
      } else if (kind === "business") {
        await api.delete(`/businesses/${id}`);
        toast.success("Business hidden from all users");
      } else {
        await api.delete(`/clients/${clientId}/businesses/${id}`);
        toast.success("Business deleted");
      }
      setPendingDelete(null);
      refresh();
      notifyOrgTreeChanged();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to delete ${kind}`);
      setPendingDelete(null);
    }
  };

  const open = secondaryNav === "clients";

  const activeClientId = (() => {
    const m = location.pathname.match(/^\/clients\/(\d+)/);
    return m ? m[1] : null;
  })();

  const activeUnit = searchParams.get("business");

  // Auto-expand the SOP business + client whose page is currently open.
  useEffect(() => {
    if (!open || !activeClientId) return;
    setExpandedClient((prev) => (prev[activeClientId] ? prev : { ...prev, [activeClientId]: true }));
    const owner = visibleBusinesses.find((b) => (b.clients || []).some((c) => String(c.id) === String(activeClientId)));
    if (owner) {
      setExpandedBiz((prev) => (prev[owner.id] ? prev : { ...prev, [owner.id]: true }));
    }
  }, [open, activeClientId, visibleBusinesses]);

  // Employees only have one business, so reveal it by default (clients stay
  // collapsed until the user opens the business) so the panel isn't blank.
  useEffect(() => {
    if (employeeBusinessId == null) return;
    const key = String(employeeBusinessId);
    if (visibleBusinesses.length && !expandedBiz[key]) {
      setExpandedBiz((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
    }
  }, [employeeBusinessId, visibleBusinesses, expandedBiz]);

  // Expand the branch that matches an active Tasks scope (client/business
  // chosen in the panel) so the selected row is visible. Keyed on the scope
  // string so it only fires when the selection actually changes.
  const scopeKey = `${searchParams.get("client") || ""}|${searchParams.get("business") || ""}`;
  useEffect(() => {
    if (!open) return;
    const c = searchParams.get("client");
    const b = searchParams.get("business");
    if (c) setExpandedClient((prev) => (prev[c] ? prev : { ...prev, [c]: true }));
    if (b) {
      setExpandedBiz((prev) => (prev[b] ? prev : { ...prev, [b]: true }));
    }
  }, [open, scopeKey]);

  // When the "New Client" flow has chosen a business (and optionally a
  // department), the inline name input is rendered inside that SOP business's
  // tree row — but only when the row is expanded. Auto-expanding here keeps
  // the name field visible without the user having to open the business first.
  useEffect(() => {
    if (addingClientBiz == null || addingClientBiz === "unassigned") return;
    if (clientBizPicker || clientDeptPicker) return;
    setExpandedBiz((prev) => (prev[addingClientBiz] ? prev : { ...prev, [addingClientBiz]: true }));
  }, [addingClientBiz, clientBizPicker, clientDeptPicker]);

  // Departments filtered to the SOP business chosen in the "New Client"
  // flow. The `departments` table has a `business_id` column, so a client
  // created under a given business can only be assigned to one of that
  // business's departments — the picker must reflect that scope.
  const departmentsForBusiness = useMemo(() => {
    const bizId = clientDeptPicker;
    if (bizId == null || bizId === '') return departments;
    return departments.filter((d) => String(d.business_id) === String(bizId));
  }, [departments, clientDeptPicker]);

  const q = query.trim().toLowerCase();
  const searching = q.length > 0;

  // Full-tree search: a SOP business matches if its name matches, or it contains
  // a client (or a client's business unit) whose name matches. Matched clients /
  // units are narrowed to just the hits so the expanded list shows only results.
  const filteredBusinesses = useMemo(() => {
    if (!q) return visibleBusinesses;
    return visibleBusinesses
      .map((b) => {
        const bizMatch = (b.name || "").toLowerCase().includes(q);
        const clients = (b.clients || [])
          .map((c) => {
            const clientMatch = (c.client_name || "").toLowerCase().includes(q);
            const units = (c.businesses || []).filter((u) => (u.business_name || "").toLowerCase().includes(q));
            if (clientMatch || units.length > 0) {
              return { ...c, businesses: clientMatch ? c.businesses : units };
            }
            return null;
          })
          .filter(Boolean);
        if (bizMatch || clients.length > 0) return { ...b, clients };
        return null;
      })
      .filter(Boolean);
  }, [visibleBusinesses, q]);

  const filteredUnassigned = useMemo(() => {
    if (!showUnassigned) return [];
    if (!q) return unassigned;
    return unassigned
      .map((c) => {
        const clientMatch = (c.client_name || "").toLowerCase().includes(q);
        const units = (c.businesses || []).filter((u) => (u.business_name || "").toLowerCase().includes(q));
        if (clientMatch || units.length > 0) return { ...c, businesses: clientMatch ? c.businesses : units };
        return null;
      })
      .filter(Boolean);
  }, [showUnassigned, unassigned, q]);

  const isClientActive = (id) => location.pathname.startsWith(`/clients/${id}`);
  const isUnitActive = (unitId) =>
    (activeUnit && String(activeUnit) === String(unitId));

  const renderUnit = (client, unit) => {
    const unitActive = isUnitActive(unit.id);
    return (
      <div
        className={cn(
          "group flex items-center gap-1 rounded-lg pr-2 transition-colors",
          unitActive
            ? "bg-[var(--bg-active)] text-[var(--text-on-sidebar)]"
            : "hover:bg-[var(--bg-hover)]"
        )}
      >
        <Link
          to={`/tasks?business=${unit.id}&client=${client.id}`}
          className="flex min-w-0 flex-1 items-center gap-2 py-2 text-[13px]"
        >
          <Briefcase size={14} className="shrink-0" />
          <span className="flex-1 truncate">{highlight(unit.business_name, q)}</span>
        </Link>
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenu((m) => (m?.kind === "unit" && m.id === unit.id ? null : { kind: "unit", id: unit.id, clientId: client.id, name: unit.business_name }));
            }}
            title="More actions"
            className="rounded p-1 text-[var(--text-on-sidebar)] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[var(--bg-hover)]"
          >
            <MoreHorizontal size={13} />
          </button>
          {menu?.kind === "unit" && menu?.id === unit.id && (
            <div className="absolute right-0 top-full z-30 mt-1 w-40 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] py-1 shadow-lg">
              <button
                type="button"
                onClick={() => requestDelete("unit", unit.id, client.id, unit.business_name)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
              >
                <Trash2 size={13} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderClient = (client) => {
    const cOpen = expandedClient[client.id] || searching;
    const units = client.businesses || [];
    return (
      <li key={client.id}>
        <div
          className={cn(
            "group flex items-center gap-1 rounded-lg pr-2 transition-colors",
            isClientActive(client.id) ? "bg-[var(--bg-active)] text-[var(--text-on-sidebar)]" : "hover:bg-[var(--bg-hover)]"
          )}
        >
          <button
            type="button"
            onClick={() => setExpandedClient((p) => ({ ...p, [client.id]: !p[client.id] }))}
            aria-label={cOpen ? "Collapse business units" : "Expand business units"}
            aria-expanded={cOpen}
            className="flex h-9 w-8 shrink-0 items-center justify-center text-[color-mix(in_srgb,var(--text-on-sidebar)_70%,transparent)] hover:text-[var(--text-on-sidebar)] focus:outline-none"
          >
            {cOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </button>
          <Link to={`/tasks?client=${client.id}`} className="flex min-w-0 flex-1 items-center gap-2 py-2 text-sm">
            <Building2
              size={16}
              className={cn(
                "shrink-0",
                isClientActive(client.id) ? "text-[var(--text-on-sidebar)]" : "text-[color-mix(in_srgb,var(--text-on-sidebar)_60%,transparent)]"
              )}
            />
            <span className="flex-1 truncate">{highlight(client.client_name, q)}</span>
            {units.length > 0 && <span className="shrink-0 text-[10px] text-[var(--text-muted)]">{units.length}</span>}
          </Link>
          {isAnyAdmin && (
          <div className="ml-auto flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                startAddUnit(client.id);
              }}
              title="Add business unit"
              className="rounded p-1 text-[var(--text-on-sidebar)] hover:bg-[var(--bg-hover)]"
            >
              <Plus size={14} />
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenu((m) => (m?.kind === "client" && m.id === client.id ? null : { kind: "client", id: client.id, clientId: client.id, name: client.client_name }));
                }}
                title="More actions"
                className="rounded p-1 text-[var(--text-on-sidebar)] hover:bg-[var(--bg-hover)]"
              >
                <MoreHorizontal size={14} />
              </button>
              {menu?.kind === "client" && menu?.id === client.id && (
                <div className="absolute right-0 top-full z-30 mt-1 w-40 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => requestDelete("client", client.id, client.id, client.client_name)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>
          )}
        </div>

        {cOpen && (
          <div className="ml-[22px] mt-0.5 space-y-0.5 border-l border-[var(--border-sidebar)] pb-0.5">
            {addingUnitClient === client.id && (
              <InlineNameRow
                placeholder="New business unit…"
                onCommit={commitAddUnit}
                onCancel={() => setAddingUnitClient(null)}
              />
            )}
            {units.length === 0 && addingUnitClient !== client.id ? (
              <p className="px-3 py-1 text-xs text-[var(--text-muted)]">No business units</p>
            ) : (
              units.map((unit) => renderUnit(client, unit))
            )}
          </div>
        )}
      </li>
    );
  };

  const renderBizGroup = (biz, label, items, key, icon) => {
    // While searching, keep every matched branch open so results are visible.
    const bOpen = expandedBiz[key] || searching;
    const toggle = () => setExpandedBiz((p) => ({ ...p, [key]: !p[key] }));
    return (
      <li key={key}>
        <div className="group sticky top-0 flex items-center gap-1 rounded-lg border-b border-[var(--border-sidebar)] bg-[var(--bg-sidebar)] pr-2 transition-colors hover:bg-[var(--bg-hover)]" style={{ zIndex: menu?.kind === "business" && menu?.id === Number(key) ? 20 : 10 }}>
          <button
            type="button"
            onClick={toggle}
            aria-label={bOpen ? `Collapse ${label}` : `Expand ${label}`}
            aria-expanded={bOpen}
            className="flex h-9 w-8 shrink-0 items-center justify-center text-[color-mix(in_srgb,var(--text-on-sidebar)_70%,transparent)] hover:text-[var(--text-on-sidebar)] focus:outline-none"
          >
            {bOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </button>
          <Link
            to={`/tasks?business=${key}`}
            onClick={(e) => e.stopPropagation()}
            className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left text-sm font-medium focus:outline-none"
          >
            {icon}
            <span className="flex-1 truncate text-left">{highlight(label, q)}</span>
            {items.length > 0 && <span className="shrink-0 text-[10px] text-[var(--text-muted)]">{items.length}</span>}
          </Link>
          {isAnyAdmin && (
          <div className="ml-auto flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                startAddClient(key);
              }}
              title="Add client to this business"
              className="rounded p-1 text-[var(--text-on-sidebar)] opacity-0 transition-opacity hover:bg-[var(--bg-hover)] group-hover:opacity-100"
            >
              <Plus size={14} />
            </button>
            {user?.role === 'super_admin' && (
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenu((m) => (m?.kind === "business" && m.id === Number(key) ? null : { kind: "business", id: Number(key), name: label }));
                  }}
                  title="More actions"
                  className="rounded p-1 text-[var(--text-on-sidebar)] opacity-0 transition-opacity hover:bg-[var(--bg-hover)] group-hover:opacity-100"
                >
                  <MoreHorizontal size={14} />
                </button>
                {menu?.kind === "business" && menu?.id === Number(key) && (
                  <div className="absolute right-0 top-full z-40 mt-1 w-40 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] py-1 shadow-lg">
                    <button
                      type="button"
                      onClick={() => requestDelete("business", Number(key), null, label)}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          )}
        </div>
        {bOpen && (
          <ul className="ml-[22px] mt-0.5 space-y-0.5 border-l border-[var(--border-sidebar)] pb-0.5">
            {addingClientBiz === key && (
              <InlineNameRow
                placeholder="New client name…"
                onCommit={commitAddClient}
                onCancel={() => setAddingClientBiz(null)}
              />
            )}
            {items.length === 0 && addingClientBiz !== key ? (
              <p className="px-3 py-1 text-xs text-[var(--text-muted)]">No clients</p>
            ) : (
              items.map((client) => renderClient(client))
            )}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div
      className={cn(
        "lg:sticky lg:top-0 lg:self-start lg:z-20 lg:flex lg:flex-col",
        "shrink-0 transition-[width,opacity] duration-300 ease-out lg:overflow-hidden",
        open ? "lg:w-[260px] lg:opacity-100" : "lg:w-0 lg:opacity-0 lg:pointer-events-none",
        "lg:h-[calc(100dvh-var(--app-shell-inset,20px))]",
        "min-[1280px]:lg:h-[calc(100dvh-var(--app-shell-inset-lg,28px))]",
        "bg-[var(--bg-sidebar)] text-[var(--text-on-sidebar)]",
        "border-r border-[var(--border-sidebar)]",
        // Desktop: inline sticky panel. Mobile: a slide-over drawer that sits
        // above the page content and closes on backdrop click / Escape.
        open
          ? "fixed inset-0 z-50 flex lg:static lg:inset-auto"
          : "hidden lg:flex"
      )}
      aria-label="Businesses"
    >
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-200 lg:hidden"
          onClick={closeSecondaryNav}
          aria-hidden="true"
        />
      )}
      <div
        className={cn(
          "relative flex h-full w-[86vw] max-w-[320px] flex-col border-r border-[var(--border-sidebar)] bg-[var(--bg-sidebar)] shadow-xl transition-transform duration-250 ease-out lg:translate-x-0 lg:w-full lg:max-w-none lg:shadow-none",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
      <div className="flex h-[var(--header-height)] shrink-0 items-center justify-between border-b border-[var(--header-border)] px-4 bg-[var(--bg-sidebar)] sticky top-0 z-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color-mix(in_srgb,var(--text-on-sidebar)_60%,transparent)]">
          Businesses
        </p>
        <button
          type="button"
          onClick={closeSecondaryNav}
          aria-label="Close businesses panel"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-on-sidebar)] hover:bg-[var(--bg-hover)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-amber)_60%,transparent)]"
        >
          <X size={16} />
        </button>
      </div>

      <div className="px-3 py-2.5 sticky top-[var(--header-height)] z-10 bg-[var(--bg-sidebar)]">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search businesses, clients, units…"
            className="w-full rounded-lg border border-[var(--border-sidebar)] bg-[var(--bg-surface)] py-2 pl-9 pr-8 text-sm text-[var(--text-on-sidebar)] placeholder:text-[var(--text-muted)] outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent-amber)_50%,transparent)]"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-on-sidebar)]"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-3 scrollbar-none" aria-label="Business list">
        {loading && businesses.length === 0 && unassigned.length === 0 ? (
          <div className="space-y-1 px-1 py-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-9 animate-pulse rounded-lg bg-[var(--bg-hover)]" />
            ))}
          </div>
        ) : filteredBusinesses.length === 0 && filteredUnassigned.length === 0 && addingClientBiz !== "unassigned" ? (
          <p className="px-3 py-4 text-xs text-[var(--text-muted)]">
            {query
              ? "No businesses or clients match your search."
              : employeeBusinessId != null
                ? "Your SOP business has no clients yet."
                : "No businesses yet."}
          </p>
        ) : (
          <ul className="mt-0.5 space-y-0.5" role="list">
            {filteredBusinesses.map((biz) =>
              renderBizGroup(
                biz,
                biz.name,
                biz.clients || [],
                biz.id,
                <Building2 size={16} className="shrink-0 text-[color-mix(in_srgb,var(--text-on-sidebar)_60%,transparent)]" />
              )
            )}
            {showUnassigned && (filteredUnassigned.length > 0 || addingClientBiz === "unassigned") &&
              renderBizGroup(
                null,
                "Unassigned",
                filteredUnassigned,
                "unassigned",
                <Building2 size={16} className="shrink-0 text-[var(--text-muted)]" />
              )}
          </ul>
        )}
      </nav>

      <div className="border-t border-[var(--border-sidebar)] p-2 space-y-1.5">
        {isAnyAdmin && addingBusiness ? (
          <InlineBusinessForm
            onCommit={commitAddBusiness}
            onCancel={() => setAddingBusiness(false)}
          />
        ) : (
          <>
{user?.role === 'super_admin' && (
                <button
                  type="button"
                  onClick={() => setAddingBusiness(true)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-[color-mix(in_srgb,var(--text-on-sidebar)_75%,transparent)] hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <Plus size={16} /> New Business
                </button>
              )}
             {clientBizPicker ? (
               <div className="space-y-1">
                 <p className="px-1 pb-0.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
                   Select an Business
                 </p>
                 <div className="max-h-44 overflow-y-auto space-y-0.5 scrollbar-none">
                   {businesses.map((b) => (
                     <button
                       key={b.id}
                       type="button"
                       onClick={() => {
                         setClientBizPicker(false);
                         setClientDeptPicker(b.id);
                       }}
                       className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[color-mix(in_srgb,var(--text-on-sidebar)_80%,transparent)] hover:bg-[var(--bg-hover)] transition-colors"
                     >
                       <Building2 size={14} className="shrink-0" />
                       <span className="flex-1 truncate text-left">{highlight(b.name, q)}</span>
                     </button>
                   ))}
                 </div>
                 <button
                   type="button"
                   onClick={() => setClientBizPicker(false)}
                   className="mt-1 w-full rounded-lg px-3 py-1.5 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-on-sidebar)] transition-colors"
                 >
                   Cancel
                 </button>
               </div>
) : clientDeptPicker ? (
                <div className="space-y-1">
                  <p className="px-1 pb-0.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    Select a Department *
                  </p>
                  <div className="max-h-44 overflow-y-auto space-y-0.5 scrollbar-none">
                    {departmentsForBusiness.length === 0 ? (
                      <p className="px-3 py-1 text-xs text-[var(--text-muted)]">No departments available for this business</p>
                    ) : (
                      departmentsForBusiness.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => {
                            setAddingClientBiz(clientDeptPicker);
                            setAddingClientDeptId(d.id);
                            setClientDeptPicker(null);
                            setClientNamePicker(true);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[color-mix(in_srgb,var(--text-on-sidebar)_80%,transparent)] hover:bg-[var(--bg-hover)] transition-colors"
                        >
                          <Building2 size={14} className="shrink-0" />
                          <span className="flex-1 truncate text-left">{d.name}</span>
                        </button>
                      ))
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setClientDeptPicker(null)}
                    className="mt-1 w-full rounded-lg px-3 py-1.5 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-on-sidebar)] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : clientNamePicker ? (
                <InlineNameRow
                  placeholder="New client name…"
                  onCommit={commitAddClient}
                  onCancel={() => { setClientNamePicker(false); setAddingClientBiz(null); setAddingClientDeptId(null); }}
                />
              ) : (
              <button
                type="button"
                onClick={handleNewClient}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-[color-mix(in_srgb,var(--text-on-sidebar)_75%,transparent)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                <Plus size={16} /> New Client
              </button>
            )}
          </>
        )}
      </div>

      <ConfirmationDialog
        isOpen={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title={pendingDelete?.kind === "business" ? "Hide business from all users" : `Delete ${pendingDelete?.kind === "client" ? "Client" : "Business"}`}
        message={pendingDelete?.kind === "business"
          ? `Are you sure you want to hide "${pendingDelete?.name || ""}"? The business, its clients, and its business units will stay in the system — they'll just stop appearing for every user. You can restore it later from the organization page.`
          : `Are you sure you want to delete "${pendingDelete?.name || ""}"? This may also affect its business units, projects, and tasks.`}
        confirmText={pendingDelete?.kind === "business" ? "Hide" : "Delete"}
        variant="destructive"
      />
      </div>
    </div>
  );
}
