import React, {
    useState, useEffect, useMemo, useCallback, useRef,
} from 'react';
import {
    MapContainer, TileLayer, Circle, Marker, Popup,
    Polyline, CircleMarker, useMap, useMapEvents,
} from 'react-leaflet';
import { useNavigate, useMatch } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLocationTracking } from '../context/LocationContext';
import locationApi from '../../../services/locationApi';

// ── Constants ─────────────────────────────────────────────────────────────────
const WORKER_COLORS = [
    '#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6',
    '#06b6d4','#f97316','#84cc16','#ec4899','#14b8a6',
];

const PIN_META = {
    ENTRANCE:  { emoji: '🚪', label: 'Entrance / Gate',   color: '#3b82f6' },
    OFFICE:    { emoji: '🏠', label: 'Site Office',        color: '#8b5cf6' },
    MATERIAL:  { emoji: '📦', label: 'Material Store',     color: '#f59e0b' },
    EQUIPMENT: { emoji: '🚜', label: 'Equipment Area',     color: '#f97316' },
    DANGER:    { emoji: '⚠️', label: 'Danger Zone',        color: '#ef4444' },
    PARKING:   { emoji: '🅿️', label: 'Parking',           color: '#64748b' },
    WATER:     { emoji: '🚰', label: 'Water / Utilities',  color: '#06b6d4' },
    TOILET:    { emoji: '🚻', label: 'Toilet',             color: '#84cc16' },
    FIRST_AID: { emoji: '🏥', label: 'First Aid',          color: '#10b981' },
    OTHER:     { emoji: '📍', label: 'Other',              color: '#64748b' },
};

// ── Icon Factories ────────────────────────────────────────────────────────────
const workerIcon = (color, stale, initials) =>
    L.divIcon({
        className: '',
        html: `
            <div style="position:relative;width:38px;height:38px;">
                ${stale ? '' : `<div style="
                    position:absolute;inset:-4px;border-radius:50%;
                    background:${color};opacity:0.2;
                    animation:locPing 2s ease-in-out infinite;
                "></div>`}
                <div style="
                    width:38px;height:38px;border-radius:50%;
                    background:${stale ? '#9ca3af' : color};
                    border:3px solid white;
                    box-shadow:0 2px 10px rgba(0,0,0,0.3);
                    display:flex;align-items:center;justify-content:center;
                    font-size:13px;font-weight:900;color:white;
                    font-family:system-ui,sans-serif;
                ">${initials}</div>
            </div>
            <style>@keyframes locPing{0%,100%{transform:scale(1);opacity:.2}50%{transform:scale(1.5);opacity:.1}}</style>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
        popupAnchor: [0, -22],
    });

const pinIcon = (meta, size = 36) =>
    L.divIcon({
        className: '',
        html: `
            <div style="
                width:${size}px;height:${size}px;border-radius:${size/2}px ${size/2}px ${size/2}px 0;
                background:${meta.color};
                border:3px solid white;
                box-shadow:0 2px 8px rgba(0,0,0,0.3);
                display:flex;align-items:center;justify-content:center;
                font-size:${size*0.45}px;
                transform:rotate(-45deg);
            ">
                <span style="transform:rotate(45deg)">${meta.emoji}</span>
            </div>
        `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size],
        popupAnchor: [0, -size - 4],
    });

// ── Map helpers ───────────────────────────────────────────────────────────────
function FlyTo({ center }) {
    const map = useMap();
    useEffect(() => { if (center) map.flyTo(center, map.getZoom(), { duration: 0.6 }); }, [center, map]);
    return null;
}

// active  = always true (captures deselect clicks)
// showCrosshair = only in pin-placement mode
function ClickCapture({ onMapClick, showCrosshair }) {
    const map = useMap();
    useEffect(() => {
        map.getContainer().style.cursor = showCrosshair ? 'crosshair' : '';
    }, [showCrosshair, map]);
    useMapEvents({ click(e) { onMapClick(e.latlng); } });
    return null;
}

// ── Live countdown ────────────────────────────────────────────────────────────
function Countdown({ target }) {
    const [s, setS] = useState(30);
    useEffect(() => {
        const tick = () => setS(Math.max(0, Math.round((target - Date.now()) / 1000)));
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [target]);
    return <span className="tabular-nums text-[10px] text-gray-400">refresh in {s}s</span>;
}

// ── Add-Pin dropdown ──────────────────────────────────────────────────────────
const PIN_TYPES = Object.entries(PIN_META).map(([k, v]) => ({ value: k, ...v }));

function AddPinForm({ latlng, projectId, onSave, onCancel }) {
    const [name,    setName]    = useState('');
    const [type,    setType]    = useState('ENTRANCE');
    const [notes,   setNotes]   = useState('');
    const [saving,  setSaving]  = useState(false);

    const meta = PIN_META[type];

    const handleSave = async () => {
        if (!name.trim()) return;
        setSaving(true);
        try {
            await onSave({
                project:   parseInt(projectId),
                name:      name.trim(),
                pin_type:  type,
                latitude:  latlng.lat,
                longitude: latlng.lng,
                notes,
                color:     meta.color,
                is_active: true,
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 w-64 z-[500]">
            <h4 className="font-black text-gray-900 text-sm mb-3 flex items-center gap-2">
                <span className="text-lg">{meta.emoji}</span> Add Site Pin
            </h4>

            {/* Type picker */}
            <div className="grid grid-cols-5 gap-1 mb-3">
                {PIN_TYPES.map(pt => (
                    <button
                        key={pt.value}
                        onClick={() => setType(pt.value)}
                        title={pt.label}
                        className={`aspect-square rounded-lg flex items-center justify-center text-lg transition-all ${
                            type === pt.value
                                ? 'ring-2 ring-offset-1 scale-105'
                                : 'hover:bg-gray-100 opacity-60 hover:opacity-100'
                        }`}
                        style={type === pt.value ? { ringColor: meta.color } : {}}
                    >
                        {pt.emoji}
                    </button>
                ))}
            </div>

            <div className="text-[10px] font-bold text-gray-400 uppercase mb-3">{meta.label}</div>

            <input
                type="text"
                placeholder={`e.g. ${meta.label}`}
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm mb-2 focus:outline-none focus:border-indigo-400"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
            <textarea
                placeholder="Notes (optional)"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm mb-3 resize-none focus:outline-none focus:border-indigo-400"
            />

            <div className="text-[10px] font-mono text-gray-300 mb-3">
                {latlng.lat.toFixed(5)}, {latlng.lng.toFixed(5)}
            </div>

            <div className="flex gap-2">
                <button
                    onClick={handleSave}
                    disabled={saving || !name.trim()}
                    className="flex-1 py-2 bg-indigo-600 text-white font-bold rounded-xl text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                    {saving ? '…' : 'Save Pin'}
                </button>
                <button
                    onClick={onCancel}
                    className="px-3 py-2 bg-gray-100 text-gray-600 font-bold rounded-xl text-sm hover:bg-gray-200 transition-colors"
                >Cancel</button>
            </div>
        </div>
    );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function LiveSiteMap({ projectId }) {
    const navigate      = useNavigate();
    const desktopMatch  = useMatch('/dashboard/desktop/location/*');
    const mobileMatch   = useMatch('/dashboard/mobile/location/*');
    const match         = desktopMatch || mobileMatch;
    const base          = match ? match.pathnameBase : '/dashboard/desktop/location';
    const goTo          = (tab) => navigate(`${base}/${tab}`, { replace: false });

    const {
        geofences, pins,
        livePositions, liveLoading,
        fetchLivePositions, pollInterval,
        createPin, deletePin,
        loadGeofences, loadPins,
    } = useLocationTracking();

    // Map interaction state
    const [flyTarget,      setFlyTarget]      = useState(null);
    const [pinMode,        setPinMode]        = useState(false);  // "click to add pin"
    const [pendingPin,     setPendingPin]      = useState(null);  // {lat, lng} while form open
    const [showTrails,     setShowTrails]     = useState(false);
    const [trails,         setTrails]         = useState({});
    const [selectedWorker, setSelectedWorker] = useState(null);
    const [nextRefresh,    setNextRefresh]    = useState(Date.now() + pollInterval);
    const [activePanel,    setActivePanel]    = useState('workers'); // workers | zones | pins
    const [simulating,     setSimulating]     = useState(false);
    const [deletingPin,    setDeletingPin]    = useState(null);

    // Derived
    const projectGeofences = useMemo(
        () => geofences.filter(g => g.project === parseInt(projectId)),
        [geofences, projectId],
    );
    const projectPins = useMemo(
        () => pins.filter(p => p.project === parseInt(projectId) && p.is_active),
        [pins, projectId],
    );
    const hasGeofence = projectGeofences.length > 0;

    const mapCenter = useMemo(() => {
        if (projectGeofences.length > 0)
            return [parseFloat(projectGeofences[0].latitude), parseFloat(projectGeofences[0].longitude)];
        if (livePositions.length > 0 && livePositions[0].latitude != null)
            return [livePositions[0].latitude, livePositions[0].longitude];
        return [27.7172, 85.3240];
    }, [projectGeofences, livePositions]);

    const workerColorMap = useMemo(() => {
        const m = {};
        livePositions.forEach((w, i) => { m[w.user_id] = WORKER_COLORS[i % WORKER_COLORS.length]; });
        return m;
    }, [livePositions]);

    // Trail tracking
    useEffect(() => {
        setNextRefresh(Date.now() + pollInterval);
        if (!showTrails) return;
        setTrails(prev => {
            const next = { ...prev };
            livePositions.forEach(w => {
                if (w.latitude == null) return;
                const pts  = next[w.user_id] || [];
                const last = pts[pts.length - 1];
                const pt   = [w.latitude, w.longitude];
                if (!last || last[0] !== pt[0] || last[1] !== pt[1])
                    next[w.user_id] = [...pts.slice(-79), pt];
            });
            return next;
        });
    }, [livePositions, showTrails, pollInterval]);

    useEffect(() => { if (!showTrails) setTrails({}); }, [showTrails]);

    // Simulate GPS ping
    const simulatePing = async () => {
        if (!hasGeofence) return;
        setSimulating(true);
        try {
            const f = projectGeofences[0];
            const j = () => (Math.random() - 0.5) * 0.0002;
            await locationApi.pingLocation({
                latitude:  parseFloat(f.latitude) + j(),
                longitude: parseFloat(f.longitude) + j(),
                accuracy:  Math.floor(Math.random() * 12) + 3,
            });
            await fetchLivePositions();
        } catch (e) { console.error(e); }
        finally { setSimulating(false); }
    };

    // Map click handler — either pin placement or deselect
    const handleMapClick = useCallback((latlng) => {
        if (pinMode) { setPendingPin(latlng); setPinMode(false); }
        else { setSelectedWorker(null); }
    }, [pinMode]);

    const handleWorkerClick = useCallback((w) => {
        setSelectedWorker(prev => prev === w.user_id ? null : w.user_id);
        if (w.latitude != null) setFlyTarget([w.latitude, w.longitude]);
    }, []);

    const handlePinSave = async (payload) => {
        await createPin(payload);
        setPendingPin(null);
    };

    const handlePinDelete = async (id) => {
        setDeletingPin(id);
        try { await deletePin(id); } finally { setDeletingPin(null); }
    };

    const fmtDuration = (m) => m < 60 ? `${m}m` : `${Math.floor(m/60)}h ${m%60}m`;
    const initials = (name) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    return (
        <div className="flex flex-col h-full overflow-hidden bg-gray-50">
            {/* ── Top toolbar ── */}
            <div className="bg-white border-b border-gray-100 px-4 py-2.5 flex items-center gap-3 shrink-0 flex-wrap">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${liveLoading ? 'bg-yellow-400 animate-pulse' : 'bg-emerald-500 animate-pulse'}`} />
                    <span className="font-black text-gray-900 text-sm">Live Command Center</span>
                    <Countdown target={nextRefresh} />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {/* Trail toggle */}
                    <button
                        onClick={() => setShowTrails(t => !t)}
                        className={`px-3 py-1.5 rounded-lg font-bold text-xs border transition-colors ${
                            showTrails ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-200'
                        }`}
                    >🛤 Trails</button>

                    {/* Add Pin toggle */}
                    <button
                        onClick={() => setPinMode(p => !p)}
                        className={`px-3 py-1.5 rounded-lg font-bold text-xs border transition-colors ${
                            pinMode ? 'bg-amber-500 text-white border-amber-500 animate-pulse' : 'bg-white text-gray-600 border-gray-200 hover:border-amber-300'
                        }`}
                        title="Click on the map to add a site pin"
                    >{pinMode ? '📍 Click map to place' : '📍 Add Pin'}</button>

                    {/* Refresh */}
                    <button
                        onClick={fetchLivePositions}
                        disabled={liveLoading}
                        className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg font-bold text-xs hover:border-gray-400 disabled:opacity-50 transition-colors"
                    >{liveLoading ? '⟳…' : '⟳ Refresh'}</button>

                    {/* Simulate */}
                    {hasGeofence && (
                        <button
                            onClick={simulatePing}
                            disabled={simulating}
                            className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg font-bold text-xs hover:bg-blue-100 disabled:opacity-50 transition-colors"
                        >{simulating ? 'Pinging…' : '🧪 Sim Ping'}</button>
                    )}

                    {/* On-site count */}
                    <div className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-200 font-black text-xs">
                        {livePositions.length} On-Site
                    </div>
                </div>
            </div>

            {pinMode && (
                <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-amber-700 text-xs font-bold flex items-center gap-2 shrink-0">
                    📍 Pin placement mode — click anywhere on the map to drop a site marker
                    <button onClick={() => setPinMode(false)} className="ml-auto text-amber-500 hover:text-amber-700">✕ Cancel</button>
                </div>
            )}

            {/* ── Main body: map + side panel ── */}
            <div className="flex flex-1 overflow-hidden">
                {/* Map */}
                <div className="flex-1 relative z-0">
                    {!hasGeofence && (
                        <div className="absolute inset-0 z-[400] flex items-center justify-center bg-white/80 backdrop-blur-sm">
                            <div className="text-center max-w-sm p-8">
                                <div className="text-5xl mb-4">🗺️</div>
                                <h3 className="text-xl font-black text-gray-900 mb-2">No Site Boundary Yet</h3>
                                <p className="text-sm text-gray-500 mb-6">Define a GPS boundary so staff are automatically tracked when they arrive on site.</p>
                                <button
                                    onClick={() => goTo('geofence')}
                                    className="bg-indigo-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors"
                                >📍 Set Up Boundaries →</button>
                            </div>
                        </div>
                    )}

                    <MapContainer
                        center={mapCenter}
                        zoom={17}
                        style={{ height: '100%', width: '100%' }}
                        zoomControl={true}
                    >
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        />
                        <ClickCapture onMapClick={handleMapClick} showCrosshair={pinMode} />
                        {flyTarget && <FlyTo center={flyTarget} />}

                        {/* Geofence zones */}
                        {projectGeofences.map(fence => (
                            <Circle
                                key={fence.id}
                                center={[parseFloat(fence.latitude), parseFloat(fence.longitude)]}
                                pathOptions={{
                                    fillColor: fence.fence_color || '#3b82f6',
                                    color:     fence.fence_color || '#3b82f6',
                                    fillOpacity: 0.06,
                                    weight: 2,
                                    dashArray: '8 5',
                                }}
                                radius={fence.radius_meters}
                            >
                                <Popup>
                                    <div className="text-sm">
                                        <div className="font-black">{fence.name}</div>
                                        <div className="text-gray-400 text-xs">Radius: {fence.radius_meters}m</div>
                                    </div>
                                </Popup>
                            </Circle>
                        ))}

                        {/* Worker trails */}
                        {showTrails && Object.entries(trails).map(([uid, pts]) => {
                            const color = workerColorMap[parseInt(uid)] || '#6b7280';
                            return pts.length > 1 ? (
                                <Polyline
                                    key={`trail-${uid}`}
                                    positions={pts}
                                    pathOptions={{ color, weight: 2.5, opacity: 0.5, dashArray: '5 4' }}
                                />
                            ) : null;
                        })}

                        {/* Site pins */}
                        {projectPins.map(pin => {
                            const meta = PIN_META[pin.pin_type] || PIN_META.OTHER;
                            return (
                                <Marker
                                    key={`pin-${pin.id}`}
                                    position={[parseFloat(pin.latitude), parseFloat(pin.longitude)]}
                                    icon={pinIcon(meta)}
                                    zIndexOffset={-100}
                                >
                                    <Popup>
                                        <div className="text-sm min-w-[140px]">
                                            <div className="font-black text-gray-900">{meta.emoji} {pin.name}</div>
                                            <div className="text-gray-400 text-xs">{meta.label}</div>
                                            {pin.notes && <div className="text-gray-600 text-xs mt-1">{pin.notes}</div>}
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                        })}

                        {/* Worker markers */}
                        {livePositions.map(w => {
                            if (w.latitude == null) return null;
                            const color     = workerColorMap[w.user_id] || '#10b981';
                            const isSelected = w.user_id === selectedWorker;
                            const init      = initials(w.full_name);
                            return (
                                <Marker
                                    key={w.session_id}
                                    position={[w.latitude, w.longitude]}
                                    icon={workerIcon(color, w.is_stale, init)}
                                    zIndexOffset={isSelected ? 1000 : 0}
                                    eventHandlers={{ click: () => handleWorkerClick(w) }}
                                >
                                    <Popup>
                                        <div className="text-sm min-w-[160px]">
                                            <div className="font-black text-gray-900">{w.full_name}</div>
                                            <div className="text-gray-400 text-xs mb-2">@{w.username}</div>
                                            <div className="space-y-0.5 text-xs text-gray-600">
                                                <div>⏱ <strong>{fmtDuration(w.duration_minutes)}</strong> on-site</div>
                                                <div>🕐 Arrived <strong>{new Date(w.entry_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></div>
                                                {w.minutes_since_ping != null && (
                                                    <div className={w.is_stale ? 'text-yellow-600 font-bold' : ''}>
                                                        📡 Last ping: {w.minutes_since_ping}m ago
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                        })}

                        {/* Workers with no GPS — show on geofence center with offset */}
                        {livePositions.filter(w => w.latitude == null && projectGeofences.length > 0).map((w, i) => {
                            const color = workerColorMap[w.user_id] || '#10b981';
                            const init  = initials(w.full_name);
                            const fence = projectGeofences[0];
                            // spread around center
                            const angle = (i * 137.5) * (Math.PI / 180);
                            const r = 0.00008 * (1 + Math.floor(i / 8));
                            const lat = parseFloat(fence.latitude) + r * Math.cos(angle);
                            const lon = parseFloat(fence.longitude) + r * Math.sin(angle);
                            return (
                                <Marker
                                    key={`noloc-${w.user_id}`}
                                    position={[lat, lon]}
                                    icon={workerIcon(color, true, init)}
                                    zIndexOffset={0}
                                >
                                    <Popup>
                                        <div className="text-sm">
                                            <div className="font-black">{w.full_name}</div>
                                            <div className="text-gray-400 text-xs italic">Position not yet received</div>
                                            <div className="text-xs mt-1">⏱ {fmtDuration(w.duration_minutes)} on-site</div>
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                        })}
                    </MapContainer>

                    {/* Floating add-pin form */}
                    {pendingPin && (
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[500]">
                            <AddPinForm
                                latlng={pendingPin}
                                projectId={projectId}
                                onSave={handlePinSave}
                                onCancel={() => setPendingPin(null)}
                            />
                        </div>
                    )}

                    {/* Map legend */}
                    <div className="absolute bottom-3 left-3 z-[400] bg-white/95 backdrop-blur-sm rounded-xl shadow-sm border border-gray-100 px-3 py-2 text-[10px] text-gray-500 space-y-1">
                        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"/>Active worker</div>
                        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gray-400 inline-block"/>Stale (&gt;5m)</div>
                        <div className="flex items-center gap-1.5"><span className="text-base leading-none">📍</span>Site pin</div>
                    </div>
                </div>

                {/* ── Side Panel ── */}
                <div className="w-72 bg-white border-l border-gray-100 flex flex-col shrink-0 overflow-hidden">
                    {/* Panel tabs */}
                    <div className="flex border-b border-gray-100 shrink-0">
                        {[
                            { id: 'workers', label: `Workers (${livePositions.length})` },
                            { id: 'zones',   label: `Zones (${projectGeofences.length})` },
                            { id: 'pins',    label: `Pins (${projectPins.length})` },
                        ].map(t => (
                            <button
                                key={t.id}
                                onClick={() => setActivePanel(t.id)}
                                className={`flex-1 py-2.5 text-xs font-bold border-b-2 transition-colors ${
                                    activePanel === t.id
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-400 hover:text-gray-700'
                                }`}
                            >{t.label}</button>
                        ))}
                    </div>

                    {/* Panel content */}
                    <div className="flex-1 overflow-y-auto">

                        {/* ── Workers tab ── */}
                        {activePanel === 'workers' && (
                            <div className="p-3 space-y-2">
                                {livePositions.length === 0 ? (
                                    <div className="text-center py-12">
                                        <div className="text-4xl mb-3">👷</div>
                                        <p className="text-gray-400 text-sm font-medium">No staff on-site</p>
                                        <p className="text-gray-300 text-xs mt-1">Staff appear here when their device pings</p>
                                        {hasGeofence && (
                                            <button
                                                onClick={simulatePing}
                                                disabled={simulating}
                                                className="mt-4 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold border border-blue-200 hover:bg-blue-100 disabled:opacity-50"
                                            >{simulating ? 'Pinging…' : '🧪 Simulate a ping'}</button>
                                        )}
                                    </div>
                                ) : livePositions.map(w => {
                                    const color = workerColorMap[w.user_id] || '#10b981';
                                    const isSelected = w.user_id === selectedWorker;
                                    return (
                                        <button
                                            key={w.session_id}
                                            onClick={() => handleWorkerClick(w)}
                                            className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all border ${
                                                isSelected
                                                    ? 'border-indigo-200 bg-indigo-50'
                                                    : 'border-transparent hover:bg-gray-50'
                                            }`}
                                        >
                                            <div className="relative shrink-0">
                                                <div
                                                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm"
                                                    style={{ background: w.is_stale ? '#9ca3af' : color }}
                                                >
                                                    {initials(w.full_name)}
                                                </div>
                                                <span
                                                    className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
                                                    style={{ background: w.is_stale ? '#f59e0b' : '#10b981' }}
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-gray-900 truncate">{w.full_name}</p>
                                                <p className="text-[10px] text-gray-400">{fmtDuration(w.duration_minutes)} · arrived {new Date(w.entry_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                {w.latitude == null && (
                                                    <p className="text-[10px] text-gray-300 italic">no GPS yet</p>
                                                )}
                                                {w.is_stale && w.minutes_since_ping != null && (
                                                    <p className="text-[10px] text-yellow-500 font-bold">⚠ {w.minutes_since_ping}m since ping</p>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* ── Zones tab ── */}
                        {activePanel === 'zones' && (
                            <div className="p-3 space-y-2">
                                <button
                                    onClick={() => goTo('geofence')}
                                    className="w-full py-2.5 border border-dashed border-indigo-300 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-50 transition-colors"
                                >+ Manage Boundaries →</button>
                                {projectGeofences.length === 0 ? (
                                    <p className="text-center text-gray-400 text-xs py-6">No zones set up yet</p>
                                ) : projectGeofences.map(fence => (
                                    <div key={fence.id} className="flex items-center gap-2.5 p-3 bg-gray-50 rounded-xl">
                                        <div
                                            className="w-4 h-4 rounded-full shrink-0 border-2 border-white shadow-sm"
                                            style={{ background: fence.fence_color || '#3b82f6' }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-900 truncate">{fence.name}</p>
                                            <p className="text-[10px] text-gray-400">{fence.radius_meters}m radius · {fence.is_active ? 'Active' : 'Inactive'}</p>
                                        </div>
                                        <button
                                            onClick={() => setFlyTarget([parseFloat(fence.latitude), parseFloat(fence.longitude)])}
                                            className="text-[10px] text-blue-500 hover:bg-blue-50 px-2 py-1 rounded-lg font-bold"
                                        >📍</button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* ── Pins tab ── */}
                        {activePanel === 'pins' && (
                            <div className="p-3 space-y-2">
                                <button
                                    onClick={() => setPinMode(true)}
                                    className="w-full py-2.5 border border-dashed border-amber-300 text-amber-600 rounded-xl text-xs font-bold hover:bg-amber-50 transition-colors"
                                >📍 Click map to add a pin</button>

                                {projectPins.length === 0 ? (
                                    <div className="text-center py-8">
                                        <p className="text-gray-400 text-xs">No site pins yet</p>
                                        <p className="text-gray-300 text-[10px] mt-1">Mark entrances, offices, stores and danger zones</p>
                                    </div>
                                ) : projectPins.map(pin => {
                                    const meta = PIN_META[pin.pin_type] || PIN_META.OTHER;
                                    return (
                                        <div key={pin.id} className="flex items-center gap-2.5 p-3 bg-gray-50 rounded-xl group">
                                            <span className="text-xl shrink-0">{meta.emoji}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-gray-900 truncate">{pin.name}</p>
                                                <p className="text-[10px] text-gray-400">{meta.label}</p>
                                                {pin.notes && <p className="text-[10px] text-gray-400 truncate">{pin.notes}</p>}
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => setFlyTarget([parseFloat(pin.latitude), parseFloat(pin.longitude)])}
                                                    className="text-[10px] text-blue-500 hover:bg-blue-50 px-2 py-1 rounded-lg font-bold"
                                                >📍</button>
                                                <button
                                                    onClick={() => handlePinDelete(pin.id)}
                                                    disabled={deletingPin === pin.id}
                                                    className="text-[10px] text-red-400 hover:bg-red-50 px-2 py-1 rounded-lg font-bold disabled:opacity-50"
                                                >{deletingPin === pin.id ? '…' : '✕'}</button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Summary footer */}
                    <div className="border-t border-gray-100 p-3 grid grid-cols-4 gap-2 shrink-0 bg-gray-50">
                        {[
                            { label: 'On-Site', value: livePositions.length,                                 color: 'text-emerald-600' },
                            { label: 'No GPS',  value: livePositions.filter(w => w.latitude == null).length, color: 'text-yellow-500'  },
                            { label: 'Zones',   value: projectGeofences.length,                              color: 'text-indigo-600'  },
                            { label: 'Pins',    value: projectPins.length,                                   color: 'text-amber-600'   },
                        ].map(s => (
                            <div key={s.label} className="text-center">
                                <div className={`text-lg font-black ${s.color}`}>{s.value}</div>
                                <div className="text-[9px] text-gray-400 uppercase tracking-wide">{s.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
