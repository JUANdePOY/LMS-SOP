import { Map, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { HierarchyProvider, useHierarchy } from "@/components/hierarchy/HierarchyContext";
import AreaAccordion from "@/components/hierarchy/AreaAccordion";
import SelectedSquadronPanel from "@/components/hierarchy/SelectedSquadronPanel";
import MembersModal from "@/components/hierarchy/MembersModal";
import { getGroups, getMapSquadrons, getMapSummary } from "@/services/api";
import { useState, useEffect, useCallback, useRef } from "react";
import { Search, X, RotateCcw, Loader, Users, MapPin, Shield, Layers, ChevronLeft, ZoomIn } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Tooltip } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ── Fix default marker icon ───────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const ARSEN_COLORS = {
  1: "#3B82F6",
  2: "#10B981",
  3: "#F59E0B",
  4: "#8B5CF6",
  5: "#EF4444",
};

function createArsenIcon(arsenId, isSelected) {
  const color = ARSEN_COLORS[arsenId] || "#6B7280";
  const size = isSelected ? 36 : 28;
  const border = isSelected ? 4 : 3;
  return L.divIcon({
    className: "custom-arsen-icon",
    html: `<div style="width:${size}px;height:${size}px;background:${color};border:${border}px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:${isSelected ? 11 : 9}px;font-family:system-ui,sans-serif;">${isSelected ? "★" : "●"}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2)],
  });
}

function createSquadronIcon(isActive, isHovered) {
  const color = isActive ? "#10B981" : "#9CA3AF";
  const size = isHovered ? 22 : 16;
  return L.divIcon({
    className: "custom-squadron-icon",
    html: `<div style="width:${size}px;height:${size}px;background:${color};border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.25);"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function FlyTo({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, zoom || 12, { duration: 0.8 });
  }, [center, zoom, map]);
  return null;
}

function SummaryCard({ label, value }) {
  return (
    <div className={cn(
      "flex flex-col rounded-xl border px-4 py-3",
      "bg-white dark:bg-neutral-900",
      "border-neutral-200 dark:border-neutral-800"
    )}>
      <span className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 leading-none">{value}</span>
      <span className="mt-0.5 text-[11px] font-medium text-neutral-500 dark:text-neutral-500">{label}</span>
    </div>
  );
}

function transformApiData(apiData) {
  if (!apiData?.airbase) return null;
  const { airbase } = apiData;
  return [
    {
      id: `airbase-${airbase.id || "pafr"}`,
      name: airbase.name || "PAFR Airbase",
      code: airbase.code || "PAFR",
      region: airbase.region || "National",
      reservists: airbase.total_reservists || 0,
      arcens: (airbase.arcens || []).map((arsen) => ({
        id: `arsen-${arsen.id}`,
        name: arsen.name || "",
        fullName: arsen.name || "",
        code: arsen.code || "",
        commander: arsen.commander || "",
        location: arsen.location || "",
        reservists: arsen.reservists || 0,
        groups: (arsen.groups || []).map((group) => ({
          id: `group-${group.id}`,
          name: group.name || "",
          code: group.code || "",
          commander: group.commander || "",
          reservists: group.reservists || 0,
          squadrons: (group.squadrons || []).map((sq) => ({
            id: `sq-${sq.id}`,
            name: sq.name || "",
            code: sq.code || "",
            status: sq.status || "active",
            members: sq.members || 0,
            specialization: sq.specialization || "",
            location: sq.location || "",
          })),
        })),
      })),
    },
  ];
}

// ── Inline Map Component ───────────────────────────────────────────
function MindanaoMapInline() {
  const [squadrons, setSquadrons] = useState([]);
  const [arsenSummaries, setArsenSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSquadron, setSelectedSquadron] = useState(null);
  const [selectedArsen, setSelectedArsen] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [flyTo, setFlyTo] = useState(null);
  const [viewMode, setViewMode] = useState("overview");

  const MINDANAO_CENTER = [7.5, 125.0];
  const MINDANAO_ZOOM = 7;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [sqRes, sumRes] = await Promise.all([
          getMapSquadrons(),
          getMapSummary(),
        ]);
        const loadedSquadrons = sqRes.data?.status === "success" ? sqRes.data.data : [];
        const loadedArsenSummaries = sumRes.data?.status === "success"
          ? sumRes.data.data.filter((a) => a.id === 2 || a.id === 3)
          : [];
        const mindanaoArsenIds = new Set(loadedArsenSummaries.map(a => a.id));
        const mindanaoSquadrons = loadedSquadrons.filter(sq => mindanaoArsenIds.has(sq.arsen?.id));
        setSquadrons(mindanaoSquadrons);
        setArsenSummaries(loadedArsenSummaries);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load map data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSelectArsen = useCallback((arsen) => {
    const arsenSq = squadrons.filter((sq) => sq.arsen.id === arsen.id);
    setSelectedArsen({ ...arsen, _squadrons: arsenSq });
    setViewMode("arsen");
    setFlyTo({ center: [arsen.center.lat, arsen.center.lng], zoom: 10 });
    setSelectedSquadron(null);
  }, [squadrons]);

  const handleSelectSq = useCallback((sq) => {
    setSelectedSquadron(sq);
    setViewMode("squadron");
    setFlyTo({ center: [sq.latitude, sq.longitude], zoom: 13 });
  }, []);

  const handleBack = useCallback(() => {
    setSelectedArsen(null);
    setSelectedSquadron(null);
    setViewMode("overview");
    setFlyTo({ center: MINDANAO_CENTER, zoom: MINDANAO_ZOOM });
  }, []);

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-800 dark:text-red-200">{error}</div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-neutral-500 dark:text-neutral-500">
          Click an <strong>ARSEN marker</strong> to zoom into its area. Click a <strong>squadron dot</strong> for details.
        </p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 text-xs text-neutral-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Active
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-neutral-400" /> Inactive
            </span>
          </div>
          {viewMode !== "overview" && (
            <button onClick={handleBack}
              className="flex items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
            >
              <ChevronLeft size={14} /> Overview
            </button>
          )}
        </div>
      </div>



      <div className="relative rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden shadow-sm" style={{ height: "calc(100vh - 340px)", minHeight: "480px" }}>
        <MapContainer center={MINDANAO_CENTER} zoom={MINDANAO_ZOOM} className="h-full w-full z-0" zoomControl={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {flyTo && <FlyTo center={flyTo.center} zoom={flyTo.zoom} />}

          {viewMode === "overview" && arsenSummaries.map((arsen) => (
            <Marker key={arsen.id} position={[arsen.center.lat, arsen.center.lng]}
              icon={createArsenIcon(arsen.id, selectedArsen?.id === arsen.id)}
              eventHandlers={{ click: () => handleSelectArsen(arsen) }}
            >
              <Tooltip direction="top" offset={[0, -20]} opacity={0.95}>
                <span className="text-[12px] font-bold">{arsen.name}</span>
              </Tooltip>
              <Popup>
                <div className="min-w-[200px] p-1">
                  <p className="text-sm font-bold text-neutral-900 mb-1">{arsen.name}</p>
                  <p className="text-xs text-neutral-500 mb-2">{arsen.location}</p>
                  <div className="flex gap-3 text-xs text-neutral-600 mb-2">
                    <span className="flex items-center gap-1"><Layers size={11} /> {arsen.total_squadrons} sqdn</span>
                    <span className="flex items-center gap-1"><Users size={11} /> {arsen.total_reservists} rsrv</span>
                  </div>
                  <button onClick={() => handleSelectArsen(arsen)}
                    className="w-full rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
                  >
                    <span className="flex items-center justify-center gap-1"><ZoomIn size={12} /> Zoom to Area</span>
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}

          {(viewMode === "arsen" || viewMode === "squadron") && selectedArsen?._squadrons?.map((sq) => (
            <Marker key={sq.id} position={[sq.latitude, sq.longitude]}
              icon={createSquadronIcon(sq.is_active, hoveredId === sq.id)}
              eventHandlers={{
                click: () => handleSelectSq(sq),
                mouseover: () => setHoveredId(sq.id),
                mouseout: () => setHoveredId(null),
              }}
            >
              <Tooltip direction="top" offset={[0, -12]} opacity={0.95}>
                <span className="text-[11px] font-semibold">{sq.name}</span>
              </Tooltip>
              <Popup>
                <div className="min-w-[180px] p-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("h-2.5 w-2.5 rounded-full", sq.is_active ? "bg-emerald-500" : "bg-neutral-400")} />
                    <span className="text-sm font-bold">{sq.name}</span>
                  </div>
                  <div className="space-y-0.5 text-xs text-neutral-600">
                    <p><span className="font-medium">Location:</span> {sq.location}</p>
                    <p><span className="font-medium">Specialization:</span> {sq.specialization}</p>
                    <p><span className="font-medium">Reservists:</span> {sq.total_reservists}</p>
                  </div>
                  <button onClick={() => handleSelectSq(sq)}
                    className="mt-2 w-full rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
                  >
                    View Details →
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Arsen sidebar */}
        {viewMode === "arsen" && selectedArsen && (
          <div className="absolute left-4 top-4 z-[1000] w-64 rounded-xl border border-neutral-200 bg-white shadow-xl dark:bg-neutral-900 dark:border-neutral-700 overflow-hidden">
            <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-700 px-3 py-2.5">
              <button onClick={handleBack} className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800">
                <ChevronLeft size={15} />
              </button>
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">{selectedArsen.name}</h3>
                <p className="text-[10px] text-neutral-400 truncate">{selectedArsen.location}</p>
              </div>
            </div>
            <div className="p-2.5 space-y-1.5 max-h-[50vh] overflow-y-auto">
              <div className="flex gap-3 text-[10px] text-neutral-500 mb-1">
                <span className="flex items-center gap-1"><Layers size={10} /> {selectedArsen.total_squadrons} squadrons</span>
                <span className="flex items-center gap-1"><Users size={10} /> {selectedArsen.total_reservists} reservists</span>
              </div>
              {selectedArsen._squadrons?.map((sq) => (
                <button key={sq.id} onClick={() => handleSelectSq(sq)}
                  className="w-full rounded-lg border border-neutral-100 dark:border-neutral-700 p-2 text-left hover:border-indigo-200 hover:bg-indigo-50/50 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/5 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full shrink-0", sq.is_active ? "bg-emerald-500" : "bg-neutral-400")} />
                    <span className="text-[11px] font-bold text-neutral-800 dark:text-neutral-200 truncate">{sq.name}</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] text-neutral-400">
                    <span className="truncate">{sq.location}</span>
                    <span className="flex items-center gap-0.5 shrink-0"><Users size={8} /> {sq.total_reservists}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Squadron detail panel */}
        {selectedSquadron && (
          <div className="absolute right-4 top-4 z-[1000] w-72 rounded-xl border border-neutral-200 bg-white shadow-xl dark:bg-neutral-900 dark:border-neutral-700 overflow-hidden">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-700 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className={cn("h-2.5 w-2.5 rounded-full", selectedSquadron.is_active ? "bg-emerald-500" : "bg-neutral-400")} />
                <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">{selectedSquadron.name}</h3>
              </div>
              <button onClick={() => { setSelectedSquadron(null); if (!selectedArsen) setViewMode("overview"); }}
                className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
              >
                <X size={14} />
              </button>
            </div>
            <div className="p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Code", value: selectedSquadron.code },
                  { label: "Status", value: selectedSquadron.is_active ? "Active" : "Inactive" },
                  { label: "Spec", value: selectedSquadron.specialization },
                  { label: "Reservists", value: String(selectedSquadron.total_reservists) },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg border border-neutral-100 dark:border-neutral-700 p-1.5">
                    <p className="text-[8px] font-semibold uppercase tracking-wider text-neutral-400">{item.label}</p>
                    <p className="text-[11px] font-bold text-neutral-800 dark:text-neutral-200 truncate">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-lg bg-neutral-50 dark:bg-neutral-800 p-2 space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] text-neutral-500"><MapPin size={10} /> {selectedSquadron.location}</div>
                <div className="flex items-center gap-1.5 text-[10px] text-neutral-500"><Layers size={10} /> {selectedSquadron.group.name}</div>
                <div className="flex items-center gap-1.5 text-[10px] text-neutral-500"><Shield size={10} /> {selectedSquadron.arsen.name}</div>
              </div>
              <p className="text-[9px] text-neutral-400 font-mono">{selectedSquadron.latitude.toFixed(4)}°N, {selectedSquadron.longitude.toFixed(4)}°E</p>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-[1000] rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-sm px-3 py-2 shadow-sm">
          <p className="text-[8px] font-semibold uppercase tracking-wider text-neutral-400 mb-1">ARSEN Regions</p>
          <div className="space-y-0.5">
            {arsenSummaries.map((arsen) => (
              <button key={arsen.id} onClick={() => handleSelectArsen(arsen)}
                className={cn(
                  "flex items-center gap-2 w-full text-left rounded px-1.5 py-0.5 transition-colors",
                  selectedArsen?.id === arsen.id ? "bg-indigo-50 dark:bg-indigo-500/10" : "hover:bg-neutral-50 dark:hover:bg-neutral-800"
                )}
              >
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: ARSEN_COLORS[arsen.id] || "#6B7280" }} />
                <span className="text-[10px] font-medium text-neutral-700 dark:text-neutral-300 truncate">{arsen.name}</span>
                <span className="text-[9px] text-neutral-400 ml-auto">{arsen.total_reservists}</span>
              </button>
            ))}
           </div>
         </div>

      </div>
    </div>
  );
 }

// ── Hierarchy View (original content) ──────────────────────────────
function HierarchyView() {
  const [search, setSearch] = useState("");
  const [hierarchyData, setHierarchyData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const { resetAll, selectedSquadron, modalSquadron, closeMembersModal } = useHierarchy();

  useEffect(() => { fetchHierarchy(); }, []);

  useEffect(() => {
    if (authError) {
      const timer = setTimeout(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [authError]);

  const fetchHierarchy = async () => {
    setLoading(true);
    try {
      const response = await getGroups({ hierarchical: true }, { skipAuthRedirect: true });
      if (response.data.status === "success") {
        const apiData = response.data.data;
        const transformed = transformApiData(apiData);
        if (transformed) setHierarchyData(transformed);
        setSummary(apiData.summary || null);
      }
    } catch (err) {
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        setAuthError(err.message);
        return;
      }
      console.warn("Could not load hierarchy from API:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalReservists = hierarchyData.reduce((a, area) => a + area.reservists, 0);
  const totalArcens = hierarchyData.reduce((a, area) => a + area.arcens.length, 0);
  const totalGroups = hierarchyData.reduce((a, area) => a + area.arcens.reduce((b, arc) => b + arc.groups.length, 0), 0);
  const totalSquadrons = hierarchyData.reduce((a, area) => a + area.arcens.reduce((b, arc) => b + arc.groups.reduce((c, g) => c + g.squadrons.length, 0), 0), 0);

  const filtered = search.trim()
    ? hierarchyData.filter((area) =>
        area.name.toLowerCase().includes(search.toLowerCase()) ||
        area.code.toLowerCase().includes(search.toLowerCase()) ||
        area.arcens.some((arc) =>
          arc.name.toLowerCase().includes(search.toLowerCase()) ||
          arc.groups.some((g) =>
            g.name.toLowerCase().includes(search.toLowerCase()) ||
            g.squadrons.some((s) => s.name.toLowerCase().includes(search.toLowerCase()))
          )
        )
      )
    : hierarchyData;

  return (
    <div className="flex flex-col gap-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <SummaryCard label="Airbases" value={summary?.total_arcens ?? totalArcens} />
        <SummaryCard label="ARCENs" value={summary?.total_arcens ?? totalArcens} />
        <SummaryCard label="Groups" value={summary?.total_groups ?? totalGroups} />
        <SummaryCard label="Squadrons" value={summary?.total_squadrons ?? totalSquadrons} />
        <SummaryCard label="Reservists" value={(summary?.total_reservists ?? totalReservists).toLocaleString()} />
      </div>

      {/* Search + collapse */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search area, ARCEN, group, squadron…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              "w-full rounded-lg border py-2 pl-8 pr-8 text-sm",
              "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900",
              "text-neutral-800 dark:text-neutral-200",
              "placeholder:text-neutral-400 dark:placeholder:text-neutral-600",
              "outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all"
            )}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
              <X size={12} />
            </button>
          )}
        </div>
        <button onClick={resetAll}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium",
            "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900",
            "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200",
            "transition-all duration-150"
          )}
        >
          <RotateCcw size={12} /> Collapse All
        </button>
      </div>

      {/* Hierarchy legend */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 px-4 py-2.5 text-[11px] text-neutral-500 dark:text-neutral-600">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Hierarchy:</span>
        {[
          { level: "1", label: "Airbase", color: "bg-indigo-500" },
          { level: "2", label: "ARCEN", color: "bg-indigo-400" },
          { level: "3", label: "Group", color: "bg-blue-400" },
          { level: "4", label: "Squadron", color: "bg-blue-300" },
        ].map((l, i) => (
          <span key={l.level} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-neutral-300 dark:text-neutral-700">›</span>}
            <span className={cn("h-2 w-2 rounded-full", l.color)} />
            <span>L{l.level}: {l.label}</span>
          </span>
        ))}
      </div>

      {/* Accordion list */}
      {authError ? (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-center">
          <div className="text-red-600 dark:text-red-400 mb-2">
            <p className="font-medium">Authentication Error</p>
            <p className="text-sm mt-1">{authError}</p>
          </div>
          <p className="text-xs text-red-500 dark:text-red-500 mt-2">Redirecting to login page in a few seconds…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 py-12 text-center">
          <p className="text-sm text-neutral-400">No data available. Please log in to view hierarchy.</p>
          <button onClick={() => setSearch("")} className="mt-2 text-xs text-indigo-500 hover:underline">Clear search</button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((area) => <AreaAccordion key={area.id} area={area} />)}
        </div>
      )}

      {selectedSquadron && <SelectedSquadronPanel />}
      {modalSquadron && (
        <MembersModal
          open={!!modalSquadron}
          node={modalSquadron}
          nodeType="squadron"
          onClose={closeMembersModal}
        />
      )}
    </div>
  );
}

// ── Main Overview with tabs ────────────────────────────────────────
function OverviewContent() {
  const [activeTab, setActiveTab] = useState("map");

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Tab switcher */}
       <div className="flex items-center gap-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-100/60 dark:bg-neutral-800/60 p-1 w-fit">
         <button
           onClick={() => setActiveTab("map")}
           className={cn(
             "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-150",
             activeTab === "map"
               ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm"
               : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
           )}
         >
           <Map size={13} /> Mindanao Map
         </button>
         <button
           onClick={() => setActiveTab("hierarchy")}
           className={cn(
             "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-150",
             activeTab === "hierarchy"
               ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm"
               : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
           )}
         >
           <List size={13} /> Hierarchy
         </button>
       </div>

      {activeTab === "hierarchy" ? <HierarchyView /> : <MindanaoMapInline />}
    </div>
  );
}

export default function AirbaseOverview() {
  return (
    <HierarchyProvider>
      <OverviewContent />
    </HierarchyProvider>
  );
}
